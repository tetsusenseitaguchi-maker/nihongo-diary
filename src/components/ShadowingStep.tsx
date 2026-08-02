"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { Furigana } from "@/components/Furigana";
import { PlayButton } from "@/components/PlayButton";
import { NativeGate } from "@/components/NativeGate";
import { createClient } from "@/lib/supabase/client";
import { useRecorder, extFromMime } from "@/lib/useRecorder";
import { useT } from "@/contexts/locale";
import {
  SHADOWING_BUCKET,
  SHADOWING_MAX_BYTES,
  SHADOWING_MAX_SECONDS,
} from "@/lib/shadowing-limits";

/**
 * Read the corrected sentence aloud, before the explanation is shown.
 *
 * ── Why this is a gate and not just another card ────────────────────────────
 * The correction result puts the natural version at the top and the reasoning
 * underneath, so a learner who scrolls straight past it never says anything out
 * loud. Standing in front of the rest for one sentence is the whole feature:
 * speak first, then read why.
 *
 * It is a gate the learner can always walk through. Skipping is one tap, costs
 * nothing, and is never punished — a step that traps people is a step they
 * learn to dread. Nothing here scores, marks or compares the recording. Saying
 * it out loud IS the exercise; the audio is kept only so it can be listened
 * back to later.
 *
 * ── Why it lives here and not in CorrectionResult ───────────────────────────
 * CorrectionResult renders in four places, one of them the tutorial, on a fake
 * diary. Same reason DictationLink sits outside it. The write page decides for
 * itself whether to show this, so the tour cannot.
 */

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * "pending" holds the rest of the result back. Both other values let it
 * through — the difference is only what the collapsed bar says afterwards, and
 * whether the learner is offered a way back in.
 */
export type ShadowingOutcome = "pending" | "recorded" | "skipped";

