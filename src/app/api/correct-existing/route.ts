import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { lessonById } from "@/lib/lessons";
import { languageDisplayName } from "@/lib/languages";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { normalizeRubyText, stripRubyText } from "@/lib/furigana";

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";

function systemPrompt(level: string, style: string, lang: string): string {
  return `You are a friendly Japanese teacher for Japanese learners.

Do not behave like a strict proofreader. Behave like a Japanese teacher who understands that learners need confidence.

Before correcting anything, ask yourself:
1. Is this actually wrong?
2. Is it unnatural for the learner's level?
3. Does changing it help the learner?
4. Will the correction change the nuance?
If the sentence is already understandable and natural enough, do not change it.

This learner's level is: ${level}
The correction style is: ${style}

You must return ONLY valid JSON. No markdown. No text outside the JSON.

Return this JSON structure:
{
  "original": "",
  "originalTextRuby": "",
  "correctedJapaneseRuby": "",
  "naturalJapaneseRuby": "",
  "englishExplanation": "",
  "correctionNote": "",
  "keyMistakes": [
    { "mistake": "", "mistakeRuby": "", "correctionRuby": "", "explanation": "" }
  ],
  "usefulVocabulary": [
    { "word": "", "reading": "", "meaning": "", "exampleRuby": "" }
  ],
  "practiceSentenceRuby": "",
  "relatedMiniLesson": { "id": 1, "shortExplanation": "", "exampleJapaneseRuby": "", "exampleEnglish": "", "shortNote": "" },
  "alternativeWords": [
    { "original": "", "alternative": "", "alternativeReading": "" }
  ],
  "diaryTitleRuby": "",
  "obieCheerRuby": ""
}

Rules:

1. Write ALL explanatory text in ${lang}. This includes: englishExplanation, correctionNote, every keyMistakes[].explanation, every usefulVocabulary[].meaning. Never explain grammar in Japanese.
   Keep ALL Japanese-language fields in Japanese. Those are learning targets — never translate them.

2. Furigana: add furigana to ALL kanji in originalTextRuby, correctedJapaneseRuby, naturalJapaneseRuby, mistakeRuby, correctionRuby, exampleRuby, and practiceSentenceRuby. Use this exact format:
<ruby>漢字<rt>かんじ</rt></ruby>
CRITICAL furigana rules:
- Put ONLY the kanji inside <ruby>, and put the kanji's reading inside <rt>. Okurigana (the hiragana that follows a kanji) MUST stay OUTSIDE the ruby tag.
- NEVER wrap hiragana or katakana in <ruby>. Only kanji get furigana.
- The reading in <rt> must be the reading of the kanji only — never repeat the kana that is already visible.

3. Furigana must be accurate and chosen from context.

4. Match the learner's level in grammar AND kanji:
- N5: mostly hiragana; only very common kanji; very simple, short grammar.
- N4: basic kanji; basic grammar (〜と思います, 〜から, 〜ので, 〜たり〜たり, 〜ている, 〜たい).
- N3: common daily kanji; more connected grammar.
- N2: natural adult Japanese.
- N1: advanced, precise Japanese, but never unnecessarily stiff.
- Natural: natural Japanese a native would write; do not simplify for JLPT.

5. Correction style:
- Light: fix only clear mistakes; keep the learner's original wording.
- Natural (default): fix mistakes and make it sound natural.
- Native: rewrite the way a native would naturally say it.

6. Do NOT over-correct natural Japanese.

7. correctedJapaneseRuby keeps the learner's structure (just fixes mistakes); naturalJapaneseRuby sounds more natural.

7b. originalTextRuby: the learner's ORIGINAL text, character-for-character identical to what they wrote — including any mistakes. Do NOT fix, reword, or improve anything here. Add ONLY furigana, following rule 2 exactly. This is purely a reading aid for the unedited original.

8. correctionNote: if the original is NOT wrong but a more natural option exists, put a short note. If nothing to add, use "".

9. keyMistakes: include only important mistakes. If none, return [].

10. usefulVocabulary: pick words from or related to the diary, at the learner's level.

11. relatedMiniLesson: choose the ONE most relevant lesson by id (1-20). If nothing clearly fits, use id 3.

12. alternativeWords: suggest exactly 3 natural synonym alternatives for words used in the diary. Focus on words a native Japanese speaker actually uses in casual conversation. For each:
- "original": the word exactly as it appears in the diary
- "alternative": the suggested replacement in dictionary/plain form
- "alternativeReading": complete hiragana reading

13. diaryTitleRuby: create ONE catchy Japanese title for this diary entry (15 chars or fewer excluding markup). Follow furigana rule 2 EXACTLY.

14. obieCheerRuby: write a short, warm, personalised message from Obie (a friendly dog mascot) reacting to the specific events or feelings described in THIS diary. Japanese with furigana following rule 2. End with 🐶.

Output must be valid JSON. No markdown, no comments, no trailing commas.`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function safeJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildLesson(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "number" ? r.id : parseInt(String(r.id ?? ""), 10);
  const base = lessonById(id) ?? lessonById(1);
  if (!base) return null;
  return {
    ...base,
    shortExplanation: str(r.shortExplanation) || base.shortExplanation,
    exampleJapaneseRuby: str(r.exampleJapaneseRuby) || base.exampleJapaneseRuby,
    exampleEnglish: str(r.exampleEnglish) || base.exampleEnglish,
    shortNote: str(r.shortNote) || base.shortNote,
  };
}

export async function POST(request: Request) {
  let body: { entryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const entryId = (body.entryId ?? "").trim();
  if (!entryId) {
    return NextResponse.json({ error: "entryId が必要です。" }, { status: 400 });
  }

  // ---- Auth ----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // ---- Fetch entry ----
  const { data: entry } = await supabase
    .from("diary_entries")
    .select("user_id, original_text, level, correction_style, corrected_japanese")
    .eq("id", entryId)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "日記が見つかりません。" }, { status: 404 });
  }
  if (entry.user_id !== user.id) {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  if (entry.corrected_japanese !== null && entry.corrected_japanese !== undefined) {
    return NextResponse.json({ error: "この日記はすでに添削済みです。" }, { status: 400 });
  }

  const text = (entry.original_text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "日記が空です。" }, { status: 400 });
  }
  const level = entry.level ?? "N4";
  const style = entry.correction_style ?? "Natural";

  // ---- Plan + usage limits ----
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, preferred_language, timezone")
    .eq("id", user.id)
    .single();
  const plan = normalizePlan(profile?.plan);

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LOCALE_COOKIE)?.value;
  const langCode = normaliseLocale(cookieLang || profile?.preferred_language || "en");
  const lang = languageDisplayName(langCode);
  const limits = limitsFor(plan);

  // Resolve timezone (same logic as /api/correct)
  const rawTz = cookieStore.get("user_tz")?.value;
  let tz = "UTC";
  if (rawTz) {
    try {
      const decoded = decodeURIComponent(rawTz);
      new Intl.DateTimeFormat("en-CA", { timeZone: decoded });
      tz = decoded;
    } catch { /* invalid cookie value */ }
  }
  if (tz === "UTC" && profile?.timezone && profile.timezone !== "UTC") {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: profile.timezone });
      tz = profile.timezone;
    } catch { /* invalid DB value */ }
  }

  // Atomically claim one correction slot
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const { data: allowed, error: rpcError } = await supabase.rpc("try_use_correction", {
    p_user_id: user.id,
    p_date: today,
    p_limit: limits.corrections,
  });
  if (rpcError) {
    console.error("[correct-existing] try_use_correction error:", rpcError.message, "code:", rpcError.code);
    return NextResponse.json(
      { error: `添削サービスで一時的なエラーが発生しました。しばらくしてから再試行してください。 [${rpcError.code ?? rpcError.message}]` },
      { status: 500 },
    );
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "daily_correction_limit_reached", upgrade: true, plan, limit: limits.corrections },
      { status: 429 },
    );
  }

  // ---- OpenAI ----
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーに OPENAI_API_KEY が設定されていません。" },
      { status: 500 },
    );
  }

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
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(level, style, lang) },
          { role: "user", content: text },
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
    const detail = await aiResponse.text().catch(() => "");
    console.error("[correct-existing] OpenAI error", aiResponse.status, detail);
    return NextResponse.json(
      { error: "AI の添削に失敗しました。少し待ってからもう一度お試しください。" },
      { status: 502 },
    );
  }

  const payload = await aiResponse.json();
  const content: string | undefined = payload?.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json(
      { error: "AI から結果を受け取れませんでした。もう一度お試しください。" },
      { status: 502 },
    );
  }

  const parsed = safeJson(content);
  if (!parsed) {
    console.error("[correct-existing] Invalid JSON from model:", content.slice(0, 500));
    return NextResponse.json(
      { error: "AI の返答を読み取れませんでした。もう一度お試しください。" },
      { status: 502 },
    );
  }

  // ---- Map AI response (same shape as saveEntry in write/page.tsx) ----
  // normalizeRubyText() sanitizes AI-generated <ruby> markup before it's
  // saved, so malformed tags never reach the DB in the first place.
  const corrected = normalizeRubyText(str(parsed.correctedJapaneseRuby) || str(parsed.correctedJapanese));
  const natural = normalizeRubyText(str(parsed.naturalJapaneseRuby) || str(parsed.naturalJapanese));
  const originalRuby = normalizeRubyText(str(parsed.originalTextRuby));

  const keyMistakes = Array.isArray(parsed.keyMistakes)
    ? (parsed.keyMistakes as Record<string, unknown>[]).map((m) => ({
        before: normalizeRubyText(str(m?.mistakeRuby) || str(m?.mistake)),
        after: normalizeRubyText(str(m?.correctionRuby) || str(m?.correction)),
        note: str(m?.explanation),
      }))
    : [];

  const grammarFocus = (() => {
    const km = (Array.isArray(parsed.keyMistakes) ? parsed.keyMistakes as Record<string, unknown>[] : [])[0];
    if (!km || !km.mistake) return null;
    return {
      before: normalizeRubyText(str(km.mistakeRuby) || str(km.mistake)),
      after: normalizeRubyText(str(km.correctionRuby)),
      note: str(km.explanation),
    };
  })();

  const usefulVocabulary = Array.isArray(parsed.usefulVocabulary)
    ? (parsed.usefulVocabulary as Record<string, unknown>[]).map((v) => ({
        word: str(v?.word),
        reading: str(v?.reading),
        meaning: str(v?.meaning),
        example: normalizeRubyText(str(v?.exampleRuby) || str(v?.example)),
      }))
    : [];

  const alternativeWords = Array.isArray(parsed.alternativeWords)
    ? (parsed.alternativeWords as Record<string, unknown>[])
        .map((a) => ({
          original: str(a?.original),
          alternative: str(a?.alternative),
          alternativeReading: str(a?.alternativeReading),
        }))
        .filter((a) => a.original && a.alternative)
    : [];

  const diaryTitleRaw = str(parsed.diaryTitleRuby);
  const diaryTitle = diaryTitleRaw ? stripRubyText(diaryTitleRaw) || null : null;

  // ---- UPDATE diary entry ----
  const updatePayload: Record<string, unknown> = {
    corrected_japanese: corrected,
    natural_japanese: natural,
    original_text_ruby: originalRuby || null,
    english_explanation: str(parsed.englishExplanation),
    correction_note: str(parsed.correctionNote),
    key_mistakes: keyMistakes,
    grammar_focus: grammarFocus,
    useful_vocabulary: usefulVocabulary,
    practice_sentence: normalizeRubyText(str(parsed.practiceSentenceRuby) || str(parsed.practiceSentence)),
  };

  if (diaryTitle) {
    updatePayload.title = diaryTitle;
  }

  if (alternativeWords.length > 0) {
    updatePayload.alternative_words = alternativeWords;
  }

  const relatedMiniLesson = buildLesson(parsed.relatedMiniLesson);
  if (relatedMiniLesson) {
    // Store in grammar_focus as a supplemental field (matches how write page treats it)
    // Note: relatedMiniLesson is not a DB column; we store only grammar_focus from it
  }

  const { error: updateError } = await supabase
    .from("diary_entries")
    .update(updatePayload)
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[correct-existing] update error:", updateError.message);
    return NextResponse.json(
      { error: `保存に失敗しました: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
