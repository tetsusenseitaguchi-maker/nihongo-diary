"use client";

import { useId, useState } from "react";
import { Furigana } from "@/components/Furigana";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";
import type { WritingPrompt } from "@/lib/writing-prompts";

/**
 * "今日のお題" — a single writing prompt shown above the diary editor.
 *
 * Hint only: it never writes into the textarea and never blocks anything.
 * The word list starts collapsed (same disclosure pattern as GuideAccordion)
 * so someone who already knows what to write can ignore it entirely.
 */
export function WritingPromptCard({
  prompt,
  onAnother,
}: {
  prompt: WritingPrompt;
  onAnother?: () => void;
}) {
  const t = useT();
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const panelId = `${baseId}-words`;
  const headerId = `${baseId}-words-header`;
  // Second disclosure, same shape as the words one and independent of it —
  // someone can have the vocabulary open and the model answer shut, which is
  // the combination this card most wants to make easy.
  const [exampleOpen, setExampleOpen] = useState(false);
  const examplePanelId = `${baseId}-example`;
  const exampleHeaderId = `${baseId}-example-header`;

  return (
    <div className="mb-4 rounded-xl border border-line bg-sand/40 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            {t("write.prompt.title")}
          </p>
          <p className="mt-1 font-jp text-base font-semibold leading-relaxed text-pine">
            <Furigana text={prompt.jp} />
          </p>
          <p className="mt-0.5 text-xs text-muted">{prompt.en}</p>
        </div>
        {onAnother && (
          <button
            type="button"
            onClick={onAnother}
            className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold text-moss-600 transition-colors hover:border-moss hover:text-pine"
          >
            🎲 <span className="hidden sm:inline">{t("write.prompt.another")}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex items-center gap-1 text-xs font-semibold text-moss-600 hover:text-pine"
      >
        <Icon.arrow
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {t("write.prompt.words")}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="mt-2 flex flex-wrap gap-1.5"
        >
          {prompt.words.map((w) => (
            <span
              key={w.jp}
              className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px]"
            >
              <Furigana text={w.jp} className="font-jp text-pine" />{" "}
              <span className="text-muted">{w.en}</span>
            </span>
          ))}
        </div>
      )}

      {/*
        The model answer, behind a tap.

        Folded rather than shown, for the same reason there is no button to
        copy it: an answer already on screen is the one that gets transcribed,
        and transcription is the one thing this card cannot help with. Opening
        it is a decision; reading what is already there is not.

        Guarded on `example` because the field is optional and most of the
        thirty prompts do not have one yet — a prompt without it renders
        exactly as this card did before, with no empty toggle left behind.

        The box borrows support/page.tsx's template-example styling (mint,
        uppercase label) and its i18n key. A learner who met an example on the
        Support tab meets the same object here.
      */}
      {prompt.example && (
        <>
          <button
            type="button"
            id={exampleHeaderId}
            aria-expanded={exampleOpen}
            aria-controls={examplePanelId}
            onClick={() => setExampleOpen((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-moss-600 hover:text-pine"
          >
            <Icon.arrow
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${exampleOpen ? "rotate-90" : ""}`}
            />
            {t("write.prompt.example")}
          </button>

          {exampleOpen && (
            <div id={examplePanelId} role="region" aria-labelledby={exampleHeaderId}>
              <div className="mt-2 rounded-xl bg-mint/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-moss-600">
                  {t("support.templateExample")}
                </p>
                <Furigana text={prompt.example.jp} className="font-jp text-[15px] text-ink" />
                <p className="mt-0.5 text-xs text-muted">{prompt.example.en}</p>
              </div>
              {/* Why there is no button to put this in the diary. */}
              <p className="mt-1.5 text-[11px] text-muted">{t("write.prompt.exampleNote")}</p>
            </div>
          )}
        </>
      )}

      <p className="mt-2 text-[11px] text-muted">{t("write.prompt.hint")}</p>
    </div>
  );
}
