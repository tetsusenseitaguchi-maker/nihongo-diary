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

function logStopReason(label: string | undefined, provider: Provider, streamed: boolean, stopReason: string | null): void {
  const tag = label ? `[${label}]` : "[ai-provider]";
  console.log(`${tag} provider=${provider} streamed=${streamed} stop_reason=${stopReason ?? "null"}`);
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

    logStopReason(params.label, provider, false, response.stop_reason);

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("");
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
  logStopReason(params.label, provider, false, finishReason);

  return { content: completion.choices[0]?.message?.content ?? "", stopReason: finishReason };
}

/**
 * Returns a plain-text ReadableStream of the model's output, regardless of
 * provider. Callers pipe this straight through as the Response body — the
 * client-side stream/partial-JSON handling never needs to know which
 * provider produced it.
 */
export async function createChatCompletionStream(
  params: ChatCompletionParams,
): Promise<ReadableStream<Uint8Array>> {
  const provider = getProvider();
  const encoder = new TextEncoder();

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

    return new ReadableStream({
      async start(controller) {
        let stopReason: string | null = null;
        try {
          for await (const event of rawStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            } else if (event.type === "message_delta") {
              stopReason = event.delta?.stop_reason ?? stopReason;
            }
          }
        } catch (err) {
          logStopReason(params.label, provider, true, stopReason ?? "error");
          controller.error(err);
          return;
        }
        logStopReason(params.label, provider, true, stopReason);
        controller.close();
      },
    });
  }

  const { apiKey, model } = PROVIDER_CONFIG.openai;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey });

  const rawStream = await client.chat.completions.create({
    model,
    stream: true,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    response_format: { type: "json_object" },
    messages: params.messages,
  });

  return new ReadableStream({
    async start(controller) {
      let finishReason: string | null = null;
      try {
        for await (const chunk of rawStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (typeof delta === "string") {
            controller.enqueue(encoder.encode(delta));
          }
          finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
        }
      } catch (err) {
        logStopReason(params.label, provider, true, finishReason ?? "error");
        controller.error(err);
        return;
      }
      logStopReason(params.label, provider, true, finishReason);
      controller.close();
    },
  });
}
