import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";
const MAX_CHARS = 500;

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
  "practiceSentenceRuby": ""
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
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `今は1回 ${MAX_CHARS} 文字までです。少し短くしてね。` },
      { status: 400 },
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
        max_tokens: 1600,
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
  };

  return NextResponse.json(result);
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
