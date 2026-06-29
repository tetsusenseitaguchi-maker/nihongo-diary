import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { languageDisplayName, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { todayInTZ } from "@/lib/date-tz";

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

  // Daily counter — fetch plan + timezone, skip for Plus/Pro (null limit).
  const { data: prof } = await supabase
    .from("profiles")
    .select("plan, timezone")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(prof?.plan);
  const limits = limitsFor(plan);

  if (limits.translationsPerDay !== null) {
    // Timezone resolution: user_tz cookie → profile.timezone → UTC (same as /api/correct).
    const cookieStore = await cookies();
    const rawTz = cookieStore.get("user_tz")?.value;
    let tz = "UTC";
    if (rawTz) {
      try {
        const decoded = decodeURIComponent(rawTz);
        new Intl.DateTimeFormat("en-CA", { timeZone: decoded });
        tz = decoded;
      } catch { /* invalid cookie — fall through */ }
    }
    if (tz === "UTC" && prof?.timezone && prof.timezone !== "UTC") {
      try {
        new Intl.DateTimeFormat("en-CA", { timeZone: prof.timezone });
        tz = prof.timezone;
      } catch { /* invalid DB value — fall through */ }
    }
    const today = todayInTZ(tz);
    const { data: allowed, error: rpcError } = await supabase.rpc("try_use_translation", {
      p_user_id: user.id,
      p_date: today,
      p_limit: limits.translationsPerDay,
    });
    if (rpcError) {
      console.error("[translate-text] try_use_translation error:", rpcError.message);
      return NextResponse.json(
        { error: "Translation service temporarily unavailable. Please try again." },
        { status: 500 }
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "daily_translation_limit_reached", upgrade: true, plan, limit: limits.translationsPerDay },
        { status: 429 }
      );
    }
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
