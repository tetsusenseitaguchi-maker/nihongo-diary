/**
 * Deterministic shuffling for the Discovery tab.
 *
 * Postgres cannot help here: PostgREST's .order() takes a column name, so
 * `order by random()` is only reachable through an RPC, and even then it sorts
 * the whole eligible set on every request and gives a different order each
 * time — which quietly breaks paging, since page 2 is drawn from a fresh
 * shuffle and repeats or skips what page 1 showed.
 *
 * So the randomness lives here instead: take a pool newest-first, shuffle it
 * with a seed, and keep the seed in the URL. The order is stable for as long
 * as the seed is, which is what makes paging and the browser's back button
 * behave, and arriving at the tab afresh mints a new seed.
 */

/**
 * mulberry32. Small, fast, and well past good enough for ordering a feed —
 * this decides what to read next, not anything anyone should bet on.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates against a seeded generator. Same seed, same order, always. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Reads a seed off the URL. Anything unparseable is treated as absent. */
export function parseSeed(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n >>> 0;
}

/** A fresh seed. Never 0, which would make mulberry32 start from a fixed point. */
export function newSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}
