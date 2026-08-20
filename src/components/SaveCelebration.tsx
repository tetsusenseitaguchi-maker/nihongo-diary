import Image from "next/image";

/**
 * Obie runs on for a couple of seconds once the diary is safely stored.
 *
 * Mount it when the save lands and leave it there. The animation is a one-shot
 * that ends at opacity 0, so there is no timer to set, no state to hold and
 * nothing to unmount — after 2.9s it is an inert, invisible node. Re-running it
 * is a matter of the caller remounting it, which is what happens naturally:
 * starting another correction clears savedEntryId, and the next save sets it
 * again.
 *
 * ── Why the top and not the bottom ────────────────────────────────────────
 * He used to sit at bottom-24 and landed on top of the footer disclaimer —
 * "AI corrections may not be perfect…" — which is the one piece of text on the
 * page that should never be covered. That was not a tuning problem: the footer
 * is the last thing in <main>, so anything pinned to the bottom of the viewport
 * meets it the moment the page is scrolled to the end, and a correction is long
 * enough that the end is where people are.
 *
 * The top-right is out of the footer's reach by construction, and is where a
 * confirmation is expected to appear anyway. The offset is measured from
 * env(safe-area-inset-top) so a notch pushes him down with the header rather
 * than under it, and z-10 keeps him beneath the sticky header at z-20 — if the
 * two ever meet, the header should win.
 *
 * ── No tile ──────────────────────────────────────────────────────────────
 * The artwork is a cutout now, so Obie stands on whatever is behind him. The
 * white card this used to need read as a sticker on the real device: #ffffff
 * on the page's warmer ground was brighter than everything around it. The
 * drop-shadow follows the alpha silhouette instead of tracing a square.
 *
 * Decorative, and only decorative. The save is already stated in words next to
 * the heading ("✓ Saved"), so this is aria-hidden rather than a second
 * announcement of the same fact. pointer-events-none because it floats over the
 * page and must never take a tap meant for what is under it.
 */
export function SaveCelebration() {
  return (
    <div
      aria-hidden
      className="obie-arrive pointer-events-none fixed right-4 z-10 lg:right-8"
      style={{ top: "calc(env(safe-area-inset-top) + 5rem)" }}
    >
      <Image
        src="/obie/obie-running.webp"
        alt=""
        width={112}
        height={112}
        className="h-28 w-28 drop-shadow-[0_6px_12px_rgba(35,61,48,0.22)]"
        // On screen for 2.6s total, so lazy-loading would spend a chunk of
        // that fetching. It is 17KB.
        priority
      />
    </div>
  );
}
