/**
 * ハーネス自身の検証。audition を回す前にこれを通すこと。
 *
 * 「壊れたハーネスで通った検証を、また信じる」のを防ぐのが目的なので、
 * ハーネスの自己申告（目印が見つかった／例外が出なかった）では足りない。
 * ハーネスの外から見て正しいと言える物差しを3本使う:
 *
 *   検証1  旧プロンプトとの行の多重集合比較（git から取り出す）
 *          339eed1 は「行を丸ごと動かしただけ、差は空行1つ」と主張している。
 *          組み上がったプロンプトが本当にそれなら、旧テンプレートと
 *          行の集合が一致するはず。ハーネスとは独立した出所での裏取り。
 *
 *   検証2  count_tokens による実測（Anthropic API）
 *          339eed1 はブロック1を約6,065トークンと記録している。
 *          外部の物差しなので、取り出しの過不足がここに出る。
 *
 *   検証3  壊し戻しテスト
 *          route.ts を1文字だけ変えたコピーを渡して、ハーネスが
 *          「気づいて例外を投げる」ことを確かめる。検証1・2が通っても
 *          ハーネスが単に何も見ていないだけ、という可能性を潰す。
 *
 * 実行: node --experimental-strip-types scripts/check-correction-harness.mjs
 */
import { pathToFileURL } from "node:url";
import {
  ROOT, HarnessError, loadEnv, buildPrompt, assertPromptWellFormed,
  buildOldPrompt, countTokens, generate, parseJson, installLogCapture,
} from "./lib/correction-harness.mjs";

loadEnv();
const LOG = installLogCapture();
const PROMPT = await import(pathToFileURL(ROOT + "src/lib/correction-prompt.ts").href);

const ARMS = {
  paid: { includeDrills: true, includeMiniLesson: true, lean: false },
  free: { includeDrills: false, includeMiniLesson: false, lean: true },
};
const BASE = { level: "N4", style: "Natural", lang: "English" };

let failures = 0;
const ok = (label, detail = "") => console.log(`  ✓ ${label}${detail ? "  " + detail : ""}`);
const bad = (label, detail) => { failures++; console.log(`  ✗ ${label}\n      ${detail}`); };

// ── 0. 組み立てと構造チェック ───────────────────────────────────────────
console.log("\n[0] 組み立てと構造チェック");
const built = {};
for (const [arm, flags] of Object.entries(ARMS)) {
  try {
    built[arm] = buildPrompt({ ...BASE, ...flags }, PROMPT);
    const s = assertPromptWellFormed(built[arm], flags);
    ok(`${arm}: 組み立て`, `block1=${s.block1Chars} block2=${s.block2Chars} 計${s.totalChars}文字`);
  } catch (e) { bad(`${arm}: 組み立て`, e.message); }
}
if (!built.paid) { console.log("\n組み立てに失敗。以降は測れない。"); process.exit(1); }

// ── 1. 旧プロンプト（339eed1^）との行の多重集合比較 ───────────────────
// 有料の腕だけで十分。Free 用の断片は 30955ab（8/17）以降のもので、
// 339eed1^ の時点の route.ts にも入っているが、比較の主眼は
// 「ふりがな規則が動いただけか」なので条件を固定して見る。
console.log("\n[1] 旧プロンプト（339eed1^）との行の多重集合比較");
try {
  // buildOldPrompt を使う。パイロットの腕Aが依存する関数なので、
  // ここで一緒に叩いておく（比較の独立性は「別のリビジョンを読む」ことで担保される）。
  const oldBuilt = buildOldPrompt({ ...BASE, ...ARMS.paid }, PROMPT);
  assertPromptWellFormed(oldBuilt, { ...ARMS.paid, old: true });
  ok("旧プロンプトの組み立て", `1ブロック・キャッシュ無し・${oldBuilt.joined.length}文字`);

  const bag = (s) => { const m = new Map(); for (const l of s.split("\n")) m.set(l, (m.get(l) ?? 0) + 1); return m; };
  const a = bag(oldBuilt.joined), b = bag(built.paid.joined);
  const diffs = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const d = (b.get(k) ?? 0) - (a.get(k) ?? 0);
    if (d !== 0) diffs.push({ line: k, delta: d });
  }
  const nonBlank = diffs.filter((d) => d.line.trim() !== "");
  if (nonBlank.length === 0) {
    const blank = diffs.map((d) => d.delta).reduce((s, x) => s + x, 0);
    ok("旧と新で本文の行は完全一致", `差は空行 ${blank >= 0 ? "+" : ""}${blank} 行のみ（339eed1 の主張どおり）`);
  } else {
    bad("旧と新で本文の行が違う", nonBlank.slice(0, 6).map((d) => `${d.delta > 0 ? "新のみ" : "旧のみ"}: ${JSON.stringify(d.line.slice(0, 90))}`).join("\n      "));
  }
} catch (e) { bad("旧プロンプトとの比較", e.message); }

