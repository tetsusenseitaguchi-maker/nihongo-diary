import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { lessonById } from "@/lib/lessons";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { languageDisplayName } from "@/lib/languages";
import { fixMasuIncompatibleBlank, ensureAnswerInChoices } from "@/lib/drills";
import { createChatCompletion, missingApiKeyError } from "@/lib/ai-provider";

export const runtime = "nodejs";

function systemPrompt(level: string, lang: string): string {
  return `You are a Japanese language drill generator for a learning app.
Generate exactly 5 practice drills for a specific grammar mini lesson. The student's level is: ${level}.

Drill types (use the exact string value):
- "fill-in"         — blank fill; mark the blank as ___
- "particle-choice" — choose the correct particle (は/が/を/に/で/と/も/へ/から/まで/より)
- "desu-masu"       — choose です or ます (or their conjugated forms)
- "reorder"         — reorder the given words into a correct sentence; put shuffled words in choices
- "rewrite"         — rewrite the given unnatural phrase naturally; choices = []

Rules:
1. Vary the drill types across the 5 drills.
2. All Japanese fields require furigana on every kanji using EXACTLY this format:
   <ruby>漢字<rt>かんじ</rt></ruby>
   - question: plain text (no ruby). questionRuby: with <ruby> tags.
   - answer: plain text. answerRuby: with <ruby> tags.
   - choices: plain text strings (no ruby tags).
   - When a kanji is immediately followed by okurigana (the hiragana that completes a verb/adjective stem, e.g. 歩きました, 珍しい), it MUST use its kun'yomi (訓読み) reading — never the on'yomi (音読み) — and <rt> must contain the FULL kun'yomi reading, not a truncated single-mora guess. Correct: <ruby>歩<rt>ある</rt></ruby>きました, <ruby>珍<rt>めずら</rt></ruby>しい. Wrong: <ruby>歩<rt>あ</rt></ruby>きました (truncated reading), <ruby>珍<rt>ちん</rt></ruby>しい (on'yomi used instead of kun'yomi).
   - Grammaticalized auxiliary verbs after the て-form (補助動詞) — てくる,
     ていく, てある, ておく, てみる, てしまう — should be written in
     hiragana, not kanji (write てくる, NOT て来る; ていく, NOT て行く),
     since this reflects their grammaticalized meaning, even though 来る/
     行く are otherwise common kanji at this level.
3. englishExplanation: one clear ${lang} sentence explaining why the answer is correct.
4. choices:
   - fill-in: EXACTLY 2 options — the correct answer plus ONE plausible
     wrong answer. Both must be complete, well-formed words/phrases
     (never a truncated fragment like "行ってき"), and must be distinct
     strings from each other.
   - particle-choice / desu-masu: 3–4 options, all distinct from each other.
   - reorder: shuffled words. rewrite: [].
   - For every drill type that has choices, the array MUST include a
     string that is character-for-character identical to "answer" — same
     kanji/hiragana notation, not just the same reading (e.g. if answer
     is "行ってきました", a choice must be "行ってきました", not "行って
     来ました").
5. Keep every drill appropriate for ${level} level. Make them directly test the lesson's grammar point.
6. Grammatical consistency (fill-in especially): the fixed text immediately before and after the blank — including the sentence ending — must connect naturally with the answer's actual grammatical form. Some forms cannot be directly followed by ます, such as 〜そう (様態/looks-like), 〜らしい, 〜ようだ, and 〜みたいだ. If the correct answer is (or ends in) one of these forms, do NOT end the sentence in ます — instead end it in です, or rewrite the whole sentence so the fixed text around the blank fits that form naturally. Before finalizing each fill-in drill, mentally fill in the blank and confirm the complete sentence reads as natural, grammatical Japanese.
7. Return ONLY valid JSON. No markdown, no text outside the JSON. Do NOT wrap the JSON in a markdown code block (no \`\`\`json, no \`\`\`).

JSON structure:
{
  "lessonTitle": "",
  "drills": [
    {
      "type": "",
      "question": "",
      "questionRuby": "",
      "choices": [],
      "answer": "",
      "answerRuby": "",
      "englishExplanation": ""
    }
  ]
}`;
}

export async function POST(request: Request) {
  let body: { lessonId?: number; level?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "number" ? body.lessonId : Number(body.lessonId ?? 1);
  const level = (body.level ?? "N4").trim();

  const lesson = lessonById(lessonId);
  if (!lesson) {
    return NextResponse.json({ error: "指定されたレッスンが見つかりません。" }, { status: 400 });
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // Plan check — reviewDrills flag must be true
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, preferred_language")
    .eq("id", user.id)
    .single();
  const plan = normalizePlan(profile?.plan);

  // Cookie-first locale resolution (same as /api/correct)
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LOCALE_COOKIE)?.value;
  const langCode = normaliseLocale(cookieLang || profile?.preferred_language || "en");
  const lang = languageDisplayName(langCode);
  if (!limitsFor(plan).reviewDrills) {
    return NextResponse.json(
      { error: "この機能は Pro プラン以上で使えます。" },
      { status: 403 },
    );
  }

  const missingKeyError = missingApiKeyError();
  if (missingKeyError) {
    return NextResponse.json({ error: missingKeyError }, { status: 500 });
  }

  // Build the lesson context to inject into the user message
  const lessonContext = `MINI LESSON TO PRACTICE:
Title: ${lesson.title}
Explanation: ${lesson.shortExplanation}
Visual image: ${lesson.visualImage}
Example Japanese: ${lesson.exampleJapanese}
Example English: ${lesson.exampleEnglish}
Note: ${lesson.shortNote}

Generate 5 drills that directly test understanding of this lesson's grammar point.`;

  let content: string;
  try {
    const result = await createChatCompletion({
      label: "mini-lesson-drills",
      temperature: 0.5,
      maxTokens: 4000,
      messages: [
        { role: "system", content: systemPrompt(level, lang) },
        { role: "user", content: lessonContext },
      ],
    });
    content = result.content;
  } catch (err) {
    console.error("[mini-lesson-drills] AI error:", err);
    return NextResponse.json(
      { error: "AI の問題生成に失敗しました。少し待ってからもう一度お試しください。" },
      { status: 502 },
    );
  }

  if (!content) {
    return NextResponse.json(
      { error: "AI から結果を受け取れませんでした。" },
      { status: 502 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json(
      { error: "AI の返答を読み取れませんでした。" },
      { status: 502 },
    );
  }

  const drills = Array.isArray(parsed.drills)
    ? parsed.drills.map((d: Record<string, unknown>) =>
        ensureAnswerInChoices(
          fixMasuIncompatibleBlank({
            type: String(d?.type ?? "fill-in"),
            question: String(d?.question ?? ""),
            questionRuby: String(d?.questionRuby ?? ""),
            choices: Array.isArray(d?.choices) ? (d.choices as unknown[]).map(String) : [],
            answer: String(d?.answer ?? ""),
            answerRuby: String(d?.answerRuby ?? ""),
            englishExplanation: String(d?.englishExplanation ?? ""),
          }),
        ),
      )
    : [];

  return NextResponse.json({ lessonTitle: lesson.title, drills });
}
