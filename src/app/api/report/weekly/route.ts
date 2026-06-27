import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plans";
import { languageDisplayName } from "@/lib/languages";
import { normaliseLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const runtime = "nodejs";
const MODEL = "gpt-4.1-mini";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, preferred_language, timezone")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(profile?.plan);
  const isPlus = plan !== "free";

  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LOCALE_COOKIE)?.value;
  const lang = languageDisplayName(
    normaliseLocale(cookieLang || profile?.preferred_language || "en"),
  );

  // Timezone-aware date range (last 7 days)
  const tz = (() => {
    const t = profile?.timezone;
    if (!t || t === "UTC") return "UTC";
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: t });
      return t;
    } catch {
      return "UTC";
    }
  })();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  const weekAgoDate = new Date();
  weekAgoDate.setDate(weekAgoDate.getDate() - 6);
  const weekStart = weekAgoDate.toLocaleDateString("en-CA", { timeZone: tz });

  // Fetch this week's entries
  const { data: weekRows } = await supabase
    .from("diary_entries")
    .select("diary_date, key_mistakes, useful_vocabulary")
    .eq("user_id", user.id)
    .gte("diary_date", weekStart)
    .lte("diary_date", today)
    .order("diary_date", { ascending: false });

  const entries = weekRows ?? [];
  const daysWritten = new Set(entries.map((e) => e.diary_date)).size;

  // Free plan: return basic info only
  if (!isPlus) {
    return NextResponse.json({ plan, daysWritten, weekStart, weekEnd: today });
  }

  // Streak: consecutive days backwards from today (up to 90 days)
  const ninetyAgo = new Date();
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);
  const ninetyAgoStr = ninetyAgo.toLocaleDateString("en-CA", { timeZone: tz });

  const { data: recentRows } = await supabase
    .from("diary_entries")
    .select("diary_date")
    .eq("user_id", user.id)
    .gte("diary_date", ninetyAgoStr)
    .order("diary_date", { ascending: false });

  const writtenDays = new Set((recentRows ?? []).map((r) => r.diary_date));
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 90; i++) {
    const ds = cur.toLocaleDateString("en-CA", { timeZone: tz });
    if (writtenDays.has(ds)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }

  // Frequent vocabulary (from useful_vocabulary JSONB)
  type VRow = { word: string; reading?: string };
  const wordMap = new Map<string, { word: string; reading: string; count: number }>();
  for (const entry of entries) {
    const vocab = (entry.useful_vocabulary as VRow[] | null) ?? [];
    for (const v of vocab) {
      if (!v.word) continue;
      const ex = wordMap.get(v.word);
      if (ex) ex.count++;
      else wordMap.set(v.word, { word: v.word, reading: v.reading ?? "", count: 1 });
    }
  }
  const frequentWords = [...wordMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Mistake patterns (from key_mistakes JSONB)
  type MRow = { before?: string; after?: string; note?: string };
  const allMistakes: Array<{ before: string; after: string; note: string }> = [];
  const allNotes: string[] = [];
  for (const entry of entries) {
    const mistakes = (entry.key_mistakes as MRow[] | null) ?? [];
    for (const m of mistakes) {
      if (m.note) allNotes.push(m.note);
      if (m.before && m.after && m.note) {
        allMistakes.push({ before: m.before, after: m.after, note: m.note });
      }
    }
  }
  const mistakeNotes = [...new Set(allNotes)].slice(0, 5);

  // AI practice suggestions — does NOT consume correction credits
  let aiSuggestions: string[] = [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && entries.length > 0) {
    try {
      const openai = new OpenAI({ apiKey });
      const mistakeContext = allMistakes
        .slice(0, 8)
        .map((m, i) => `${i + 1}. ${m.before} → ${m.after}: ${m.note}`)
        .join("\n");

      const content = mistakeContext
        ? `You are a Japanese language teacher reviewing a learner's week. Suggest 2–3 specific, actionable practice activities for next week based on these mistakes.

Mistakes this week:
${mistakeContext}

Return ONLY a JSON object:
{
  "suggestions": [
    "Practice activity 1 in ${lang} (1–2 sentences, concrete and actionable)",
    "Practice activity 2 in ${lang}",
    "Practice activity 3 in ${lang}"
  ]
}`
        : `You are a Japanese language teacher. A learner had a great week with no mistakes. Suggest 2 ways to keep challenging themselves.

Return ONLY a JSON object:
{
  "suggestions": [
    "Challenge suggestion 1 in ${lang}",
    "Challenge suggestion 2 in ${lang}"
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        max_tokens: 350,
        temperature: 0.7,
        messages: [{ role: "user", content }],
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      aiSuggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3).map(String).filter(Boolean)
        : [];
    } catch {
      // AI failure is non-fatal; show report without suggestions
    }
  }

  return NextResponse.json({
    plan,
    daysWritten,
    weekStart,
    weekEnd: today,
    streak,
    frequentWords,
    mistakeNotes,
    aiSuggestions,
  });
}
