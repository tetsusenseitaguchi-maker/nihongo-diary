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

interface ChatCompletionParams {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens: number;
  /** Set to false for plain-text output (e.g. translation). Defaults to true. */
  jsonMode?: boolean;
  /** Short tag (e.g. "correct", "mini-lesson-drills") prefixed to the stop-reason server log. */
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
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: "claude-haiku-4-5",
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
    const { apiKey, model } = PROVIDER_CONFIG.anthropic;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    const client = new Anthropic({ apiKey });
    const { system, rest } = splitSystem(params.messages);

    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      system,
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
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    ...(params.jsonMode === false ? {} : { response_format: { type: "json_object" as const } }),
    messages: params.messages,
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

  if (provider === "anthropic") {
    const { apiKey, model } = PROVIDER_CONFIG.anthropic;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    const client = new Anthropic({ apiKey });
    const { system, rest } = splitSystem(params.messages);

    const rawStream = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      system,
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
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    response_format: { type: "json_object" },
    messages: params.messages,
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
