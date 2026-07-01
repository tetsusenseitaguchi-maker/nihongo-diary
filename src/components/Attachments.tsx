"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

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

type ValidationResult = { key: string; vars?: Record<string, string | number> } | null;

function validatePhoto(file: File): ValidationResult {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!PHOTO_EXTS.includes(ext))
    return { key: "attach.photoInvalidType", vars: { exts: PHOTO_EXTS.join(" / ") } };
  if (file.size > PHOTO_MAX_BYTES)
    return { key: "attach.photoTooLarge", vars: { maxMB: PHOTO_MAX_MB, sizeMB: (file.size / 1024 / 1024).toFixed(1) } };
  return null;
}

function validateAudio(file: File): ValidationResult {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!AUDIO_EXTS.includes(ext))
    return { key: "attach.audioInvalidType", vars: { exts: AUDIO_EXTS.join(" / ") } };
  if (file.size > AUDIO_MAX_BYTES)
    return { key: "attach.audioTooLarge", vars: { maxMB: AUDIO_MAX_MB, sizeMB: (file.size / 1024 / 1024).toFixed(1) } };
  return null;
}

// ── Recording helpers ──────────────────────────────────────────────────────

type RecState = "idle" | "requesting" | "recording" | "preview" | "denied" | "unsupported";

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function extFromMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

// ── Props ──────────────────────────────────────────────────────────────────

export interface AttachmentsProps {
  photoFile: File | null;
  audioFile: File | null;
  onPhotoChange: (file: File | null) => void;
  onAudioChange: (file: File | null) => void;
  /** Hide the entire photo section (buttons + preview). Used when caller renders the existing photo separately. */
  hidePhoto?: boolean;
  /** Hide the entire audio section (buttons + recording UI + preview). */
  hideAudio?: boolean;
}

// ── Attachments ────────────────────────────────────────────────────────────

