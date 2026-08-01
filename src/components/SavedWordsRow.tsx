"use client";

import { useState } from "react";
import { Furigana } from "@/components/Furigana";
import { AudioLimitNotice, PlayButton } from "@/components/PlayButton";
import { useT } from "@/contexts/locale";
import { safeVocabWordText } from "@/lib/reading-validation";
import { GRADUATION_AT } from "@/lib/learned-display";

/**
 * One always-visible line above the editor listing words the learner saved to
 * their vocabulary, so they remember to use them.
 *
 * Deliberately NOT inside the Hints band. HintsSection closes on every mount by
 * design, and the whole point of this row is reaching people who have forgotten
 * they saved anything — a box they never open cannot do that.
 *
 * One line, and it stays one line: the label and the link never shrink, the
 * chips scroll sideways instead of wrapping. Hints exists because two open
 * hint blocks pushed the editor off screen, and a row that grows to three lines
 * on a 375px screen would undo that.
 *
 * Staying one line must not be paid for by the surrounding layout, though —
 * see the comment on the scroll container. Nothing in here may contribute an
 * intrinsic width, or the notebook grows with it.
 *
 * The chips are plain spans, not buttons. Tapping a word does not write into
 * the textarea — the same rule WritingPromptCard follows ("it never writes into
 * the textarea and never blocks anything"). This is a reminder, not an input.
 * The 🔊 inside each chip is the one exception, and it keeps the rule: it plays
 * the word and touches nothing else.
 *
 * Renders nothing when there is nothing saved. No empty-state copy either:
 * most learners have saved no words, and advertising an unused feature on every
 * visit to the editor is noise in the one place that should stay quiet.
 */

/** Only the columns this row needs, straight off vocabulary_entries. */
export type SavedWord = {
  id: string;
  word: string;
  reading: string | null;
  /** Nullability is not guaranteed by the deployed schema, so treat null as 0. */
  use_count: number | null;
};

export function SavedWordsRow({ words }: { words: SavedWord[] }) {
  const t = useT();
  // Hoisted out of the chips: three PlayButtons would otherwise each render
  // their own copy of the same sentence. The row itself must stay one line, so
  // the notice goes underneath it rather than inside the scroll container.
  const [audioLimit, setAudioLimit] = useState<number | null>(null);

  if (words.length === 0) return null;

  return (
    <div className="mb-3">
      <div
        role="group"
        aria-label={t("write.savedWords.label")}
        className="flex items-center gap-2"
      >
        {/* Icon-only under sm. The label is the widest fixed part of the row, and
            on a 320px screen it left the chips an 82px window. Same disclosure
            idiom WritingPromptCard uses for its 🎲 button. The text is decorative
            once the group above carries it as an accessible name. */}
        <span
          aria-hidden
          className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted"
        >
          📖<span className="hidden sm:inline"> {t("write.savedWords.label")}</span>
        </span>

        {/* min-w-0 lets this flex item shrink below its content so the overflow
            scrolls. The inner track must NOT carry w-max: width: max-content
            propagates as this item's min-content contribution all the way up to
            the notebook column, which is a grid item with min-width: auto — the
            track then grows past the card and drags the ruled lines out with it.
            min-w-0 here floors the used width but does not stop that propagation.
            The chips keep their own shrink-0 and the row never wraps, so they are
            not squashed without it. */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {words.map((w) => {
              // The quiet nudge asked for: marked only on the last word before
              // graduation, so it reads as "nearly there" rather than as a
              // counter on everything.
              const oneMore = (w.use_count ?? 0) === GRADUATION_AT - 1;
              // One string for both: the button speaks exactly what is drawn.
              const wordText = safeVocabWordText(w.word, w.reading ?? undefined);
              return (
                <span
                  key={w.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-[11px]"
                >
                  <Furigana text={wordText} className="font-jp text-pine" />
                  {oneMore && (
                    <span className="text-[9px] font-semibold text-moss-600">
                      {t("write.savedWords.oneMore")}
                    </span>
                  )}
                  {/* onLimitReached suppresses the button's own notice — the
                      row lifts it out below, where there is room for a
                      sentence. */}
                  <PlayButton text={wordText} kind="word" onLimitReached={setAudioLimit} />
                </span>
              );
            })}
          </div>
        </div>

        <a
          href="/vocabulary"
          className="shrink-0 text-[11px] font-semibold text-moss-600 hover:text-pine"
        >
          {t("common.seeAll")}
        </a>
      </div>

      {audioLimit !== null && <AudioLimitNotice limit={audioLimit} className="mt-1.5" />}
    </div>
  );
}
