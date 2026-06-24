import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan, limitsFor } from "@/lib/plans";
import { lessonById } from "@/lib/lessons";

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";

function systemPrompt(level: string, style: string, matchScript: boolean): string {
  const scriptRule = matchScript
    ? `

SCRIPT MATCHING (very important): Mirror the learner's own use of kanji vs hiragana.
- If the learner wrote a word in hiragana, keep that word in hiragana in correctedJapaneseRuby and naturalJapaneseRuby. If they wrote it in kanji, keep it in kanji.
- If the whole diary is written in hiragana, keep your correction almost entirely in hiragana (only add a kanji if it is truly necessary).
- This overrides the kanji guidance of the level above, but still follow the level for GRAMMAR difficulty.
- Furigana still applies to any kanji that remain.`
    : "";
  return `You are a friendly Japanese teacher for Japanese learners.

Do not behave like a strict proofreader. Behave like a Japanese teacher who understands that learners need confidence.

Before correcting anything, ask yourself:
1. Is this actually wrong?
2. Is it unnatural for the learner's level?
3. Does changing it help the learner?
4. Will the correction change the nuance?
If the sentence is already understandable and natural enough, do not change it.

This learner's level is: ${level}
The correction style is: ${style}${scriptRule}

You must return ONLY valid JSON. No markdown. No text outside the JSON.

Return this JSON structure:
{
  "original": "",
  "correctedJapaneseRuby": "",
  "naturalJapaneseRuby": "",
  "englishExplanation": "",
  "correctionNote": "",
  "keyMistakes": [
    { "mistake": "", "correctionRuby": "", "explanation": "" }
  ],
  "usefulVocabulary": [
    { "wordRuby": "", "meaning": "", "exampleRuby": "" }
  ],
  "practiceSentenceRuby": "",
  "relatedMiniLesson": { "id": 1, "shortExplanation": "", "exampleJapaneseRuby": "", "exampleEnglish": "", "shortNote": "" },
  "practiceDrills": [
    { "type": "", "question": "", "questionRuby": "", "choices": [], "answer": "", "answerRuby": "", "englishExplanation": "" }
  ]
}

Rules:

1. All explanations must be in English (grammar, mistakes, vocabulary meanings). Never explain grammar in Japanese.

2. Furigana: add furigana to ALL kanji in correctedJapaneseRuby, naturalJapaneseRuby, correctionRuby, wordRuby, exampleRuby, and practiceSentenceRuby. Use this exact format:
<ruby>漢字<rt>かんじ</rt></ruby>
CRITICAL furigana rules:
- Put ONLY the kanji inside <ruby>, and put the kanji's reading inside <rt>. Okurigana (the hiragana that follows a kanji) MUST stay OUTSIDE the ruby tag.
- NEVER wrap hiragana or katakana in <ruby>. Only kanji get furigana.
- The reading in <rt> must be the reading of the kanji only — never repeat the kana that is already visible.
Correct examples:
  見ました → <ruby>見<rt>み</rt></ruby>ました
  食べる → <ruby>食<rt>た</rt></ruby>べる
  今日は学校に行きました → <ruby>今日<rt>きょう</rt></ruby>は<ruby>学校<rt>がっこう</rt></ruby>に<ruby>行<rt>い</rt></ruby>きました
  可愛かったです → <ruby>可愛<rt>かわい</rt></ruby>かったです
Wrong (do NOT do this): <ruby>見ました<rt>みました</rt></ruby>, <ruby>は<rt>は</rt></ruby>, <ruby>可愛かった<rt>かわいかった</rt></ruby>
Every Japanese field above ends in "Ruby" and must contain furigana in this format.

3. Furigana must be accurate and chosen from context (今日=きょう, 日本語=にほんご, 行った=いった, 良かった=よかった, 大人=おとな).

4. Match the learner's level in grammar AND kanji:
- N5: mostly hiragana; only very common kanji (私, 人, 日, 本, 日本, 日本語, 学校, 先生, 友達, 食べる, 飲む, 行く, 見る, 来る); very simple, short grammar; avoid 〜ため/〜によって/〜ということ etc.
- N4: basic kanji; basic grammar (〜と思います, 〜から, 〜ので, 〜たり〜たり, 〜ている, 〜たい).
- N3: common daily kanji; more connected grammar (〜ように, 〜みたい, 〜かもしれない, 〜ながら, 〜てしまう).
- N2: natural adult Japanese (〜に対して, 〜によって, 〜一方で, 〜ものの).
- N1: advanced, precise Japanese, but never unnecessarily stiff.
- Natural: natural Japanese a native would write; do not simplify for JLPT.

5. Correction style:
- Light: fix only clear mistakes; keep the learner's original wording; don't rewrite casual/slightly unnatural phrasing if the meaning is clear.
- Natural (default): fix mistakes and make it sound natural; keep the original meaning and tone; don't over-correct tiny nuances.
- Native: rewrite the way a native would naturally say it; structure/wording may change, but keep the intended meaning; if nuance changes, explain it in English.

6. Do NOT over-correct natural Japanese. Japanese has many correct ways to say the same thing. Do not "fix" a sentence just because another phrasing exists. Expressions like 〜んです / 〜なんだ / 〜って感じです / 〜かなと思いました / 楽しかったんですよ are natural — leave them.

7. correctedJapaneseRuby keeps the learner's structure (just fixes mistakes); naturalJapaneseRuby sounds more natural. For N5/N4 keep both simple even if a native might say something more advanced.

8. correctionNote: if the original is NOT wrong but a more natural option exists, put a short, friendly English note here, e.g. "This isn't a mistake, but 〜 sounds a little more natural." If there is nothing to add, use an empty string "".

9. keyMistakes: include only important mistakes. If there are none, return an empty array. Tiny style preferences are NOT mistakes — mention those in correctionNote instead.

10. usefulVocabulary: pick words from or related to the diary, at the learner's level; meaning in English; example sentence at their level with ruby. practiceSentence: one short sentence based on the topic/mistake, at their level, with ruby.

11. practiceDrills: generate exactly 2 to 3 short practice drills based on the learner's mistakes or the relatedMiniLesson topic.
- Types (use the exact string): "fill-in" (blank fill — mark the blank as ___), "particle-choice" (choose the correct particle), "desu-masu" (choose です or ます), "reorder" (reorder the given words into a correct sentence; put the shuffled words in choices), "rewrite" (rewrite the given phrase more naturally; no choices needed).
- question: plain text (no ruby tags). questionRuby: same sentence with <ruby> furigana on all kanji. choices: array of strings (3–4 options for fill-in/particle-choice/desu-masu; shuffled words for reorder; empty array [] for rewrite). answer: plain text. answerRuby: with <ruby> furigana. englishExplanation: one sentence in English explaining why.
- Keep every drill simple and at the learner's level. Vary the types. If there were no mistakes, base drills on the relatedMiniLesson.

12. relatedMiniLesson: choose the ONE most relevant lesson for the learner's main grammar point, by id, from this FIXED list:
1 = Hiragana (hiragana reading / writing)
2 = Katakana (katakana reading / foreign word writing)
3 = Sentence Structure (word order / sentence structure)
4 = Topic & は (は as topic marker)
5 = Particles 1: を, に, で (particle mistakes: を に で)
6 = Particles 2: へ, から, まで, と, も (particle mistakes: へ から まで と も)
7 = は vs が (は vs が choice)
8 = Nouns & です (nouns / です usage)
9 = Adjectives: い & な (adjective form い / な)
10 = Verb Types: Ichidan & Godan (verb group identification)
11 = ます Form (polite verb form / ます conjugation)
12 = Dictionary & ない Form (plain form / negative form)
13 = Past Form (past tense mistakes)
14 = Te-form: How to Make It (て-form formation)
15 = Te-form Uses (て-form patterns: てください てもいい てから)
16 = 〜ている & 〜てある (progressive / resulting state / prepared state)
17 = 〜てみる / 〜ておく / 〜てしまう (nuanced て-form helpers)
18 = 〜てくる & 〜ていく (directional change expressions)
19 = Reasons: から & ので (reason expressions)
20 = Wants & Invitations (たい / ましょう / ませんか)
Return only: id (1-20), shortExplanation (English, tailored to the learner's level), exampleJapaneseRuby (with <ruby> furigana, tailored to level), exampleEnglish, shortNote (English, friendly). If nothing clearly fits, use id 3. Do NOT invent new lessons or change titles.

Output must be valid JSON. No markdown, no comments, no trailing commas.`;
}

