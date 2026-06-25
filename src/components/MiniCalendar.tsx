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
  const flat = buildMonthGrid(year, month);
  const active = new Set(activeDays);
  const sm = size === "sm";
  const cellH = sm ? "h-8 text-xs" : "h-10 text-sm";

  // Convert flat array to 7-cell rows — guarantees correct column layout
  const rows: (typeof flat)[] = [];
  for (let i = 0; i < flat.length; i += 7) {
    rows.push(flat.slice(i, i + 7));
  }

  return (
    <div className="w-full select-none">
      {/* Weekday headers — flex row, each label takes 1/7 */}
      <div className="mb-1 flex">
        {weekdayLabels.map((d, i) => (
          <div
            key={i}
            className="flex h-6 flex-1 items-center justify-center text-[10px] font-semibold text-muted"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows — flex-1 cells each = exactly 1/7 of row width */}
      <div className="space-y-1">
        {rows.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((cell, ci) => {
              if (cell.day === null) {
                return <div key={ci} className={`flex-1 ${cellH}`} />;
              }

              const isActive = active.has(cell.day);
              const isToday = today === cell.day;
              const href = dayLinks?.[cell.day];

              const cls = [
                "relative flex flex-1 items-center justify-center rounded-lg font-medium transition-colors",
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
                  key={ci}
                  href={href}
                  className={cls}
                  aria-label={`${cell.day}日の日記`}
                >
                  {inner}
                </Link>
              ) : (
                <div key={ci} className={cls}>
                  {inner}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
