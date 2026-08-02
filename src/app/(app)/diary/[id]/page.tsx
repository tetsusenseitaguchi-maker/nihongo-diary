import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CorrectionResult } from "@/components/CorrectionResult";
import { PublicToggle } from "@/components/PublicToggle";
import { DiaryAttachments } from "@/components/DiaryAttachments";
import { DiaryEditAttachments } from "@/components/DiaryEditAttachments";
import { DeleteDiaryButton } from "@/components/DeleteDiaryButton";
import { ReportButton } from "@/components/ReportButton";
import { CommentsSection } from "@/components/CommentsSection";
import { ReactionBar } from "@/components/ReactionBar";
import { TagChips } from "@/components/TagChips";
import { DiaryPlaceMap } from "@/components/DiaryPlaceMap";
import { TranslateButton } from "@/components/TranslateButton";
import { GetCorrectionButton } from "@/components/GetCorrectionButton";
import { DictationLink } from "@/components/DictationLink";
import { hasDictation } from "@/lib/dictation";
import { normalizePlan } from "@/lib/plans";
import { PeerCorrections } from "@/components/PeerCorrections";
import { Avatar } from "@/components/ObiePhoto";
import { formatLong } from "@/lib/dates";
import { getServerT } from "@/lib/i18n-server";
import { countryFlag } from "@/lib/countryFlag";
import { Furigana } from "@/components/Furigana";
import { WordTranslateText } from "@/components/WordTranslateText";
import type { Correction, MistakeItem, VocabItem, JlptWord, AlternativeWord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DiaryDetailPage({
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

  const { data: entry } = await supabase
    .from("diary_entries")
    .select("*")
    .eq("id", id)
    .single();

  // RLS returns null for: non-existent, private-owned-by-other, or anon on private
  if (!entry) notFound();

  const isOwner = entry.user_id === user.id;

  // Defense-in-depth: even if RLS lets it through, block non-owner on private diary
  if (!isOwner && !entry.is_public) notFound();

  // Fetch author profile + mutual block state for non-owner view.
  // Blocks are enforced by the caller, never by RLS — /feed, /api/peer-corrections
  // and CommentsSection each subtract the same both-directions union. This page
  // was the one public-diary entry point that never did, so a blocked author's
  // diary stayed reachable by URL either way. notFound() rather than a 403, so a
  // block is indistinguishable from a missing diary: a separate error code would
  // tell the other side that a block exists.
  type AuthorProfile = { username: string | null; display_name: string | null; avatar_url: string | null; country: string | null };
  let authorProfile: AuthorProfile | null = null;
  if (!isOwner) {
    const [{ data: profileData }, { data: blockedByMe }, { data: blockedMe }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url, country")
        .eq("id", entry.user_id)
        .single(),
      supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", entry.user_id)
        .maybeSingle(),
      supabase
        .from("blocks")
        .select("id")
        .eq("blocked_id", user.id)
        .eq("blocker_id", entry.user_id)
        .maybeSingle(),
    ]);
    if (blockedByMe || blockedMe) notFound();
    authorProfile = profileData;
  }

  // Fetch location pins for this diary. The owner reads the base table and
  // sees exactly where they were; everyone else reads diary_places_public,
  // which rounds to the same ~22km grid /places has always used for friends'
  // pins. Until now this page handed exact coordinates to every viewer of a
  // public diary, which for a diary written at home is a home address.
  const { data: placesData } = await supabase
    .from(isOwner ? "diary_places" : "diary_places_public")
    .select("id, lat, lng, place_name")
    .eq("diary_entry_id", id);
  const places = (placesData ?? []) as { id: string; lat: number; lng: number; place_name: string | null }[];

  // Fetch reaction data for this diary's activity row (same reactions shown in Feed)
  const { data: activityRow } = await supabase
    .from("activity_feed")
    .select("id")
    .eq("diary_entry_id", id)
    .eq("activity_type", "wrote_diary")
    .maybeSingle();
  const activityId = activityRow?.id as string | undefined;

  const reactionCounts: Record<string, number> = {};
  const myReactions: string[] = [];
  if (activityId) {
    const { data: reactionData } = await supabase
      .from("reactions")
      .select("reaction_type, user_id")
      .eq("activity_id", activityId);
    for (const r of reactionData ?? []) {
      reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] ?? 0) + 1;
      if (r.user_id === user.id) myReactions.push(r.reaction_type);
    }
  }

  // Fetch viewer's preferred language for translation
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single();
  const preferredLanguage = (viewerProfile?.preferred_language as string) || "en";

  /**
   * The viewer's plan, for the 🔊 on the natural version and nothing else.
   *
   * A SEPARATE query rather than another column on the select above, and
   * deliberately so: one absent column makes the whole query error and every
   * field in it come back undefined. Widening the language read is how the
   * viewer would silently lose their translation language too. This way the
   * worst a broken plan read can do is fall through normalizePlan to "free",
   * which costs a paid learner one sentence instead of the paragraph.
   */
  const { data: planRow } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const viewerPlan = normalizePlan(planRow?.plan as string | null | undefined);

  const entryTranslations = (entry.translations as Record<string, string> | null) ?? {};
  const t = await getServerT();

  const correction: Correction = {
    original: entry.original_text,
    originalRuby: entry.original_text_ruby ?? undefined,
    corrected: entry.corrected_japanese ?? "",
    natural: entry.natural_japanese ?? "",
    explanation: entry.english_explanation ?? "",
    correctionNote: entry.correction_note ?? "",
    mistakes: (entry.key_mistakes as MistakeItem[]) ?? [],
    vocabulary: (entry.useful_vocabulary as VocabItem[]) ?? [],
    practice: { jp: entry.practice_sentence ?? "", en: "" },
    jlptWords: ((entry as Record<string, unknown>).jlpt_words as JlptWord[] | null) ?? [],
    alternativeWords: ((entry as Record<string, unknown>).alternative_words as AlternativeWord[] | null) ?? [],
  };

  const imageUrl = entry.image_path
    ? supabase.storage.from("diary-images").getPublicUrl(entry.image_path).data.publicUrl
    : null;
  const audioUrl = entry.audio_path
    ? supabase.storage.from("diary-audio").getPublicUrl(entry.audio_path).data.publicUrl
    : null;

  // The learner reading this diary aloud, owner only.
  //
  // A signed URL, not getPublicUrl: shadowing-audio is a private bucket, which
  // is the one thing that separates a recording of your own voice from the
  // diary attachments sitting in a world-readable one. An hour is far more than
  // anyone needs to press play, and short enough that a link copied out of the
  // page stops working.
  //
  // Generated with the learner's own session rather than the service role, so
  // the storage policy checks the path against auth.uid() as well —
  // `isOwner &&` here is the first of two locks, not the only one.
  let shadowingUrl: string | null = null;
  if (isOwner && entry.shadowing_audio_path) {
    const { data: signed } = await supabase.storage
      .from("shadowing-audio")
      .createSignedUrl(entry.shadowing_audio_path as string, 60 * 60);
    shadowingUrl = signed?.signedUrl ?? null;
  }

  const authorName =
    authorProfile?.display_name || authorProfile?.username || "Learner";
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      {isOwner ? (
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-600 hover:text-pine"
        >
          <Icon.arrow className="h-4 w-4 rotate-180" /> {t("diary.backToHistory")}
        </Link>
      ) : (
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-600 hover:text-pine"
        >
          <Icon.arrow className="h-4 w-4 rotate-180" /> {t("diary.backToFeed")}
        </Link>
      )}

      {/* Author attribution for non-owner view */}
      {!isOwner && authorProfile && (
        <div className="flex items-center gap-3 rounded-2xl bg-mint/40 px-4 py-3">
          {authorProfile.avatar_url ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={authorProfile.avatar_url} alt={authorName} className="h-full w-full object-cover" />
            </span>
          ) : (
            <Avatar initials={authorInitials} size={40} />
          )}
          <div className="min-w-0">
            <p className="text-sm text-muted">{t("diary.diaryBy")}</p>
            <span className="inline-flex items-center gap-1.5 font-semibold text-pine">
              {authorProfile.username ? (
                <Link
                  href={`/profile/${authorProfile.username}`}
                  className="hover:text-moss-600"
                >
                  {authorName}
                </Link>
              ) : (
                authorName
              )}
              {countryFlag(authorProfile.country) && (
                <span className="text-base leading-none">{countryFlag(authorProfile.country)}</span>
              )}
            </span>
          </div>
          <span className="ml-auto rounded-full bg-pine px-3 py-1 text-xs font-bold text-cream">
            公開
          </span>
        </div>
      )}

      {/* Title row */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-pine">
          {formatLong(entry.diary_date)}
        </h1>
        {entry.level && <Badge tone="moss">{entry.level}</Badge>}
        {entry.correction_style && <Badge tone="sand">{entry.correction_style}</Badge>}
        {isOwner ? (
          <span className="ml-auto flex items-center gap-2">
            <PublicToggle diaryId={id} initialPublic={Boolean(entry.is_public)} />
            <DeleteDiaryButton diaryId={id} redirectAfter />
          </span>
        ) : (
          <span className="ml-auto">
            <ReportButton targetType="diary_entry" targetId={id} />
          </span>
        )}
      </div>

      {isOwner && (
        <p className="-mt-3 text-xs text-muted">
          {t("diary.publicNote")}
        </p>
      )}

      {/* Tags */}
      {(entry.tags ?? []).length > 0 && (
        <TagChips tags={entry.tags ?? []} />
      )}

      {/* Optional title */}
      {entry.title && (
        <p className="rounded-2xl bg-mint/40 px-5 py-3 font-serif text-lg font-bold text-pine">
          {entry.title}
        </p>
      )}

      {/* Location pins */}
      {places.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {places.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-xs font-semibold text-pine"
              >
                <Icon.mapPin className="h-3.5 w-3.5 shrink-0" />
                {p.place_name || "場所"}
              </span>
            ))}
          </div>
          <DiaryPlaceMap
            places={places}
            isOwner={isOwner}
            diaryEntryId={id}
            diaryDate={entry.diary_date}
            diaryTitle={entry.title ?? null}
          />
        </div>
      )}

      {/* Translation toggle — available for both owner and public-diary visitors */}
      <TranslateButton
        diaryEntryId={id}
        translations={entryTranslations}
        preferredLanguage={preferredLanguage}
      />

      <DiaryAttachments imageUrl={imageUrl} audioUrl={audioUrl} t={t} />

      {isOwner && (
        <DiaryEditAttachments
          diaryId={id}
          imageUrl={imageUrl}
          audioUrl={audioUrl}
          hasExistingImage={Boolean(entry.image_path)}
          hasExistingAudio={Boolean(entry.audio_path)}
          savedPlaces={places}
        />
      )}

      {isOwner ? (
        // Owner: full correction result with explanation, mistakes, vocabulary, etc.
        entry.corrected_japanese ? (
          <>
            <div className="flex items-center gap-2">
              <span>🌸</span>
              <h2 className="font-serif text-xl font-bold text-pine">添削結果</h2>
              <span className="text-sm font-medium text-muted">{t("write.resultTitle")}</span>
            </div>
            <CorrectionResult correction={correction} plan={viewerPlan} />
            {/* Their own voice, from the day they wrote this. No controls
                beyond play — there is nothing to score and nothing to compare
                it against, which is the point. Absent for every diary written
                before the feature, and for every one that was skipped. */}
            {shadowingUrl && (
              <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
                <p className="mb-2 text-sm font-bold text-pine">
                  🎙 {t("shadowing.previewLabel")}
                </p>
                <audio controls src={shadowingUrl} className="h-9 w-full max-w-xs" />
              </div>
            )}
            {/* Under the result, where a learner who has just re-read the diary
                can go and test whether they can hear it. Hidden when the
                natural version carries no readings — see hasDictation. */}
            {hasDictation(entry.natural_japanese) && <DictationLink diaryId={entry.id} />}
          </>

        ) : (
          <>
            <div className="rounded-2xl bg-mint/30 px-5 py-4">
              <p className="font-jp text-base leading-relaxed text-ink whitespace-pre-wrap">
                {entry.original_text_ruby ? (
                  <Furigana text={entry.original_text_ruby} />
                ) : (
                  entry.original_text
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-line bg-paper/60 px-6 py-8 text-center">
              <p className="mb-1 font-semibold text-pine">{t("diary.noCorrectionYet")}</p>
              <div className="mt-4">
                <GetCorrectionButton entryId={id} />
              </div>
            </div>
          </>
        )
      ) : (
        // Non-owner: only original text + natural Japanese rewrite (no corrections, mistakes, or vocabulary)
        <div className="space-y-4">
          <div className="rounded-2xl bg-mint/30 px-5 py-4">
            <p className="font-jp text-base leading-relaxed text-ink whitespace-pre-wrap">
              {entry.original_text_ruby ? (
                <Furigana text={entry.original_text_ruby} />
              ) : (
                entry.original_text
              )}
            </p>
          </div>
          {entry.natural_japanese && (
            <div className="gloss-panel rounded-2xl p-5">
              <p className="mb-2 flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-bold text-pine">{t("correction.naturalJapanese")}</span>
                <Furigana text="自然(しぜん)な日本語(にほんご)" className="font-jp text-xs text-muted" />
              </p>
              <WordTranslateText
                text={entry.natural_japanese}
                language={preferredLanguage}
              />
            </div>
          )}
        </div>
      )}

      {/* Reactions — same as Feed, shown regardless of diary privacy */}
      {activityId && (
        <ReactionBar
          activityId={activityId}
          initialCounts={reactionCounts}
          initialMine={myReactions}
        />
      )}

      {/* Peer corrections — shown for any public diary */}
      {entry.is_public && (
        <PeerCorrections
          entryId={id}
          originalText={entry.original_text ?? ""}
          isOwner={isOwner}
          isPublic={Boolean(entry.is_public)}
          currentUserId={user.id}
        />
      )}

      {/* Comments — shown for any public diary */}
      {entry.is_public && (
        <CommentsSection
          diaryEntryId={id}
          currentUserId={user.id}
          viewerLanguage={preferredLanguage}
        />
      )}
    </div>
  );
}
