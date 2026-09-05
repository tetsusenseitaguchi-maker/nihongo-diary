/**
 * /api/correct の検証ハーネス共通部。プロンプトの組み立てと生成の呼び出し。
 *
 * ── なぜ切り出したか ────────────────────────────────────────────────
 * 2026-08-21 の 339eed1（キャッシュ用の並べ替え）で、audition-correction-lean
 * が route.ts からプロンプトを取り出す目印
 *   "return `You are a friendly Japanese teacher"
 * が消えた。indexOf が -1 を返し、-1 + 7 = 6 文字目、つまり import 文から
 * 切り出して new Function に渡していたので SyntaxError で落ちる。
 * 落ちること自体は幸運で、目印がもう少し惜しい壊れ方をしていれば
 * 「途中まで正しいプロンプト」で検証が通ってしまっていた。
 *
 * 取り出しはここ1箇所だけにする。ハーネスが増えるたびに同じ壊れ方を
 * それぞれが抱えるのを避けるため。壊れるときは全部まとめて壊れる。
 *
 * ── なぜ route.ts から取り出すのか（コピーしない理由）────────────────
 * ハーネス側にプロンプトを写すと、本体を直したのにハーネスが古い文面を
 * 検証し続ける、という一番たちの悪いずれ方をする。
 *
 * ⚠️ CACHED_RULES を lib/correction-prompt.ts へ移せば import で済む話では
 * ある。やらないのは correction-prompt.ts:41-43 の理由（ルール2が level と
 * style に依存する文面と隣接していて、切り出すと 2026-08-08 の並べ替えと
 * 同じ危険を踏む）による。動かすなら罠14件の前後比較つきで。
 *
 * ── 本番と同じ経路を通す ──────────────────────────────────────────
 * 旧ハーネスは api.anthropic.com を直接叩いていた。そのため本番と3点ずれて
 * いた。すべて 2026-09-05 に判明:
 *   1. temperature — ハーネスは 0、本番は Anthropic の既定 1.0。
 *      ai-provider が Anthropic 分岐で temperature を渡していなかったため。
 *   2. streaming  — ハーネスは非ストリーム、本番は createChatCompletionStream。
 *   3. system の形 — ハーネスは1本の文字列、本番は cache_control つき2ブロック。
 * このモジュールは ai-provider を経由するので、3つとも本番と同じになる。
 * 「検証で通ったが本番では別の条件だった」を作らないための造り。
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

// fileURLToPath, not .pathname — the repo path contains a space, which stays
// percent-encoded in a URL's pathname and makes every read ENOENT.
export const ROOT = fileURLToPath(new URL("../..", import.meta.url));

export class HarnessError extends Error {}

/** .env.local を process.env へ。ai-provider は PROVIDER_CONFIG を
 *  モジュール読み込み時に評価するので、import より前に呼ぶこと。 */
