"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ObiePhoto } from "@/components/ObiePhoto";
import { renderIcon } from "@/components/icons";
import { navItems } from "@/lib/mock-data";

const primary = navItems.slice(0, 6);
const secondary = navItems.slice(6);

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function NavLink({ item }: { item: (typeof navItems)[number] }) {
    const active =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
        {item.label}
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

      {/* Obie buddy card */}
      <div className="rounded-2xl border border-line bg-mint/50 p-3">
        <div className="flex items-center gap-3">
          <ObiePhoto size={44} />
          <div className="leading-tight">
            <p className="text-sm font-bold text-pine">Keep going!</p>
            <p className="text-[11px] text-muted">
              Consistency is your superpower.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-moss-600">🐾</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
            <div className="h-full w-3/4 rounded-full bg-moss" />
          </div>
        </div>
      </div>
    </div>
  );
}
