import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CorrectionResult } from "@/components/CorrectionResult";
import { PublicToggle } from "@/components/PublicToggle";
import { DiaryAttachments } from "@/components/DiaryAttachments";
import { DeleteDiaryButton } from "@/components/DeleteDiaryButton";
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

  if (!entry) notFound();

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

  // Resolve public URLs for attachments (synchronous — no network call)
  const imageUrl = entry.image_path
    ? supabase.storage.from("diary-images").getPublicUrl(entry.image_path).data.publicUrl
    : null;
  const audioUrl = entry.audio_path
    ? supabase.storage.from("diary-audio").getPublicUrl(entry.audio_path).data.publicUrl
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss-600 hover:text-pine"
      >
        <Icon.arrow className="h-4 w-4 rotate-180" /> 過去の日記にもどる
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-pine">
          {formatLong(entry.diary_date)}
        </h1>
        {entry.level && <Badge tone="moss">{entry.level}</Badge>}
        {entry.correction_style && <Badge tone="sand">{entry.correction_style}</Badge>}
        {entry.user_id === user.id && (
          <span className="ml-auto flex items-center gap-2">
            <PublicToggle diaryId={id} initialPublic={Boolean(entry.is_public)} />
            <DeleteDiaryButton diaryId={id} redirectAfter />
          </span>
        )}
      </div>

      {entry.user_id === user.id && (
        <p className="-mt-3 text-xs text-muted">
          Public diaries can appear on your profile and in followers&apos; feeds. Private diaries are only visible to you.
        </p>
      )}

      <div className="flex items-center gap-2">
        <span>🌸</span>
        <h2 className="font-serif text-xl font-bold text-pine">添削結果</h2>
        <span className="text-sm font-medium text-muted">Correction Result</span>
      </div>

      <DiaryAttachments imageUrl={imageUrl} audioUrl={audioUrl} />

      <CorrectionResult correction={correction} />
    </div>
  );
}
