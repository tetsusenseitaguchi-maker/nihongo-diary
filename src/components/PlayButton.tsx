"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/contexts/locale";
import { NativeGate } from "@/components/NativeGate";
import { AUDIO_LIFETIME_LIMIT } from "@/lib/audio-limits";

/**
 * 🔊 button that reads a piece of Japanese aloud through /api/tts.
 *
 * Takes the same ruby-annotated string that <Furigana> renders, so the audio
 * and the furigana on screen always agree — /api/tts turns the <rt> readings
 * into SSML <sub alias="…"> on the server (see lib/ruby-ssml.ts). Nothing here
 * parses or rebuilds ruby markup itself.
 *
 * The allowance is a LIFETIME one and is claimed server-side by try_use_audio.
 * This component never counts anything; it only reacts to the 429.
 */

export type PlayButtonKind = "word" | "expression" | "diary";

/**
 * 8ms of silence, 8kHz mono 8-bit PCM — 108 bytes inline, no network fetch.
 *
 * Exists purely so there is something for play() to start on inside the tap
 * handler. See the unlock comment in handleClick; a data: URI is required
 * because a real clip cannot be fetched without leaving the gesture.
 */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRmQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

/**
 * "You have used all N plays", plus an upgrade link on web only.
 *
 * The sentence itself is always rendered — a learner who taps 🔊 and gets
 * nothing needs to be told why. Only the link is gated: inside the Capacitor
 * iOS shell App Store Guideline 3.1.1 forbids pointing at outside payment, so
 * NativeGate drops it there and the neutral sentence stands alone.
 *
 * Exported so a caller rendering several PlayButtons can hoist ONE notice
 * instead of repeating it under every button.
 */
export function AudioLimitNotice({
  limit,
  className = "",
}: {
  limit: number;
  className?: string;
}) {
  const t = useT();
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted ${className}`}>
      <span>{t("audio.limitReached", { limit: String(limit) })}</span>
      <NativeGate>
        <a href="/upgrade" className="font-semibold text-moss-600 hover:text-pine">
          {t("audio.upgradeForMore")}
        </a>
      </NativeGate>
    </p>
  );
}

type Props = {
  /** Ruby-annotated Japanese, exactly as handed to <Furigana>. */
  text: string;
  /** Routes the server cache: "diary" is personal and stored per user. */
  kind?: PlayButtonKind;
  /**
   * Called instead of rendering the inline notice when the allowance runs out.
   * Give this to hoist the message somewhere the layout has room for it; leave
   * it off and the button reports the limit underneath itself.
   */
  onLimitReached?: (limit: number) => void;
  className?: string;
};

export function PlayButton({ text, kind = "word", onLimitReached, className = "" }: Props) {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  /**
   * ONE element for the life of the component. Reusing it is what makes the
   * unlock stick: iOS grants permission to the element that was played inside
   * the gesture, not to the page, so a fresh `new Audio()` per tap would have
   * to be unlocked again every time.
   */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Object URL of the fetched clip, kept so a replay costs no round trip. */
  const clipUrlRef = useRef<string | null>(null);

  // Keyed on `text`: if the caller swaps the word out, the cached clip is for
  // the wrong one. Cleanup also runs on unmount, which is what stops the
  // object URL leaking.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (clipUrlRef.current) {
        URL.revokeObjectURL(clipUrlRef.current);
        clipUrlRef.current = null;
      }
    };
  }, [text]);

  function handleClick() {
    if (status !== "idle" || limit !== null) return;

    // ── iOS Safari unlock — order matters, do not reorder ──────────────────
    // Everything from here to the first `await` runs synchronously inside the
    // tap handler. iOS only treats play() as user-initiated when it is reached
    // that way; put a single await in front of it and the call rejects with
    // NotAllowedError and the learner hears nothing.
    //
    // So the element is started here on 8ms of silence, and the real clip is
    // swapped into the same — by then unlocked — element once the fetch
    // resolves. Fetch first, play after, is the version that does not work.
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audio.onended = () => setStatus("idle");
      audioRef.current = audio;
    }

    const cached = clipUrlRef.current;
    audio.src = cached ?? SILENT_WAV;
    // Deliberately not awaited — awaiting would push the real play() below
    // out of the gesture. The rejection when the silent clip is cut short by
    // the src swap is expected and carries no information.
    void audio.play().catch(() => {});

    if (cached) {
      setStatus("playing");
      return;
    }

    setStatus("loading");
    setError(null);
    void fetchAndPlay(audio);
  }

  async function fetchAndPlay(audio: HTMLAudioElement) {
    let res: Response;
    try {
      res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, kind }),
      });
    } catch {
      audio.pause();
      setError(t("audio.networkError"));
      setStatus("idle");
      return;
    }

    if (!res.ok) {
      audio.pause();
      setStatus("idle");
      const data: { error?: string; limit?: number } = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const reached = data.limit ?? AUDIO_LIFETIME_LIMIT;
        setLimit(reached);
        onLimitReached?.(reached);
      } else {
        setError(t("audio.failed"));
      }
      return;
    }

    const url = URL.createObjectURL(await res.blob());
    clipUrlRef.current = url;
    audio.src = url;
    setStatus("playing");
    try {
      await audio.play();
    } catch {
      // The element was unlocked above, so this is a decode or autoplay-policy
      // failure rather than the iOS gesture rule.
      setError(t("audio.failed"));
      setStatus("idle");
    }
  }

  const busy = status === "loading";
  const blocked = limit !== null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || blocked}
        aria-label={t("audio.play")}
        title={t("audio.play")}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] leading-none text-moss-600 transition-colors hover:bg-mint/60 hover:text-pine disabled:opacity-40 ${className}`}
      >
        {busy ? (
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-moss border-t-transparent"
          />
        ) : (
          <span aria-hidden className={status === "playing" ? "animate-pulse" : undefined}>
            🔊
          </span>
        )}
      </button>

      {/* The icon carries the state visually; this is the same state for
          screen readers. Empty when idle so it announces nothing at rest. */}
      <span role="status" aria-live="polite" className="sr-only">
        {busy ? t("audio.loading") : status === "playing" ? t("audio.playing") : ""}
      </span>

      {blocked && !onLimitReached && <AudioLimitNotice limit={limit} />}
      {error && <span className="text-[11px] text-apricot">{error}</span>}
    </>
  );
}
