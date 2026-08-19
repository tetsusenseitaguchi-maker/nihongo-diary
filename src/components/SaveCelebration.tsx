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
 * Decorative, and only decorative. The save is already stated in words next to
 * the heading ("✓ Saved"), so this is aria-hidden rather than a second
 * announcement of the same fact to a screen reader. pointer-events-none because
 * it floats over the page and must never take a tap meant for what is under it.
 *
 * Sits above the bottom nav on mobile (which is h-[env(safe-area-inset-bottom)]
 * plus its own height, hence bottom-24) and drops to a normal corner offset once
 * that nav is gone at lg.
 */
export function SaveCelebration() {
  return (
    <div
      aria-hidden
      className="obie-arrive pointer-events-none fixed bottom-24 right-4 z-20 lg:bottom-8 lg:right-8"
    >
      {/* ⚠️ Rounded, and that is not decoration. The artwork is an opaque PNG
          on white, and #ffffff against the page's #fafafa is a visible square
          — the drop-shadow was outlining it rather than lifting Obie off the
          page. Predicted invisible, looked at, and it was not.
          So the square becomes a deliberate one: bg-paper is the same #ffffff
          the file already carries, so the image melts into the tile and what
          is left reads as a small card that slid in. The real fix is cutting
          the background out of all 23 files at once, which is its own job. */}
      <Image
        src="/obie/obie-running.webp"
        alt=""
        width={112}
        height={112}
        className="h-28 w-28 rounded-2xl bg-paper shadow-lift"
        // On screen for 2.6s total, so lazy-loading would spend a chunk of
        // that fetching. It is 9KB.
        priority
      />
    </div>
  );
}
