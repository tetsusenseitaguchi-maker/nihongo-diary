"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRESET_TAGS } from "@/lib/tags";
import { COUNTRIES, countryFlag } from "@/lib/countryFlag";
import {
  JLPT_LEVELS,
  discoveryHref,
  hasAnyFilter,
  NO_FILTERS,
  type DiscoveryFilters as Filters,
  type DiscoverySort,
} from "@/lib/discovery/filters";
import { useT } from "@/contexts/locale";

/**
 * The Discovery filter bar.
 *
 * Chips are links, not buttons with state: the filtering happens in the query,
 * so every change is a navigation either way, and links make each combination
 * a real URL that can be shared, bookmarked and reached with the back button.
 * Only the country control is a select — ninety chips, most of them matching
 * nothing, is not a row of chips — and it navigates on change.
 *
 * Clicking the chip that is already on clears it. There is no separate "all"
 * chip per row, because the row already shows which one is on.
 */

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? "bg-pine text-cream"
          : "border border-line bg-paper text-ink/70 hover:border-moss hover:text-pine"
      }`}
    >
      {children}
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

export function DiscoveryFilters({
  sort,
  seed,
  filters,
}: {
  /** Carried through every chip so narrowing does not also reorder. */
  sort: DiscoverySort;
  seed: number;
  filters: Filters;
}) {
  const t = useT();
  const router = useRouter();

  const hrefFor = (patch: Partial<Filters>) =>
    discoveryHref(sort, seed, { ...filters, ...patch });

  return (
    <div className="space-y-2.5 rounded-xl border border-line bg-paper p-3">
      {/* First, because this one is about the whole list rather than about
          which part of it to keep.

          Unlike the rows below, the active chip here does not toggle off: a
          filter can be absent, an order cannot. Clicking the one already on
          leads back to the same URL, which is the honest answer to "what
          would this do" — there is no third state to fall into. */}
      <Row label={t("discovery.sortLabel")}>
        <Chip href={discoveryHref("new", seed, filters)} active={sort === "new"}>
          {t("discovery.sortNew")}
        </Chip>
        <Chip href={discoveryHref("random", seed, filters)} active={sort === "random"}>
          {t("discovery.sortRandom")}
        </Chip>
      </Row>

      <Row label={t("discovery.filterLevel")}>
        {JLPT_LEVELS.map((lv) => (
          <Chip
            key={lv}
            href={hrefFor({ level: filters.level === lv ? null : lv })}
            active={filters.level === lv}
          >
            {lv}
          </Chip>
        ))}
      </Row>

      <Row label={t("discovery.filterTag")}>
        {PRESET_TAGS.map((tag) => (
          <Chip
            key={tag.key}
            href={hrefFor({ tag: filters.tag === tag.key ? null : tag.key })}
            active={filters.tag === tag.key}
          >
            #{tag.key}{" "}
            <span className={filters.tag === tag.key ? "opacity-70" : "text-muted"}>
              {tag.en}
            </span>
          </Chip>
        ))}
      </Row>

      <Row label={t("discovery.filterCountry")}>
        <select
          value={filters.country ?? ""}
          onChange={(e) => router.push(hrefFor({ country: e.target.value || null }))}
          className="rounded-xl border border-line bg-paper px-2.5 py-1 text-base font-medium text-ink focus:border-moss focus:outline-none"
        >
          <option value="">{t("discovery.filterCountryAny")}</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {countryFlag(c.code)} {c.name}
            </option>
          ))}
        </select>
      </Row>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
        {/* Its own row rather than a fourth chip line: this one is about what
            the writer asked for, not about who they are, and it is the reason
            somebody with corrections to give opens this tab at all. */}
        <Chip href={hrefFor({ seeking: !filters.seeking })} active={filters.seeking}>
          ✍️ {t("discovery.filterSeeking")}
        </Chip>

        {hasAnyFilter(filters) && (
          <Link
            href={discoveryHref(sort, seed, NO_FILTERS)}
            className="ml-auto text-[11px] font-semibold text-moss-600 hover:text-pine"
          >
            {t("discovery.filterClear")}
          </Link>
        )}
      </div>
    </div>
  );
}