export function loadEnv() {
  const env = Object.fromEntries(
    readFileSync(ROOT + ".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
  for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AI_PROVIDER"]) {
    if (env[k]) process.env[k] = env[k];
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HarnessError(".env.local に ANTHROPIC_API_KEY がない");
  }
  return env;
}

/**
 * `anchor` の直後にあるテンプレートリテラルを、開き ` から閉じ ` まで
 * ソースのまま返す。
 *
 * 旧実装の indexOf("`;") と違い、エスケープされた \` を読み飛ばす。
 * プロンプト本文には \`\`\`json が含まれるので、素朴な検索では
 * いつ誤爆してもおかしくなかった。
 *
 * 見つからない・一意でない・閉じていない、のいずれも例外にする。
 * ここで黙って続けると「途中まで正しいプロンプト」で検証が通る。
 */
export function templateLiteralAt(src, anchor, label) {
  const a = src.indexOf(anchor);
  if (a === -1) {
    throw new HarnessError(
      `${label}: route.ts に目印が見つからない: ${JSON.stringify(anchor)}\n` +
        `  プロンプトの構造が変わった可能性がある。ハーネスを直すまで検証結果は信用できない。`,
    );
  }
  if (src.indexOf(anchor, a + 1) !== -1) {
    throw new HarnessError(`${label}: 目印が2箇所以上ある: ${JSON.stringify(anchor)}`);
  }
  const open = src.indexOf("`", a);
  if (open === -1) throw new HarnessError(`${label}: 目印の後にテンプレートリテラルがない`);
  for (let i = open + 1; i < src.length; i++) {
    if (src[i] === "\\") { i++; continue; }
    if (src[i] === "`") return src.slice(open, i + 1);
  }
  throw new HarnessError(`${label}: テンプレートリテラルが閉じていない`);
}

const ROUTE_PATH = "src/app/api/correct/route.ts";
const BLOCK1_ANCHOR = "const CACHED_RULES =";
const BLOCK2_ANCHOR = "return `This learner's level is:";

/** 339eed1 より前の、1本のテンプレートだった頃の目印。 */
export const OLD_PROMPT_REV = "339eed1^";
const OLD_ANCHOR = "return `You are a friendly Japanese teacher";

/** ルール1・11〜16 に差し込まれる断片。新旧どちらのテンプレートでも同じ。 */
function promptLocals({ level, style, lang, includeDrills, includeMiniLesson, lean }, PROMPT) {
  return {
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
}

function evalTemplate(tplSrc, locals) {
  const names = Object.keys(locals);
  return new Function(...names, `return ${tplSrc};`)(...names.map((n) => locals[n]));
}

/** route.ts が実際に送っている2ブロックを組み立てる。
 *
 *  返り値の blocks は ai-provider の systemBlocks とそのまま同じ形。
 *  joined は "" で連結したもの — Anthropic はブロック間に区切りを入れない
 *  ので（ai-provider.ts:88-103）、これが実際にモデルが読む1本の文字列。
 *  "\n\n" で連結してはいけない。 */
export function buildPrompt({ level, style, lang, includeDrills, includeMiniLesson, lean }, PROMPT) {
  const src = readFileSync(ROOT + ROUTE_PATH, "utf8");

  const block1Src = templateLiteralAt(src, BLOCK1_ANCHOR, "CACHED_RULES");
  const block2Src = templateLiteralAt(src, BLOCK2_ANCHOR, "variablePrompt");

  // 差し込みゼロのブロック。new Function で評価するのは、\` や \${ の
  // エスケープを route.ts と同じ規則で解くため。
  const cachedRules = evalTemplate(block1Src, {});
  const variable = evalTemplate(
    block2Src,
    promptLocals({ level, style, lang, includeDrills, includeMiniLesson, lean }, PROMPT),
  );

  const blocks = [{ text: cachedRules, cache: true }, { text: variable }];
  return { blocks, joined: cachedRules + variable, cachedRules, variable };
}

/**
 * 339eed1 より前のプロンプトを git から組み立てる。
 *
 * 並べ替えの回帰と temperature の効果を切り分けるための対照。
 * 当時の本番を再現するので、ブロックには**分けず**、cache_control も付けない
 * （キャッシュは 339eed1 で入ったもの）。temperature も当時は届いていなかった
 * ので、この腕は 1.0 で回すことに意味がある。
 *
 * ⚠️ ワーキングツリーではなく git から読む。ここをファイルから読むと
 * 「旧」が旧でなくなる。
 */
export function buildOldPrompt(opts, PROMPT) {
  const oldSrc = execFileSync("git", ["show", `${OLD_PROMPT_REV}:${ROUTE_PATH}`], {
    cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24,
  });
  const tpl = templateLiteralAt(oldSrc, OLD_ANCHOR, `旧テンプレート(${OLD_PROMPT_REV})`);
  const joined = evalTemplate(tpl, promptLocals(opts, PROMPT));
  // 1ブロック・キャッシュ無し = 339eed1 以前の送り方そのもの。
  return { blocks: [{ text: joined }], joined, cachedRules: "", variable: joined };
}

/**
 * 組み上がったプロンプトが「本当に route.ts のものか」を構造で確かめる。
 *
 * 目印が見つかることと、正しく組み上がっていることは別。旧ハーネスは
 * 前者すら確かめていなかったので、ここは後者まで見る。
 * 失敗したら例外 — 警告にすると読み飛ばされる。
 */
export function assertPromptWellFormed({ blocks, joined, cachedRules, variable }, { includeDrills, includeMiniLesson, old = false }) {
  const problems = [];

  if (joined.includes("${")) problems.push("未評価の ${...} が残っている");
  if (!joined.startsWith("You are a friendly Japanese teacher")) {
    problems.push("プロンプトが想定の書き出しで始まっていない");
  }
  if (old) {
    // 339eed1 以前は1ブロック・キャッシュ無し。分かれていたら「旧」ではない。
    if (blocks.length !== 1) problems.push(`旧プロンプトが ${blocks.length} ブロックに分かれている`);
    if (blocks[0]?.cache) problems.push("旧プロンプトに cache_control が付いている");
    if (!joined.includes("This learner's level is:")) problems.push("level の行がない");
  } else {
    if (blocks.length !== 2) problems.push(`新プロンプトが ${blocks.length} ブロックではない`);
    if (!blocks[0]?.cache) problems.push("ブロック1に cache_control が付いていない");
    // ai-provider.ts:38-41 — 区切りが入らないので、ブロック1は自前で
    // 空行で終わっていなければ 7b の最終行が "This learner's..." に直結する。
    if (!cachedRules.endsWith("\n\n")) problems.push("ブロック1が空行で終わっていない（7bと次行が直結する）");
    if (!variable.startsWith("This learner's level is:")) {
      problems.push("ブロック2が想定の書き出しで始まっていない");
    }
    // ふりがな規則はキャッシュされる側に無ければならない。ブロック2へ
    // 移ると毎回課金され、339eed1 の目的そのものが失われる。
    if (!cachedRules.includes("<rt> must never ABSORB the okurigana")) {
      problems.push("ふりがな規則がキャッシュ対象のブロック1に無い");
    }
  }

  // 番号つきルールが行頭に1回ずつ出ること。並べ替えは 2〜7b → 1 → 8 なので
  // 「順番」ではなく「過不足なく在ること」を見る。
  //
  // 数えるのは "Rules:" 以降だけ。その前に
  //   Before correcting anything, ask yourself:
  //   1. Is this actually wrong?  …  4. Will the correction change the nuance?
  // という別の 1.〜4. があり、素朴に数えると必ず2回になる。
  const rulesAt = joined.indexOf("\nRules:\n");
  if (rulesAt === -1) problems.push('"Rules:" の行がない');
  const ruleLines = rulesAt === -1 ? [] : joined.slice(rulesAt).split("\n");
  const startsRule = (n) => ruleLines.filter((l) => l.startsWith(`${n}. `)).length;

  const always = ["1", "2", "3", "4", "5", "5b", "6", "6b", "7", "7b", "8", "9", "10", "13", "14", "15", "16", "17"];
  const conditional = [...(includeDrills ? ["11"] : []), ...(includeMiniLesson ? ["12"] : [])];
  for (const n of [...always, ...conditional]) {
    const hits = startsRule(n);
    if (hits !== 1) problems.push(`ルール ${n} が行頭に ${hits} 回（1回であるべき）`);
  }
  if (!includeDrills && startsRule("11")) problems.push("ドリル無しのはずがルール11がある");
  if (!includeMiniLesson && startsRule("12")) problems.push("ミニレッスン無しのはずがルール12がある");

  // ふりがな規則の中核。ここが落ちていたら測る意味がない。
  // 旧プロンプトでは cachedRules が空なので joined を見る。ここが落ちていたら
  // どちらの腕でも測る意味がない。
  for (const needle of [
    "<rt> must never ABSORB the okurigana",
    "it MUST use its kun'yomi (訓読み) reading",
    "<ruby>珍<rt>ちん</rt></ruby>しい",
  ]) {
    if (!joined.includes(needle)) problems.push(`ふりがな規則に ${JSON.stringify(needle)} がない`);
  }

  if (problems.length) {
    throw new HarnessError("プロンプトの組み立てが想定と違う:\n  - " + problems.join("\n  - "));
  }
  return { block1Chars: cachedRules.length, block2Chars: variable.length, totalChars: joined.length };
}

/** count_tokens で実測。339eed1 はブロック1を約6,065トークンと記録している。
 *  外部の物差しなので、取り出しが正しいことの独立した裏取りになる。 */
export async function countTokens(blocks, userText) {
  const r = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      system: blocks.map((b) => ({ type: "text", text: b.text })),
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!r.ok) throw new HarnessError(`count_tokens ${r.status}: ${await r.text()}`);
  return (await r.json()).input_tokens;
}

/**
 * ai-provider 経由で1件生成する。本番 /api/correct と同じ呼び出し。
 *
 * usage は ai-provider が console.log にしか出さないので、その行を拾う。
 * 行の形は ai-provider.ts:194-208 の logStopReason に合わせてある。
 * 迂回に見えるが、ログ経路そのものが本番と同じであることの確認も兼ねる。
 */
export async function generate({ blocks, text, temperature, label = "correct" }, provider) {
  const captured = [];
  const realLog = console.log;
  console.log = (...args) => { captured.push(args.join(" ")); };
  let out;
  try {
    const { stream, stopReason } = await provider.createChatCompletionStream({
      label,
      temperature,
      maxTokens: 8000,
      systemBlocks: blocks,
      messages: [{ role: "user", content: text }],
    });
    // ⚠️ stopReason に即座にハンドラを付けること。
    //
    // ai-provider はストリームが途中で切れたとき rejectStopReason(err) と
    // controller.error(err) の両方を呼ぶ。reader.read() の側で先に捕まえて
    // 抜けると、stopReason の reject が誰にも await されないまま残り、
    // Node が unhandledRejection でプロセスごと落とす。
    // 2026-09-05 のパイロット試走が 40/64 でこれで死んだ（ECONNRESET）。
    // 本番は refund 判定で必ず await するので起きない、ハーネス固有の穴。
    const settledStop = stopReason.catch(() => null);
    const chunks = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    out = { raw: Buffer.concat(chunks.map(Buffer.from)).toString("utf8"), stop: await settledStop };
  } finally {
    console.log = realLog;
  }

  const usageLine = captured.find((l) => l.includes(" stop_reason=") && l.includes(" input="));
  const num = (k) => {
    const m = usageLine?.match(new RegExp(`${k}=(\\d+)`));
    return m ? Number(m[1]) : null;
  };
  out.usage = usageLine
    ? { input: num("input"), output: num("output"), cacheRead: num("cache_read"), cacheWrite: num("cache_write") }
    : null;
  return out;
}

/**
 * generate() を、一時的なネットワーク断で再試行する。
 *
 * ストリームが始まったあとに切れると SDK の内蔵リトライは効かない
 * （ECONNRESET / terminated）。長い生成を数百回まわすと必ず何回か起きるので、
 * ハーネス側で吸収する。恒久的なエラー（400 など）は再試行しても無駄なので、
 * メッセージで振り分ける。
 */
export async function generateWithRetry(args, provider, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await generate(args, provider);
    } catch (e) {
      last = e;
      const msg = String(e?.message ?? e);
      const transient = /terminated|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|overloaded|rate.?limit|429|50\d/i.test(msg);
      if (!transient || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw last;
}

export function parseJson(raw) {
  const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try { return JSON.parse(s); } catch { return null; }
}
