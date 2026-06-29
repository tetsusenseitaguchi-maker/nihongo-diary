import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { languageDisplayName, SUPPORTED_LANGUAGES } from "@/lib/languages";

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";

// POST { text: string, language: string }
// Lightweight translation for short texts (comments, excerpts).
// Auth required; no plan gate, no DB caching.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let text: string | undefined;
  let language: string | undefined;
  try {
    ({ text, language } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!text?.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const targetLang = language && SUPPORTED_CODES.includes(language) ? language : "en";
  const targetDisplay = languageDisplayName(targetLang);

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a Japanese-to-${targetDisplay} translator. Translate the text into natural, conversational ${targetDisplay}. Output only the translation — no explanations, no quotation marks, no preamble.`,
          },
          { role: "user", content: text.trim() },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json(
        { error: "Translation service error. Please try again." },
        { status: 503 }
      );
    }

    const aiData = await aiRes.json();
    const translation: string = aiData.choices?.[0]?.message?.content?.trim() ?? "";

    if (!translation) {
      return NextResponse.json({ error: "Translation returned empty." }, { status: 500 });
    }

    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json(
      { error: "Translation service unavailable. Please try again." },
      { status: 503 }
    );
  }
}
