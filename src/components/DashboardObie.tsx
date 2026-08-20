import Image from "next/image";
import { obieArtFor, type ObieMood } from "@/lib/obie-mood";

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
 * Still, except when the week's goal has been met. See globals.css: this page
 * is opened daily, and an arrival animation on the everyday states would play
 * thousands of times a year.
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
  return (
    <Image
      // The pools hold bare pose names; the files carry an obie- prefix.
      src={`/obie/obie-${art}.webp`}
      alt=""
      width={112}
      height={112}
      className={`h-20 w-20 shrink-0 sm:h-28 sm:w-28 ${mood === "goalMet" ? "obie-cheer" : ""}`}
      priority
    />
  );
}
