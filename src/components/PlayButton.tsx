"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
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

/**
 * Sentence-final punctuation, in both widths. Used only to avoid doubling it
 * when stitching parts together below.
 */
const SENTENCE_END = /[。．.！!？?…]$/;

/**
 * Stitch several pieces into the ONE string that gets synthesised.
 *
 * Why one string and not one request per piece: a request is a request, and
 * every miss claims a lifetime credit. Playing 「まちがい」 then 「ただしい」 as
 * two fetches costs two credits for what the learner experiences as a single
 * before/after — the exact doubling a combined button is meant to avoid.
 *
 * The gap between them comes from a full stop, because it has to. A precise
 * pause would be SSML <break time="500ms"/>, and the client cannot send that:
 * /api/tts escapes everything it is given before wrapping it (rubyToSsml), so
 * markup would be read out as literal characters. A sentence boundary is what
 * is left, and ja-JP-Wavenet-A rests roughly half a second on one.
 */
function joinForOneRequest(parts: string[]): string {
  const kept = parts.map((p) => p.trim()).filter(Boolean);
  return kept
    .map((p, i) => (i === kept.length - 1 || SENTENCE_END.test(p) ? p : `${p}。`))
    .join("");
}

/**
 * sm sits in a chip or a list row; md is the one on the main sentence.
 *
 * `icon` is a circle just big enough for the glyph; `labelled` drops the fixed
 * width for a pill that grows with the text, which matters because "Listen"
 * is the shortest of the nine translations (Anhören, Escuchar, Écouter).
 *
 * These were 20/14 and 28/16 and nobody noticed the button was a button. Both
 * steps went up. Even 32px is under the 44px Apple asks for, which is the real
 * argument for the labelled pill wherever there is room for one: a 70px-wide
 * target is hit on the first try in a way a 24px circle is not.
 */
const SIZES = {
  sm: { icon: "h-6 w-6", labelled: "gap-1 px-2 py-1 text-[11px]", glyph: "h-4 w-4", spinner: "h-3 w-3" },
  md: {
    icon: "h-8 w-8",
    labelled: "gap-1.5 px-3 py-1.5 text-xs",
    glyph: "h-[18px] w-[18px]",
    spinner: "h-4 w-4",
  },
} as const;

type Props = {
  /**
   * Ruby-annotated Japanese, exactly as handed to <Furigana>. An array is
   * spoken as one clip with a pause between the parts — see
   * joinForOneRequest for why it is not one request each.
   */
  text: string | string[];
  /** Routes the server cache: "diary" is personal and stored per user. */
  kind?: PlayButtonKind;
  /**
   * Called instead of rendering the inline notice when the allowance runs out.
   * Give this to hoist the message somewhere the layout has room for it; leave
   * it off and the button reports the limit underneath itself.
   */
  onLimitReached?: (limit: number) => void;
  /**
   * Turns the button off from outside. A screen with several buttons uses this
   * to close the rest once any one of them has hit the shared allowance —
   * a button's own limit state only ever disables itself.
   */
  disabled?: boolean;
  /** Accessible name. Defaults to a generic "Play audio". */
  label?: string;
  /**
   * Show the word "Listen" next to the icon.
   *
   * Only where the layout has room for it — the vocabulary page. The saved-word
   * chips scroll sideways in an 82px window on a 320px screen, and the
   * correction result puts these in half-width columns under a card whose
   * top-right corner is occupied by the よく書けました stamp. In both, the icon
   * alone is what fits, and the accessible name carries the meaning.
   */
  showLabel?: boolean;
  /**
   * Playback speed multiplier, 1 being the clip as synthesised.
   *
   * Relative to TTS_SPEAKING_RATE, not to natural Japanese: the audio is
   * already generated slightly slow, so 1 here is the speed every other button
   * in the app plays at.
   */
  rate?: number;
  size?: keyof typeof SIZES;
  className?: string;
};

export function PlayButton({
  text,
  kind = "word",
  onLimitReached,
  disabled = false,
  label,
  showLabel = false,
  rate = 1,
  size = "sm",
  className = "",
}: Props) {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  // The one string that is sent, cached and keyed on. Derived rather than held
  // in state, and a string rather than the raw prop, so that passing an array
  // literal — a fresh reference every render — does not retrigger the effect
  // below and throw the cached clip away on each parent render.
  const speech = Array.isArray(text) ? joinForOneRequest(text) : text;

  /**
   * ONE element for the life of the component. Reusing it is what makes the
   * unlock stick: iOS grants permission to the element that was played inside
   * the gesture, not to the page, so a fresh `new Audio()` per tap would have
   * to be unlocked again every time.
   */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Object URL of the fetched clip, kept so a replay costs no round trip. */
  const clipUrlRef = useRef<string | null>(null);

  // Keyed on the spoken string: if the caller swaps the word out, the cached
  // clip is for the wrong one. Cleanup also runs on unmount, which is what
  // stops the object URL leaking.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (clipUrlRef.current) {
        URL.revokeObjectURL(clipUrlRef.current);
        clipUrlRef.current = null;
      }
    };
  }, [speech]);

  /**
   * Speed, without spending anything.
   *
   * The clip is synthesised once at TTS_SPEAKING_RATE and the browser stretches
   * it, so changing speed replays the SAME file: no request, no credit, no
   * second object in the bucket. Asking Google for another rate would change
   * the /api/tts cache key and bill a fresh synthesis for every step.
   *
   * defaultPlaybackRate as well as playbackRate, and re-applied after EVERY
   * src assignment, because assigning src runs the media load algorithm and
   * that resets playbackRate back to defaultPlaybackRate. Set one only and the
   * speed silently reverts the moment the fetched clip replaces the silence.
   *
   * preservesPitch is the default in every current browser; it is written out
   * because the failure it prevents — a chipmunk voice — is one nobody would
   * ship on purpose, and relying on a default for that is not worth the risk.
   */
  function applyRate(audio: HTMLAudioElement) {
    audio.preservesPitch = true;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
  }

  // A speed picked mid-clip takes effect at once rather than on the next tap.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) applyRate(audio);
    // applyRate closes over `rate`, which is the only thing it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  function handleClick() {
    if (status !== "idle" || limit !== null || disabled) return;

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
    applyRate(audio);
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
        body: JSON.stringify({ text: speech, kind }),
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
    applyRate(audio);
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
  const name = label ?? t("audio.play");
  const sizing = SIZES[size];

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || blocked || disabled}
        aria-label={name}
        title={name}
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-moss-600 transition-colors hover:bg-mint/60 hover:text-pine disabled:opacity-40 ${
          showLabel ? sizing.labelled : sizing.icon
        } ${className}`}
      >
        {busy ? (
          <span
            aria-hidden
            className={`inline-block ${sizing.spinner} animate-spin rounded-full border-2 border-moss border-t-transparent`}
          />
        ) : (
          <Icon.speaker
            aria-hidden
            className={`${sizing.glyph} ${status === "playing" ? "animate-pulse" : ""}`}
          />
        )}
        {showLabel && <span aria-hidden>{t("audio.listen")}</span>}
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
