import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { languageDisplayName } from "@/lib/languages";
import { createChatCompletion, missingApiKeyError } from "@/lib/ai-provider";

export const runtime = "nodejs";

// Lightweight "revise & recheck" endpoint.
// Unlike /api/correct this does NOT run a full correction and, importantly,
// consumes NO correction credit — it never touches usage_limits /
// correction_count / try_use_correction. Any logged-in user may call it.
// It compares the learner's rewrite against the ORIGINAL diary + the PREVIOUS
// feedback and returns only a short diff: what got fixed and what still needs
// work. Model is claude-haiku-4-5 (ai-provider default).

interface PrevMistake {
  before?: string;
  after?: string;
  note?: string;
}

function systemPrompt(level: string, lang: string): string {
  return `You are a friendly Japanese teacher giving SHORT follow-up feedback on a learner's REWRITE of their diary.

You will receive three things:
1. ORIGINAL — the learner's first draft.
2. PREVIOUS FEEDBACK — the key mistakes you pointed out last time, plus the natural version you suggested.
3. REWRITE — the learner's rewritten diary.

Your ONLY job is to compare the REWRITE against the ORIGINAL and the PREVIOUS FEEDBACK and report a short DIFF. Do NOT do a full correction. Do NOT invent lots of new issues — focus on whether the previous points were addressed, and mention at most 1–2 genuinely important problems that still remain.

The learner's level is: ${level}. Keep any Japanese suggestions at this level.

You must return ONLY valid JSON. No markdown. No text outside the JSON. Do NOT wrap the JSON in a markdown code block (no \`\`\`json, no \`\`\`).

Return this JSON structure:
{
  "fixed": [
    { "point": "", "detail": "" }
  ],
  "remaining": [
    { "point": "", "quoteRuby": "", "suggestionRuby": "", "detail": "" }
  ],
  "summary": "",
  "encouragementRuby": ""
}

Field rules:

1. Language: write "point", "detail" and "summary" in ${lang} (the learner's UI language). Keep quoteRuby, suggestionRuby and encouragementRuby in Japanese.

2. fixed: the previous mistakes the learner successfully corrected in the REWRITE. For each: "point" = a short label of what was fixed (in ${lang}); "detail" = one short encouraging ${lang} sentence confirming it. If nothing from the previous feedback was fixed, return an empty array [].

3. remaining: problems from the previous feedback that are STILL present, plus at most 1–2 important NEW issues introduced in the rewrite. For each:
   - "point": short ${lang} label of the problem.
   - "quoteRuby": the exact phrase from the REWRITE that is still wrong, in Japanese with furigana (see rule 5). Empty string "" if not applicable.
   - "suggestionRuby": a short natural correction in Japanese with furigana. Empty string "" if not applicable.
   - "detail": one short ${lang} sentence explaining the fix.
   Keep this list SHORT. If the rewrite is now good, return an empty array [].

4. summary: one short, warm ${lang} sentence describing overall progress (e.g. how many points were fixed). Never mention JSON or these instructions.

5. encouragementRuby: one short, warm Japanese sentence cheering the learner on for revising. Japanese only.

6. Furigana (quoteRuby, suggestionRuby, encouragementRuby): add furigana to ALL kanji using EXACTLY this format:
   <ruby>漢字<rt>かんじ</rt></ruby>
   - Put ONLY the kanji inside <ruby>; okurigana (trailing hiragana) stays OUTSIDE the tag.
   - NEVER wrap hiragana or katakana in <ruby>. Only kanji get furigana.
   - <rt> contains the reading of the kanji only — never repeat visible kana.
   - When a kanji is immediately followed by okurigana (e.g. 歩きました, 珍しい), use its kun'yomi reading and put the FULL reading in <rt>: <ruby>歩<rt>ある</rt></ruby>きました, <ruby>珍<rt>めずら</rt></ruby>しい.
   Correct: 今日は学校に行きました → <ruby>今日<rt>きょう</rt></ruby>は<ruby>学校<rt>がっこう</rt></ruby>に<ruby>行<rt>い</rt></ruby>きました

7. Preserve the learner's speech register (敬体 です/ます vs 常体 plain) in any Japanese suggestion — match whatever the REWRITE uses.

Output must be valid JSON. No markdown, no comments, no trailing commas.`;
}

