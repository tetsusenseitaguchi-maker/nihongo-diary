import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createChatCompletion, missingApiKeyError } from "@/lib/ai-provider";
import { normalizePlan } from "@/lib/plans";
import { todayInTZ } from "@/lib/date-tz";
import { SUPPORTED_LANGUAGES, languageDisplayName } from "@/lib/languages";
import {
  wordLookupLimitFor,
  isCacheableQuery,
  cacheKey,
  MAX_QUERY_CHARS,
} from "@/lib/word-lookup-limits";

export const runtime = "nodejs";

/**
 * POST { query: string, language?: string } → { japanese, reading, meaning, level, cached }
 *
 * "How do I say this in Japanese?" — the gap a beginner falls into mid-sentence
 * and does not climb out of. English in, one Japanese word out, with a reading
 * and a JLPT level, ready to drop into the diary at the cursor.
 *
 * ── Why this is not /api/translate-text ─────────────────────────────────
 * That route translates Japanese INTO the learner's language, returns a bare
 * string, and is metered by try_use_translation. All three are wrong here: the
 * direction is reversed, the answer is structured, and the allowance has to be
 * its own — a learner who spent their translations reading someone else's
 * diary must still be able to write their own. try_use_translation and
 * translation_count are untouched by this file.
 *
 * ── The allowance ───────────────────────────────────────────────────────
 * Free is capped per day (see word-lookup-limits.ts for why twenty), paid
 * plans are not counted at all. The RPC runs on the USER's client, not the
 * admin one: try_use_word_lookup checks auth.uid() against the id it is given,
 * so a service-role call would find no uid and always refuse.
 *
 * ── Cache above claim ───────────────────────────────────────────────────
 * The lookup hits word_lookup_cache BEFORE the counter, so a word another
 * learner has already asked for costs nothing and answers instantly. This is
 * the ordering /api/tts depends on, and the reason twenty is twenty NEW words
 * rather than twenty taps. Only dictionary-shaped queries are stored — see
 * isCacheableQuery; a whole sentence is answered and forgotten.
 *
 * ── When the counter is missing ─────────────────────────────────────────
 * Fails CLOSED. If try_use_word_lookup is not in the database yet, Free gets
 * an error rather than an uncounted lookup. The opposite choice is how a
 * limit quietly stops existing.
 */

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

