// Thin AI-provider wrapper used by every /api/* route that calls an LLM
// (correction, drill generation, translation, weekly report, vocabulary).
// Switch providers with the AI_PROVIDER env var ("openai" | "anthropic")
// without touching call sites. By default callers get JSON back in the
// text content — set jsonMode: false for plain-text output (translation).
// Callers keep their own JSON.parse / safeJson() fallback logic unchanged.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * One piece of a system prompt that is sent as several blocks instead of one
 * string, so a prompt-caching breakpoint can be placed between them.
 *
 * ⚠️ Blocks are concatenated with NO separator — see the note on splitSystem
 * below for why. Each block must carry its own trailing newlines. That is not
 * a wart: it is what makes `blocks.map(b => b.text).join("")` identical to the
 * single string the same prompt would have been, which is how a caller can
 * prove a split changed the layout and nothing else.
 */
export interface SystemBlock {
  text: string;
  /**
   * Marks the end of the cacheable prefix. Anthropic only — OpenAI caches
   * prefixes automatically and has no equivalent marker, so the flag is
   * simply ignored there and the same blocks are sent as one string.
   *
   * A cached prefix has to be long enough to qualify: measured against
   * claude-haiku-4-5 on 2026-08-21, a 6,065-token block was cached
   * (cache_creation_input_tokens=6065) and a 1,278-token one was not
   * (0, billed as ordinary input). Below the minimum this flag costs
   * nothing and does nothing — it does not fail, it just never caches.
   */
  cache?: boolean;
}

interface ChatCompletionParams {
  messages: ChatMessage[];
  /**
   * System prompt as ordered blocks. When set, `messages` must carry no
   * system message — this replaces it. Callers that do not need a caching
   * breakpoint keep passing a plain system message and ignore this.
   */
  systemBlocks?: SystemBlock[];
  temperature?: number;
  maxTokens: number;
  /** Set to false for plain-text output (e.g. translation). Defaults to true. */
  jsonMode?: boolean;
  /** Short tag (e.g. "correct", "mini-lesson-drills") prefixed to the stop-reason log. */
  label?: string;
}

type Provider = "openai" | "anthropic";

function getProvider(): Provider {
  return process.env.AI_PROVIDER === "openai" ? "openai" : "anthropic";
}

const PROVIDER_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4.1-mini",
    temperatureSupported: true,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-haiku-4-5",
    /**
     * ⚠️ このフラグは model と必ず一緒に動かすこと。
     *
     * Anthropic の temperature は Claude Opus 4.6 より後のモデルでは
     * 非対応で、1.0 以外を送ると 400 で落ちる。claude-haiku-4-5 は
     * それ以前の世代なので受け付ける。
     *
     * つまりモデルを上げるとき、model だけ書き換えると10ルート全部が
     * 400 になる。上げるなら同時にここを false にして、呼び出し側の
     * temperature 指定が何を意味するかを決め直すこと（既定は 1.0 相当で、
     * 現に 2026-09-05 まで全ルートがその値で動いていた）。
     */
    temperatureSupported: true,
  },
} as const;

/** Returns a Japanese error string if the active provider's API key is missing, else null. */
export function missingApiKeyError(): string | null {
  const provider = getProvider();
  if (!PROVIDER_CONFIG[provider].apiKey) {
    return provider === "anthropic"
      ? "サーバーに ANTHROPIC_API_KEY が設定されていません。"
      : "サーバーに OPENAI_API_KEY が設定されていません。";
  }
  return null;
}

/**
 * ⚠️ system を配列（複数ブロック）で送るときの落とし穴。
 *
 * Anthropic の API はブロックとブロックの間に区切り文字を入れない。
 * count_tokens で確認済み: [A, B] の2ブロックは A+B と同じトークン数で、
 * A + "\n\n" + B より2トークン少ない。つまり前のブロックの最終行と次の
 * ブロックの先頭行が改行なしで直結する。
 *
 * prompt caching の cache_control を置くために system を分割する場合、
 * 区切りは自分で入れること。入れ忘れると
 *   "...alternativeWords[].alternativeReading.1. Write ALL explanatory text"
 * のように連結され、ルールがルールとして読まれなくなる。2026-08-08 の
 * 並べ替え検証で実際に踏んだ。
 *
 * 下の splitSystem が "\n\n" で join しているのは system "メッセージ" を
 * 1本の文字列にまとめる話で、こちらとは別物。混同しないこと。
 */