// ── 2. count_tokens ────────────────────────────────────────────────────
console.log("\n[2] count_tokens（339eed1 の記録: ブロック1 ≈ 6,065 トークン）");
try {
  const b1 = await countTokens([{ text: built.paid.cachedRules }], "x");
  const full = await countTokens(built.paid.blocks, "今日はいい天気でした。");
  const off = Math.abs(b1 - 6065) / 6065;
  const detail = `実測 ${b1}（記録との差 ${(off * 100).toFixed(1)}%） / 有料フルプロンプト ${full}`;
  if (off < 0.05) ok("ブロック1のトークン数が記録と一致", detail);
  else bad("ブロック1のトークン数が記録と乖離", detail + " — 取り出しに過不足がある疑い");
} catch (e) { bad("count_tokens", e.message); }

// ── 3. 壊し戻しテスト ──────────────────────────────────────────────────
// ハーネスが「何も見ていないから通っている」のではないことを示す。
console.log("\n[3] 壊し戻しテスト（わざと壊して、気づくか）");
const sabotage = [
  // ⚠️ サボタージュは joined も一緒に壊すこと。本物の変更は必ず両方に出る。
  //    片方だけ壊すと「チェックが見ていない側」を突いてしまい、
  //    チェックの強さではなくサボタージュの作りを測ることになる。
  {
    name: "書き出しを変える",
    mutate: (p) => {
      const c = p.cachedRules.replace("You are a friendly", "X");
      return { ...p, cachedRules: c, joined: c + p.variable, blocks: [{ text: c, cache: true }, { text: p.variable }] };
    },
  },
  {
    name: "ブロック1末尾の空行を削る",
    mutate: (p) => {
      const c = p.cachedRules.replace(/\n+$/, "\n");
      return { ...p, cachedRules: c, joined: c + p.variable, blocks: [{ text: c, cache: true }, { text: p.variable }] };
    },
  },
  {
    name: "cache_control を落とす",
    mutate: (p) => ({ ...p, blocks: [{ text: p.cachedRules }, { text: p.variable }] }),
  },
  {
    name: "ふりがな規則をブロック2へ移す（キャッシュから外れる）",
    mutate: (p) => {
      const line = p.cachedRules.match(/^- The mirror of the rule above.*$/m)[0];
      const c = p.cachedRules.replace(line, "");
      const v = p.variable + "\n" + line;
      return { ...p, cachedRules: c, variable: v, joined: c + v, blocks: [{ text: c, cache: true }, { text: v }] };
    },
  },
  {
    name: "ルール2の飲み込み禁止を削る",
    mutate: (p) => {
      const c = p.cachedRules.replace(/^- The mirror of the rule above.*$/m, "");
      return { ...p, cachedRules: c, joined: c + p.variable, blocks: [{ text: c, cache: true }, { text: p.variable }] };
    },
  },
  {
    name: "ルール10を消す",
    mutate: (p) => {
      const v = p.variable.replace(/^10\. /m, "XX. ");
      return { ...p, variable: v, joined: p.cachedRules + v, blocks: [{ text: p.cachedRules, cache: true }, { text: v }] };
    },
  },
];
for (const s of sabotage) {
  const broken = s.mutate({ ...built.paid });
  try {
    assertPromptWellFormed(broken, ARMS.paid);
    bad(`${s.name}`, "壊したのに通ってしまった — このチェックは効いていない");
  } catch (e) {
    if (e instanceof HarnessError) ok(`${s.name}`, "→ 検出");
    else bad(`${s.name}`, `想定外の例外: ${e.message}`);
  }
}

