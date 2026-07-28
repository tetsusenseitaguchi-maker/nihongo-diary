"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

/**
 * One collapsed band holding every "before you write" hint — the daily prompt
 * and the word-order diagram.
 *
 * Each hint used to sit open in the notebook, so the editor was pushed down
 * behind two blocks of reading. Folding them into a single band means the
 * default view is one line, and someone who already knows what to write never
 * has to look at either.
 *
 * Closed on every mount, on purpose: nothing is remembered and nothing
 * auto-expands, so the quiet state is the one people land on every time.
 *
 * Takes children rather than importing the two cards itself — the prompt card
 * needs state that lives on the Write page, and threading it through here
 * would buy nothing.
 */
export function HintsSection({ children }: { children: ReactNode }) {
  const t = useT();
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const headerId = `${baseId}-header`;
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 rounded-xl border border-line bg-mint/25">
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span aria-hidden>💡</span>
        <span className="min-w-0 flex-1 break-words text-xs font-bold text-pine">
          {t("write.hints.title")}
          <span className="ml-1.5 font-normal text-muted">
            {t("write.hints.subtitle")}
          </span>
        </span>
        <Icon.arrow
          className={`h-4 w-4 shrink-0 text-moss-600 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          // pb-0: both children carry their own bottom margin.
          className="rounded-b-xl border-t border-line bg-paper/60 px-3 pb-0 pt-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
