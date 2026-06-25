import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { lessonById } from "@/lib/lessons";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { languageDisplayName } from "@/lib/languages";

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";

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
3. englishExplanation: one clear ${lang} sentence explaining why the answer is correct.
4. choices: 3–4 options for fill-in/particle-choice/desu-masu; shuffled words for reorder; [] for rewrite.
5. Keep every drill appropriate for ${level} level. Make them directly test the lesson's grammar point.
6. Return ONLY valid JSON. No markdown, no text outside the JSON.

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーに OPENAI_API_KEY が設定されていません。" },
      { status: 500 },
    );
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

  let aiResponse: Response;
  try {
    aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(level, lang) },
          { role: "user", content: lessonContext },
        ],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "AI サーバーに接続できませんでした。もう一度お試しください。" },
      { status: 502 },
    );
  }

  if (!aiResponse.ok) {
    return NextResponse.json(
      { error: "AI の問題生成に失敗しました。少し待ってからもう一度お試しください。" },
      { status: 502 },
    );
  }

  const payload = await aiResponse.json();
  const content: string | undefined = payload?.choices?.[0]?.message?.content;
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
    ? parsed.drills.map((d: Record<string, unknown>) => ({
        type: String(d?.type ?? "fill-in"),
        question: String(d?.question ?? ""),
        questionRuby: String(d?.questionRuby ?? ""),
        choices: Array.isArray(d?.choices) ? (d.choices as unknown[]).map(String) : [],
        answer: String(d?.answer ?? ""),
        answerRuby: String(d?.answerRuby ?? ""),
        englishExplanation: String(d?.englishExplanation ?? ""),
      }))
    : [];

  return NextResponse.json({ lessonTitle: lesson.title, drills });
}
