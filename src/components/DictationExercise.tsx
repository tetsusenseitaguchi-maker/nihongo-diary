"use client";

import { useEffect, useState } from "react";
import { Furigana } from "@/components/Furigana";
import { PlayButton } from "@/components/PlayButton";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";
import { markAnswer, type Mark, type MarkOp } from "@/lib/dictation";
import { TTS_SPEAKING_RATE } from "@/lib/audio-limits";

/**
 * Listen to one sentence from your own diary, write down what you heard, see
 * what you got.
 *
 * The sentence is the corrected version of something the learner wrote
 * themselves, so the vocabulary is theirs and the form is the right one.
 *
 * Playback is <PlayButton/> unchanged: it already owns the iOS unlock, the
 * lifetime allowance, the 429 and — the part that matters here — the cached
 * clip. Replaying costs nothing and does not even reach the network, so
 * "listen again" is free however many times it takes. Only the first play of a
 * given sentence spends a credit, and only if it missed the server cache.
 *
 * Marking is local and instant (lib/dictation.ts). Nothing is sent anywhere,
 * nothing is stored, and the same answer always scores the same.
 */

/* ── Speed ───────────────────────────────────────────────────────────────
   Three steps, and the browser does the stretching: the clip is synthesised
   once and replayed faster or slower, so switching speed costs no request, no
   credit and no second object in the bucket. Asking Google for another
   speakingRate would change the /api/tts cache key and bill a fresh synthesis
   every time a learner touched this control — on a lifetime allowance of three
   that is a control nobody could afford to use.

   The numbers are speeds relative to natural Japanese. playbackRate is that
   over TTS_SPEAKING_RATE, because the file is already generated a little slow.

   ⚠️ Nothing below 0.75. Time-stretching an MP3 is not the same as asking the
   model to speak slowly — Google's own 0.6 sounds fine and the stretched
   version of it audibly does not, which is where this range comes from. The
   middle step is exactly 1.0 playbackRate: the default does no processing at
   all, and matches every other audio button in the app. */
const SPEEDS = [
  { speed: 0.75, key: "dictation.speedSlow" },
  { speed: TTS_SPEAKING_RATE, key: "dictation.speedNormal" },
  { speed: 1.15, key: "dictation.speedFast" },
] as const;

const STORAGE_KEY = "dictation.speed";

/** One character of the answer, coloured by what happened to it. */
function MarkedChar({ op }: { op: MarkOp }) {
  switch (op.op) {
    case "ok":
      return <span className="text-pine">{op.ch}</span>;
    case "wrong":
      return (
        <span className="rounded bg-apricot/20 px-0.5 text-apricot" title={`→ ${op.typed}`}>
          {op.ch}
        </span>
      );
    case "missing":
      return (
        <span className="rounded bg-apricot/10 px-0.5 text-apricot/70 underline decoration-dotted">
          {op.ch}
        </span>
      );
    case "extra":
      // Not part of the answer, so it is shown struck through where it was typed.
      return <span className="text-ink/30 line-through">{op.typed}</span>;
  }
}

function Result({ mark, sentence }: { mark: Mark; sentence: string }) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-serif text-3xl font-bold text-pine">{mark.percent}%</p>
        <p className="text-sm text-muted">
          {t("dictation.score", { correct: mark.correct, total: mark.total })}
        </p>
        {mark.isPerfect && (
          <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold text-pine">
            {t("dictation.perfect")}
          </span>
        )}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-moss-600">
          {t("dictation.yourAnswer")}
        </p>
        <p className="font-jp text-[17px] leading-loose tracking-wide">
          {mark.ops.map((op, i) => (
            <MarkedChar key={i} op={op} />
          ))}
        </p>
      </div>

      <div className="rounded-xl bg-mint/30 px-4 py-3">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-moss-600">
          {t("dictation.answer")}
        </p>
        <p className="font-jp text-[17px] leading-loose text-ink">
          <Furigana text={sentence} />
        </p>
      </div>
    </div>
  );
}

