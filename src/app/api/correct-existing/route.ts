import { NextResponse, after } from "next/server";
import { cookies } from "next/headers";
// Learned Items の照合。サーバー内なので HTTP で自分を叩き直さず、
// export された POST をそのまま呼ぶ（scan 側のロジックは無変更）。
import { POST as scanLearned } from "@/app/api/learned/scan/route";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { languageDisplayName } from "@/lib/languages";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { parseCorrectionPayload, correctionToDbColumns } from "@/lib/correction-payload";
import { createChatCompletion, missingApiKeyError } from "@/lib/ai-provider";
import { refundCorrection } from "@/lib/correction-refund";
import * as PROMPT from "@/lib/correction-prompt";

export const runtime = "nodejs";

function systemPrompt(
  level: string,
  style: string,
  lang: string,
  includeDrills: boolean,
  includeMiniLesson: boolean,
): string {
  // ドリルとミニレッスンは有料プランの機能。Free ではスキーマからもルールからも
  // 外すので、モデルは生成せず、出力トークンも払わない。
  //
  // ⚠️ 2つのフラグは連動させること。ドリルのルールが「relatedMiniLesson の
  // トピックに基づけ」と書いているので、片方だけ有効にすると、もう要求して
  // いないフィールドを指すプロンプトになる。
  //
  // ⚠️ 断片は /api/correct と共有している（lib/correction-prompt.ts）。ここに
  // 文字列をコピーし直さないこと — 2つの systemPrompt は以前ドリフトした
  // 実績がある（下の「Map AI response」のコメント参照）。
  const drillsSchema = PROMPT.drillsSchema(includeDrills);
  const drillsInRule1 = PROMPT.drillsInRule1(includeDrills);
  const miniLessonInRule1 = PROMPT.miniLessonInRule1(includeMiniLesson);
  const miniLessonSchema = PROMPT.miniLessonSchema(includeMiniLesson);
  const drillsRule = PROMPT.drillsRule(includeDrills, lang);
  const miniLessonRule = PROMPT.miniLessonRule(includeMiniLesson, lang);
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

You must return ONLY valid JSON. No markdown. No text outside the JSON. Do NOT wrap the JSON in a markdown code block (no \`\`\`json, no \`\`\`).

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
${miniLessonSchema}${drillsSchema}  "alternativeWords": [
    { "original": "", "alternative": "", "alternativeReading": "" }
  ],
  "diaryTitleRuby": "",
  "obieCheerRuby": ""
}

Rules:

1. Write ALL explanatory text in ${lang}. This includes: englishExplanation, correctionNote, every keyMistakes[].explanation, every usefulVocabulary[].meaning${drillsInRule1}${miniLessonInRule1}. Never explain grammar in Japanese.
   Keep ALL Japanese-language fields in Japanese. Those are learning targets — never translate them.
   NEVER put a <ruby> tag in ANY of the explanatory fields listed above. Furigana belongs ONLY in the *Ruby fields named in rule 2. When an explanation quotes Japanese, write it as plain kanji and kana: 「今日は」, NEVER 「<ruby>今日<rt>きょう</rt></ruby>は」. The same holds for alternativeWords[].original — that is a plain Japanese label, never furigana markup.
   NEVER name a JSON field in ANY explanatory text. Field names (naturalJapaneseRuby, correctedJapaneseRuby, correctedJapanese, keyMistakes, usefulVocabulary, practiceSentenceRuby, diaryTitleRuby, and every other key in the structure above) belong to this response format alone. The learner never sees the JSON — to them these names are meaningless jargon. Refer to each part the way a teacher would, in ${lang}: "the natural version" (NOT naturalJapaneseRuby), "the correction" (NOT correctedJapaneseRuby), "the practice sentence" (NOT practiceSentenceRuby), "the words below" (NOT usefulVocabulary).
   Wrong: "In the naturalJapaneseRuby, I've combined some ideas."
   Right: "In the natural version, I've combined some ideas."

2. Furigana: add furigana to ALL kanji in originalTextRuby, correctedJapaneseRuby, naturalJapaneseRuby, mistakeRuby, correctionRuby, exampleRuby, and practiceSentenceRuby. Use this exact format:
<ruby>漢字<rt>かんじ</rt></ruby>
CRITICAL furigana rules:
- Put ONLY the kanji inside <ruby>, and put the kanji's reading inside <rt>. Okurigana (the hiragana that follows a kanji) MUST stay OUTSIDE the ruby tag.
- NEVER wrap hiragana or katakana in <ruby>. Only kanji get furigana.
- The reading in <rt> must be the reading of the kanji only — never repeat the kana that is already visible.
- When a kanji is immediately followed by okurigana (the hiragana that completes a verb/adjective stem, e.g. 歩きました, 珍しい), it MUST use its kun'yomi (訓読み) reading — never the on'yomi (音読み) — and <rt> must contain the FULL kun'yomi reading, not a truncated single-mora guess. Correct: <ruby>歩<rt>ある</rt></ruby>きました, <ruby>珍<rt>めずら</rt></ruby>しい. Wrong: <ruby>歩<rt>あ</rt></ruby>きました (truncated reading), <ruby>珍<rt>ちん</rt></ruby>しい (on'yomi used instead of kun'yomi).

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

5b. Speech register (敬体/常体): Detect whether the learner's original text is written in polite/desu-masu form (敬体: です/ます) or plain/casual form (常体: だ・である・plain verb endings). Preserve that SAME register in BOTH correctedJapaneseRuby and naturalJapaneseRuby — this applies at every correction style, including Native.
- If the original is 敬体 (です/ます), keep every sentence in です/ます. Do NOT introduce plain/casual endings (だ, けど, 〜んだ as a sentence-final form, etc.) even if they would sound "more natural" in isolation.
- If the original is 常体 (plain/casual), keep it plain/casual. Do NOT switch to です/ます.
- Never mix registers within the same passage. If the learner's own text mixes registers inconsistently, pick the DOMINANT register (whichever appears more) and normalize naturalJapaneseRuby to that one register; correctedJapaneseRuby should still just fix clear mistakes without forcing a register change.

6. Do NOT over-correct natural Japanese.

7. correctedJapaneseRuby keeps the learner's structure (just fixes mistakes); naturalJapaneseRuby sounds more natural.

7b. originalTextRuby: the learner's ORIGINAL text, character-for-character identical to what they wrote — including any mistakes. Do NOT fix, reword, or improve anything here. Add ONLY furigana, following rule 2 exactly. This is purely a reading aid for the unedited original.

8. correctionNote: if the original is NOT wrong but a more natural option exists, put a short note. If nothing to add, use "".

9. keyMistakes: include only important mistakes. If none, return [].

10. usefulVocabulary: pick words from or related to the diary, at the learner's level. "word": plain dictionary form with kanji as written (e.g. "公園", "歩く"). "reading": complete hiragana reading including okurigana (e.g. "こうえん", "あるく").
CRITICAL — "reading" is NOT written the way <rt> is. <rt> carries the reading of the KANJI only, because the okurigana is already visible next to it (<ruby>歩<rt>ある</rt></ruby>きます). "reading" is a standalone field with no kanji beside it, so it must spell out the WHOLE word, okurigana included: 歩く → "あるく" (NEVER "ある"), 待つ → "まつ" (NEVER "ま"), 新しい → "あたらしい" (NEVER "あたら"). Do not carry rule 2's kanji-only habit into this field. Check every reading by reading it aloud on its own: if it is not a pronounceable whole word, it is wrong. This applies identically to alternativeWords[].alternativeReading.

${drillsRule}${miniLessonRule}13. alternativeWords: suggest exactly 3 natural synonym alternatives for words used in the diary. Focus on words a native Japanese speaker actually uses in casual conversation. For each:
- "original": the word exactly as it appears in the diary
- "alternative": the suggested replacement in dictionary/plain form
- "alternativeReading": complete hiragana reading

14. diaryTitleRuby: create ONE catchy Japanese title for this diary entry (15 chars or fewer excluding markup). Follow furigana rule 2 EXACTLY.

15. obieCheerRuby: write a short, warm, personalised message from Obie (a friendly dog mascot) reacting to the specific events or feelings described in THIS diary. Japanese with furigana following rule 2. End with 🐶.

Output must be valid JSON. No markdown, no comments, no trailing commas.`;
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

  // ①（/api/correct）と同じ判定。ここまで relatedMiniLesson を全プランに
  // 無条件生成していて、しかも保存も返却もせず捨てていた。Free では生成自体を
  // 止める。2つのフラグが連動する理由は systemPrompt のコメントに書いてある。
  const includeDrills = plan !== "free";
  const includeMiniLesson = plan !== "free";

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

  // ---- AI provider (OpenAI or Anthropic, switched via AI_PROVIDER) ----
  // From here on, a correction slot has already been claimed above — any
  // failure path must refund it via refund_correction() so the user's
  // daily count doesn't drop for a request that produced no result.
  const missingKeyError = missingApiKeyError();
  if (missingKeyError) {
    await refundCorrection(supabase, user.id, today);
    return NextResponse.json({ error: missingKeyError }, { status: 500 });
  }

  let content: string;
  let stopReason: string | null = null;
  try {
    const result = await createChatCompletion({
      label: "correct-existing",
      temperature: 0.3,
      maxTokens: 8000,
      messages: [
        { role: "system", content: systemPrompt(level, style, lang, includeDrills, includeMiniLesson) },
        { role: "user", content: text },
      ],
    });
    content = result.content;
    stopReason = result.stopReason;
  } catch (err) {
    console.error("[correct-existing] AI error:", err);
    await refundCorrection(supabase, user.id, today);
    return NextResponse.json(
      { error: "AI の添削に失敗しました。少し待ってからもう一度お試しください。" },
      { status: 502 },
    );
  }

  if (stopReason === "max_tokens") {
    console.error("[correct-existing] truncated: stop_reason=max_tokens");
    await refundCorrection(supabase, user.id, today);
    return NextResponse.json(
      { error: "AI の返答が長すぎて途中で切れました。もう一度お試しください。" },
      { status: 502 },
    );
  }

  if (!content) {
    await refundCorrection(supabase, user.id, today);
    return NextResponse.json(
      { error: "AI から結果を受け取れませんでした。もう一度お試しください。" },
      { status: 502 },
    );
  }

  const parsed = safeJson(content);
  if (!parsed) {
    console.error("[correct-existing] Invalid JSON from model:", content.slice(0, 500));
    await refundCorrection(supabase, user.id, today);
    return NextResponse.json(
      { error: "AI の返答を読み取れませんでした。もう一度お試しください。" },
      { status: 502 },
    );
  }

  // ---- Map AI response ----
  // Same converter as the write page: it owns which transform every field
  // gets (normalizeRubyText on the *Ruby fields, sanitizeReading on the
  // readings) and its table has to name every field of Correction, so a new
  // one cannot arrive here untransformed. This route used to keep a second
  // copy of that mapping, which is how the two drifted over the diary title.
  const correction = parseCorrectionPayload(parsed, text);
  const columns = correctionToDbColumns(correction);

  // ---- UPDATE diary entry ----
  // A re-correction updates a subset. Deliberately NOT sent:
  //  - original_text, which the learner wrote and this must never overwrite;
  //  - title and alternative_words when empty, so a title or a set of
  //    alternatives the entry already has is not cleared by a re-run.
  // The write page inserts a fresh row and sends all of them.
  const { title, alternative_words, practice_drills, related_mini_lesson, ...common } = columns;
  const updatePayload: Record<string, unknown> = { ...common };

  if (title) {
    updatePayload.title = title;
  }

  // Same "omit when empty" rule as title and alternative_words. Free
  // corrections return null for both — sending those would clear drills and a
  // lesson the entry already had, which is the one thing a re-correction must
  // never do. Destructured out of `common` above rather than filtered here, so
  // adding a column to CorrectionDbColumns cannot silently join the update.
  if (practice_drills) {
    updatePayload.practice_drills = practice_drills;
  }
  if (related_mini_lesson) {
    updatePayload.related_mini_lesson = related_mini_lesson;
  }

  // Entries with an empty original or alternative are dropped — a suggestion
  // missing either half has nothing to show. Only this route has ever done
  // this; the write page keeps them, so the filter stays here rather than
  // moving into the shared converter and changing that.
  const usableAlternatives = alternative_words.filter((a) => a.original && a.alternative);
  if (usableAlternatives.length > 0) {
    updatePayload.alternative_words = usableAlternatives;
  }

  const { error: updateError } = await supabase
    .from("diary_entries")
    .update(updatePayload)
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[correct-existing] update error:", updateError.message);
    // The only failure path in this route that did not refund. A slot was
    // claimed above and the learner has nothing to show for it — the same
    // situation the five paths before this one all pay back. It matters more
    // now than it did: this update writes two columns that may not exist yet,
    // so until add-correction-drills-lesson.sql has been run, every attempt
    // lands here.
    await refundCorrection(supabase, user.id, today);
    return NextResponse.json(
      { error: `保存に失敗しました: ${updateError.message}` },
      { status: 500 },
    );
  }

  // ---- Learned Items: 「使えた」照合 ----
  // 保存（update）が成功した後だけ走らせる。照合対象は original_text で、
  // ここで書き換えた corrected_japanese / natural_japanese は使わない。
  //
  // ⚠️ 指示は「await しない（fire-and-forget）」だが、サーバー側で素の
  //    unawaited promise にすると、レスポンスを返した時点で実行環境
  //    （Vercel）が関数を止めてしまい、照合が走らないことがある。
  //    after() はレスポンス後の実行を保証する Next.js の枠組みなので、
  //    「リクエストをブロックしない」という意図は満たしつつ、確実に動く。
  //    レスポンスはこの下の return で先に返るので、添削の応答は1msも遅れない。
  //
  // 同じリクエストスコープで呼ぶため cookies() がそのまま見え、認証を
  // 引き継げる（scan 側も RLS 前提の anon クライアントのまま動く）。
  after(async () => {
    try {
      // Request の URL は Request コンストラクタが絶対 URL を要求するだけの
      // ダミー。scan ハンドラは req.json() しか読まず req.url は見ない。
      await scanLearned(
        new Request("http://internal/api/learned/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diaryEntryId: entryId }),
        }),
      );
    } catch (err) {
      // scan 側は設計上投げないが、万一投げてもここで止める。
      // 添削結果はすでに保存済みなので、学習者の日記には影響しない。
      console.error("[correct-existing] learned scan failed:", err);
    }
  });

  return NextResponse.json({ ok: true });
}