function splitSystem(messages: ChatMessage[]): {
  system: string;
  rest: { role: "user" | "assistant"; content: string }[];
} {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages
    .filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system");
  return { system, rest };
}

/**
 * What Anthropic's `system` field gets: the joined string as before, or the
 * blocks with a cache_control breakpoint on the ones that asked for it.
 *
 * ttl "1h" rather than the default "5m" is the whole reason this exists.
 * Corrections arrive about 70 times a day, median gap 13 minutes — measured
 * over 2,202 of them on 2026-08-21. At 5 minutes the prefix is re-read 24% of
 * the time, and a 5-minute write costs 1.25x input against a 0.1x read, so the
 * writes eat the savings and the whole change is worth under 2%. At an hour
 * the same prefix is re-read 91.6% of the time; the write costs 2x instead of
 * 1.25x and it still pays for itself several times over.
 */
function anthropicSystem(
  blocks: SystemBlock[] | undefined,
  joined: string,
): string | { type: "text"; text: string; cache_control?: { type: "ephemeral"; ttl: "1h" } }[] {
  if (!blocks) return joined;
  return blocks.map((b) => ({
    type: "text" as const,
    text: b.text,
    ...(b.cache ? { cache_control: { type: "ephemeral" as const, ttl: "1h" as const } } : {}),
  }));
}

/**
 * temperature を送るときだけキーを作る。両プロバイダで同じものを使う。
 *
 * ⚠️ `{ temperature: params.temperature }` をそのまま展開してはいけない。
 * 呼び出し側が指定していないとき `temperature: undefined` を送ることになり、
 * 「指定なし（＝プロバイダの既定）」と「明示的に既定値」を区別できなくなる。
 *
 * 2026-09-05 まで、Anthropic 分岐はこれを一切送っていなかった。10ルートが
 * 0.2〜0.7 を宣言しているのに全部がプロバイダ既定の 1.0 で動いていて、
 * OpenAI 分岐だけが宣言どおりだった、という非対称が2つの経路
 * （createChatCompletion / createChatCompletionStream）の両方にあった。
 * 添削のふりがなが同じ応答の中で欄ごとに割れる症状の調査で見つかったもの。
 * 片方だけ直せる形にしないため、送出はこの1関数に集約してある。
 */
function samplingParams(params: ChatCompletionParams, supported: boolean) {
  if (!supported || params.temperature === undefined) return {};
  return { temperature: params.temperature };
}

/** OpenAI has no block form: the same blocks go back to being one string.
 *  Joined with "" because each block already ends with its own newlines. */
function openaiMessages(params: ChatCompletionParams): ChatMessage[] {
  if (!params.systemBlocks) return params.messages;
  return [
    { role: "system", content: params.systemBlocks.map((b) => b.text).join("") },
    ...params.messages,
  ];
}

/**
 * Tokens billed for one call, normalised across the two providers.
 *
 * Read only to be logged. Nothing in the app branches on it, and it is
 * deliberately not persisted: the question it answers ("which feature spends
 * the budget") is asked of a week of Vercel logs, not of a row in Supabase.
 * No counter, no plan logic, no DB write.
 */
interface TokenUsage {
  input: number;
  output: number;
  /** Anthropic only — 0 until a cache_control breakpoint is actually sent. */
  cacheRead: number;
  cacheWrite: number;
}

/** Anthropic's `usage`. Fields are loosened because the streamed and
 *  non-streamed shapes differ, and the cache pair is null when unused. */
function anthropicUsage(u: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): TokenUsage {
  return {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
  };
}

/**
 * One line per AI call, carrying both the stop reason and the token bill.
 *
 * Kept as a single line on purpose — the whole point is to be greppable in
 * Vercel by label, so a week of `[correct] usage …` lines can be summed per
 * feature. Splitting it across two log calls would make the pairing lossy.
 *
 * `usage` is null when the provider did not report it; that is logged as
 * `usage=unavailable` rather than as zeros, so a measurement gap cannot be
 * mistaken for a free call.
 */
