"use client";

import { useState } from "react";
import { Furigana } from "@/components/Furigana";
import type { PracticeDrill, DrillType } from "@/lib/types";

// ── Drill type label + colour ──────────────────────────────────────────────

const TYPE_META: Record<DrillType, { label: string; bg: string; text: string }> = {
  "fill-in":        { label: "Fill in",   bg: "bg-mint",        text: "text-pine" },
  "particle-choice":{ label: "Particles", bg: "bg-sand",        text: "text-ink/80" },
  "desu-masu":      { label: "です・ます", bg: "bg-apricot/15",  text: "text-apricot" },
  "reorder":        { label: "Reorder",   bg: "bg-sky-100",     text: "text-sky-700" },
  "rewrite":        { label: "Rewrite",   bg: "bg-violet-100",  text: "text-violet-700" },
};

// ── Single drill card ──────────────────────────────────────────────────────

function DrillCard({ drill, index }: { drill: PracticeDrill; index: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const meta = TYPE_META[drill.type as DrillType] ?? TYPE_META["fill-in"];
  const hasChoices = drill.choices.length > 0;
  const isDone = revealed || selected !== null;

  function handleChoice(c: string) {
    if (selected) return;
    setSelected(c);
    setRevealed(true);
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-card space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pine text-[11px] font-bold text-cream">
          {index + 1}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.bg} ${meta.text}`}>
          {meta.label}
        </span>
      </div>

      {/* Question */}
      <p className="font-jp text-[15px] leading-loose text-ink">
        <Furigana text={drill.questionRuby || drill.question} />
      </p>

      {/* Choices */}
      {hasChoices && (
        <div className="flex flex-wrap gap-2">
          {drill.choices.map((c) => {
            const isCorrect = c === drill.answer;
            const isSelected = c === selected;
            let cls = "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ";
            if (!isDone) {
              cls += "border-line bg-paper text-pine hover:border-moss hover:bg-mint/50 cursor-pointer";
            } else if (isCorrect) {
              cls += "border-moss bg-mint text-pine cursor-default";
            } else if (isSelected) {
              cls += "border-apricot bg-apricot/10 text-apricot cursor-default";
            } else {
              cls += "border-line bg-paper text-muted cursor-default opacity-60";
            }
            return (
              <button key={c} type="button" onClick={() => handleChoice(c)} className={cls}>
                <Furigana text={c} />
              </button>
            );
          })}
        </div>
      )}

      {/* Reveal button for rewrite / reorder without choices */}
      {!hasChoices && !revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded-full border border-line bg-paper px-4 py-1.5 text-sm font-semibold text-pine hover:border-moss hover:bg-mint/50"
        >
          Reveal answer
        </button>
      )}

      {/* Answer + explanation */}
      {isDone && (
        <div className="space-y-1.5 rounded-xl bg-mint/40 px-4 py-3">
          {selected && selected !== drill.answer && (
            <p className="text-xs font-semibold text-apricot">✗ Not quite!</p>
          )}
          {selected && selected === drill.answer && (
            <p className="text-xs font-semibold text-moss-600">✓ Correct!</p>
          )}
          <p className="font-jp text-[14px] text-pine">
            <span className="mr-1 text-xs font-bold uppercase tracking-wide text-muted">Answer:</span>
            <Furigana text={drill.answerRuby || drill.answer} />
          </p>
          <p className="text-xs leading-relaxed text-ink/75">
            💡 {drill.englishExplanation}
          </p>
        </div>
      )}
    </div>
  );
}

// ── PracticeDrills (used in CorrectionResult) ──────────────────────────────

export function PracticeDrills({ drills }: { drills?: PracticeDrill[] }) {
  if (!drills?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="font-serif text-lg font-bold text-pine">📝 Practice from This Correction</h3>
        <span className="font-jp text-xs text-muted">練習(れんしゅう)してみよう</span>
      </div>
      <div className="space-y-3">
        {drills.map((d, i) => (
          <DrillCard key={i} drill={d} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── DrillList (reused by MiniLessonReview) ─────────────────────────────────

export function DrillList({ drills }: { drills: PracticeDrill[] }) {
  if (!drills.length) return null;
  return (
    <div className="space-y-3">
      {drills.map((d, i) => (
        <DrillCard key={i} drill={d} index={i} />
      ))}
    </div>
  );
}