interface LookupResult {
  japanese: string;
  reading: string | null;
  meaning: string;
  level: string | null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let query: unknown;
  let language: unknown;
  try {
    ({ query, language } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof query === "string" ? query.trim() : "";
  if (!raw) return NextResponse.json({ error: "Missing query" }, { status: 400 });
  if (raw.length > MAX_QUERY_CHARS * 4) {
    // Generous next to MAX_QUERY_CHARS, which governs what may be CACHED.
    // A learner pasting a clause still gets an answer; a paragraph does not.
    return NextResponse.json({ error: "Query too long" }, { status: 413 });
  }

  const lang = typeof language === "string" && SUPPORTED_CODES.includes(language) ? language : "en";
  const key = cacheKey(raw);
  const cacheable = isCacheableQuery(raw);

  const admin = createAdminClient();

  // ── Cache, above the counter ─────────────────────────────────────────
  if (cacheable) {
    const { data: hit } = await admin
      .from("word_lookup_cache")
      .select("japanese, reading, meaning, level")
      .eq("query", key)
      .eq("lang", lang)
      .maybeSingle();

    if (hit?.japanese) {
      return NextResponse.json({ ...hit, cached: true });
    }
  }

  // ── Claim one, for Free only ─────────────────────────────────────────
  const { data: prof } = await supabase
    .from("profiles")
    .select("plan, timezone")
    .eq("id", user.id)
    .single();

  const plan = normalizePlan(prof?.plan);
  const limit = wordLookupLimitFor(prof?.plan);

  if (limit !== null) {
    // Cookie first (TimezoneSyncer sets it), then the profile column. Same
    // precedence as /api/correct and /api/translate-text — the day has to roll
    // over on the learner's clock, not the server's.
    const cookieStore = await cookies();
    const rawTz = cookieStore.get("user_tz")?.value;
    let tz = "UTC";
    if (rawTz) {
      try {
        const decoded = decodeURIComponent(rawTz);
        new Intl.DateTimeFormat("en-CA", { timeZone: decoded });
        tz = decoded;
      } catch { /* invalid cookie — fall through */ }
    }
    if (tz === "UTC" && prof?.timezone && prof.timezone !== "UTC") {
      try {
        new Intl.DateTimeFormat("en-CA", { timeZone: prof.timezone });
        tz = prof.timezone;
      } catch { /* invalid DB value — fall through */ }
    }

    const { data: allowed, error: rpcError } = await supabase.rpc("try_use_word_lookup", {
      p_user_id: user.id,
      p_date: todayInTZ(tz),
      p_limit: limit,
    });

    if (rpcError) {
      // Fail closed. An uncounted lookup is how a limit stops existing without
      // anybody noticing.
      console.error("[word-lookup] try_use_word_lookup error:", rpcError.message);
      return NextResponse.json(
        { error: "Word lookup is temporarily unavailable. Please try again." },
        { status: 500 },
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "daily_word_lookup_limit_reached", upgrade: true, plan, limit },
        { status: 429 },
      );
    }
  }

  const missingKey = missingApiKeyError();
  if (missingKey) {
    console.error("[word-lookup]", missingKey);
    return NextResponse.json({ error: "Lookup service error. Please try again." }, { status: 503 });
  }

  // ── Ask ──────────────────────────────────────────────────────────────
  const meaningLang = languageDisplayName(lang);
  let result: LookupResult;
  try {
    const completion = await createChatCompletion({
      label: "word-lookup",
      jsonMode: true,
      maxTokens: 200,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            `You help a Japanese learner say an English word in Japanese while they write a diary.\n` +
            `Return ONE Japanese equivalent, the one a learner should actually use — the everyday word, not the rarest or most literary.\n` +
            `Reply with JSON only: {"japanese":"","reading":"","meaning":"","level":""}\n` +
            `japanese: the word in normal Japanese orthography, kanji where kanji is normal (疲れた, not つかれた). Dictionary form for verbs and adjectives unless the query is clearly inflected.\n` +
            `reading: the FULL reading of the whole word in hiragana, okurigana included (歩く → あるく, NEVER ある). If the word has no kanji, repeat the word.\n` +
            `meaning: a short gloss in ${meaningLang}, at most six words.\n` +
            `level: the JLPT level of the word — one of N5, N4, N3, N2, N1. Guess the closest if unsure.\n` +
            `No explanations, no alternatives, no romaji.`,
        },
        { role: "user", content: raw },
      ],
    });

    const parsed = JSON.parse(completion.content) as Partial<LookupResult>;
    if (!parsed.japanese || !parsed.meaning) {
      return NextResponse.json({ error: "Lookup returned nothing usable." }, { status: 502 });
    }
    result = {
      japanese: String(parsed.japanese).trim(),
      reading: parsed.reading ? String(parsed.reading).trim() : null,
      meaning: String(parsed.meaning).trim(),
      level: parsed.level ? String(parsed.level).trim().toUpperCase() : null,
    };
  } catch (err) {
    console.error("[word-lookup] model call failed:", err);
    return NextResponse.json({ error: "Lookup service unavailable. Please try again." }, { status: 503 });
  }

  // ── Remember it, for everybody ───────────────────────────────────────
  // Best effort: a learner who just spent one of their twenty gets the answer
  // whether or not the write lands. Conflict means another request stored the
  // same word first, which is a success from here.
  if (cacheable) {
    const { error: cacheErr } = await admin.from("word_lookup_cache").insert({
      query: key,
      lang,
      japanese: result.japanese,
      reading: result.reading,
      meaning: result.meaning,
      level: result.level,
    });
    if (cacheErr && cacheErr.code !== "23505") {
      console.error("[word-lookup] cache write failed:", cacheErr.message);
    }
  }

  return NextResponse.json({ ...result, cached: false });
}
