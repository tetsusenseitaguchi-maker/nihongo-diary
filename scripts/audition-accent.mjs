#!/usr/bin/env node
/**
 * Render candidate words for src/lib/accent-dictionary.ts, twice each: once as
 * the app speaks them today, once with the 平板 mark. Listen to the pair and
 * decide whether the word belongs in the dictionary.
 *
 *   node scripts/audition-accent.mjs                    # the built-in candidates
 *   node scripts/audition-accent.mjs 公園:こうえん 銀行:ぎんこう
 *
 * Files land in ~/Desktop/accent-audition/ as NN-word.off.mp3 / .on.mp3, so a
 * pair sits together in the Finder listing. 00-公園 is included as a reference:
 * its .on is the version already confirmed correct, so it calibrates the ear
 * before judging anything else.
 *
 * ⚠️ Every run costs money — it calls Google Cloud TTS with the key from
 * .env.local, once per clip. It does NOT go through /api/tts, so it consumes
 * nobody's lifetime audio allowance and writes nothing to Supabase.
 *
 * Judge in the sentence, not in isolation: ^ opens an accent phrase and shifts
 * the prosody of the words after it too. The frame below puts the candidate
 * mid-utterance for that reason.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const VOICE = "ja-JP-Wavenet-A";
const RATE = 0.9;
const OUT = join(homedir(), "Desktop", "accent-audition");

/** Mid-sentence, and the same frame for every word so pairs stay comparable. */
const FRAME = (word, ph) =>
  `<speak>今日は<phoneme alphabet="yomigana" ph="${ph}">${word}</phoneme>のことを友達と話しました。</speak>`;
const FRAME_SUB = (word, reading) =>
  `<speak>今日は<sub alias="${reading}">${word}</sub>のことを友達と話しました。</speak>`;

/** 候補語 → 読み。採否が決まった語はここから外し、辞書へ移す。 */
const CANDIDATES = [
  ["公園", "こうえん"], // ← 採用済み。校正用の基準として残してある
  ["学校", "がっこう"],
  ["会社", "かいしゃ"],
  ["電車", "でんしゃ"],
  ["自転車", "じてんしゃ"],
  ["旅行", "りょこう"],
  ["仕事", "しごと"],
  ["予定", "よてい"],
  ["時間", "じかん"],
  ["掃除", "そうじ"],
  ["洗濯", "せんたく"],
  ["料理", "りょうり"],
  ["散歩", "さんぽ"],
  ["勉強", "べんきょう"],
  ["宿題", "しゅくだい"],
  ["日本語", "にほんご"],
  ["辞書", "じしょ"],
  ["友達", "ともだち"],
  ["写真", "しゃしん"],
  ["音楽", "おんがく"],
];

function apiKey() {
  // Read .env.local directly rather than requiring the caller to export it.
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => /^\s*(export\s+)?GOOGLE_TTS_API_KEY\s*=/.test(l));
  const value = line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  if (!value) throw new Error("GOOGLE_TTS_API_KEY is not set in .env.local");
  return value;
}

async function synth(key, ssml) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: "ja-JP", name: VOICE },
        audioConfig: { audioEncoding: "MP3", speakingRate: RATE },
      }),
    },
  );
  const json = await res.json();
  // The key is in the URL, so log the status and the message — never the request.
  if (!res.ok || !json.audioContent) {
    throw new Error(`HTTP ${res.status}: ${String(json?.error?.message ?? "").slice(0, 200)}`);
  }
  return Buffer.from(json.audioContent, "base64");
}

const words = process.argv.slice(2).length
  ? process.argv.slice(2).map((a) => {
      const [word, reading] = a.split(":");
      if (!word || !reading) throw new Error(`引数は 語:読み の形で指定してください（受け取った値: ${a}）`);
      return [word, reading];
    })
  : CANDIDATES;

const key = apiKey();
mkdirSync(OUT, { recursive: true });
console.log(`${words.length} 語 × 2 本 = ${words.length * 2} クリップ\n出力先: ${OUT}\n`);

for (const [i, [word, reading]] of words.entries()) {
  const n = String(i).padStart(2, "0");
  try {
    writeFileSync(join(OUT, `${n}-${word}.off.mp3`), await synth(key, FRAME_SUB(word, reading)));
    writeFileSync(join(OUT, `${n}-${word}.on.mp3`), await synth(key, FRAME(word, `^${reading}`)));
    console.log(`  ${n}-${word}  (${reading})`);
  } catch (err) {
    console.error(`  ${n}-${word}  ✗ ${err.message}`);
  }
}

console.log(`
聞き方: NN-語.off.mp3 → NN-語.on.mp3 の順に、対で聞いてください。
  on の方が自然  → 平板型。ACCENT_DICTIONARY に "語": "^よみ" を追加。
  off の方が自然  → 下降のある型。追加しないこと（辞書の外は現状維持）。
  差が分からない  → 追加しない。効果のない語を足すと、その語を含む音声の
                    キャッシュだけが無駄に作り直しになります。`);
