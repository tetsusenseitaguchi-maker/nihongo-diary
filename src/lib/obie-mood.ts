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
