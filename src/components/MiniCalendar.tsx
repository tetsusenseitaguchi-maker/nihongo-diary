import Link from "next/link";
import { buildMonthGrid, weekdayLabels } from "@/lib/dates";

interface MiniCalendarProps {
  year: number;
  month: number; // 0-indexed
  activeDays: number[];
  today?: number | null;
  size?: "sm" | "md";
  /** Optional map of day number -> href. Marked days become clickable links. */
  dayLinks?: Record<number, string>;
}

// minmax(0, 1fr) — NOT 1fr — so columns can shrink below their content min-width.
// Without the 0 minimum, CSS Grid uses auto (= content min-width) and 7 columns
// can overflow the screen on narrow phones.
const GRID_7 = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: "2px",
} as const;

export function MiniCalendar({
  year,
  month,
  activeDays,
  today = null,
  size = "md",
  dayLinks,
}: MiniCalendarProps) {
  const cells = buildMonthGrid(year, month);
  const active = new Set(activeDays);
  const sm = size === "sm";
  // h-9 on mobile (36px) keeps tap targets comfortable while fitting 7 cols.
  // text-xs (12px) ensures two-digit numbers don't overflow narrow cells.
  const cellH = sm ? "h-7 text-[11px]" : "h-9 text-xs sm:h-10 sm:text-sm";

  return (
    <div className="w-full overflow-hidden">
      {/* Weekday labels — same grid so columns align with date cells */}
      <div style={GRID_7} className="mb-0.5">
        {weekdayLabels.map((d, i) => (
          <div
            key={i}
            className="flex h-6 min-w-0 items-center justify-center text-[10px] font-semibold text-muted"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells — grid layout via inline style, appearance via Tailwind */}
      <div style={GRID_7}>
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return <div key={i} className={cellH} />;
          }

          const isActive = active.has(cell.day);
          const isToday = today === cell.day;
          const href = dayLinks?.[cell.day];

          const cls = [
            "relative flex min-w-0 items-center justify-center rounded font-medium transition-colors",
            cellH,
            isActive
              ? "bg-moss text-cream hover:brightness-110"
              : "text-ink/70 hover:bg-mint",
            isToday && !isActive ? "ring-2 ring-inset ring-moss" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const inner = (
            <>
              <span className="leading-none">{cell.day}</span>
              {isToday && (
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-apricot" />
              )}
            </>
          );

          return href ? (
            <Link
              key={i}
              href={href}
              className={cls}
              aria-label={`${cell.day}日の日記`}
            >
              {inner}
            </Link>
          ) : (
            <div key={i} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
