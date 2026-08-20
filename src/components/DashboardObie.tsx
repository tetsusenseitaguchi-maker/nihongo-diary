import Image from "next/image";
import { obieArtFor, obieMotionFor, type ObieMood } from "@/lib/obie-mood";

/**
 * Obie's place on the dashboard, and the one that changes.
 *
 * A server component with no state of its own: the mood is decided on the page
 * from values already computed there, and the picture is picked from the date,
 * so this renders once and holds still.
 *
 * ── Why it is not the avatar frame ────────────────────────────────────────
 * The frame beside this one is the learner's, not Obie's. It links to
 * /profile-setup, says "change photo" on hover, and shows Obie only when no
 * photo has been set — so putting the daily Obie there would mean tapping him
 * opens a form about your own face, and would hide him entirely from everyone
 * who has uploaded one. Obie needed a slot that is his.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * Chosen by the illustration, not by the mood — a wagging Obie wags whichever
 * state put him there. Poses that are doing something get a one-shot and then
 * hold still; poses at rest breathe. See globals.css for the amplitudes and
 * for why the breath is gentler than the sleeping Obie in the empty feed.
 *
 * Standing completely still was the first attempt and it read as an ornament
 * in what is meant to be a character's own place.
 *
 * alt="" because the state is already in words on the same screen — the streak
 * line above, the write CTA below, the weekly goal card further down. Obie
 * repeats it in a picture; he does not carry it alone.
 */
export function DashboardObie({
  mood,
  todayStr,
}: {
  mood: ObieMood;
  todayStr: string;
}) {
  const art = obieArtFor(mood, todayStr);
  const motion = obieMotionFor(art);
  return (
    <Image
      // The pools hold bare pose names; the files carry an obie- prefix.
      src={`/obie/obie-${art}.webp`}
      alt=""
      width={112}
      height={112}
      className={`h-20 w-20 shrink-0 sm:h-28 sm:w-28 ${motion}`}
      priority
    />
  );
}
