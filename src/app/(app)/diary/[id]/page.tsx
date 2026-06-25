import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CorrectionResult } from "@/components/CorrectionResult";
import { PublicToggle } from "@/components/PublicToggle";
import { DiaryAttachments } from "@/components/DiaryAttachments";
import { DeleteDiaryButton } from "@/components/DeleteDiaryButton";
import { CommentsSection } from "@/components/CommentsSection";
import { TagChips } from "@/components/TagChips";
import { DiaryPlaceMap } from "@/components/DiaryPlaceMap";
import { TranslateButton } from "@/components/TranslateButton";
import { Avatar } from "@/components/ObiePhoto";
import { formatLong } from "@/lib/dates";
import type { Correction, MistakeItem, VocabItem } from "@/lib/types";

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

  // Fetch author profile for non-owner view
  type AuthorProfile = { username: string | null; display_name: string | null; avatar_url: string | null };
  let authorProfile: AuthorProfile | null = null;
  if (!isOwner) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", entry.user_id)
      .single();
    authorProfile = data;
  }

  // Fetch location pins for this diary
  const { data: placesData } = await supabase
    .from("diary_places")
    .select("id, lat, lng, place_name")
    .eq("diary_entry_id", id);
  const places = (placesData ?? []) as { id: string; lat: number; lng: number; place_name: string | null }[];

  // Fetch viewer's preferred language for translation
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single();
  const preferredLanguage = (viewerProfile?.preferred_language as string) || "en";
  const entryTranslations = (entry.translations as Record<string, string> | null) ?? {};

  const correction: Correction = {
    original: entry.original_text,
    corrected: entry.corrected_japanese ?? "",
    natural: entry.natural_japanese ?? "",
    explanation: entry.english_explanation ?? "",
    correctionNote: entry.correction_note ?? "",
    mistakes: (entry.key_mistakes as MistakeItem[]) ?? [],
    vocabulary: (entry.useful_vocabulary as VocabItem[]) ?? [],
    practice: { jp: entry.practice_sentence ?? "", en: "" },
  };

  const imageUrl = entry.image_path
    ? supabase.storage.from("diary-images").getPublicUrl(entry.image_path).data.publicUrl
    : null;
  const audioUrl = entry.audio_path
    ? supabase.storage.from("diary-audio").getPublicUrl(entry.audio_path).data.publicUrl
    : null;

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
          <Icon.arrow className="h-4 w-4 rotate-180" /> 過去の日記にもどる
        </Link>
      ) : (
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-600 hover:text-pine"
        >
          <Icon.arrow className="h-4 w-4 rotate-180" /> Learning Feed に戻る
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
            <p className="text-sm text-muted">Diary by</p>
            {authorProfile.username ? (
              <Link
                href={`/profile/${authorProfile.username}`}
                className="font-semibold text-pine hover:text-moss-600"
              >
                {authorName}
              </Link>
            ) : (
              <span className="font-semibold text-pine">{authorName}</span>
            )}
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
        {isOwner && (
          <span className="ml-auto flex items-center gap-2">
            <PublicToggle diaryId={id} initialPublic={Boolean(entry.is_public)} />
            <DeleteDiaryButton diaryId={id} redirectAfter />
          </span>
        )}
      </div>

      {isOwner && (
        <p className="-mt-3 text-xs text-muted">
          Public diaries can appear on your profile and in followers&apos; feeds. Private diaries are only visible to you.
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

      <div className="flex items-center gap-2">
        <span>🌸</span>
        <h2 className="font-serif text-xl font-bold text-pine">添削結果</h2>
        <span className="text-sm font-medium text-muted">Correction Result</span>
      </div>

      <DiaryAttachments imageUrl={imageUrl} audioUrl={audioUrl} />

      <CorrectionResult correction={correction} />

      {/* Comments — shown for any public diary */}
      {entry.is_public && (
        <CommentsSection
          diaryEntryId={id}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