function logStopReason(
  label: string | undefined,
  provider: Provider,
  streamed: boolean,
  stopReason: string | null,
  usage: TokenUsage | null,
): void {
  const tag = label ? `[${label}]` : "[ai-provider]";
  const tokens = usage
    ? `input=${usage.input} output=${usage.output} cache_read=${usage.cacheRead} cache_write=${usage.cacheWrite}`
    : "usage=unavailable";
  console.log(
    `${tag} provider=${provider} streamed=${streamed} stop_reason=${stopReason ?? "null"} ${tokens}`,
  );
}

/**
 * Strips a markdown code fence (```json ... ``` or ``` ... ```) that wraps
 * the ENTIRE response — models occasionally do this even when told not to.
 * Only strips when the fence wraps the whole trimmed response, so a fence
 * that's legitimately part of the content (rare, but possible) is left
 * alone. Only meaningful when jsonMode !== false — never applied to
 * plain-text output (e.g. translation), where a stray fence is left as-is.
 */
function stripCodeFences(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  return match ? match[1].trim() : content;
}

const RAW_CONTENT_LOG_LIMIT = 4000;

/** Logs the raw text the model returned, capped to avoid flooding logs. Diagnostic only. */
function logRawContent(label: string | undefined, content: string): void {
  const tag = label ? `[${label}]` : "[ai-provider]";
  const truncated = content.length > RAW_CONTENT_LOG_LIMIT;
  console.log(
    `${tag} raw content (len=${content.length}${truncated ? `, showing first ${RAW_CONTENT_LOG_LIMIT}` : ""}):`,
    content.slice(0, RAW_CONTENT_LOG_LIMIT),
  );
}

export async function createChatCompletion(
  params: ChatCompletionParams,
): Promise<{ content: string; stopReason: string | null }> {
  const provider = getProvider();

  if (provider === "anthropic") {
    const { apiKey, model, temperatureSupported } = PROVIDER_CONFIG.anthropic;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    const client = new Anthropic({ apiKey });
    const { system, rest } = splitSystem(params.messages);

    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      ...samplingParams(params, temperatureSupported),
      system: anthropicSystem(params.systemBlocks, system),
      messages: rest,
    });

    logStopReason(params.label, provider, false, response.stop_reason, anthropicUsage(response.usage));

    const rawContent = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("");
    logRawContent(params.label, rawContent);
    const content = params.jsonMode === false ? rawContent : stripCodeFences(rawContent);
    return { content, stopReason: response.stop_reason };
  }

  const { apiKey, model } = PROVIDER_CONFIG.openai;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model,
    ...samplingParams(params, PROVIDER_CONFIG.openai.temperatureSupported),
    max_tokens: params.maxTokens,
    ...(params.jsonMode === false ? {} : { response_format: { type: "json_object" as const } }),
    messages: openaiMessages(params),
  });

  const finishReason = completion.choices[0]?.finish_reason ?? null;
  logStopReason(
    params.label,
    provider,
    false,
    finishReason,
    completion.usage
      ? {
          input: completion.usage.prompt_tokens,
          output: completion.usage.completion_tokens,
          cacheRead: completion.usage.prompt_tokens_details?.cached_tokens ?? 0,
          cacheWrite: 0,
        }
      : null,
  );
  const rawOpenaiContent = completion.choices[0]?.message?.content ?? "";
  logRawContent(params.label, rawOpenaiContent);
  const openaiContent = params.jsonMode === false ? rawOpenaiContent : stripCodeFences(rawOpenaiContent);

  return { content: openaiContent, stopReason: finishReason };
}

/**
 * Returns a plain-text ReadableStream of the model's output, regardless of
 * provider, plus a `stopReason` promise that resolves once the stream ends
 * (or rejects if it errored) — callers use this to decide whether to refund
 * a consumed usage credit (e.g. stopReason === "max_tokens" means the JSON
 * was truncated) without buffering the whole response themselves.
 * The client-side stream/partial-JSON handling never needs to know which
 * provider produced the plain-text bytes.
 */
