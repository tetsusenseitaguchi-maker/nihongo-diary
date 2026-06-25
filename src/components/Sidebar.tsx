"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ObiePhoto } from "@/components/ObiePhoto";
import { renderIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { navItems } from "@/lib/mock-data";
import { useT } from "@/contexts/locale";

const primary = navItems.slice(0, 6);
const secondary = navItems.slice(6);

const MILESTONES = [3, 7, 14, 30, 60, 100];

type StreakInfo = { pct: number; next: number | null; remaining: number };

function streakInfo(streak: number): StreakInfo {
  if (streak <= 0) return { pct: 0, next: MILESTONES[0], remaining: MILESTONES[0] };
  let prev = 0;
  for (const m of MILESTONES) {
    if (streak < m) {
      return {
        pct: Math.round(((streak - prev) / (m - prev)) * 100),
        next: m,
        remaining: m - streak,
      };
    }
    prev = m;
  }
  return { pct: 100, next: null, remaining: 0 };
}

/** Map English nav labels (from mock-data) to i18n keys. */
const NAV_KEYS: Record<string, string> = {
  Dashboard: "nav.dashboard",
  "Write Diary": "nav.writeDiary",
  Calendar: "nav.calendar",
  History: "nav.history",
  Feed: "nav.feed",
  "My Places": "nav.places",
  Templates: "nav.support",
  Support: "nav.support",
  Profile: "nav.profile",
  Upgrade: "nav.upgrade",
};

export function Sidebar({ onNavigate, currentStreak = 0 }: { onNavigate?: () => void; currentStreak?: number }) {
  const pathname = usePathname();
  const t = useT();

  function NavLink({ item }: { item: (typeof navItems)[number] }) {
    const active =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));
    const label = NAV_KEYS[item.label] ? t(NAV_KEYS[item.label]) : item.label;
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
          active
            ? "bg-mint text-pine"
            : "text-ink/70 hover:bg-mint/60 hover:text-pine"
        }`}
      >
        <span className={active ? "text-pine" : "text-moss-600"}>
          {renderIcon(item.icon, "h-5 w-5")}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <div className="px-1 pt-1">
        <Logo href="/dashboard" />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {primary.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
        <div className="my-2 h-px bg-line" />
        {secondary.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
      </nav>

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Obie buddy card */}
      {(() => {
        const info = streakInfo(currentStreak);
        const streakLabel =
          currentStreak === 0
            ? t("sidebar.startToday")
            : info.next === null
            ? t("sidebar.legend")
            : t("sidebar.daysTo", { remaining: info.remaining, next: info.next });
        return (
          <div className="rounded-2xl border border-line bg-mint/50 p-3">
            <div className="flex items-center gap-3">
              <ObiePhoto size={44} />
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-bold text-pine">{t("sidebar.keepGoing")}</p>
                <p className="truncate text-[11px] text-muted">{streakLabel}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="text-moss-600">🐾</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-moss transition-all duration-500"
                    style={{ width: `${info.pct}%` }}
                  />
                </div>
              </div>
              <p className="mt-1 pl-5 text-[10px] text-muted">{streakLabel}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
