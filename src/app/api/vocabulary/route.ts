import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plans";
import { languageDisplayName } from "@/lib/languages";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { createChatCompletion, missingApiKeyError } from "@/lib/ai-provider";

export const runtime = "nodejs";

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
  const { word, reading, jlptLevel, entryType, explanation, exampleRuby } = body as {
    word?: string;
    reading?: string;
    jlptLevel?: string;
    entryType?: string;
    explanation?: string;
    exampleRuby?: string;
  };

  const type = entryType === "grammar" ? "grammar" : "word";

  if (!word || typeof word !== "string") {
    return NextResponse.json({ error: "Missing word" }, { status: 400 });
  }
  if (type === "word" && (!reading || typeof reading !== "string")) {
    return NextResponse.json({ error: "Missing reading" }, { status: 400 });
  }

  // ---- Plan check: Free users capped at FREE_VOCAB_LIMIT total entries (words + grammar) ----
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

  if (!missingApiKeyError()) {
    try {
      if (type === "grammar") {
        // For grammar entries, meaning and example are already provided.
        // AI only generates translation + practice.
        meaning = explanation || word;
        example_jp_ruby = exampleRuby || "";

        const result = await createChatCompletion({
          label: "vocabulary-grammar",
          maxTokens: 300,
          temperature: 0.7,
          messages: [
            {
              role: "user",
              content: `You are a Japanese language teacher. Generate practice content for this Japanese grammar pattern.

Grammar pattern: ${word}
Explanation: ${explanation || ""}
Example sentence (with ruby furigana HTML): ${exampleRuby || ""}

Return ONLY a JSON object (no markdown):
{
  "example_translation": "Translation of the example sentence into ${lang}",
  "practice_question": "A short Japanese sentence that demonstrates the grammar pattern, where the pattern itself is replaced by ___. Add <ruby>kanji<rt>reading</rt></ruby> tags to ALL kanji in the sentence. Do NOT wrap hiragana or katakana.",
  "practice_answer": "The grammar pattern that fills the blank (e.g. 〜てから)"
}`,
            },
          ],
        });
        const parsed = JSON.parse(result.content || "{}");
        example_translation = String(parsed.example_translation ?? "").trim();
        practice_question = String(parsed.practice_question ?? "").trim();
        practice_answer = String(parsed.practice_answer ?? word).trim();
      } else {
        // Vocabulary word generation (existing logic)
        const result = await createChatCompletion({
          label: "vocabulary-word",
          maxTokens: 400,
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
        const parsed = JSON.parse(result.content || "{}");
        meaning = String(parsed.meaning ?? "").trim();
        example_jp_ruby = String(parsed.example_jp_ruby ?? "").trim();
        example_translation = String(parsed.example_translation ?? "").trim();
        practice_question = String(parsed.practice_question ?? "").trim();
        practice_answer = String(parsed.practice_answer ?? word).trim();
      }
    } catch {
      // AI failure is non-fatal — save with available data.
      if (type === "grammar") {
        meaning = explanation || word;
        example_jp_ruby = exampleRuby || "";
      }
    }
  } else if (type === "grammar") {
    meaning = explanation || word;
    example_jp_ruby = exampleRuby || "";
  }

  // ---- Insert ----
  const { data, error } = await supabase
    .from("vocabulary_entries")
    .insert({
      user_id: user.id,
      word,
      reading: reading || "",
      jlpt_level: jlptLevel ?? null,
      meaning: meaning || word,
      example_jp_ruby: example_jp_ruby || null,
      example_translation: example_translation || null,
      practice_question: practice_question || null,
      practice_answer: practice_answer || null,
      entry_type: type,
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