export async function createChatCompletionStream(
  params: ChatCompletionParams,
): Promise<{ stream: ReadableStream<Uint8Array>; stopReason: Promise<string | null> }> {
  const provider = getProvider();
  const encoder = new TextEncoder();
  let resolveStopReason!: (value: string | null) => void;
  let rejectStopReason!: (reason: unknown) => void;
  const stopReason = new Promise<string | null>((resolve, reject) => {
    resolveStopReason = resolve;
    rejectStopReason = reject;
  });
  /**
   * ⚠️ 捨てる用のハンドラを1本、ここで張る。消さないこと。
   *
   * ストリームが途中で切れると下の start() が rejectStopReason(err) と
   * controller.error(err) の両方を呼ぶ。呼び出し側が reader 側で先に例外を
   * 捕まえて抜けると、この promise の reject に誰もハンドラを持たないまま
   * 残る。Node の既定は --unhandled-rejections=throw なので、それは
   * uncaught exception に化けてプロセスが落ちる（Vercel なら関数インスタンス
   * ごと）。2026-09-05 に検証ハーネスが実際にこれで死んだ。
   *
   * 「呼び出し側が必ずハンドラを付ける」という規約では守れない。守れて
   * いることを検証する手段が無いし、現に破ったものが出た。ここで握る。
   *
   * 返すのは元の promise のまま。ハンドラは何本でも付くので、
   * correct/route.ts:425 の .then().catch()（返金判定）はこれまでどおり
   * reject を受け取る。挙動は変わらず、落ちなくなるだけ。
   */
  stopReason.catch(() => {});

  if (provider === "anthropic") {
    const { apiKey, model, temperatureSupported } = PROVIDER_CONFIG.anthropic;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    const client = new Anthropic({ apiKey });
    const { system, rest } = splitSystem(params.messages);

    const rawStream = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      ...samplingParams(params, temperatureSupported),
      system: anthropicSystem(params.systemBlocks, system),
      messages: rest,
      stream: true,
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let reason: string | null = null;
        let fullText = "";
        // Anthropic splits the bill across two events: message_start carries
        // the input side (and the cache pair), message_delta carries a running
        // output_tokens total. Neither alone is the whole figure.
        let usage: TokenUsage | null = null;
        try {
          for await (const event of rawStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              fullText += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            } else if (event.type === "message_start") {
              usage = anthropicUsage(event.message.usage);
            } else if (event.type === "message_delta") {
              reason = event.delta?.stop_reason ?? reason;
              // Cumulative, not incremental — assign, never add.
              const out = event.usage?.output_tokens;
              if (typeof out === "number") {
                usage = { ...(usage ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }), output: out };
              }
            }
          }
        } catch (err) {
          // Partial usage is still worth having: a stream that died after
          // message_start has already been billed for its input tokens.
          logStopReason(params.label, provider, true, "error", usage);
          logRawContent(params.label, fullText);
          rejectStopReason(err);
          controller.error(err);
          return;
        }
        logStopReason(params.label, provider, true, reason, usage);
        logRawContent(params.label, fullText);
        resolveStopReason(reason);
        controller.close();
      },
    });

    return { stream, stopReason };
  }

  const { apiKey, model } = PROVIDER_CONFIG.openai;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey });

  const rawStream = await client.chat.completions.create({
    model,
    stream: true,
    // Without this OpenAI reports no usage on a stream at all, and the log
    // would read `usage=unavailable` for every streamed call. It appends one
    // final chunk whose `choices` is empty — the loop below already reads that
    // array optionally, so the text and finish_reason paths are unaffected.
    stream_options: { include_usage: true },
    ...samplingParams(params, PROVIDER_CONFIG.openai.temperatureSupported),
    max_tokens: params.maxTokens,
    response_format: { type: "json_object" },
    messages: openaiMessages(params),
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reason: string | null = null;
      let fullText = "";
      // Arrives once, on the final chunk, and only because of stream_options
      // above. That chunk carries no choices, hence the separate branch.
      let usage: TokenUsage | null = null;
      try {
        for await (const chunk of rawStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (typeof delta === "string") {
            fullText += delta;
            controller.enqueue(encoder.encode(delta));
          }
          reason = chunk.choices[0]?.finish_reason ?? reason;
          if (chunk.usage) {
            usage = {
              input: chunk.usage.prompt_tokens,
              output: chunk.usage.completion_tokens,
              cacheRead: chunk.usage.prompt_tokens_details?.cached_tokens ?? 0,
              cacheWrite: 0,
            };
          }
        }
      } catch (err) {
        logStopReason(params.label, provider, true, "error", usage);
        logRawContent(params.label, fullText);
        rejectStopReason(err);
        controller.error(err);
        return;
      }
      logStopReason(params.label, provider, true, reason, usage);
      logRawContent(params.label, fullText);
      resolveStopReason(reason);
      controller.close();
    },
  });

  return { stream, stopReason };
}
