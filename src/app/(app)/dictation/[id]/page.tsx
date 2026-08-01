import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { DictationExercise } from "@/components/DictationExercise";
import { pickSentence } from "@/lib/dictation";
import { audioLimitFor } from "@/lib/audio-limits";
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

  // ── Remaining plays ──────────────────────────────────────────────────────
  // Only `plan` is selected. Widening this select is how the timezone incident
  // turned every user Free: one missing column errors the whole query.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const limit = audioLimitFor(profile?.plan);
  let remaining: number | null = null;
  if (limit !== null) {
    // audio_usage is read-only from here — writing is try_use_audio's job and
    // the table has no insert/update policy for a client to use anyway. A user
    // with no row has spent nothing.
    const { data: usage } = await supabase
      .from("audio_usage")
      .select("audio_count")
      .eq("user_id", user.id)
      .maybeSingle();
    remaining = Math.max(0, limit - (usage?.audio_count ?? 0));
  }

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
        <DictationExercise sentence={sentence} remaining={remaining} />
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
