/**
 * 本測定: correct の temperature を 1.0 / 0.3 / 0.0 のどれにするか。
 *
 * パイロット（2026-09-05、192回）で確定したこと:
 *   ・339eed1 の並べ替えによる回帰は再現しなかった（腕A vs 腕B に差なし）
 *     → 腕Aを落とし、浮いた分を反復に回す
 *   ・temperature の効果ははっきり出る（トラップ誤読 1.7% → 0%)
 *   ・指標2つが壊れていた（主1 過剰修正 / 主3 応答内一貫性）→ 下で直した
 *
 * 残った問いは「0.3 か 0.0 か」。0.0 はパイロットの全指標で最良だったが、
 * 硬直（どの日記にも同じ言い回しが出る）が心配になる。添削は1回の呼び出しで
 *   ・ふりがな / 文法 = analytical。ばらつきは害
 *   ・タイトル / Obie の応援 / 言い換え = creative。ばらつきは価値
 * の両方をやるので、temperature 1つで両立させる点を探すことになる。
 * 「一貫性」と「多様性」を別々に測り、トレードオフを数字で出す。
 *
 * ── 指標 ──────────────────────────────────────────────────────────
 * 一貫性（低いほど良い）
 *   C1 カタカナルビ    base が全部カタカナの <ruby>
 *   C2 語単位の不一致  同じ「漢字＋直後のかな」が1応答内で違う読み
 *                      ⚠️ 漢字単位で比べてはいけない。食べる(た)と食事(しょく)は
 *                      どちらも正しい。パイロットはこれで検出30件中20件が
 *                      誤検出だった
 *   C3 反復間ばらつき  同じ日記を5回まわして読みが割れた語の数
 *   C4 トラップ誤読    音読み30語（検出力は低い。悪化の見張り）
 *
 * 多様性（高いほど良い）
 *   D1 タイトルの異なり率      別々の日記に別々のタイトルが付くか
 *   D2 Obie 応援の相互類似度   別々の日記の応援がどれだけ似ているか
 *                              （プロンプト17が「日記ごとに意味のある変化」を要求）
 *   D3 英語説明の相互類似度     定型文になっていないか
 *   D4 言い換え候補の異なり率   ルール15が「自然な多様性」を要求
 *
 * ── 本番と同じ後処理を通す ───────────────────────────────────────────
 * 生の応答ではなく normalizeRubyText を通した後も測る。学習者が見るのは
 * 後者。一日=ついたち は辞書で直り、カタカナルビは parseRubySegments が
 * テキストに落とす。生だけ見ると、直っているものを問題として数える。
 *
 * ⚠️ 生の応答は必ず保存する。パイロットでは指標を組み直せず測り直しになった。
 *
 * 実行: node --experimental-strip-types scripts/measure-temperature.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  ROOT, loadEnv, buildPrompt, assertPromptWellFormed, generateWithRetry, parseJson, installLogCapture,
} from "./lib/correction-harness.mjs";
import { DIARIES as ALL_DIARIES } from "./lib/pilot-diaries.mjs";

loadEnv();
// ⚠️ プロセスで1回だけ。generate() ごとに差し替えると並列で競合する。
const LOG = installLogCapture();
const PROMPT = await import(pathToFileURL(ROOT + "src/lib/correction-prompt.ts").href);
const provider = await import(pathToFileURL(ROOT + "src/lib/ai-provider.ts").href);
const FURIGANA = await import(pathToFileURL(ROOT + "src/lib/furigana.ts").href);

const REPS = Number(process.env.MEASURE_REPS ?? 5);
const CONCURRENCY = Number(process.env.MEASURE_CONCURRENCY ?? 8);
const ONLY = process.env.MEASURE_ONLY ? process.env.MEASURE_ONLY.split(",") : null;
/** 煙試験用。1群だけ回して集計まで通す。 */
const DIARIES = process.env.MEASURE_DIARIES
  ? ALL_DIARIES.filter((d) => process.env.MEASURE_DIARIES.split(",").includes(d.kind)).slice(0, Number(process.env.MEASURE_DIARY_LIMIT ?? 99))
  : ALL_DIARIES;

const ARMS = [
  { id: "B", label: "1.0（現状）", temperature: 1.0 },
  { id: "C", label: "0.3（提案）", temperature: 0.3 },
  { id: "D", label: "0.0",        temperature: 0.0 },
].filter((a) => !ONLY || ONLY.includes(a.id));

const PLANS = {
  paid: { includeDrills: true,  includeMiniLesson: true,  lean: false },
  free: { includeDrills: false, includeMiniLesson: false, lean: true },
};

