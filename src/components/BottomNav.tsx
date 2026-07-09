"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { renderIcon } from "@/components/icons";
import { mobileNavItems } from "@/lib/mock-data";
import { useT } from "@/contexts/locale";
import { useRipple } from "@/lib/useRipple";

/** Same tap-ripple pattern as LinkButton in ui.tsx, one useRipple instance per link. */
function NavLink({
  href,
  ariaLabel,
  className,
  children,
}: {
  href: string;
  ariaLabel?: string;
  className: string;
  children: React.ReactNode;
}) {
  const { ref, onPointerDown } = useRipple<HTMLAnchorElement>();
  return (
    <Link
      href={href}
      ref={ref}
      onPointerDown={onPointerDown}
      aria-label={ariaLabel}
      className={`ripple-container ${className}`}
    >
      {children}
    </Link>
  );
}

/** Map English mobile nav labels to i18n keys. */
const MOB_KEYS: Record<string, string> = {
  Home: "nav.home",
  Feed: "nav.feed",
  Write: "nav.write",
  History: "nav.history",
  Support: "nav.support",
};

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {mobileNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const isWrite = item.label === "Write";
          const label = MOB_KEYS[item.label] ? t(MOB_KEYS[item.label]) : item.label;
          if (isWrite) {
            return (
              <li key={item.label} className="flex items-end pb-2">
                <NavLink
                  href={item.href}
                  ariaLabel={label}
                  className="grid h-12 w-12 -translate-y-2 place-items-center rounded-2xl bg-pine text-cream shadow-lift"
                >
                  {renderIcon(item.icon, "h-6 w-6")}
                </NavLink>
              </li>
            );
          }
          return (
            <li key={item.label} className="flex-1">
              <NavLink
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-pine" : "text-muted"
                }`}
              >
                {renderIcon(item.icon, "h-5 w-5")}
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
