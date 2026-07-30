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
 */
export function discoveryHref(seed: number, f: DiscoveryFilters): string {
  const sp = new URLSearchParams({ tab: "discovery", seed: String(seed) });
  if (f.level) sp.set("level", f.level);
  if (f.country) sp.set("country", f.country);
  if (f.tag) sp.set("tag", f.tag);
  if (f.seeking) sp.set("seeking", "1");
  return `/feed?${sp.toString()}`;
}