export function Attachments({
  photoFile,
  audioFile,
  onPhotoChange,
  onAudioChange,
  hidePhoto = false,
  hideAudio = false,
}: AttachmentsProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const t = useT();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Recording state
  const [recState, setRecState] = useState<RecState>("idle");
  const [recSecs, setRecSecs] = useState(0);
  const [recPreviewUrl, setRecPreviewUrl] = useState<string | null>(null);
  const [recMime, setRecMime] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recBlobRef = useRef<Blob | null>(null);
  const recPreviewUrlRef = useRef<string | null>(null);

  // Revoke object URLs on unmount
  useEffect(() => {
    const photo = photoPreviewUrl;
    const audio = audioPreviewUrl;
    return () => {
      if (photo) URL.revokeObjectURL(photo);
      if (audio) URL.revokeObjectURL(audio);
      if (recPreviewUrlRef.current) URL.revokeObjectURL(recPreviewUrlRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Photo ───────────────────────────────────────────────────────────────

  function handlePhotoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validatePhoto(file);
    if (err) {
      setPhotoError(t(err.key, err.vars));
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

  // ── Audio file picker ───────────────────────────────────────────────────

  function handleAudioInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateAudio(file);
    if (err) {
      setAudioError(t(err.key, err.vars));
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
    // Also reset any lingering recording state
    setRecState("idle");
  }

  // ── MediaRecorder recording ─────────────────────────────────────────────

  async function startRecording() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecState("unsupported");
      return;
    }
    setRecState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      chunksRef.current = [];
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        recBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        recPreviewUrlRef.current = url;
        setRecMime(actualMime);
        setRecPreviewUrl(url);
        setRecState("preview");
      };

      recorder.start(250);
      setRecSecs(0);
      setRecState("recording");
      timerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch (err) {
      const error = err as Error;
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError" ||
        error.name === "SecurityError"
      ) {
        setRecState("denied");
      } else {
        setRecState("unsupported");
      }
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { recorderRef.current?.stop(); } catch { /* already stopped */ }
  }

  function useRecording() {
    const blob = recBlobRef.current;
    if (!blob) return;
    const mime = recMime || "audio/webm";
    const ext = extFromMime(mime);
    const file = new File([blob], `voice.${ext}`, { type: mime });

    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(file));

    if (recPreviewUrlRef.current) {
      URL.revokeObjectURL(recPreviewUrlRef.current);
      recPreviewUrlRef.current = null;
    }
    setRecPreviewUrl(null);
    recBlobRef.current = null;
    setRecState("idle");

    onAudioChange(file);
  }

  function retakeRecording() {
    if (recPreviewUrlRef.current) {
      URL.revokeObjectURL(recPreviewUrlRef.current);
      recPreviewUrlRef.current = null;
    }
    setRecPreviewUrl(null);
    recBlobRef.current = null;
    setRecState("idle");
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const isRecordingActive = recState === "requesting" || recState === "recording" || recState === "preview";

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-card">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
        {t("attach.heading")}
      </p>

      <div className="flex flex-wrap gap-2">
        {/* Photo picker */}
        {!hidePhoto && !photoFile && (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine transition-colors hover:bg-moss/20"
          >
            <Icon.camera className="h-4 w-4" />
            {t("attach.addPhoto")}
          </button>
        )}

        {/* Record voice button — only shown when idle and no audio yet */}
        {!hideAudio && !audioFile && recState === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine transition-colors hover:bg-moss/20"
          >
            <Icon.mic className="h-4 w-4" />
            {t("attach.recordVoice")}
          </button>
        )}

        {/* Upload audio file — hidden while recording/preview */}
        {!hideAudio && !audioFile && !isRecordingActive && (
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-pine transition-colors hover:border-moss hover:bg-mint/30"
          >
            <Icon.book className="h-4 w-4" />
            {t("attach.uploadAudio")}
          </button>
        )}
      </div>

      {/* ── Recording UI ─────────────────────────────────────────────── */}

      {/* Requesting permission */}
      {!hideAudio && recState === "requesting" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-mint/40 px-4 py-3 text-sm text-pine">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-moss/30 border-t-moss" />
          {t("attach.requestingMic")}
        </div>
      )}

      {/* Recording in progress */}
      {!hideAudio && recState === "recording" && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-apricot/30 bg-apricot/10 px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-apricot">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-apricot" />
            {t("attach.recording")}
          </span>
          <span className="font-mono text-sm font-bold text-pine">{fmtTime(recSecs)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-1.5 text-xs font-semibold text-cream hover:opacity-90"
          >
            <span className="h-3 w-3 rounded-sm bg-cream" />
            {t("attach.stop")}
          </button>
        </div>
      )}

      {/* Preview after recording */}
      {!hideAudio && recState === "preview" && recPreviewUrl && (
        <div className="mt-3 rounded-xl border border-moss/30 bg-mint/20 p-3">
          <p className="mb-2 text-xs font-semibold text-moss-600">{t("attach.recordingPreview")}</p>
          <audio controls src={recPreviewUrl} className="h-9 w-full max-w-xs" />
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={useRecording}
              className="inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-xs font-semibold text-cream hover:opacity-90"
            >
              <Icon.check className="h-3.5 w-3.5" />
              {t("attach.useThis")}
            </button>
            <button
              type="button"
              onClick={retakeRecording}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-pine hover:border-moss"
            >
              ↺ {t("attach.reRecord")}
            </button>
          </div>
        </div>
      )}

      {/* Microphone denied */}
      {!hideAudio && recState === "denied" && (
        <div className="mt-3 rounded-xl bg-apricot/10 px-4 py-3 text-sm text-apricot">
          <p className="font-semibold">{t("attach.micDenied")}</p>
          <p className="mt-0.5 text-xs text-apricot/80">
            {t("attach.micDeniedDetail")}
          </p>
          <button
            type="button"
            onClick={() => setRecState("idle")}
            className="mt-2 text-xs font-semibold underline hover:opacity-80"
          >
            {t("attach.tryAgain")}
          </button>
        </div>
      )}

      {/* MediaRecorder not supported */}
      {!hideAudio && recState === "unsupported" && (
        <div className="mt-3 rounded-xl bg-sand/60 px-4 py-3 text-sm text-ink/70">
          {t("attach.unsupported")}
          <button
            type="button"
            onClick={() => setRecState("idle")}
            className="ml-2 text-xs font-semibold text-pine underline hover:opacity-80"
          >
            {t("attach.dismiss")}
          </button>
        </div>
      )}

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
      {((!hidePhoto && photoFile) || (!hideAudio && audioFile)) && (
        <div className="mt-4 space-y-3">
          {!hidePhoto && photoFile && photoPreviewUrl && (
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreviewUrl}
                alt="Photo preview"
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
                  {t("attach.remove")}
                </button>
              </div>
            </div>
          )}

          {!hideAudio && audioFile && audioPreviewUrl && (
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
                  {t("attach.remove")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      {!hidePhoto && (
        <input
          ref={photoInputRef}
          type="file"
          accept={PHOTO_ACCEPT}
          onChange={handlePhotoInput}
          className="hidden"
        />
      )}
      {!hideAudio && (
        <input
          ref={audioInputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          onChange={handleAudioInput}
          className="hidden"
        />
      )}
    </div>
  );
}
