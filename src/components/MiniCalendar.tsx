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

  return (
    <div className="w-full">
      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdayLabels.map((d, i) => (
          <div
            key={i}
            className="flex h-6 items-center justify-center text-[10px] font-semibold text-muted"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells — flex items-center justify-center avoids nested-grid width collapse */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return (
              <div key={i} className={sm ? "h-8" : "h-10"} aria-hidden="true" />
            );
          }

          const isActive = active.has(cell.day);
          const isToday = today === cell.day;
          const href = dayLinks?.[cell.day];

          const cls = [
            "relative flex items-center justify-center rounded-lg font-medium transition-colors",
            sm ? "h-8 text-xs" : "h-10 text-sm",
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