/* ── 本番と同じ後処理 ──────────────────────────────────────────────────
   correction-payload.ts の kind:"ruby" の欄がこれ。normalizeRubyText を
   通すと READING_DICTIONARY が効き、カタカナのルビはテキストに落ちる。 */
const RUBY_PATHS = [
  "originalTextRuby", "correctedJapaneseRuby", "naturalJapaneseRuby", "practiceSentenceRuby",
  "diaryTitleRuby", "obieCheerRuby",
];
const RUBY_IN_ARRAY = {
  keyMistakes: ["mistakeRuby", "correctionRuby"],
  usefulVocabulary: ["exampleRuby"],
  nextGrammar: ["exampleRuby"],
  practiceDrills: ["questionRuby", "answerRuby"],
};
function normalizeLikeProduction(j) {
  if (!j) return j;
  const out = JSON.parse(JSON.stringify(j));
  for (const k of RUBY_PATHS) if (typeof out[k] === "string") out[k] = FURIGANA.normalizeRubyText(out[k]);
  for (const [arr, keys] of Object.entries(RUBY_IN_ARRAY)) {
    if (!Array.isArray(out[arr])) continue;
    for (const item of out[arr]) for (const k of keys) {
      if (typeof item?.[k] === "string") item[k] = FURIGANA.normalizeRubyText(item[k]);
    }
  }
  // relatedMiniLesson は生で保存されるが、読み出し時に通るので学習者が
  // 見るものは正規化後。correction-payload.ts:77 の記録どおり。
  if (out.relatedMiniLesson?.exampleJapaneseRuby) {
    out.relatedMiniLesson.exampleJapaneseRuby =
      FURIGANA.normalizeRubyText(out.relatedMiniLesson.exampleJapaneseRuby);
  }
  return out;
}

/* ── 指標の道具 ───────────────────────────────────────────────────────── */
const ALL_KATAKANA = /^[ァ-ヺー・゠]+$/;
const RUBY = /<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g;
const KANA = /[ぁ-ゖァ-ヺー]/;

function rubySegments(j) {
  const blob = JSON.stringify(j);
  const out = [];
  for (const m of blob.matchAll(RUBY)) {
    // 直後の1文字が送り仮名かどうか。語を区別する鍵になる。
    const after = blob.slice(m.index + m[0].length, m.index + m[0].length + 1);
    out.push({ base: m[1], rt: m[2], oku: KANA.test(after) ? after : "" });
  }
  return out;
}
const stripRuby = (s) => String(s ?? "").replace(RUBY, "$1").replace(/<[^>]*>/g, "").trim();

const TRAPS = [
  ["診","てるた",["しん"]], ["観","るてまた",["かん"]], ["生","きけ",["せい","しょう"]],
  ["分","かっ",["ぶん","ふん"]], ["話","しすせそ",["わ"]], ["激","し",["げき"]],
  ["細","か",["さい"]], ["過","ご",["か"]], ["歩","きくい",["ほ","あ"]],
  ["珍","し",["ちん"]], ["難","し",["なん"]], ["新","し",["しん"]],
  ["楽","し",["らく","がく"]], ["苦","し",["く"]], ["美","し",["び"]],
  ["厳","し",["げん"]], ["優","し",["ゆう"]], ["正","し",["せい"]],
  ["悲","し",["ひ"]], ["若","い",["じゃく"]], ["温","か",["おん"]],
  ["忘","れ",["ぼう"]], ["覚","え",["かく"]], ["続","けきかい",["ぞく"]],
  ["決","め",["けつ"]], ["直","し",["ちょく"]], ["通","っうい",["つう"]],
  ["開","けか",["かい"]], ["迎","え",["げい"]], ["祝","っうい",["しゅく"]],
];

