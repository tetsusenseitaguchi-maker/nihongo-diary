/**
 * temperature とプロンプト並べ替えの切り分け — パイロット。
 *
 * 目的は結果を出すことではなく、**測る道具が腕を区別できるか**を確かめること。
 * 本測定（25本 ≈ $10）の前に、8本 ≈ $3 で設計の穴を見つける。
 *
 * ── 腕（2要因を交差させず、1本ずつの比較軸で読む）────────────────────
 *   A  旧プロンプト(339eed1^) @ 1.0   339eed1 前の本番そのもの
 *   B  新プロンプト            @ 1.0   現在の本番そのもの
 *   C  新プロンプト            @ 0.3   提案値
 *   D  新プロンプト            @ 0.0   下限
 *
 *   A vs B  → 並べ替えの回帰（temperature を本番値に固定）
 *   B vs C vs D → temperature の効果（プロンプトを固定）
 *
 * 腕Aは当時の送り方を再現する: 1ブロック・cache_control 無し。
 * 当時 temperature は届いていなかったので 1.0 で回すことに意味がある。
 *
 * ── 指標 ──────────────────────────────────────────────────────────
 *   主1  過剰修正      canary（全文かな）の correctedJapaneseRuby に漢字が出るか
 *   主2  カタカナルビ  base が全部カタカナの <ruby>
 *   主3  応答内一貫性  同じ漢字が1応答内で違う読みを持つか（8/22 の症状そのもの）
 *   副1  反復間ばらつき 同じ日記・同じ腕を3回回して読みが何通りに割れるか
 *   副2  トラップ誤読  音読み30語。⚠️ 検出力不足。「悪化していないこと」の見張り専用
 *
 * 実行: node --experimental-strip-types scripts/pilot-temperature.mjs
 *   PILOT_REPS=3 PILOT_CONCURRENCY=4 で調整可
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  ROOT, loadEnv, buildPrompt, buildOldPrompt, assertPromptWellFormed, generateWithRetry, parseJson,
  installLogCapture,
} from "./lib/correction-harness.mjs";

loadEnv();
const LOG = installLogCapture();
const PROMPT = await import(pathToFileURL(ROOT + "src/lib/correction-prompt.ts").href);
const provider = await import(pathToFileURL(ROOT + "src/lib/ai-provider.ts").href);

const REPS = Number(process.env.PILOT_REPS ?? 3);
const CONCURRENCY = Number(process.env.PILOT_CONCURRENCY ?? 4);

// ── 腕 ─────────────────────────────────────────────────────────────────
const ARMS = [
  { id: "A", label: "旧@1.0", old: true,  temperature: 1.0 },
  { id: "B", label: "新@1.0", old: false, temperature: 1.0 },
  { id: "C", label: "新@0.3", old: false, temperature: 0.3 },
  { id: "D", label: "新@0.0", old: false, temperature: 0.0 },
];
const PLANS = {
  paid: { includeDrills: true,  includeMiniLesson: true,  lean: false },
  free: { includeDrills: false, includeMiniLesson: false, lean: true },
};

// ── 日記 ───────────────────────────────────────────────────────────────
// canary: 全文かな。N5 + Light なので、correctedJapaneseRuby に漢字が出た時点で
//   ルール4（N5はほぼひらがな）とルール5（Lightは明らかな誤りだけ）の違反。
//   2026-08-08 の「あめ → 雨」がこの型（0/6 → 6/6 で再現した）。
// katakana: 外来語を濃縮。カタカナに <ruby> が付く回帰を見る。
// traps: 音読みに引かれやすい動詞・形容詞を濃縮。
const DIARIES = [
  { id: "canary1", kind: "canary", level: "N5", style: "Light",
    text: "きょうは あめでした。ともだちと こうえんに いきました。たのしかったです。" },
  { id: "canary2", kind: "canary", level: "N5", style: "Light",
    text: "きのう おかあさんと でんしゃに のって、うみを みに いきました。さかなが たくさん いました。" },
  { id: "canary3", kind: "canary", level: "N5", style: "Light",
    text: "あさ はやく おきて、がっこうまで あるきました。せんせいに あいさつを しました。" },

  { id: "kata1", kind: "katakana", level: "N4", style: "Natural",
    text: "今日はカフェでコーヒーを飲みながら、スマートフォンでゲームをしました。ケーキも食べました。" },
  { id: "kata2", kind: "katakana", level: "N4", style: "Natural",
    text: "週末はショッピングモールでシャツとスニーカーを買って、レストランでパスタを食べました。" },
  { id: "kata3", kind: "katakana", level: "Natural", style: "Native",
    text: "オンラインレッスンでフランス語を勉強しています。テキストとノートを用意して、パソコンの前に座ります。" },

  { id: "trap1", kind: "traps", level: "N4", style: "Natural",
    text: "今日は目を診てもらいました。雨が止んだので、公園を少し歩きました。" +
          "カフェでコーヒーを飲みながら、新しい本を読みました。とても楽しい一日を過ごしました。" +
          "夜は激しい風が吹いていましたが、部屋は温かかったです。" },
  { id: "trap2", kind: "traps", level: "Natural", style: "Native",
    text: "珍しい花が咲いていたので写真を撮りました。細かい作業を続けて、少し疲れました。" +
          "友達に電話して、優しい言葉をもらいました。難しい問題も解決して、" +
          "美しい夕日を見ながら帰りました。忘れないように覚えておきます。" },
];

// ── 指標の道具 ─────────────────────────────────────────────────────────
const KANJI = /[一-鿿々〆ヶ]/;
const ALL_KATAKANA = /^[ァ-ヺー・゠]+$/;
const RUBY = /<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g;

/** 応答全体（単語カード・ドリル・タイトル・応援まで）のルビを拾う。
 *  本番の症状は本文以外にも出る（2026-08-29 の 湖=こ は単語カードの例文）。 */
