/**
 * Free 出力削減の検証ハーネス。
 *
 * 2026-08-08 の並べ替え回帰（correction-prompt.ts:45-72）を繰り返さないため、
 * temperature 0 で同一条件を5回ずつ回し、回帰の有無を機械的に判定する。
 *
 * ⚠️ プロンプトはコピーせず、route.ts のテンプレートリテラルを読み出して
 *    その場で組み立てる。ハーネス側にプロンプトを写すと、本体を直したのに
 *    ハーネスが古い文面を検証し続ける、という一番たちの悪いずれ方をする。
 *
 * 3つの腕:
 *   paid        … 有料。今回の変更前と同一であるべき（バイト一致は別途検証済み）
 *   free-before … 変更前の Free（ドリル/ミニレッスンだけ無し）
 *   free-after  … 変更後の Free（今回の削減が効いている）
 *
 * 実行: ANTHROPIC_API_KEY を .env.local から読む。
 *   node --experimental-strip-types scripts/audition-correction-lean.mjs
 */
import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

// fileURLToPath, not .pathname — the repo path contains a space, which stays
// percent-encoded in a URL's pathname and makes every read ENOENT.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(ROOT + ".env.local", "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const KEY = env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5";
const REPS = 5;

const PROMPT = await import(pathToFileURL(ROOT + "src/lib/correction-prompt.ts").href);

/** Pull the template literal out of route.ts and evaluate it with real fragments. */
function buildPrompt({ level, style, lang, includeDrills, includeMiniLesson, lean }) {
  const src = readFileSync(ROOT + "src/app/api/correct/route.ts", "utf8");
  const i = src.indexOf("return `You are a friendly Japanese teacher");
  const j = src.indexOf("`;", i);
  const body = src.slice(i + "return ".length, j + 1);
  const locals = {
    level, style, lang,
    drillsSchema: PROMPT.drillsSchema(includeDrills),
    drillsInRule1: PROMPT.drillsInRule1(includeDrills),
    miniLessonInRule1: PROMPT.miniLessonInRule1(includeMiniLesson),
    miniLessonSchema: PROMPT.miniLessonSchema(includeMiniLesson),
    drillsRule: PROMPT.drillsRule(includeDrills, lang),
    miniLessonRule: PROMPT.miniLessonRule(includeMiniLesson, lang),
    keyMistakesCap: PROMPT.keyMistakesCap(lean),
    vocabularyCap: PROMPT.vocabularyCap(lean),
    explanationCap: PROMPT.explanationCap(lean),
    correctionNoteCap: PROMPT.correctionNoteCap(lean),
    suggestionCount: PROMPT.suggestionCount(lean),
  };
  const names = Object.keys(locals);
  return new Function(...names, `return ${body};`)(...names.map((n) => locals[n]));
}