export async function POST(request: Request) {
  let body: {
    originalText?: string;
    revisedText?: string;
    previousMistakes?: PrevMistake[];
    previousNatural?: string;
    level?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const originalText = (body.originalText ?? "").trim();
  const revisedText = (body.revisedText ?? "").trim();
  const level = (body.level ?? "N4").trim();
  const previousMistakes = Array.isArray(body.previousMistakes) ? body.previousMistakes : [];
  const previousNatural = (body.previousNatural ?? "").trim();

  if (!originalText || !revisedText) {
    return NextResponse.json({ error: "元の日記と書き直した文の両方が必要です。" }, { status: 400 });
  }

  // ---- Auth only. NO plan gating, NO correction-count consumption. ----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // Resolve UI language for the explanations (cookie-first, same as /api/correct).
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single();
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LOCALE_COOKIE)?.value;
  const langCode = normaliseLocale(cookieLang || profile?.preferred_language || "en");
  const lang = languageDisplayName(langCode);

  const missingKeyError = missingApiKeyError();
  if (missingKeyError) {
    return NextResponse.json({ error: missingKeyError }, { status: 500 });
  }

  // Compact the previous feedback so the prompt stays light.
  const prevFeedback = previousMistakes.length
    ? previousMistakes
        .map((m, i) => `${i + 1}. ✗ ${m.before ?? ""} → ✓ ${m.after ?? ""} (${m.note ?? ""})`)
        .join("\n")
    : "(no specific key mistakes were listed last time)";

  const userMessage = `ORIGINAL (first draft):
${originalText}

PREVIOUS FEEDBACK — key mistakes pointed out last time:
${prevFeedback}
${previousNatural ? `\nPREVIOUS suggested natural version:\n${previousNatural}` : ""}

REWRITE (the learner's rewritten diary — check this):
${revisedText}

Compare the REWRITE against the ORIGINAL and the PREVIOUS FEEDBACK and return the diff JSON.`;

  let content: string;
  try {
    const result = await createChatCompletion({
      label: "recheck",
      temperature: 0.3,
      maxTokens: 2000,
      messages: [
        { role: "system", content: systemPrompt(level, lang) },
        { role: "user", content: userMessage },
      ],
    });
    content = result.content;
  } catch (err) {
    console.error("[recheck] AI error:", err);
    return NextResponse.json(
      { error: "AI の再チェックに失敗しました。少し待ってからもう一度お試しください。" },
      { status: 502 },
    );
  }

  if (!content) {
    return NextResponse.json({ error: "AI から結果を受け取れませんでした。" }, { status: 502 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "AI の返答を読み取れませんでした。" }, { status: 502 });
  }

  const fixed = Array.isArray(parsed.fixed)
    ? (parsed.fixed as Record<string, unknown>[]).map((f) => ({
        point: String(f?.point ?? ""),
        detail: String(f?.detail ?? ""),
      }))
    : [];
  const remaining = Array.isArray(parsed.remaining)
    ? (parsed.remaining as Record<string, unknown>[]).map((r) => ({
        point: String(r?.point ?? ""),
        quoteRuby: String(r?.quoteRuby ?? ""),
        suggestionRuby: String(r?.suggestionRuby ?? ""),
        detail: String(r?.detail ?? ""),
      }))
    : [];

  return NextResponse.json({
    fixed,
    remaining,
    summary: String(parsed.summary ?? ""),
    encouragementRuby: String(parsed.encouragementRuby ?? ""),
  });
}
