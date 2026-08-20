/**
 * Which Obie the dashboard shows today.
 *
 * Every input is already on the page — stats.today, stats.currentStreak,
 * daysThisWeek and weeklyTarget are all computed before this is called — so
 * this adds no query and reads nothing new. In particular it does not compute
 * a streak: currentStreak arrives as a number and is only compared against.
 * There are three streak implementations in this codebase and none of them is
 * touched here.
 */

export type ObieMood = "goalMet" | "wroteStreak" | "wrote" | "ready" | "waiting";

/** A streak long enough that keeping it going is the day's real story. */
const STREAK_ROLLING = 7;

/**
 * Ordered, and the order is the argument.
 *
 * `goalMet` outranks having written today because it is the rarer and larger
 * thing: the week's promise kept, not the day's. `wroteStreak` outranks a
 * plain `wrote` for the same reason one rung down.
 *
 * ⚠️ There is deliberately no "you have not written in days" mood. Showing a
 * sleeping or downcast Obie to someone who has just come back after a gap
 * reads as a reproach rather than a welcome, and the learner who has been away
 * is the last one to greet that way. A gap simply falls through to `waiting`,
 * which is the same calm thing a Tuesday morning gets. Obie waits; he does not
 * keep score.
 *
 * ⚠️ A live streak with nothing written yet is `ready`, not `wroteStreak`. The
 * streak is yesterday's news until today has an entry, so this is the state
 * that gets Obie putting his shoes on rather than already running.
 */
export function obieMood(s: {
  wroteToday: boolean;
  currentStreak: number;
  daysThisWeek: number;
  /** null when the learner has never set a weekly goal. */
  weeklyTarget: number | null;
}): ObieMood {
  if (s.weeklyTarget !== null && s.daysThisWeek >= s.weeklyTarget) return "goalMet";
  if (s.wroteToday && s.currentStreak >= STREAK_ROLLING) return "wroteStreak";
  if (s.wroteToday) return "wrote";
  if (s.currentStreak >= 1) return "ready";
  return "waiting";
}

/**
 * Two or three illustrations per mood, because the same picture three days
 * running is wallpaper and the whole point of a state-driven Obie is that it
 * does not become one.
 *
 * ⚠️ running, sleeping, writing and reading are missing on purpose. Each has
 * been given a fixed meaning elsewhere — the save celebration, the empty feed,
 * the empty history tab, the empty vocabulary book — and an illustration that
 * means two things means neither. running matters most: a learner who has just
 * saved has seen that exact pose seconds earlier, and meeting it again on the
 * dashboard reads as reuse rather than as a change of state.
 *
 * phone is excluded too. Its desk runs to the frame, so it only works inside a
 * border, and nothing here has one.
 */
const POOLS: Record<ObieMood, readonly string[]> = {
  goalMet: ["laughing", "gift", "surprised"],
  wroteStreak: ["tailwag", "walking"],
  wrote: ["tailwag", "listening", "eating"],
  ready: ["shoes", "walking"],
  waiting: ["sitting", "thinking", "drinking"],
};

/**
 * Stable within a day, different the next.
 *
 * Keyed off todayStr, which the page has already resolved in the learner's own
 * timezone, so the picture turns over when their day does rather than at UTC
 * midnight. Deterministic on purpose: no Math.random and no Date.now, so the
 * dashboard renders the same Obie on a reload, and — since this runs in a
 * server component — there is no second value on the client to disagree with.
 */
export function obieArtFor(mood: ObieMood, todayStr: string): string {
  const pool = POOLS[mood];
  const day = Math.floor(Date.parse(`${todayStr}T00:00:00Z`) / 86_400_000);
  // Number.isFinite guards a malformed date rather than indexing with NaN.
  const i = Number.isFinite(day) ? ((day % pool.length) + pool.length) % pool.length : 0;
  return pool[i];
}

/**
 * The motion each illustration gets, keyed on the artwork rather than on the
 * mood, because the drawing is what the movement has to agree with. A wagging
 * Obie wags whichever state put him there; a sitting one breathes.
 *
 * Doing → a one-shot that finishes and leaves a still dog. Resting → a slow
 * breath, the only loop on this page. Nothing here is bigger than the sleeping
 * Obie in the empty feed, which is the ceiling for a screen opened daily; the
 * breath is deliberately under it.
 *
 * Unmapped names fall back to no class at all rather than to a default motion:
 * a new illustration should be given its own answer, not inherit someone
 * else's by accident.
 */
const MOTION: Record<string, string> = {
  // finished the week — the existing cheer, two hops and done
  laughing: "obie-cheer",
  gift: "obie-cheer",
  surprised: "obie-cheer",
  // doing something
  tailwag: "",   // has a sprite — see SPRITES below
  walking: "obie-bob",
  shoes: "obie-bob",
  // at rest
  sitting: "obie-breathe-soft",
  thinking: "",   // has a sprite — see SPRITES below
  drinking: "obie-breathe-soft",
  listening: "obie-breathe-soft",
  eating: "obie-breathe-soft",
};

export function obieMotionFor(art: string): string {
  return MOTION[art] ?? "";
}

/**
 * Poses drawn as a flip-book rather than moved with a transform.
 *
 * The split is the one the transforms were already reaching for and could not
 * reach: a wag is the drawing changing, not the drawing tilting. Anything in
 * here renders as a background sprite and takes its motion from the frames;
 * anything not in here keeps its transform. Positional motion — the save
 * celebration sliding in from the right — stays a transform either way, since
 * no number of frames moves a character across a screen.
 *
 * `frames` must match the file: obie-<pose>-<frames>f.webp, built by
 * scripts/obie-sprite.mjs, which prints the background-size and steps() that go
 * with whatever it just wrote.
 */
const SPRITES: Record<string, { frames: number; motion: string }> = {
  tailwag: { frames: 2, motion: "obie-wag-burst" },
  // Breathing as two drawings instead of one scaled. On trial: see the note on
  // .obie-breathe-2f in globals.css for what it is being judged against.
  thinking: { frames: 2, motion: "obie-breathe-2f" },
};

export function obieSpriteFor(art: string): { frames: number; motion: string } | null {
  return SPRITES[art] ?? null;
}