function allRuby(j) {
  const out = [];
  for (const m of JSON.stringify(j).matchAll(RUBY)) out.push({ base: m[1], rt: m[2] });
  return out;
}

function stripRuby(s) {
  return String(s ?? "").replace(RUBY, "$1").replace(/<[^>]*>/g, "");
}

// 音読みトラップ30語。[漢字, 送り仮名の先頭候補, 正しい読み, 誤りの音読み]
const TRAPS = [
  ["診","てるた","み",["しん"]], ["観","るてまた","み",["かん"]], ["生","きけ","い",["せい","しょう"]],
  ["分","かっ","わ",["ぶん","ふん"]], ["話","しすせそ","はな",["わ"]], ["激","し","はげ",["げき"]],
  ["細","か","こま",["さい"]], ["過","ご","す",["か"]], ["歩","きくい","ある",["ほ","あ"]],
  ["珍","し","めずら",["ちん"]], ["難","し","むずか",["なん"]], ["新","し","あたら",["しん"]],
  ["楽","し","たの",["らく","がく"]], ["苦","し","くる",["く"]], ["美","し","うつく",["び"]],
  ["厳","し","きび",["げん"]], ["優","し","やさ",["ゆう"]], ["正","し","ただ",["せい"]],
  ["悲","し","かな",["ひ"]], ["若","い","わか",["じゃく"]], ["温","か","あたた",["おん"]],
  ["忘","れ","わす",["ぼう"]], ["覚","え","おぼ",["かく"]], ["続","けきかい","つづ",["ぞく"]],
  ["決","め","き",["けつ"]], ["直","し","なお",["ちょく"]], ["通","っうい","かよ",["つう"]],
  ["開","けか","あ",["かい"]], ["迎","え","むか",["げい"]], ["祝","っうい","いわ",["しゅく"]],
];