/** 文字 n-gram の Jaccard。定型化の度合いを見る。 */
function jaccard(a, b, n = 4) {
  const g = (s) => { const t = new Set(); for (let i = 0; i + n <= s.length; i++) t.add(s.slice(i, i + n)); return t; };
  const A = g(a), B = g(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

function measure(j) {
  if (!j) return null;
  const segs = rubySegments(j);
  const m = {};

  m.katakanaRuby = segs.filter((s) => ALL_KATAKANA.test(s.base)).map((s) => `${s.base}=${s.rt}`);

  // C2 語単位。キーは「漢字＋直後のかな1字」。
  // 珍(ちん)しく と 珍(めずら)しく → キーは両方「珍し」→ 比較される
  // 食(た)べる と 食(しょく)事    → キーは「食べ」と「食」  → 比較されない
  const byWord = new Map();
  for (const s of segs) {
    const key = s.base + s.oku;
    if (!byWord.has(key)) byWord.set(key, new Set());
    byWord.get(key).add(s.rt);
  }
  m.inconsistent = [...byWord.entries()].filter(([, v]) => v.size > 1).map(([k, v]) => `${k}=${[...v].join("/")}`);
  m.words = Object.fromEntries([...byWord.entries()].map(([k, v]) => [k, [...v].sort().join("/")]));

  const blob = JSON.stringify(j);
  m.trapTotal = 0; m.trapBad = [];
  for (const [k, oku, wrong] of TRAPS) {
    for (const mm of blob.matchAll(new RegExp(`<ruby>${k}<rt>([^<]*)</rt></ruby>(.)`, "g"))) {
      if (!oku.includes(mm[2])) continue;
      m.trapTotal++;
      if (wrong.includes(mm[1])) m.trapBad.push(`${k}=${mm[1]}`);
    }
  }

  // 多様性の素材
  m.title = stripRuby(j.diaryTitleRuby);
  m.cheer = stripRuby(j.obieCheerRuby);
  m.explanation = String(j.englishExplanation ?? "");
  m.alts = (Array.isArray(j.alternativeWords) ? j.alternativeWords : [])
    .map((a) => String(a?.alternative ?? "")).filter(Boolean);

  m.fields = {
    drills: Array.isArray(j.practiceDrills) ? j.practiceDrills.length : null,
    miniLesson: j.relatedMiniLesson ? 1 : 0,
    vocab: Array.isArray(j.usefulVocabulary) ? j.usefulVocabulary.length : -1,
  };
  return m;
}

/* ── 実行 ─────────────────────────────────────────────────────────────── */
const jobs = [];
for (const arm of ARMS) {
  for (const [plan, flags] of Object.entries(PLANS)) {
    for (const d of DIARIES) {
      const built = buildPrompt({ level: d.level, style: d.style, lang: "English", ...flags }, PROMPT);
      assertPromptWellFormed(built, flags);
      for (let rep = 1; rep <= REPS; rep++) jobs.push({ arm, plan, diary: d, rep, built });
    }
  }
}
console.error(`${jobs.length} 回 / 並列 ${CONCURRENCY} / 反復 ${REPS} / 腕 ${ARMS.map((a) => a.id).join(",")}`);

mkdirSync(ROOT + "scripts/logs", { recursive: true });
const RAW_PATH = ROOT + "scripts/logs/measure-temperature-raw.jsonl";
const rawLines = [];
const results = [];
let done = 0, cursor = 0;

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", String(e).slice(0, 120)));

async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= jobs.length) return;
    const job = jobs[i];
    let r = null, err = null;
    try {
      r = await generateWithRetry(
        { blocks: job.built.blocks, text: job.diary.text, temperature: job.arm.temperature }, provider,
      );
    } catch (e) { err = String(e.message).slice(0, 150); }
    const raw = r ? parseJson(r.raw) : null;
    const norm = normalizeLikeProduction(raw);
    const key = { arm: job.arm.id, plan: job.plan, diary: job.diary.id, kind: job.diary.kind, rep: job.rep };
    // ⚠️ 生の応答を必ず残す。指標を後から組み直せるように。
    rawLines.push(JSON.stringify({ ...key, err, stop: r?.stop ?? null, raw: r?.raw ?? null }));
    results.push({ ...key, err, parsed: !!raw, mRaw: measure(raw), mNorm: measure(norm) });
    done++;
    if (done % 25 === 0) process.stderr.write(`${done}/${jobs.length} `);
  }
}
const t0 = Date.now();
await Promise.allSettled(Array.from({ length: CONCURRENCY }, worker));
const mins = ((Date.now() - t0) / 60000).toFixed(1);
process.stderr.write("\n");
writeFileSync(RAW_PATH, rawLines.join("\n") + "\n");
writeFileSync(ROOT + "scripts/logs/measure-temperature.json", JSON.stringify(results, null, 1));

/* ── 集計 ─────────────────────────────────────────────────────────────── */
const armIds = ARMS.map((a) => a.id);
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "—");
const pad = (s, n) => String(s).padEnd(n);

console.log(`\n=== 本測定 (${jobs.length}回, ${mins}分) ===`);
console.log("腕: " + ARMS.map((a) => `${a.id}=${a.label}`).join("  ") + `   日記${DIARIES.length}本 × ${Object.keys(PLANS).length}プラン × ${REPS}反復`);