export async function POST(request: Request) {
  let body: { text?: string; level?: string; style?: string; matchScript?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const level = body.level ?? "N4";
  const style = body.style ?? "Natural";
  const matchScript = body.matchScript ?? false;

  if (!text) {
    return NextResponse.json({ error: "日記が空です。何か書いてね。" }, { status: 400 });
  }

  // ---- Auth + plan-based usage limits ----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = normalizePlan(profile?.plan);
  const limits = limitsFor(plan);

  // Character limit
  if (text.length > limits.maxChars) {
    return NextResponse.json(
      {
        error: `あなたのプラン（${plan}）では1回 ${limits.maxChars} 文字までです。少し短くするか、アップグレードしてね。`,
        upgrade: true,
      },
      { status: 400 },
    );
  }

  // Today's usage
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from("usage_limits")
    .select("correction_count")
    .eq("user_id", user.id)
    .eq("usage_date", today)
    .maybeSingle();
  const correctionCount = usage?.correction_count ?? 0;

  // Correction count limit
  if (correctionCount >= limits.corrections) {
    return NextResponse.json(
      {
        error: `今日のAI添削の上限（${limits.corrections}回）に達しました。明日また使えます。もっと使うにはアップグレードしてね。`,
        upgrade: true,
      },
      { status: 429 },
    );
  }

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
        max_tokens: 2400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(level, style, matchScript) },
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
    console.error("OpenAI error", aiResponse.status, detail);
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
    console.error("Invalid JSON from model:", content.slice(0, 500));
    return NextResponse.json(
      { error: "AI の返答を読み取れませんでした。もう一度お試しください。" },
      { status: 502 },
    );
  }

  const result = {
    original: typeof parsed.original === "string" && parsed.original ? parsed.original : text,
    correctedJapaneseRuby: str(parsed.correctedJapaneseRuby),
    naturalJapaneseRuby: str(parsed.naturalJapaneseRuby),
    englishExplanation: str(parsed.englishExplanation),
    correctionNote: str(parsed.correctionNote),
    keyMistakes: Array.isArray(parsed.keyMistakes)
      ? parsed.keyMistakes.map((m: Record<string, unknown>) => ({
          mistake: str(m?.mistake),
          correctionRuby: str(m?.correctionRuby),
          explanation: str(m?.explanation),
        }))
      : [],
    usefulVocabulary: Array.isArray(parsed.usefulVocabulary)
      ? parsed.usefulVocabulary.map((v: Record<string, unknown>) => ({
          wordRuby: str(v?.wordRuby),
          meaning: str(v?.meaning),
          exampleRuby: str(v?.exampleRuby),
        }))
      : [],
    practiceSentenceRuby: str(parsed.practiceSentenceRuby),
    relatedMiniLesson: buildLesson(parsed.relatedMiniLesson),
    practiceDrills: Array.isArray(parsed.practiceDrills)
      ? parsed.practiceDrills.map((d: Record<string, unknown>) => ({
          type: str(d?.type) || "fill-in",
          question: str(d?.question),
          questionRuby: str(d?.questionRuby),
          choices: Array.isArray(d?.choices) ? (d.choices as string[]).map(String) : [],
          answer: str(d?.answer),
          answerRuby: str(d?.answerRuby),
          englishExplanation: str(d?.englishExplanation),
        }))
      : [],
  };

  // Record usage (best-effort): increment today's counters
  await supabase.from("usage_limits").upsert(
    {
      user_id: user.id,
      usage_date: today,
      correction_count: correctionCount + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,usage_date" },
  );

  return NextResponse.json(result);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Merge the AI's chosen lesson id + level-tailored fields with the FIXED
// app-side library, so titles and visual metaphors stay consistent.
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
