import Link from "next/link";

/**
 * Following / Discovery switcher for /feed.
 *
 * Links rather than local state, because the two tabs are different queries
 * against different sources — Following reads activity_feed, Discovery reads
 * the discovery_entries view — and the server has to run one or the other.
 * HistoryWithTabs can hold its tabs in useState because it already has every
 * entry in hand; this cannot.
 *
 * A tab inside /feed, not a sixth entry in the bottom nav, which stays at five.
 */
export function FeedTabs({
  active,
  followingHref,
  discoveryHref,
  followingLabel,
  discoveryLabel,
}: {
  active: "following" | "discovery";
  followingHref: string;
  discoveryHref: string;
  followingLabel: string;
  discoveryLabel: string;
}) {
  const tabs = [
    { key: "following" as const, href: followingHref, label: followingLabel },
    { key: "discovery" as const, href: discoveryHref, label: discoveryLabel },
  ];

  return (
    <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          // No transition-colors, for the reason spelled out in
          // HistoryWithTabs: tweening background and text together washes both
          // labels out mid-switch. The pill moves instantly; hover still tints.
          className={`flex-1 rounded-lg px-2 py-2 text-center text-sm font-semibold ${
            active === tab.key
              ? "bg-pine text-cream shadow-sm"
              : "text-ink/60 hover:text-pine"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
