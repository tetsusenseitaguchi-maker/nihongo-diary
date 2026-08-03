"use client";

import type { CSSProperties } from "react";
import type { Correction } from "@/lib/types";
import { ObiePhoto } from "@/components/ObiePhoto";
import { Furigana } from "@/components/Furigana";
import { LearnedUsedPanel } from "@/components/LearnedUsedPanel";
import type { UsedExpression } from "@/lib/learned-display";
import { useT } from "@/contexts/locale";
import { daysToNextMilestone } from "@/lib/streak";

/**
 * The top of a correction result, on its own so the write page can put it
 * ABOVE the shadowing step.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The write page used to render the whole result behind the shadowing gate,
 * so a learner arriving for their correction met a microphone card and asked
 * where the correction was. This block — the title, Obie's cheer, and the
 * learner's sentence next to the natural one — now sits in front of the gate,
 * so the page reads as corrected before it asks for anything.
 *
 * ── Its relationship to CorrectionResult ─────────────────────────────────
 * The markup here is a copy of CorrectionResult.tsx's first four blocks, NOT
 * an extraction: that component renders on four other pages (feed, diary,
 * history, tour) where the whole result is one piece, and pulling the block
 * out of it would have meant threading its shared audio-limit state through a
 * prop. The two are kept in step by hand — a design change to the "元の文 /
 * 自然な日本語" pair belongs in both files.
 *
 * On the write page only ONE of the two renders this block: the page passes
 * showTopBlock={false} to CorrectionResult, so nothing here appears twice.
 *
 * ── No 🔊 ────────────────────────────────────────────────────────────────
 * Deliberately: the shadowing card directly below has a play button on the
 * same sentence (naturalAudioChoice returns pickSentence() on Free, which is
 * exactly what ShadowingStep sends), so a second button here would be the
 * same clip twice over. It would also carry its own copy of the "no plays
 * left" state, which lives inside CorrectionResult and could not be shared —
 * one button would go quiet while the other still looked alive. Once the gate
 * opens, CorrectionResult renders its 🔊 exactly as before, including the
 * whole-text play that paid plans get.
 */

function tint(v: string): CSSProperties {
  return { ["--tint" as string]: `var(${v})` } as CSSProperties;
}

function Label({ en, jp }: { en: string; jp: string }) {
  return (
    <p className="mb-2 flex flex-wrap items-baseline gap-x-2">
      <span className="text-sm font-bold text-pine">{en}</span>
      <Furigana text={jp} className="font-jp text-xs text-muted" />
    </p>
  );
}

/**
 * 🔥 N — the streak, at the moment it was just extended.
 *
 * Placed with the praise band rather than with the statistics, because that is
 * what it is: the learner has written today, and this says so before anything
 * is corrected or explained. The dashboard carries the same number as a
 * standing figure; this one exists for the instant it changes.
 *
 * Day 1 gets the same warmth as day 30, and a streak that broke and restarted
 * IS day 1 — nothing here knows or says that a longer run ended. Production
 * data is the argument: 174 learners wrote exactly one diary and stopped, and
 * 293 are on zero today. The transition worth paying for is 1 → 2, not 29 → 30.
 *
 * Shown on every plan. Loss aversion is not a paid feature.
 */
function StreakBadge({ days }: { days: number }) {
  const t = useT();
  if (days <= 0) return null;
  const milestone = daysToNextMilestone(days);
  return (
    <div
      className="gloss-panel flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[var(--radius-card)] px-5 py-3.5"
      style={tint("--color-tint-sand")}
    >
      <span className="text-[17px] font-bold text-pine">
        🔥 {days === 1 ? t("streak.dayOne") : t("streak.days", { n: days })}
      </span>
      {milestone && (
        <span className="text-xs text-ink/65">
          {t("streak.toNext", { n: milestone.remaining, m: milestone.next })}
        </span>
      )}
    </div>
  );
}

export function CorrectionTopBlock({
  correction,
  usedExpressions,
  streak = 0,
}: {
  correction: Correction;
  /**
   * Saved expressions this diary actually used, from /api/learned/scan. Same
   * prop the write page used to hand CorrectionResult — it moves here with
   * the rest of the praise band, and the page no longer passes it below the
   * gate, so the panel still renders exactly once.
   *
   * Arrives a beat after the rest: the scan cannot run until the diary row
   * exists, so this is undefined on first paint and fills in when the
   * response lands.
   */
  usedExpressions?: UsedExpression[];
  /**
   * Days in a row, today included — computed by the write page, which is the
   * only caller. 0 draws nothing, which is also what the first paint passes
   * while the learner's timezone is still unknown.
   */
  streak?: number;
}) {
  const t = useT();

  return (
    <div className="space-y-4">
      {/* Diary Title */}
      {correction.diaryTitle && (
        <div className="gloss-panel rounded-[var(--radius-card)] px-6 py-5 text-center" style={tint("--color-tint-sage")}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-moss-600">
            📓 {t("correction.diaryTitle")}
          </p>
          <p className="font-jp text-[22px] font-bold leading-loose text-pine">
            <Furigana text={correction.diaryTitle} />
          </p>
        </div>
      )}

      {/* Obie Cheer — personalised reaction to the diary content */}
      {correction.obieCheer && (
        <div className="gloss-green flex items-start gap-3 rounded-[var(--radius-card)] p-5">
          <ObiePhoto size={44} className="shrink-0 ring-2 ring-cream/25" />
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cream/70">
              🐾 {t("correction.obieCheer")}
            </p>
            <p className="font-jp text-[15px] font-medium leading-relaxed text-cream">
              <Furigana text={correction.obieCheer} />
            </p>
          </div>
        </div>
      )}

      {/* The streak, with the cheer rather than with the numbers. */}
      <StreakBadge days={streak} />

      {/* "You used a word you saved" — stays directly under Obie's cheer, in
          the praise band, which is the whole reason it was placed there. */}
      {usedExpressions && usedExpressions.length > 0 && (
        <LearnedUsedPanel used={usedExpressions} />
      )}

      {/* Original + Natural — the pair that has to be on screen before the
          shadowing card, because this is the part that says "you have been
          corrected". */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="gloss-card rounded-[var(--radius-card)] p-6">
          <Label en={t("correction.originalText")} jp="元(もと)の文(ぶん)" />
          <p className="font-jp text-[15px] leading-loose text-ink/70">
            {correction.originalRuby ? (
              <Furigana text={correction.originalRuby} />
            ) : (
              correction.original
            )}
          </p>
        </div>

        {correction.natural && (
          <div className="gloss-panel relative rounded-[var(--radius-card)] p-6" style={tint("--color-tint-sage")}>
            <Label en={t("correction.naturalJapanese")} jp="自然(しぜん)な日本語(にほんご)" />
            {/* The whole natural version, on every plan — same as below the
                gate. Only the 🔊 was ever narrowed to one sentence, and there
                is no 🔊 here. */}
            <p className="font-jp text-[15px] leading-loose text-ink">
              <Furigana text={correction.natural} />
            </p>
            <span className="stamp gloss absolute -right-2 -top-3 grid h-16 w-16 rotate-[-12deg] place-items-center rounded-full bg-paper text-center font-jp text-[10px] font-bold leading-tight text-apricot shadow-card">
              よく
              <br />
              書けました
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
