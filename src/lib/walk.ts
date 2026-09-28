/**
 * Obie's walk — the dashboard road where every diary is one footprint.
 *
 * Pure data and arithmetic, no I/O, so the rules can be read in one place and
 * checked without rendering anything. Which destinations have a picture is a
 * question about files on disk and lives in walk-art.ts.
 *
 * ── What it counts ────────────────────────────────────────────────────────
 * Diaries written, in total — never the streak. The walk is the thing that
 * does not go backwards when a day is missed; the 🔥 already tells the other
 * story and the two are kept apart on purpose. A deleted diary does take its
 * footprint with it (accepted for v1: no high-water mark is stored).
 */

export interface Destination {
  /** The diary count at which Obie arrives. */
  at: number;
  /**
   * File name in public/walk/ without the extension. Any of WALK_ART_EXTS
   * works, so a .png can be swapped for a .svg without touching this.
   */
  slug: string;
  /** Japanese with readings, in the Furigana component's 漢字(かんじ) form. */
  name: string;
}

/**
 * Fixed, never random. Hokkaido up to 100, then south through Japan.
 *
 * Names stay Japanese in every locale — they are proper nouns or plain nouns a
 * learner can read with the furigana — so none of them is an i18n key.
 *
 * 2 exists because of where people stop: of the 694 who had written anything
 * (2026-09-27), 330 stopped at exactly one diary. The next place has to be one
 * diary away at the moment that happens.
 */
export const DESTINATIONS: readonly Destination[] = [
  { at: 1, slug: "genkan", name: "玄関(げんかん)" },
  { at: 2, slug: "denchu", name: "電柱(でんちゅう)" },
  { at: 5, slug: "koen", name: "公園(こうえん)" },
  { at: 10, slug: "odori-koen", name: "大通公園(おおどおりこうえん)" },
  { at: 20, slug: "tokeidai", name: "時計台(とけいだい)" },
  { at: 30, slug: "jingu-torii", name: "北海道神宮(ほっかいどうじんぐう)の鳥居(とりい)" },
  { at: 45, slug: "hitsujigaoka", name: "羊ヶ丘展望台(ひつじがおかてんぼうだい)" },
  { at: 60, slug: "shikotsuko", name: "支笏湖(しこつこ)" },
  { at: 80, slug: "hakodate", name: "函館(はこだて)の夜景(やけい)" },
  { at: 100, slug: "fujisan", name: "富士山(ふじさん)" },
  { at: 130, slug: "senbon-torii", name: "京都(きょうと)の千本鳥居(せんぼんとりい)" },
  { at: 160, slug: "nara-shika", name: "奈良(なら)の鹿(しか)" },
  { at: 200, slug: "okinawa-umi", name: "沖縄(おきなわ)の海(うみ)" },
];

export type Season = "spring" | "summer" | "autumn" | "winter";

/**
 * The season of a diary_date, by the Japanese calendar for everyone — the road
 * runs through Japan, so a learner in Sydney still gets 桜 in April. Month only;
 * no timezone is involved because diary_date is already the learner's own day.
 */
export function seasonOf(dateStr: string): Season {
  const m = Number(dateStr.slice(5, 7));
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export interface WalkStep {
  id: string;
  diary_date: string;
}

/** One stretch of road ending at a destination (or at Obie, for the last). */
export interface WalkLeg {
  steps: WalkStep[];
  /** The destination this stretch arrives at; null for the unfinished tail. */
  reached: Destination | null;
}

export interface WalkPlan {
  total: number;
  legs: WalkLeg[];
  /** The next place ahead, or null once the last one is reached. */
  next: Destination | null;
  /** The one after that — the last thing drawn — or null. */
  after: Destination | null;
  /** Places beyond `after`, shown as a count only. */
  beyond: number;
}

/**
 * Split the footprints into stretches, one per destination reached.
 *
 * `steps` must be oldest first. Only two destinations ahead are drawn: showing
 * someone with two diaries the whole road to 200 reads as a wall rather than an
 * invitation, so the rest is a number.
 */
export function planWalk(steps: readonly WalkStep[]): WalkPlan {
  const total = steps.length;
  const legs: WalkLeg[] = [];
  let from = 0;
  for (const d of DESTINATIONS) {
    if (d.at > total) break;
    legs.push({ steps: steps.slice(from, d.at), reached: d });
    from = d.at;
  }
  if (from < total) legs.push({ steps: steps.slice(from), reached: null });

  const ahead = DESTINATIONS.filter((d) => d.at > total);
  return {
    total,
    legs,
    next: ahead[0] ?? null,
    after: ahead[1] ?? null,
    beyond: Math.max(0, ahead.length - 2),
  };
}
