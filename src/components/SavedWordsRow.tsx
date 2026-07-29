"use client";

import { Furigana } from "@/components/Furigana";
import { useT } from "@/contexts/locale";
import { vocabWordText } from "@/lib/furigana";

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
 * The chips are plain spans, not buttons. Tapping a word does not write into
 * the textarea — the same rule WritingPromptCard follows ("it never writes into
 * the textarea and never blocks anything"). This is a reminder, not an input.
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

/**
 * Mirrors GRADUATION_THRESHOLD (3) from learned-match.ts.
 *
 * Not imported from there on purpose: learned-match.ts pulls in segmenter.ts,
 * which does `new TinySegmenter()` at module scope. That is a real side effect,
 * so no bundler can tree-shake it away, and importing one number drags the
 * whole segmenter into the /write client bundle, which does not otherwise
 * contain it. Measured: importing it moves /write's First Load JS from 312 kB
 * to 321 kB. Duplicating one number is the cheaper trade — but if the
 * threshold ever changes, it has to change in both places.
 */
const GRADUATION_AT = 3;

export function SavedWordsRow({ words }: { words: SavedWord[] }) {
  const t = useT();

  if (words.length === 0) return null;

  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">
        📖 {t("write.savedWords.label")}
      </span>

      {/* min-w-0 is what lets this shrink below its content width so the
          overflow actually scrolls; w-max keeps the chips from being squashed. */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="flex w-max items-center gap-1.5">
          {words.map((w) => {
            // The quiet nudge asked for: marked only on the last word before
            // graduation, so it reads as "nearly there" rather than as a
            // counter on everything.
            const oneMore = (w.use_count ?? 0) === GRADUATION_AT - 1;
            return (
              <span
                key={w.id}
                className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1 text-[11px]"
              >
                <Furigana
                  text={vocabWordText(w.word, w.reading ?? undefined)}
                  className="font-jp text-pine"
                />
                {oneMore && (
                  <span className="ml-1 text-[9px] font-semibold text-moss-600">
                    {t("write.savedWords.oneMore")}
                  </span>
                )}
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
  );
}