// ── 4. 本番経路で1件生成 ───────────────────────────────────────────────
console.log("\n[4] ai-provider 経由で1件生成（本番と同じ経路）");
try {
  const provider = await import(pathToFileURL(ROOT + "src/lib/ai-provider.ts").href);
  const t0 = Date.now();
  const r = await generate({
    blocks: built.paid.blocks,
    text: "今日は友達と公園を少し歩きました。天気が良くて楽しかったです。",
    temperature: 0.3,
  }, provider);
  const j = parseJson(r.raw);
  if (!j) { bad("生成", `JSON パース失敗 (stop=${r.stop}, ${r.raw.length}文字)`); }
  else {
    const want = ["originalTextRuby", "correctedJapaneseRuby", "naturalJapaneseRuby", "keyMistakes", "usefulVocabulary", "practiceDrills", "relatedMiniLesson", "diaryTitleRuby", "obieCheerRuby"];
    const missing = want.filter((k) => j[k] === undefined);
    if (missing.length) bad("生成", `欠けている欄: ${missing.join(", ")}`);
    else ok("生成", `stop=${r.stop} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    const t = LOG.totals;
    if (t.calls > 0) ok("usage をログから回収", `input=${t.input} output=${t.output} cache_read=${t.cacheRead} cache_write=${t.cacheWrite}`);
    else bad("usage をログから回収", "ai-provider のログ行を拾えなかった（ログの書式が変わった？）");
    console.log(`      title: ${String(j.diaryTitleRuby).slice(0, 60)}`);
  }
} catch (e) { bad("生成", e.message); }

// ── 5. temperature が本当に API まで届いているか ───────────────────────
// ソースを読んで判断すると、書き方が変わったときに黙って嘘をつく。
// 出力のばらつきで測るのも考えたが、n を現実的な範囲に収めると
// 雑音に埋もれて偽陽性が出た（temp0 で 3/6、temp1 で 2/6 など）。
//
// 代わりに範囲外の値を1回投げる。temperature の定義域は 0.0〜1.0 なので、
//   届いている  → 400 invalid_request_error（または SDK の送信前バリデーション）
//   落ちている  → 何事もなく 200
// 二値で、1回で決まり、解釈の余地がない。
console.log("\n[5] temperature が API まで届いているか（範囲外の値で判定）");
try {
  const provider = await import(pathToFileURL(ROOT + "src/lib/ai-provider.ts").href);
  for (const streamed of [false, true]) {
    const path = streamed ? "stream " : "non-str";
    const args = {
      label: "probe", temperature: 2, maxTokens: 8, jsonMode: false,
      messages: [{ role: "user", content: "Say OK." }],
    };
    let threw = null;
    try {
      if (streamed) {
        const { stream } = await provider.createChatCompletionStream(args);
        const rd = stream.getReader();
        for (;;) { const { done } = await rd.read(); if (done) break; }
      } else {
        await provider.createChatCompletion(args);
      }
    } catch (e) { threw = e; }

    if (threw) ok(`${path} temperature が届いている`, `範囲外の 2 が拒否された: ${String(threw.message).slice(0, 80)}`);
    else bad(`${path} temperature が届いていない`, "範囲外の 2 を投げたのに 200 が返った → ai-provider の Anthropic 分岐が渡していない");
  }
} catch (e) { bad("temperature の到達確認", e.message); }

console.log(failures ? `\n${failures} 件 FAILED\n` : "\nすべて通過\n");
process.exit(failures ? 1 : 0);