async function generate(system, text) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 8000, temperature: 0,
        system, messages: [{ role: "user", content: text }],
      }),
    });
    if (r.ok) {
      const d = await r.json();
      const raw = (d.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
      return { raw, usage: d.usage, stop: d.stop_reason };
    }
    if ((r.status === 429 || r.status >= 500) && attempt < 4) {
      await new Promise((s) => setTimeout(s, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(`${r.status}: ${await r.text()}`);
  }
}

const parse = (raw) => {
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try { return JSON.parse(s); } catch { return null; }
};

// ── test diaries ───────────────────────────────────────────────────────────
// canary: 2026-08-08 の回帰そのもの。N5 + Light で「あめ」が「雨」に化けたら
// ルール4（N5はほぼひらがな）とルール5（Lightは明らかな誤りだけ）の違反。
const CANARY = "きょうは あめでした。ともだちと こうえんに いきました。たのしかったです。";
// traps: 音読み/訓読みの罠とカタカナを1つの日記に詰めたもの。
const TRAPS =
  "今日は目を診てもらいました。雨が止んだので、公園を少し歩きました。" +
  "カフェでコーヒーを飲みながら、新しい本を読みました。とても楽しい一日を過ごしました。" +
  "夜は激しい風が吹いていましたが、部屋は温かかったです。";

const ARMS = {
  paid:         { includeDrills: true,  includeMiniLesson: true,  lean: false },
  "free-before": { includeDrills: false, includeMiniLesson: false, lean: false },
  "free-after":  { includeDrills: false, includeMiniLesson: false, lean: true },
};

const CASES = [
  { name: "canary N5+Light", text: CANARY, level: "N5", style: "Light",   arms: ["free-before", "free-after", "paid"] },
  { name: "traps N4+Natural", text: TRAPS, level: "N4", style: "Natural", arms: ["free-before", "free-after", "paid"] },
  { name: "traps Natural+Native", text: TRAPS, level: "Natural", style: "Native", arms: ["free-after", "paid"] },
];

// ── checks ─────────────────────────────────────────────────────────────────
const KATAKANA_RUBY = /<ruby>[゠-ヿ・ー]+<rt>/;
const TRAP_READINGS = [
  [/<ruby>診<rt>み<\/rt>/, "診=み"],
  [/<ruby>止<rt>や<\/rt>/, "止=や"],
  [/<ruby>少<rt>すこ<\/rt>/, "少=すこ"],
  [/<ruby>歩<rt>ある<\/rt>/, "歩=ある"],
  [/<ruby>新<rt>あたら<\/rt>/, "新=あたら"],
  [/<ruby>楽<rt>たの<\/rt>/, "楽=たの"],
  [/<ruby>過<rt>す<\/rt>/, "過=す"],
  [/<ruby>激<rt>はげ<\/rt>/, "激=はげ"],
  [/<ruby>温<rt>あたた<\/rt>/, "温=あたた"],
];
const sentences = (s) => (s ?? "").split(/(?<=[.!?])\s+/).filter(Boolean).length;

function check(arm, caseName, j) {
  const f = [];
  if (!j) return ["JSON parse failed"];
  const n = (k) => (Array.isArray(j[k]) ? j[k].length : -1);
  const lean = arm === "free-after";

  if (lean) {
    if (n("keyMistakes") > 2) f.push(`keyMistakes=${n("keyMistakes")} (>2)`);
    if (n("usefulVocabulary") !== 2) f.push(`usefulVocabulary=${n("usefulVocabulary")} (want 2)`);
    if (n("nextVocab") !== 2) f.push(`nextVocab=${n("nextVocab")} (want 2)`);
    if (n("alternativeWords") !== 2) f.push(`alternativeWords=${n("alternativeWords")} (want 2)`);
    if (sentences(j.englishExplanation) > 4) f.push(`explanation=${sentences(j.englishExplanation)} sentences (>4)`);
  } else {
    if (n("nextVocab") !== 3) f.push(`nextVocab=${n("nextVocab")} (want 3 — paid/before unchanged)`);
    if (n("alternativeWords") !== 3) f.push(`alternativeWords=${n("alternativeWords")} (want 3)`);
  }
  if (n("nextGrammar") !== 2) f.push(`nextGrammar=${n("nextGrammar")} (want 2, all arms)`);

  const paid = arm === "paid";
  if (paid && n("practiceDrills") !== 2) f.push(`practiceDrills=${n("practiceDrills")} (paid wants 2)`);
  if (paid && !j.relatedMiniLesson) f.push("relatedMiniLesson missing (paid)");
  if (!paid && j.practiceDrills) f.push("practiceDrills present on a Free arm");
  if (!paid && j.relatedMiniLesson) f.push("relatedMiniLesson present on a Free arm");

  const allRuby = [j.originalTextRuby, j.correctedJapaneseRuby, j.naturalJapaneseRuby].join("\n");
  if (KATAKANA_RUBY.test(allRuby)) f.push("katakana carries <ruby> (rule 2)");

  if (caseName.startsWith("canary")) {
    // The 2026-08-08 regression: 「あめでした」 must not become 「雨でした」.
    if (/雨/.test(j.correctedJapaneseRuby ?? "")) f.push("OVER-CORRECTION: あめ → 雨 (rules 4+5)");
  }
  if (caseName.startsWith("traps")) {
    for (const [re, label] of TRAP_READINGS) {
      if (!re.test(allRuby) && new RegExp(label.split("=")[0]).test(allRuby)) f.push(`furigana trap: ${label}`);
    }
  }
  return f;
}

// ── run ────────────────────────────────────────────────────────────────────
const results = [];
let inTok = 0, outTok = 0;
for (const c of CASES) {
  for (const arm of c.arms) {
    const system = buildPrompt({ level: c.level, style: c.style, lang: "English", ...ARMS[arm] });
    for (let rep = 1; rep <= REPS; rep++) {
      const { raw, usage, stop } = await generate(system, c.text);
      const j = parse(raw);
      inTok += usage?.input_tokens ?? 0; outTok += usage?.output_tokens ?? 0;
      const fails = check(arm, c.name, j);
      results.push({
        case: c.name, arm, rep, fails, stop,
        out: usage?.output_tokens ?? 0,
        km: Array.isArray(j?.keyMistakes) ? j.keyMistakes.length : -1,
        uv: Array.isArray(j?.usefulVocabulary) ? j.usefulVocabulary.length : -1,
        expSent: sentences(j?.englishExplanation),
        expChars: (j?.englishExplanation ?? "").length,
      });
      process.stderr.write(fails.length ? "x" : ".");
    }
  }
}
process.stderr.write("\n");

const by = {};
for (const r of results) {
  const k = `${r.case} | ${r.arm}`;
  (by[k] ??= []).push(r);
}
const avg = (a, f) => +(a.reduce((s, x) => s + f(x), 0) / a.length).toFixed(1);
console.log("\ncase                     arm           pass   out_tok  keyMist  vocab  expl(sent/chars)");
console.log("─".repeat(92));
for (const [k, a] of Object.entries(by)) {
  const [c, arm] = k.split(" | ");
  const pass = a.filter((r) => !r.fails.length).length;
  console.log(
    `${c.padEnd(24)} ${arm.padEnd(13)} ${String(pass + "/" + a.length).padEnd(6)} ` +
    `${String(avg(a, (r) => r.out)).padStart(7)}  ${String(avg(a, (r) => r.km)).padStart(7)}  ` +
    `${String(avg(a, (r) => r.uv)).padStart(5)}  ${avg(a, (r) => r.expSent)} / ${avg(a, (r) => r.expChars)}`
  );
}
const failed = results.filter((r) => r.fails.length);
if (failed.length) {
  console.log(`\n${failed.length}/${results.length} FAILED:`);
  for (const r of failed) console.log(`  [${r.case} | ${r.arm} rep${r.rep}] ${r.fails.join("; ")}`);
} else {
  console.log(`\nall ${results.length} generations passed`);
}
console.log(`\ntokens: input=${inTok} output=${outTok}  cost≈$${(inTok / 1e6 + outTok * 5 / 1e6).toFixed(2)} (haiku-4-5)`);
