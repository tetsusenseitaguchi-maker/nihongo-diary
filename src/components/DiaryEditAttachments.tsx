"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Icon } from "@/components/icons";
import { Attachments } from "@/components/Attachments";
import { useT } from "@/contexts/locale";
import type { DiaryPlace } from "@/lib/types";

const DiaryMapPicker = dynamic(
  () => import("@/components/DiaryMapPicker").then((m) => m.DiaryMapPicker),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-2xl bg-mint/30" /> }
);

interface SavedPlace {
  id: string;
  lat: number;
  lng: number;
  place_name: string | null;
}

interface Props {
  diaryId: string;
  imageUrl: string | null;
  audioUrl: string | null;
  hasExistingImage: boolean;
  hasExistingAudio: boolean;
  savedPlaces: SavedPlace[];
}

export function DiaryEditAttachments({
  diaryId,
  imageUrl,
  audioUrl,
  hasExistingImage,
  hasExistingAudio,
  savedPlaces,
}: Props) {
  const router = useRouter();
  const t = useT();
  const [editing, setEditing] = useState(false);

  // New files picked via Attachments component
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [places, setPlaces] = useState<DiaryPlace[]>(() =>
    savedPlaces.map((p) => ({ lat: p.lat, lng: p.lng, name: p.place_name ?? "" }))
  );

  // Flags to delete existing server files on save
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEdit() {
    setPhotoFile(null);
    setAudioFile(null);
    setPlaces(savedPlaces.map((p) => ({ lat: p.lat, lng: p.lng, name: p.place_name ?? "" })));
    setRemoveExistingPhoto(false);
    setRemoveExistingAudio(false);
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setPhotoFile(null);
    setAudioFile(null);
    setRemoveExistingPhoto(false);
    setRemoveExistingAudio(false);
    setSaveError(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const fd = new FormData();
    if (photoFile) {
      fd.append("photo", photoFile);
    } else if (removeExistingPhoto) {
      fd.append("removePhoto", "true");
    }
    if (audioFile) {
      fd.append("audio", audioFile);
    } else if (removeExistingAudio) {
      fd.append("removeAudio", "true");
    }
    fd.append("places", JSON.stringify(places.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name }))));

    try {
      const res = await fetch(`/api/diary/${diaryId}`, {
        method: "PATCH",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError((data as { error?: string }).error ?? t("diary.attachmentsSaveError"));
        setSaving(false);
        return;
      }
      // Refresh server components to show updated data without navigating away
      router.refresh();
      setEditing(false);
    } catch {
      setSaveError(t("diary.attachmentsSaveError"));
      setSaving(false);
    }
  }

  // Whether the existing server files are still "active" in the edit UI
  const showExistingPhoto = hasExistingImage && !removeExistingPhoto && !photoFile;
  const showExistingAudio = hasExistingAudio && !removeExistingAudio && !audioFile;

  // ── View mode ──────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <button
        type="button"
        onClick={openEdit}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-pine transition-colors hover:border-moss hover:bg-mint/40"
      >
        <Icon.pen className="h-4 w-4" />
        {t("diary.editAttachments")}
      </button>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 rounded-[var(--radius-card)] border border-moss/50 bg-mint/10 p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-serif text-lg font-bold text-pine">
          {t("diary.editingAttachments")}
        </p>
        <button
          type="button"
          onClick={cancelEdit}
          className="text-sm font-medium text-muted hover:text-pine"
        >
          {t("diary.cancelEdit")} ×
        </button>
      </div>

      {/* Existing photo — shown while not removed and no new file selected */}
      {showExistingPhoto && imageUrl && (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-paper p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Current photo"
            className="h-24 w-24 shrink-0 rounded-xl object-cover"
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {t("diary.currentPhoto")}
            </p>
            <button
              type="button"
              onClick={() => setRemoveExistingPhoto(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:border-apricot hover:text-apricot"
            >
              <Icon.trash className="h-3.5 w-3.5" />
              {t("diary.removePhoto")}
            </button>
          </div>
        </div>
      )}

      {/* Existing audio — shown while not removed and no new audio selected */}
      {showExistingAudio && audioUrl && (
        <div className="rounded-xl border border-line bg-paper p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            {t("diary.currentAudio")}
          </p>
          <audio controls src={audioUrl} className="w-full max-w-xs h-9" />
          <button
            type="button"
            onClick={() => setRemoveExistingAudio(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted hover:border-apricot hover:text-apricot"
          >
            <Icon.trash className="h-3.5 w-3.5" />
            {t("diary.removeAudio")}
          </button>
        </div>
      )}

      {/* New-file picker — hidden sections for slots covered by existing-file UI */}
      {(!showExistingPhoto || !showExistingAudio) && (
        <Attachments
          photoFile={photoFile}
          audioFile={audioFile}
          onPhotoChange={setPhotoFile}
          onAudioChange={setAudioFile}
          hidePhoto={showExistingPhoto}
          hideAudio={showExistingAudio}
        />
      )}

      {/* Location / map */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          📍 {t("map.heading")}
        </p>
        <DiaryMapPicker places={places} onPlacesChange={setPlaces} />
      </div>

      {/* Error */}
      {saveError && (
        <p className="rounded-lg bg-apricot/10 px-3 py-2 text-sm text-apricot">
          {saveError}
        </p>
      )}

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-cream shadow-lift transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/30 border-t-cream" />
              {t("diary.savingAttachments")}
            </>
          ) : (
            <>
              <Icon.check className="h-4 w-4" />
              {t("diary.saveAttachments")}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={saving}
          className="rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-pine hover:border-moss disabled:opacity-60"
        >
          {t("diary.cancelEdit")}
        </button>
      </div>
    </div>
  );
}
