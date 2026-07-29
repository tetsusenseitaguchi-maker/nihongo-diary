"use client";

import { useId, useState } from "react";

/**
 * The "?" beside a comparison-table label, and the note it holds.
 *
 * Split out as its own client component rather than making the table one:
 * PlanComparisonTable is a Server Component that takes its translator as a
 * function prop, and functions cannot cross the client boundary. This takes
 * resolved strings instead, so the table stays where it is.
 *
 * The note is never removed from the page, only from view. Both notes exist
 * to keep the table honest — one says Free's ten translations are shared
 * between two features, the other that the recheck allowance is per day on
 * Free and per correction on the paid plans — and a comparison table that
 * hides a qualifier is back to overstating itself. So the text is always in
 * the DOM: sr-only while closed, which assistive technology still reads, and
 * a positioned panel once opened. aria-describedby ties the two together.
 *
 * Hover and press are tracked separately. A single flag would have the
 * pointer leaving the button close a note the user had just clicked open.
 */
export function NoteTooltip({ text, label }: { text: string; label: string }) {
  const id = useId();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;

  return (
    <span className="relative ml-1 inline-block align-middle">
      <button
        type="button"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setPinned((p) => !p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setPinned(false);
        }}
        /* The dot is 16px so it sits inside a label line, but the ::before
           takes the tap target out to 32px. A full 44px would reach into the
           rows above and below. */
        className="relative grid h-4 w-4 place-items-center rounded-full border border-line bg-paper text-[9px] font-bold leading-none text-muted transition-colors before:absolute before:-inset-2 before:content-[''] hover:border-moss hover:text-pine"
      >
        <span aria-hidden>?</span>
        <span className="sr-only">{label}</span>
      </button>

      {/* Wide enough to read, and still inside the table's own width so the
          scroll container around it never has to clip or scroll to show it. */}
      <span
        id={id}
        role="tooltip"
        className={
          open
            ? "absolute left-0 top-full z-20 mt-1 block w-56 rounded-xl border border-line bg-paper px-3 py-2 text-left text-[11px] font-normal leading-snug text-ink/80 shadow-card"
            : "sr-only"
        }
      >
        {text}
      </span>
    </span>
  );
}
