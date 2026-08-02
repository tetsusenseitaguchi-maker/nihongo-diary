import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { DictationExercise } from "@/components/DictationExercise";
import { pickSentence } from "@/lib/dictation";
import { audioLimitFor } from "@/lib/audio-limits";
import { getTimezoneFromCookie, validateTZ } from "@/lib/tz-server";
import { todayInTZ } from "@/lib/date-tz";
import { formatLong } from "@/lib/dates";
import { getServerT } from "@/lib/i18n-server";

/**
 * Dictation, on a page of its own.
 *
 * Not a card inside the correction result, which is where it looks like it
 * belongs: the answer is printed at the top of that page. An exercise you can
 * scroll up to is not an exercise. A separate route also keeps CorrectionResult
 * — which renders in four places, one of them the tutorial — out of it
 * entirely.
 *
 * force-dynamic because it reads the learner's own row and their remaining
 * allowance; neither is cacheable.
 */
export const dynamic = "force-dynamic";

export default async function DictationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getServerT();

  // .eq("user_id") as well as the id: this is the learner's own writing, and a
  // public diary being readable does not make its owner's practice page so.
  const { data: entry } = await supabase
    .from("diary_entries")
    .select("id, diary_date, title, natural_japanese")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!entry) notFound();

  const sentence = entry.natural_japanese ? pickSentence(entry.natural_japanese) : null;

  // ── Remaining plays today ────────────────────────────────────────────────
  // `timezone` joins `plan` because the allowance is daily and the day has to
  // be the learner's. Same column /api/correct and /api/tts read, for the same
  // reason. A failed read still resolves to free + the cookie's timezone,
  // which is the safe direction.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, timezone")
    .eq("id", user.id)
    .single();

  // Resolved once: both the allowance below and the "which day is this" of the
  // attempt history hang on it.
  let tz = await getTimezoneFromCookie();
  const dbTz = profile?.timezone as string | null | undefined;
  if (tz === "UTC" && dbTz) tz = validateTZ(dbTz);
  const today = todayInTZ(tz);

  const limit = audioLimitFor(profile?.plan);
  let remaining: number | null = null;
  if (limit !== null) {
    // audio_usage_daily is read-only from here — writing is
    // try_use_audio_daily's job and the table has no insert/update policy for a
    // client to use anyway. No row for today means nothing spent today.
    const { data: usage } = await supabase
      .from("audio_usage_daily")
      .select("audio_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();
    remaining = Math.max(0, limit - (usage?.audio_count ?? 0));
  }

  // ── The last time this sentence was set, on an earlier day ───────────────
  // lt(today) rather than "the newest row": today's own row is written the
  // moment the learner checks their answer, and a score has nothing to prove
  // against itself. One row per diary per day, so this is yesterday's attempt —
  // or whenever they last did it.
  //
  // sentence_kana comes along because the comparison is only honest if both
  // attempts were the same sentence; re-correcting a diary rewrites
  // natural_japanese and pickSentence would then be setting something else.
  // The check itself is in DictationExercise, next to the number it guards.
  const { data: prior } = await supabase
    .from("dictation_attempts")
    .select("percent, sentence_kana, usage_date")
    .eq("user_id", user.id)
    .eq("diary_entry_id", id)
    .lt("usage_date", today)
    .order("usage_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previous = prior
    ? {
        percent: prior.percent as number,
        sentenceKana: prior.sentence_kana as string,
        date: prior.usage_date as string,
      }
    : null;

  return (
    <div className="space-y-6">
      <Link
        href={`/diary/${entry.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-600 hover:text-pine"
      >
        <Icon.arrow className="h-4 w-4 rotate-180" /> {t("dictation.backToDiary")}
      </Link>

      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">
          {t("dictation.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {entry.title ? `${entry.title} · ` : ""}
          {formatLong(entry.diary_date)}
        </p>
      </div>

      {sentence ? (
        <DictationExercise
          sentence={sentence}
          remaining={remaining}
          diaryId={entry.id}
          previous={previous}
        />
      ) : (
        /* Either the entry has no correction yet, or its natural version has
           kanji with no reading attached — an entry saved before the ruby
           pipeline. Without readings there is no answer key, so there is
           nothing to mark against. */
        <div className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-12 text-center">
          <p className="text-4xl">🎧</p>
          <p className="mt-3 font-semibold text-ink/70">{t("dictation.unavailable")}</p>
          <p className="mt-1 text-sm text-muted">{t("dictation.unavailableHint")}</p>
        </div>
      )}
    </div>
  );
}
