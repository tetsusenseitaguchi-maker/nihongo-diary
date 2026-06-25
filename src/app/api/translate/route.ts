import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { languageDisplayName, SUPPORTED_LANGUAGES } from "@/lib/languages";

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let diaryEntryId: string | undefined;
  let requestedLang: string | undefined;
  try {
    ({ diaryEntryId, language: requestedLang } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!diaryEntryId) {
    return NextResponse.json({ error: "Missing diaryEntryId" }, { status: 400 });
  }

  // Fetch entry (RLS blocks non-owner from reading private diaries)
  const { data: entry } = await supabase
    .from("diary_entries")
    .select("id, user_id, is_public, natural_japanese, original_text, translations")
    .eq("id", diaryEntryId)
    .single();

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = entry.user_id === user.id;
  if (!isOwner && !entry.is_public) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Plan feature gate — flip translation: false in plans.ts to make it Pro-only
  const { data: prof } = await supabase
    .from("profiles")
    .select("plan, preferred_language")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(prof?.plan);
  if (!limitsFor(plan).translation) {
    return NextResponse.json(
      { error: "upgrade", message: "Translation is available on paid plans." },
      { status: 403 }
    );
  }

  // Prefer the language sent by the client (TranslateButton passes preferredLanguage
  // explicitly). Fall back to the profile's preferred_language, then to "en".
  // Validate against the supported list to reject arbitrary strings.
  const targetLang =
    (requestedLang && SUPPORTED_CODES.includes(requestedLang) ? requestedLang : null) ??
    (prof?.preferred_language && SUPPORTED_CODES.includes(prof.preferred_language as string)
      ? (prof.preferred_language as string)
      : null) ??
    "en";
  const targetDisplay = languageDisplayName(targetLang);

  // Return cached translation for this language — zero API cost
  const cached = (entry.translations as Record<string, string> | null) ?? {};
  if (cached[targetLang]) {
    return NextResponse.json({ translation: cached[targetLang], cached: true });
  }

  // Choose the most polished version of the Japanese text
  const source = ((entry.natural_japanese || entry.original_text) as string | null)?.trim();
  if (!source) {
    return NextResponse.json({ error: "No Japanese text to translate" }, { status: 400 });
  }

  // Call OpenAI (same fetch pattern as /api/correct)
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
            content: `You are a Japanese-to-${targetDisplay} translator. Translate the diary entry into natural, conversational ${targetDisplay} that preserves the writer's personal voice and emotion. Output only the translation — no explanations, no quotation marks, no preamble.`,
          },
          { role: "user", content: source },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.json().catch(() => ({}));
      console.error("[translate] OpenAI error:", err);
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

    // Persist to JSONB cache — each language translated at most once per diary
    const updated = { ...cached, [targetLang]: translation };
    await supabase
      .from("diary_entries")
      .update({ translations: updated })
      .eq("id", diaryEntryId);

    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[translate] Unexpected error:", err);
    return NextResponse.json(
      { error: "Translation service unavailable. Please try again." },
      { status: 503 }
    );
  }
}
