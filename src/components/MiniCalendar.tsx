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
  const cellSize = size === "sm" ? "h-8 w-full text-xs" : "h-10 w-full text-sm";

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdayLabels.map((d, i) => (
          <div key={i} className="grid h-6 place-items-center text-[11px] font-semibold text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={i} className={cellSize} />;
          const isActive = active.has(cell.day);
          const isToday = today === cell.day;
          const href = dayLinks?.[cell.day];
          const base = `relative grid ${cellSize} place-items-center rounded-lg font-medium transition-colors ${
            isActive ? "bg-moss text-cream" : "text-ink/70 hover:bg-mint"
          } ${isToday && !isActive ? "ring-2 ring-moss ring-inset" : ""}`;

          const inner = (
            <>
              {cell.day}
              {isToday && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-apricot" />}
            </>
          );

          if (href) {
            return (
              <Link
                key={i}
                href={href}
                className={`${base} cursor-pointer ${isActive ? "hover:brightness-110" : ""}`}
                aria-label={`${cell.day}日の日記`}
              >
                {inner}
              </Link>
            );
          }
          return (
            <div key={i} className={base}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