for (const [tag, pick] of [["生の応答", "mRaw"], ["normalizeRubyText 適用後（学習者が見るもの）", "mNorm"]]) {
  console.log(`\n────── ${tag} ──────`);
  console.log("\n[C1] カタカナにルビ            [C2] 語単位の不一致           [C4] トラップ誤読");
  console.log("腕    違反/試行             違反/試行                   誤読/出現");
  for (const id of armIds) {
    const rs = results.filter((r) => r.arm === id && r[pick]);
    const k = rs.filter((r) => r[pick].katakanaRuby.length).length;
    const c = rs.filter((r) => r[pick].inconsistent.length).length;
    const tt = rs.reduce((s, r) => s + r[pick].trapTotal, 0);
    const tb = rs.reduce((s, r) => s + r[pick].trapBad.length, 0);
    console.log(`${id}     ${pad(`${k}/${rs.length} ${pct(k, rs.length)}`, 22)}${pad(`${c}/${rs.length} ${pct(c, rs.length)}`, 28)}${tb}/${tt} ${pct(tb, tt)}`);
  }
  console.log("\n[C3] 反復間ばらつき — 同じ日記を回して読みが割れた語");
  for (const id of armIds) {
    let split = 0, total = 0;
    for (const plan of Object.keys(PLANS)) for (const d of DIARIES) {
      const rs = results.filter((r) => r.arm === id && r.plan === plan && r.diary === d.id && r[pick]);
      if (rs.length < 2) continue;
      const acc = new Map();
      for (const r of rs) for (const [w, rt] of Object.entries(r[pick].words)) {
        if (!acc.has(w)) acc.set(w, new Set());
        acc.get(w).add(rt);
      }
      for (const s of acc.values()) { total++; if (s.size > 1) split++; }
    }
    console.log(`${id}     ${split}/${total} ${pct(split, total)}`);
  }
}

// 多様性は生の応答で測る（正規化はふりがなにしか触らない）
console.log("\n────── 多様性（varied 8本で測る。高いほど良い / 類似度は低いほど良い）──────");
console.log("腕    D1 タイトル異なり率   D2 応援の相互類似   D3 説明の相互類似   D4 言い換え異なり率");
for (const id of armIds) {
  const rs = results.filter((r) => r.arm === id && r.kind === "varied" && r.mRaw);
  // ⚠️ 反復を「別々の日記」と数えないこと。同じ日記の5反復に同じタイトルが
  // 付くのは正しい挙動で、硬直ではない。(plan, rep) ごとに「日記が違えば
  // タイトルも違うか」を見て、その平均を取る。
  const groupRatio = (pick) => {
    const groups = new Map();
    for (const r of rs) {
      const g = `${r.plan}|${r.rep}`;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(...[pick(r)].flat().filter(Boolean));
    }
    const ratios = [...groups.values()].filter((v) => v.length)
      .map((v) => new Set(v).size / v.length);
    return ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
  };
  const d1 = groupRatio((r) => r.mRaw.title);
  const crossSim = (field) => {
    let sum = 0, n = 0;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      if (rs[i].diary === rs[j].diary) continue; // 別々の日記だけを比べる
      sum += jaccard(rs[i].mRaw[field], rs[j].mRaw[field]); n++;
    }
    return n ? sum / n : 0;
  };
  const d4 = groupRatio((r) => r.mRaw.alts);
  console.log(`${id}     ${pad((100 * d1).toFixed(1) + "%", 20)}${pad((100 * crossSim("cheer")).toFixed(1) + "%", 20)}${pad((100 * crossSim("explanation")).toFixed(1) + "%", 20)}${(100 * d4).toFixed(1)}%`);
}

console.log("\n[健全性] parse / 欄の構成");
for (const id of armIds) {
  const rs = results.filter((r) => r.arm === id);
  const paid = rs.filter((r) => r.plan === "paid" && r.mRaw);
  const free = rs.filter((r) => r.plan === "free" && r.mRaw);
  console.log(`${id}     parsed ${rs.filter((r) => r.parsed).length}/${rs.length}   paid drills=2: ${paid.filter((r) => r.mRaw.fields.drills === 2).length}/${paid.length}   free drills有り: ${free.filter((r) => r.mRaw.fields.drills !== null).length}/${free.length}`);
}

const errs = results.filter((r) => r.err);
if (errs.length) {
  console.log(`\nエラー ${errs.length}件:`);
  for (const e of errs.slice(0, 5)) console.log(`  [${e.arm} ${e.plan} ${e.diary}] ${e.err}`);
}
const t = LOG.totals;
const cost = t.input / 1e6 + t.cacheRead * 0.1 / 1e6 + t.cacheWrite * 2 / 1e6 + t.output * 5 / 1e6;
console.log(`\ntokens: input=${t.input} cache_read=${t.cacheRead} cache_write=${t.cacheWrite} output=${t.output} (${t.calls}回ぶん回収)`);
console.log(`cost≈$${cost.toFixed(2)}  1回あたり $${(cost / jobs.length).toFixed(4)}`);
console.log(`生の応答: scripts/logs/measure-temperature-raw.jsonl`);
