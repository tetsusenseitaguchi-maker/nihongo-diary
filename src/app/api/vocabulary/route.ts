import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plans";
import { languageDisplayName } from "@/lib/languages";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";
const FREE_VOCAB_LIMIT = 3;

// ------------------------------------------------------------------ GET

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("vocabulary_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

// ------------------------------------------------------------------ POST

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { word, reading, jlptLevel } = body as {
    word?: string;
    reading?: string;
    jlptLevel?: string;
  };
  if (!word || typeof word !== "string" || !reading || typeof reading !== "string") {
    return NextResponse.json({ error: "Missing word or reading" }, { status: 400 });
  }

  // ---- Plan check: Free users capped at FREE_VOCAB_LIMIT entries ----
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, preferred_language")
    .eq("id", user.id)
    .single();
  const plan = normalizePlan(profile?.plan);

  if (plan === "free") {
    const { count } = await supabase
      .from("vocabulary_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= FREE_VOCAB_LIMIT) {
      return NextResponse.json(
        { error: "vocab_limit_reached", upgrade: true, limit: FREE_VOCAB_LIMIT },
        { status: 403 },
      );
    }
  }

  // ---- Locale for AI-generated content ----
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LOCALE_COOKIE)?.value;
  const lang = languageDisplayName(
    normaliseLocale(cookieLang || profile?.preferred_language || "en"),
  );

  // ---- AI generation ----
  let meaning = "";
  let example_jp_ruby = "";
  let example_translation = "";
  let practice_question = "";
  let practice_answer = word;

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        max_tokens: 400,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: `You are a Japanese language teacher. Generate study content for this Japanese word.

Word: ${word}
Reading (hiragana): ${reading}
${jlptLevel ? `JLPT Level: ${jlptLevel}` : ""}

Return ONLY a JSON object (no markdown):
{
  "meaning": "Clear 1-sentence definition in ${lang}",
  "example_jp_ruby": "Short natural Japanese sentence using the word. Wrap every KANJI character group with <ruby>kanji<rt>hiragana</rt></ruby>. Do NOT add ruby to hiragana or katakana.",
  "example_translation": "Translation of the example in ${lang}",
  "practice_question": "Japanese sentence where the target word is replaced by ___. Add <ruby> tags to other kanji in the sentence.",
  "practice_answer": "The word or phrase that fills the blank"
}`,
          },
        ],
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      meaning = String(parsed.meaning ?? "").trim();
      example_jp_ruby = String(parsed.example_jp_ruby ?? "").trim();
      example_translation = String(parsed.example_translation ?? "").trim();
      practice_question = String(parsed.practice_question ?? "").trim();
      practice_answer = String(parsed.practice_answer ?? word).trim();
    } catch {
      // AI failure is non-fatal — save the word with an empty meaning fallback.
    }
  }

  // ---- Insert ----
  const { data, error } = await supabase
    .from("vocabulary_entries")
    .insert({
      user_id: user.id,
      word,
      reading,
      jlpt_level: jlptLevel ?? null,
      meaning: meaning || word,
      example_jp_ruby: example_jp_ruby || null,
      example_translation: example_translation || null,
      practice_question: practice_question || null,
      practice_answer: practice_answer || null,
    })
    .select()
    .single();

  if (error?.code === "23505") {
    return NextResponse.json({ error: "already_saved" }, { status: 409 });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
