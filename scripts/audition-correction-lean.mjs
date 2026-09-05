/**
 * Free 出力削減の検証ハーネス。
 *
 * 2026-08-08 の並べ替え回帰（correction-prompt.ts:45-72）を繰り返さないため、
 * 同一条件を5回ずつ回し、回帰の有無を機械的に判定する。
 *
 * ⚠️ プロンプトはコピーせず、route.ts のテンプレートリテラルを読み出して
 *    その場で組み立てる。ハーネス側にプロンプトを写すと、本体を直したのに
 *    ハーネスが古い文面を検証し続ける、という一番たちの悪いずれ方をする。
 *    取り出しは scripts/lib/correction-harness.mjs に一本化した。
 *
 * ⚠️ 回す前に scripts/check-correction-harness.mjs を通すこと。
 *    このハーネスは 2026-08-21〜09-05 のあいだ壊れていた（339eed1 で
 *    取り出しの目印が消え、import 文を new Function に渡していた）。
 *    ハーネスが正しいことは、ハーネス自身では証明できない。
 *
 * 3つの腕:
 *   paid        … 有料。今回の変更前と同一であるべき（バイト一致は別途検証済み）
 *   free-before … 変更前の Free（ドリル/ミニレッスンだけ無し）
 *   free-after  … 変更後の Free（今回の削減が効いている）
 *
 * temperature は本番 /api/correct が宣言している 0.3 を既定にする（route.ts:401）。
 * 環境変数 HARNESS_TEMPERATURE で上書きできる。以前はここが 0 固定で、
 * 本番（ai-provider が Anthropic に渡していなかったため既定の 1.0）と
 * 食い違ったまま100回規模の検証を通していた。同じことを繰り返さないため、
 * 実際に使った値を必ず出力の末尾に印字する。
 *
 * 実行: node --experimental-strip-types scripts/audition-correction-lean.mjs
 */
import { pathToFileURL } from "node:url";
import { ROOT, loadEnv, buildPrompt, assertPromptWellFormed, generate, parseJson, installLogCapture } from "./lib/correction-harness.mjs";

loadEnv();
const LOG = installLogCapture();
const PROMPT = await import(pathToFileURL(ROOT + "src/lib/correction-prompt.ts").href);
const provider = await import(pathToFileURL(ROOT + "src/lib/ai-provider.ts").href);

const REPS = Number(process.env.HARNESS_REPS ?? 5);
/** 本番 /api/correct が宣言している値。route.ts:401 と揃える。 */
const TEMPERATURE = Number(process.env.HARNESS_TEMPERATURE ?? 0.3);

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
for (const c of CASES) {
  for (const arm of c.arms) {
    const flags = ARMS[arm];
    const built = buildPrompt({ level: c.level, style: c.style, lang: "English", ...flags }, PROMPT);
    // 組み立てが想定と違えば、そこで止まる。壊れたプロンプトで測った数字を
    // 表に出さないため。
    assertPromptWellFormed(built, flags);
    for (let rep = 1; rep <= REPS; rep++) {
      const { raw, stop } = await generate(
        { blocks: built.blocks, text: c.text, temperature: TEMPERATURE }, provider,
      );
      const j = parseJson(raw);
      const fails = check(arm, c.name, j);
      results.push({
        case: c.name, arm, rep, fails, stop,
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
console.log("\ncase                     arm           pass   keyMist  vocab  expl(sent/chars)");
console.log("─".repeat(92));
for (const [k, a] of Object.entries(by)) {
  const [c, arm] = k.split(" | ");
  const pass = a.filter((r) => !r.fails.length).length;
  console.log(
    `${c.padEnd(24)} ${arm.padEnd(13)} ${String(pass + "/" + a.length).padEnd(6)} ` +
    `${String(avg(a, (r) => r.km)).padStart(7)}  ` +
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
// 条件は必ず印字する。過去に「本番と違う temperature で回した100回」を
// 本番の保証として読んでしまった事故がある。
console.log(`\n条件: temperature=${TEMPERATURE} reps=${REPS} 経路=ai-provider(stream) provider=${process.env.AI_PROVIDER ?? "anthropic(既定)"}`);
const t = LOG.totals;
console.log(`tokens: input=${t.input} cache_read=${t.cacheRead} output=${t.output}  cost≈$${(t.input / 1e6 + t.cacheRead * 0.1 / 1e6 + t.output * 5 / 1e6).toFixed(2)} (haiku-4-5)`);