export function ShadowingStep({
  natural,
  entryId,
  remaining,
  outcome,
  onOutcome,
  onCounted,
}: {
  /** Ruby-annotated natural version, exactly as CorrectionResult renders it. */
  natural: string;
  /**
   * The saved diary's id, which the storage path is built from.
   *
   * Null while the auto-save that follows a correction is still in flight, and
   * permanently null if that save failed. Recording is allowed either way —
   * only the upload needs an id, and losing the file is not a reason to stop
   * someone reading a sentence aloud.
   */
  entryId: string | null;
  /** Recordings left today. null = unlimited (paid plans). */
  remaining: number | null;
  outcome: ShadowingOutcome;
  onOutcome: (outcome: ShadowingOutcome) => void;
  /** Fired once a recording has actually been counted, so the page's own
   *  remaining count can follow without re-reading the table. */
  onCounted: () => void;
}) {
  const t = useT();
  const rec = useRecorder({ maxSeconds: SHADOWING_MAX_SECONDS });
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const usedUp = remaining !== null && remaining <= 0;

  // ── Collapsed bar, once the learner has moved on ────────────────────────
  // The card stays on the page rather than vanishing: it is the record of what
  // happened, and after a skip it is the way back in.
  if (outcome !== "pending") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-card)] border border-line bg-paper px-5 py-3">
        {outcome === "recorded" ? (
          <p className="text-sm font-semibold text-moss-600">
            ✓ {t("shadowing.doneRecorded")}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">{t("shadowing.doneSkipped")}</p>
            {!usedUp && (
              <button
                type="button"
                onClick={() => onOutcome("pending")}
                className="text-xs font-semibold text-moss-600 underline-offset-2 hover:underline"
              >
                {t("shadowing.readInstead")}
              </button>
            )}
          </>
        )}
        {saveFailed && (
          <p className="w-full text-xs text-muted">{t("shadowing.saveFailed")}</p>
        )}
      </div>
    );
  }

  /**
   * Upload the take, then claim today's slot — in that order.
   *
   * The claim goes last so a failed upload costs the learner nothing: they keep
   * the day's recording and can try again. This is the ordering
   * /api/shadowing/use documents, and the reason no refund function exists.
   *
   * Returns false when the audio could not be stored. The learner still moves
   * on either way — they did the exercise, and the file is the souvenir, not
   * the point.
   */
  async function persist(): Promise<boolean> {
    const blob = rec.blob;
    if (!blob || !entryId) return false;
    if (blob.size > SHADOWING_MAX_BYTES) return false;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // The first path segment has to be the user id — the storage policies match
    // on it (supabase/add-shadowing-audio.sql). upsert because a re-record
    // replaces the take rather than adding one.
    //
    // The extension follows what the browser produced, so the same diary read
    // on a phone (m4a) and later on a laptop (webm) would leave one orphan.
    // The daily limit makes that combination rare enough to leave alone.
    const ext = extFromMime(rec.mimeType);
    const path = `${user.id}/${entryId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(SHADOWING_BUCKET)
      .upload(path, blob, { contentType: rec.mimeType, upsert: true });
    if (upErr) {
      console.error("[shadowing] upload failed:", upErr.message);
      return false;
    }

    await supabase
      .from("diary_entries")
      .update({ shadowing_audio_path: path })
      .eq("id", entryId);

    // A 429 here means the day was already used up — the recording is stored
    // and the learner moves on regardless. Nothing to undo.
    const res = await fetch("/api/shadowing/use", { method: "POST" });
    if (res.ok) onCounted();
    return true;
  }

  async function handleKeep() {
    setSaving(true);
    setSaveFailed(false);
    let ok = false;
    try {
      ok = await persist();
    } catch (err) {
      console.error("[shadowing] save failed:", err);
    }
    setSaving(false);
    setSaveFailed(!ok);
    onOutcome("recorded");
  }

  const busy = saving || rec.state === "requesting" || rec.state === "recording";

  return (
    <div
      className="gloss-panel rounded-[var(--radius-card)] p-6"
      style={tint("--color-tint-sage")}
    >
      <p className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-bold text-pine">🎙 {t("shadowing.heading")}</span>
        <Furigana text="音読(おんどく)" className="font-jp text-xs text-muted" />
      </p>

      <p className="mb-4 text-sm leading-relaxed text-ink/70">{t("shadowing.intro")}</p>

      {/* The same sentence, in the same tint as the natural-Japanese card it
          will reappear in once the result opens up. */}
      <p className="font-jp text-[17px] leading-loose text-ink">
        <Furigana text={natural} />
      </p>

      {/* Listen first. Same text and same kind as the button inside
          CorrectionResult, so both resolve to one cached clip at /api/tts and
          hearing it here costs nothing extra later. */}
      <div className="mt-3">
        <PlayButton
          text={natural}
          kind="diary"
          label={t("audio.playSentence")}
          showLabel
          size="md"
          disabled={busy}
        />
      </div>

      {/* ── Today's allowance is gone ──────────────────────────────────── */}
      {usedUp ? (
        <div className="mt-5">
          <p className="text-sm text-ink/70">{t("shadowing.usedToday")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOutcome("skipped")}
              className="gloss-btn rounded-full px-4 py-2 text-sm font-semibold text-cream hover:brightness-105"
            >
              {t("shadowing.continueAnyway")}
            </button>
            <NativeGate>
              <a
                href="/upgrade"
                className="text-xs font-semibold text-moss-600 hover:text-pine"
              >
                {t("shadowing.upgradeForMore")}
              </a>
            </NativeGate>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          {/* ── Idle ─────────────────────────────────────────────────── */}
          {rec.state === "idle" && (
            <button
              type="button"
              onClick={() => void rec.start()}
              className="inline-flex items-center gap-2 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90"
            >
              <Icon.mic className="h-4 w-4" />
              {t("shadowing.recordBtn")}
            </button>
          )}

          {/* ── Asking for the microphone ────────────────────────────── */}
          {rec.state === "requesting" && (
            <div className="flex items-center gap-2 rounded-xl bg-mint/40 px-4 py-3 text-sm text-pine">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-moss/30 border-t-moss" />
              {t("attach.requestingMic")}
            </div>
          )}

          {/* ── Recording ────────────────────────────────────────────── */}
          {rec.state === "recording" && (
            <div className="flex items-center gap-3 rounded-xl border border-apricot/30 bg-apricot/10 px-4 py-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-apricot">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-apricot" />
                {t("attach.recording")}
              </span>
              <span className="font-mono text-sm font-bold text-pine">
                {fmtTime(rec.seconds)}
              </span>
              <button
                type="button"
                onClick={rec.stop}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-1.5 text-xs font-semibold text-cream hover:opacity-90"
              >
                <span className="h-3 w-3 rounded-sm bg-cream" />
                {t("attach.stop")}
              </button>
            </div>
          )}

          {/* ── Listen back, keep or retake ──────────────────────────── */}
          {rec.state === "preview" && rec.previewUrl && (
            <div className="rounded-xl border border-moss/30 bg-mint/20 p-3">
              <p className="mb-2 text-xs font-semibold text-moss-600">
                {t("shadowing.previewLabel")}
              </p>
              {rec.hitTimeLimit && (
                <p className="mb-2 text-xs text-muted">
                  {t("shadowing.timeLimit", { n: Math.round(SHADOWING_MAX_SECONDS / 60) })}
                </p>
              )}
              <audio controls src={rec.previewUrl} className="h-9 w-full max-w-xs" />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleKeep}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-2 text-xs font-semibold text-cream hover:opacity-90 disabled:opacity-50"
                >
                  <Icon.check className="h-3.5 w-3.5" />
                  {saving ? t("shadowing.saving") : t("shadowing.keepBtn")}
                </button>
                <button
                  type="button"
                  onClick={rec.reset}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-pine hover:border-moss disabled:opacity-50"
                >
                  ↺ {t("attach.reRecord")}
                </button>
              </div>
            </div>
          )}

          {/* ── Microphone refused ───────────────────────────────────── */}
          {rec.state === "denied" && (
            <div className="rounded-xl bg-apricot/10 px-4 py-3 text-sm text-apricot">
              <p className="font-semibold">{t("attach.micDenied")}</p>
              <p className="mt-0.5 text-xs text-apricot/80">
                {t("shadowing.micDeniedDetail")}
              </p>
              <button
                type="button"
                onClick={rec.reset}
                className="mt-2 text-xs font-semibold underline hover:opacity-80"
              >
                {t("attach.tryAgain")}
              </button>
            </div>
          )}

          {/* ── No MediaRecorder at all ──────────────────────────────── */}
          {rec.state === "unsupported" && (
            <div className="rounded-xl bg-sand/60 px-4 py-3 text-sm text-ink/70">
              {t("shadowing.unsupported")}
            </div>
          )}

          {/* ── The way past ─────────────────────────────────────────── */}
          {/* Always visible, never emphasised. Shown from the first render
              rather than fading in after a delay: hiding the exit until
              someone has hesitated long enough is a trick, and this step is
              supposed to be genuinely optional. A small link next to a filled
              button already says which one is the suggestion. */}
          {rec.state !== "preview" && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => onOutcome("skipped")}
                disabled={saving}
                className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
              >
                {t("shadowing.skip")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
