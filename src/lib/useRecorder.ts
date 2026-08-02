"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stopAllPlayback } from "@/lib/audio-bus";

/**
 * MediaRecorder, as a hook.
 *
 * The logic is lifted from Attachments.tsx, which has been recording diary
 * attachments since long before this file existed and had already learned the
 * things worth keeping: pick a MIME type the browser admits to supporting, tell
 * a denied microphone apart from a missing MediaRecorder, and stop every track
 * when the take ends.
 *
 * Attachments.tsx is deliberately NOT switched over to this hook in the same
 * change that introduces it. That component is shipped and works; rewriting it
 * to prove a new abstraction is how working code breaks. The duplication is
 * temporary and known — moving it across is a separate, testable change.
 */

export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "preview"
  | "denied"
  | "unsupported";

/**
 * The first type the browser admits to supporting.
 *
 * Order matters. Opus in WebM is the small one and what Chrome, Firefox and
 * Android produce. audio/mp4 is here for iOS and Safari, which do not do WebM
 * at all — drop that entry and recording silently fails on every iPhone.
 *
 * An empty string means "let MediaRecorder choose", which is not the same as
 * failure: some browsers support recording but report nothing through
 * isTypeSupported.
 */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/**
 * File extension for a recorded MIME type. The string can carry parameters
 * ("audio/webm;codecs=opus"), so this matches on a substring rather than
 * comparing whole values.
 */
export function extFromMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export interface Recorder {
  state: RecorderState;
  /** Seconds elapsed in the current take. */
  seconds: number;
  /** Object URL for the finished take — only set while state is "preview". */
  previewUrl: string | null;
  /** The finished take. Null until state is "preview". */
  blob: Blob | null;
  /** MIME type the recording actually came out as; pair with extFromMime. */
  mimeType: string;
  /** True when the take was cut short by maxSeconds rather than by the learner. */
  hitTimeLimit: boolean;
  start: () => Promise<void>;
  stop: () => void;
  /** Throw the take away and go back to idle, ready to record again. */
  reset: () => void;
}

export function useRecorder({ maxSeconds }: { maxSeconds: number }): Recorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("");
  const [hitTimeLimit, setHitTimeLimit] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function revokePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  // Unmount: a navigation mid-take must not leave the microphone open or the
  // object URL dangling. The recording itself is abandoned, which is correct —
  // there is nowhere left to put it.
  useEffect(() => {
    return () => {
      clearTimer();
      revokePreview();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    try {
      recorderRef.current?.stop();
    } catch {
      /* already stopped — onstop has run or never will */
    }
  }, []);

  const start = useCallback(async () => {
    // FIRST, and synchronously — before any await, so it still counts as part
    // of the tap. Nothing may be playing when the microphone opens: the model
    // voice would bleed into the take, and on iOS the audio session is about to
    // change category underneath whatever is running. See lib/audio-bus.ts.
    stopAllPlayback();

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }

    setHitTimeLimit(false);
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const preferred = pickMimeType();
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // ⚠️ Releasing the tracks is not optional and not just tidiness. On iOS
        // the AVAudioSession stays in playAndRecord while any track is live,
        // and every clip played afterwards comes out quiet or routed to the
        // earpiece instead of the speaker. The audio still "works", so the bug
        // reads as a mysterious volume problem that only appears after someone
        // has recorded. Attachments.tsx:203 does the same thing for the same
        // reason.
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const actual = recorder.mimeType || preferred || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actual });
        blobRef.current = blob;

        revokePreview();
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;

        setMimeType(actual);
        setPreviewUrl(url);
        setState("preview");
      };

      // 250ms timeslices, so a take that is interrupted still has most of its
      // audio in chunksRef rather than sitting undelivered inside the recorder.
      recorder.start(250);
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= maxSeconds) {
            // Someone walked away with the recorder running. Stop rather than
            // upload however many minutes it has been.
            setHitTimeLimit(true);
            stop();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      const error = err as Error;
      // A refusal is worth telling apart from a browser that cannot do this at
      // all: one has a way forward (allow it in settings), the other does not.
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError" ||
        error.name === "SecurityError"
      ) {
        setState("denied");
      } else {
        setState("unsupported");
      }
    }
  }, [maxSeconds, stop]);

  const reset = useCallback(() => {
    clearTimer();
    revokePreview();
    blobRef.current = null;
    setPreviewUrl(null);
    setSeconds(0);
    setHitTimeLimit(false);
    setState("idle");
  }, []);

  return {
    state,
    seconds,
    previewUrl,
    blob: blobRef.current,
    mimeType,
    hitTimeLimit,
    start,
    stop,
    reset,
  };
}
