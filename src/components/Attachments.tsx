"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function Attachments() {
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (photo) URL.revokeObjectURL(photo);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      if (photo) URL.revokeObjectURL(photo);
      setPhoto(URL.createObjectURL(f));
    }
  }

  function removePhoto() {
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function toggleRecord() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        setRecording(false);
      };
      mr.start();
      recRef.current = mr;
      setMicError(null);
      setSecs(0);
      setRecording(true);
      timerRef.current = window.setInterval(
        () => setSecs((s) => s + 1),
        1000,
      );
    } catch {
      setMicError("Couldn't access the mic — check your browser permission.");
    }
  }

  function removeAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSecs(0);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-card">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
        Attachments
      </p>

      <div className="flex flex-wrap gap-2">
        {/* Photo */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-pine transition-colors hover:bg-moss/20"
        >
          <Icon.camera className="h-4 w-4" /> Add photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPhoto}
          className="hidden"
        />

        {/* Voice */}
        <button
          type="button"
          onClick={toggleRecord}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            recording
              ? "bg-apricot/20 text-apricot"
              : "bg-mint text-pine hover:bg-moss/20"
          }`}
        >
          {recording ? (
            <>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-apricot" />
              Stop · {fmt(secs)}
            </>
          ) : (
            <>
              <Icon.mic className="h-4 w-4" /> Record voice
            </>
          )}
        </button>
      </div>

      {micError && <p className="mt-2 text-xs text-apricot">{micError}</p>}

      {/* Previews */}
      {(photo || audioUrl) && (
        <div className="mt-4 space-y-3">
          {photo && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="Diary attachment"
                className="h-20 w-20 rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-apricot"
              >
                <Icon.trash className="h-4 w-4" /> Remove photo
              </button>
            </div>
          )}

          {audioUrl && (
            <div className="flex items-center gap-3">
              <audio controls src={audioUrl} className="h-9 w-full max-w-xs" />
              <button
                type="button"
                onClick={removeAudio}
                aria-label="Remove voice note"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:text-apricot"
              >
                <Icon.trash className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
