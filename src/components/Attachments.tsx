"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

// ── Validation ─────────────────────────────────────────────────────────────

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const PHOTO_MAX_MB = 5;
const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;
const PHOTO_EXTS = ["jpg", "jpeg", "png", "webp"];

// audio/x-m4a covers some browsers' MIME type for .m4a files
const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/x-m4a,.mp3,.m4a,.wav,.webm";
const AUDIO_MAX_MB = 10;
const AUDIO_MAX_BYTES = AUDIO_MAX_MB * 1024 * 1024;
const AUDIO_EXTS = ["mp3", "m4a", "wav", "webm"];

function validatePhoto(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PHOTO_EXTS.includes(ext))
    return `対応形式は ${PHOTO_EXTS.join(" / ")} です。`;
  if (file.size > PHOTO_MAX_BYTES)
    return `写真は ${PHOTO_MAX_MB}MB 以下にしてください（現在: ${(file.size / 1024 / 1024).toFixed(1)}MB）。`;
  return null;
}

function validateAudio(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!AUDIO_EXTS.includes(ext))
    return `対応形式は ${AUDIO_EXTS.join(" / ")} です。`;
  if (file.size > AUDIO_MAX_BYTES)
    return `音声ファイルは ${AUDIO_MAX_MB}MB 以下にしてください（現在: ${(file.size / 1024 / 1024).toFixed(1)}MB）。`;
  return null;
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface AttachmentsProps {
  photoFile: File | null;
  audioFile: File | null;
  onPhotoChange: (file: File | null) => void;
  /**
   * Called with a validated File from the file picker.
   *
   * [future] Browser recording will call this the same way after MediaRecorder
   * stops — the upload path in write/page.tsx is identical for both sources:
   *
   *   const blob = new Blob(chunks, { type: "audio/webm" });
   *   onAudioChange(new File([blob], "voice.webm", { type: "audio/webm" }));
   */
  onAudioChange: (file: File | null) => void;
}

// ── Attachments (write-page picker) ───────────────────────────────────────

export function Attachments({
  photoFile,
  audioFile,
  onPhotoChange,
  onAudioChange,
}: AttachmentsProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    const photo = photoPreviewUrl;
    const audio = audioPreviewUrl;
    return () => {
      if (photo) URL.revokeObjectURL(photo);
      if (audio) URL.revokeObjectURL(audio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePhotoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validatePhoto(file);
    if (err) {
      setPhotoError(err);
      e.target.value = "";
      return;
    }
    setPhotoError(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    onPhotoChange(file);
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    onPhotoChange(null);
  }

  function handleAudioInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateAudio(file);
    if (err) {
      setAudioError(err);
      e.target.value = "";
      return;
    }
    setAudioError(null);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(file));
    onAudioChange(file);
  }

  function removeAudio() {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setAudioError(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
    onAudioChange(null);
  }

  // ── [future] Browser recording hook ─────────────────────────────────────
  // Add a "録音" button here. On MediaRecorder stop, convert the blob to a
  // File and call onAudioChange — write/page.tsx uploads it identically to a
  // picked file:
  //
  //   const blob = new Blob(chunks, { type: "audio/webm" });
  //   onAudioChange(new File([blob], "voice.webm", { type: "audio/webm" }));
  //
  // Keep MediaRecorder state (isRecording, elapsedSecs, recorderRef) local
  // to this component so write/page.tsx stays unchanged.
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-card">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
        Attachments
      </p>

      <div className="flex flex-wrap gap-2">
        {/* Photo picker — hidden once a file is selected */}
        {!photoFile && (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine transition-colors hover:bg-moss/20"
          >
            <Icon.camera className="h-4 w-4" />
            写真を追加
            <span className="text-xs font-normal text-muted">Add photo</span>
          </button>
        )}

        {/* Audio file picker — hidden once a file is selected */}
        {!audioFile && (
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine transition-colors hover:bg-moss/20"
          >
            <Icon.mic className="h-4 w-4" />
            音声を追加
            <span className="text-xs font-normal text-muted">Add audio</span>
          </button>
        )}

        {/* [future] 録音ボタン (MediaRecorder) をここに追加 */}
      </div>

      {/* Validation errors */}
      {photoError && (
        <p className="mt-2 rounded-lg bg-apricot/10 px-3 py-1.5 text-xs text-apricot">
          {photoError}
        </p>
      )}
      {audioError && (
        <p className="mt-2 rounded-lg bg-apricot/10 px-3 py-1.5 text-xs text-apricot">
          {audioError}
        </p>
      )}

      {/* Previews */}
      {(photoFile || audioFile) && (
        <div className="mt-4 space-y-3">
          {photoFile && photoPreviewUrl && (
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreviewUrl}
                alt="添付写真プレビュー"
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">
                  {photoFile.name}
                </p>
                <p className="text-xs text-muted">
                  {(photoFile.size / 1024).toFixed(0)} KB
                </p>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-apricot"
                >
                  <Icon.trash className="h-3.5 w-3.5" />
                  削除
                </button>
              </div>
            </div>
          )}

          {audioFile && audioPreviewUrl && (
            <div className="space-y-1.5">
              <audio
                controls
                src={audioPreviewUrl}
                className="h-9 w-full max-w-xs"
              />
              <div className="flex items-center gap-3">
                <p className="min-w-0 truncate text-xs text-muted">
                  {audioFile.name} ·{" "}
                  {(audioFile.size / 1024).toFixed(0)} KB
                </p>
                <button
                  type="button"
                  onClick={removeAudio}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-apricot"
                >
                  <Icon.trash className="h-3.5 w-3.5" />
                  削除
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        onChange={handlePhotoInput}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        onChange={handleAudioInput}
        className="hidden"
      />
    </div>
  );
}