export function DictationExercise({
  sentence,
  remaining,
}: {
  /** One sentence of natural_japanese, ruby markup and all. */
  sentence: string;
  /**
   * Plays left on a metered plan, or null when the plan is unlimited.
   *
   * Shown BEFORE the first play, never after: the allowance is a lifetime one,
   * and spending a third of it on a tap the learner did not know was billed is
   * not something to discover afterwards.
   */
  remaining: number | null;
}) {
  const t = useT();
  const [typed, setTyped] = useState("");
  const [composing, setComposing] = useState(false);
  const [mark, setMark] = useState<Mark | null>(null);
  const [speed, setSpeed] = useState<number>(TTS_SPEAKING_RATE);

  // Read after mount, not during render: localStorage does not exist on the
  // server, and seeding state from it would make the first client render
  // disagree with the HTML that came down.
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    if (SPEEDS.some((s) => s.speed === saved)) setSpeed(saved);
  }, []);

  function pickSpeed(next: number) {
    setSpeed(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Private browsing can refuse to write. The speed still applies to this
      // session; only remembering it is lost.
    }
  }

  const canSubmit = typed.trim().length > 0 && !composing;

  function handleSubmit() {
    if (!canSubmit) return;
    setMark(markAnswer(typed, sentence));
  }

  function handleRetry() {
    setMark(null);
    setTyped("");
  }

  return (
    <div className="space-y-5">
      {/* ── Listen ─────────────────────────────────────────────────────── */}
      <div className="gloss-panel rounded-[var(--radius-card)] p-6">
        <p className="mb-1 text-sm font-bold text-pine">{t("dictation.listenTitle")}</p>
        <p className="mb-4 text-sm text-ink/70">{t("dictation.listenBody")}</p>

        <div className="flex flex-wrap items-center gap-3">
          <PlayButton
            text={sentence}
            kind="diary"
            size="md"
            showLabel
            label={t("audio.playSentence")}
            rate={speed / TTS_SPEAKING_RATE}
          />

          {/* Same clip at every setting, so switching is instant and free. */}
          <div
            role="group"
            aria-label={t("dictation.speed")}
            className="inline-flex overflow-hidden rounded-full border border-line bg-paper"
          >
            {SPEEDS.map(({ speed: s, key }) => (
              <button
                key={key}
                type="button"
                onClick={() => pickSpeed(s)}
                aria-pressed={speed === s}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  speed === s ? "bg-pine text-cream" : "text-ink/60 hover:bg-mint/50 hover:text-pine"
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        {remaining !== null && (
          <p className="mt-3 text-xs text-muted">
            {remaining > 0
              ? t("dictation.remaining", { n: remaining })
              : t("dictation.noneLeft")}
          </p>
        )}
      </div>

      {/* ── Write ──────────────────────────────────────────────────────── */}
      <div className="gloss-card rounded-[var(--radius-card)] p-6">
        <label htmlFor="dictation-answer" className="mb-2 block text-sm font-bold text-pine">
          {t("dictation.writeTitle")}
        </label>
        <p className="mb-3 text-xs text-muted">{t("dictation.writeHint")}</p>
        <textarea
          id="dictation-answer"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          // Japanese input builds a word over several keystrokes and fires
          // change events for each partial form. Marking mid-composition would
          // grade こうえ, and Enter belongs to the IME while it is open — which
          // is why submitting is a button and never a keypress here.
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => {
            setComposing(false);
            setTyped(e.currentTarget.value);
          }}
          rows={3}
          disabled={mark !== null}
          placeholder={t("dictation.placeholder")}
          className="w-full resize-none rounded-xl border border-line bg-paper px-4 py-3 font-jp text-[17px] leading-loose text-ink outline-none transition-colors focus:border-moss disabled:opacity-60"
        />

        {mark === null ? (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gloss-btn mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-cream transition hover:brightness-105 disabled:opacity-40"
          >
            <Icon.check className="h-4 w-4" /> {t("dictation.check")}
          </button>
        ) : (
          <button
            onClick={handleRetry}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-moss-600 transition-colors hover:border-moss/50 hover:bg-mint/30 hover:text-pine"
          >
            {t("dictation.retry")}
          </button>
        )}
      </div>

      {/* ── Result ─────────────────────────────────────────────────────── */}
      {mark && (
        <div className="gloss-panel rounded-[var(--radius-card)] p-6">
          <Result mark={mark} sentence={sentence} />
        </div>
      )}
    </div>
  );
}
