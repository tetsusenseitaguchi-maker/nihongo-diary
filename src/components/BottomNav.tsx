"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { renderIcon } from "@/components/icons";
import { mobileNavItems } from "@/lib/mock-data";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {mobileNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const isWrite = item.label === "Write";
          if (isWrite) {
            return (
              <li key={item.label} className="flex items-end pb-2">
                <Link
                  href={item.href}
                  aria-label="Write diary"
                  className="grid h-12 w-12 -translate-y-2 place-items-center rounded-2xl bg-pine text-cream shadow-lift"
                >
                  {renderIcon(item.icon, "h-6 w-6")}
                </Link>
              </li>
            );
          }
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-pine" : "text-muted"
                }`}
              >
                {renderIcon(item.icon, "h-5 w-5")}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