function measure(diary, j) {
  if (!j) return null;
  const ruby = allRuby(j);
  const m = {};

  // 主1 過剰修正（canary のみ）— 全文かなの日記に漢字が出たら違反
  if (diary.kind === "canary") {
    const plain = stripRuby(j.correctedJapaneseRuby);
    m.overCorrectionKanji = [...new Set([...plain].filter((c) => KANJI.test(c)))];
  }

  // 主2 カタカナにルビ
  m.katakanaRuby = ruby.filter((r) => ALL_KATAKANA.test(r.base)).map((r) => `${r.base}=${r.rt}`);

  // 主3 応答内一貫性 — 同じ base が違う rt を持つ
  const byBase = new Map();
  for (const r of ruby) {
    if (!byBase.has(r.base)) byBase.set(r.base, new Set());
    byBase.get(r.base).add(r.rt);
  }
  m.inconsistent = [...byBase.entries()].filter(([, s]) => s.size > 1)
    .map(([b, s]) => `${b}=${[...s].join("/")}`);
  m.repeatedBases = [...byBase.values()].filter((s) => s.size >= 1).length;

  // 副2 トラップ誤読
  const blob = JSON.stringify(j);
  m.trapTotal = 0; m.trapBad = [];
  for (const [k, oku, , wrong] of TRAPS) {
    for (const mm of blob.matchAll(new RegExp(`<ruby>${k}<rt>([^<]*)</rt></ruby>(.)`, "g"))) {
      if (!oku.includes(mm[2])) continue;
      m.trapTotal++;
      if (wrong.includes(mm[1])) m.trapBad.push(`${k}=${mm[1]}`);
    }
  }

  // 反復間ばらつき用の生データ
  m.readings = Object.fromEntries([...byBase.entries()].map(([b, s]) => [b, [...s].sort().join("/")]));

  // 形の健全性
  m.fields = {
    corrected: typeof j.correctedJapaneseRuby === "string" && j.correctedJapaneseRuby.length > 0,
    drills: Array.isArray(j.practiceDrills) ? j.practiceDrills.length : null,
    miniLesson: j.relatedMiniLesson ? 1 : 0,
    vocab: Array.isArray(j.usefulVocabulary) ? j.usefulVocabulary.length : -1,
  };
  return m;
}

// ── 実行 ───────────────────────────────────────────────────────────────
const jobs = [];
for (const arm of ARMS) {
  for (const [plan, flags] of Object.entries(PLANS)) {
    for (const d of DIARIES) {
      const opts = { level: d.level, style: d.style, lang: "English", ...flags };
      const built = arm.old ? buildOldPrompt(opts, PROMPT) : buildPrompt(opts, PROMPT);
      assertPromptWellFormed(built, { ...flags, old: arm.old });
      for (let rep = 1; rep <= REPS; rep++) jobs.push({ arm, plan, diary: d, rep, built });
    }
  }
}
console.error(`${jobs.length} 回 / 並列 ${CONCURRENCY} / 反復 ${REPS}`);

const results = [];
let done = 0;
let cursor = 0;
async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= jobs.length) return;
    const job = jobs[i];
    let r = null, err = null;
    try {
      r = await generateWithRetry({
        blocks: job.built.blocks, text: job.diary.text, temperature: job.arm.temperature,
      }, provider);
    } catch (e) { err = String(e.message).slice(0, 120); }
    const j = r ? parseJson(r.raw) : null;
    results.push({
      arm: job.arm.id, plan: job.plan, diary: job.diary.id, kind: job.diary.kind, rep: job.rep,
      err, parsed: !!j, stop: r?.stop ?? null, m: measure(job.diary, j),
    });
    done++;
    if (done % 8 === 0) process.stderr.write(`${done}/${jobs.length} `);
  }
}
// 1本のワーカーが落ちても他を巻き込まない。取れた分は必ず書き出す。
process.on("unhandledRejection", (e) => console.error("unhandledRejection:", String(e).slice(0, 120)));
const t0 = Date.now();
await Promise.allSettled(Array.from({ length: CONCURRENCY }, worker));
const mins = ((Date.now() - t0) / 60000).toFixed(1);
process.stderr.write("\n");

writeFileSync(ROOT + "scripts/logs/pilot-temperature.json", JSON.stringify(results, null, 1));

// ── 集計 ───────────────────────────────────────────────────────────────
const armIds = ARMS.map((a) => a.id);
const rowsFor = (pred) => results.filter(pred);
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—");

console.log(`\n=== パイロット結果 (${jobs.length}回, ${mins}分) ===`);
console.log("腕: " + ARMS.map((a) => `${a.id}=${a.label}`).join("  "));

console.log("\n【主1】過剰修正 — canary の correctedJapaneseRuby に出た漢字");
console.log("腕    違反/試行     出た漢字");
for (const id of armIds) {
  const rs = rowsFor((r) => r.arm === id && r.kind === "canary" && r.m);
  const bad = rs.filter((r) => r.m.overCorrectionKanji.length);
  const chars = [...new Set(bad.flatMap((r) => r.m.overCorrectionKanji))];
  console.log(`${id}     ${String(bad.length + "/" + rs.length).padEnd(12)} ${pct(bad.length, rs.length).padEnd(7)} ${chars.join("") || "—"}`);
}

