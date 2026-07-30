import { PRESET_TAG_KEYS } from "@/lib/tags";
import { COUNTRIES } from "@/lib/countryFlag";

/**
 * Discovery's filter state, which lives entirely in the URL.
 *
 * Nothing is held in React state, because filtering happens in the query —
 * narrowing the pool after it has been fetched would hand back "however many
 * of 300 happened to match" instead of 300 matches, which is the same trap the
 * exclusions already have to avoid.
 *
 * Every value is validated against a known list before it reaches a query.
 * PostgREST parameterises its filters, so this is not about injection; it is
 * about the URL not being an open query surface. A stranger's link can only
 * ask for combinations the UI itself offers.
 */

export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

/**
 * How the pool is ordered. Not part of DiscoveryFilters: a filter narrows what
 * is shown, and "clear filters" means give me everything back — it should not
 * also decide what order everything comes back in.
 *
 * "new" is the order the query already returns, newest first; "random" is that
 * same list put through seededShuffle. See @/lib/discovery/shuffle.
 */
export type DiscoverySort = "new" | "random";

/**
 * The order used when the URL does not say. Whichever one this is, it is the
 * one left out of the URL — the same way an unset level means every level.
 */
export const DEFAULT_SORT: DiscoverySort = "random";

/** Anything but the one other known value reads as the default. */
export function parseSort(raw: string | undefined): DiscoverySort {
  if (raw === "new") return "new";
  if (raw === "random") return "random";
  return DEFAULT_SORT;
}

export type DiscoveryFilters = {
  level: string | null;
  country: string | null;
  tag: string | null;
  seeking: boolean;
};

export const NO_FILTERS: DiscoveryFilters = {
  level: null,
  country: null,
  tag: null,
  seeking: false,
};

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

export function parseFilters(params: {
  level?: string;
  country?: string;
  tag?: string;
  seeking?: string;
}): DiscoveryFilters {
  const level = params.level ?? "";
  const country = params.country ?? "";
  const tag = params.tag ?? "";

  return {
    level: (JLPT_LEVELS as readonly string[]).includes(level) ? level : null,
    country: COUNTRY_CODES.has(country) ? country : null,
    // Preset tags only. Diaries can carry custom tags, but a filter has to be
    // something the UI can offer as a choice, and an arbitrary free-text tag
    // in the URL is not that.
    tag: PRESET_TAG_KEYS.has(tag) ? tag : null,
    seeking: params.seeking === "1",
  };
}

export function hasAnyFilter(f: DiscoveryFilters): boolean {
  return Boolean(f.level || f.country || f.tag || f.seeking);
}

/**
 * Builds a Discovery URL. The seed rides along with every filter change, so
 * narrowing the results does not also reshuffle them — the only thing that
 * moved is what was asked for.
 *
 * The seed is written only when the order actually uses one. Under "new" it
 * would be a number in the URL that changes nothing, and the first person to
 * try editing it would reasonably expect it to.
 */
export function discoveryHref(
  sort: DiscoverySort,
  seed: number,
  f: DiscoveryFilters,
): string {
  const sp = new URLSearchParams({ tab: "discovery" });
  if (sort !== DEFAULT_SORT) sp.set("sort", sort);
  if (sort === "random") sp.set("seed", String(seed));
  if (f.level) sp.set("level", f.level);
  if (f.country) sp.set("country", f.country);
  if (f.tag) sp.set("tag", f.tag);
  if (f.seeking) sp.set("seeking", "1");
  return `/feed?${sp.toString()}`;
}
