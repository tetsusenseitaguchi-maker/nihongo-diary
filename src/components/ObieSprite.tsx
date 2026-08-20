/**
 * One Obie pose drawn as a flip-book: both frames in a single file, shown one
 * at a time by moving the background.
 *
 * A background rather than an <img> because that is what makes the frames a
 * single request — the second drawing cannot arrive late when it was never a
 * second fetch. The price is next/image's optimisation, on an asset already
 * webp at the size it is drawn, and alt, which these have never used: every
 * Obie in the app is decorative and the meaning is always in the words beside
 * him, so aria-hidden says exactly what alt="" said.
 *
 * The sizing class comes from the caller. Obie is 80px in the dashboard hero
 * and 56px in the feed header, and those are layout decisions belonging to the
 * places they are made, not to this.
 *
 * See globals.css for obie-frames-N and the motion classes, and
 * scripts/obie-sprite.mjs for the file this points at — it prints the
 * background-size and steps() that match whatever it just built.
 */
export function ObieSprite({
  art,
  frames,
  motion,
  className = "",
}: {
  /** Pose name, without the obie- prefix: "tailwag". */
  art: string;
  /** How many frames the sprite holds. Must match the file it names. */
  frames: number;
  /** Animation class, e.g. "obie-wag-burst". */
  motion: string;
  /** Sizing and layout from the caller. */
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`${className} obie-frames-${frames} ${motion}`}
      style={{ backgroundImage: `url(/obie/obie-${art}-${frames}f.webp)` }}
    />
  );
}