console.log("\n【主2】カタカナにルビ");
console.log("腕    違反/試行     例");
for (const id of armIds) {
  const rs = rowsFor((r) => r.arm === id && r.m);
  const bad = rs.filter((r) => r.m.katakanaRuby.length);
  const ex = [...new Set(bad.flatMap((r) => r.m.katakanaRuby))].slice(0, 4);
  console.log(`${id}     ${String(bad.length + "/" + rs.length).padEnd(12)} ${pct(bad.length, rs.length).padEnd(7)} ${ex.join(", ") || "—"}`);
}

console.log("\n【主3】応答内一貫性 — 同じ漢字が1応答の中で違う読みになった");
console.log("腕    違反/試行     例");
for (const id of armIds) {
  const rs = rowsFor((r) => r.arm === id && r.m);
  const bad = rs.filter((r) => r.m.inconsistent.length);
  const ex = [...new Set(bad.flatMap((r) => r.m.inconsistent))].slice(0, 4);
  console.log(`${id}     ${String(bad.length + "/" + rs.length).padEnd(12)} ${pct(bad.length, rs.length).padEnd(7)} ${ex.join(", ") || "—"}`);
}

console.log("\n【副1】反復間ばらつき — 同じ日記・同じ腕を3回回して読みが割れた漢字の数");
console.log("腕    割れた漢字/延べ漢字");
for (const id of armIds) {
  let split = 0, total = 0;
  for (const plan of Object.keys(PLANS)) {
    for (const d of DIARIES) {
      const rs = rowsFor((r) => r.arm === id && r.plan === plan && r.diary === d.id && r.m);
      if (rs.length < 2) continue;
      const acc = new Map();
      for (const r of rs) for (const [b, rt] of Object.entries(r.m.readings)) {
        if (!acc.has(b)) acc.set(b, new Set());
        acc.get(b).add(rt);
      }
      for (const s of acc.values()) { total++; if (s.size > 1) split++; }
    }
  }
  console.log(`${id}     ${String(split + "/" + total).padEnd(12)} ${pct(split, total)}`);
}

console.log("\n【副2】音読みトラップ ⚠️ 検出力不足。悪化していないことの見張り専用");
console.log("腕    誤読/出現");
for (const id of armIds) {
  const rs = rowsFor((r) => r.arm === id && r.m);
  const tot = rs.reduce((s, r) => s + r.m.trapTotal, 0);
  const bad = rs.reduce((s, r) => s + r.m.trapBad.length, 0);
  const ex = [...new Set(rs.flatMap((r) => r.m.trapBad))].slice(0, 5);
  console.log(`${id}     ${String(bad + "/" + tot).padEnd(12)} ${pct(bad, tot).padEnd(7)} ${ex.join(", ") || "—"}`);
}

console.log("\n【健全性】JSON パース / 欄の構成");
console.log("腕    parsed        paid:drills  free:drills(0であるべき)");
for (const id of armIds) {
  const rs = rowsFor((r) => r.arm === id);
  const p = rs.filter((r) => r.parsed).length;
  const paid = rowsFor((r) => r.arm === id && r.plan === "paid" && r.m);
  const free = rowsFor((r) => r.arm === id && r.plan === "free" && r.m);
  const paidDrills = paid.filter((r) => r.m.fields.drills === 2).length;
  const freeDrills = free.filter((r) => r.m.fields.drills !== null).length;
  console.log(`${id}     ${String(p + "/" + rs.length).padEnd(13)} ${String(paidDrills + "/" + paid.length).padEnd(12)} ${freeDrills}/${free.length}`);
}

const errs = results.filter((r) => r.err);
if (errs.length) {
  console.log(`\nエラー ${errs.length}件:`);
  for (const e of errs.slice(0, 5)) console.log(`  [${e.arm} ${e.plan} ${e.diary}] ${e.err}`);
}

const t = LOG.totals;
const cost = t.input / 1e6 + t.cacheRead * 0.1 / 1e6 + t.cacheWrite * 2 / 1e6 + t.output * 5 / 1e6;
console.log(`\ntokens: input=${t.input} cache_read=${t.cacheRead} cache_write=${t.cacheWrite} output=${t.output}`);
console.log(`cost≈$${cost.toFixed(2)} (haiku-4-5)  1回あたり $${(cost / jobs.length).toFixed(4)}`);
console.log(`生データ: scripts/logs/pilot-temperature.json`);
