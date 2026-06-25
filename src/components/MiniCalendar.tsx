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

// Group a flat cell array into rows of 7 for table rendering.
function toRows<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 7) rows.push(arr.slice(i, i + 7));
  return rows;
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
  const rows = toRows(cells);
  const active = new Set(activeDays);
  const sm = size === "sm";

  // table-layout:fixed divides the table width evenly among 7 columns.
  // Unlike CSS Grid fr units, this is immune to containing-block width ambiguity:
  // width:100% on a table = containing block width, then each column = that / 7.
  const tableStyle: React.CSSProperties = {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "separate",
    borderSpacing: sm ? "1px" : "2px",
  };

  const cellH = sm ? 28 : 36; // td height in px
  const fontSize = sm ? 11 : 12; // px

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {weekdayLabels.map((d, i) => (
            <th
              key={i}
              style={{
                textAlign: "center",
                fontWeight: 600,
                fontSize: 10,
                color: "var(--color-muted)",
                padding: "0 0 4px",
                lineHeight: "24px",
              }}
            >
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => {
              if (cell.day === null) {
                return (
                  <td
                    key={ci}
                    style={{ height: cellH, padding: 0 }}
                    aria-hidden="true"
                  />
                );
              }

              const isActive = active.has(cell.day);
              const isToday = today === cell.day;
              const href = dayLinks?.[cell.day];

              const tdStyle: React.CSSProperties = {
                height: cellH,
                padding: 0,
                textAlign: "center",
                position: "relative",
                borderRadius: 8,
                fontWeight: 500,
                fontSize,
                cursor: href ? "pointer" : "default",
                backgroundColor: isActive ? "var(--color-moss)" : "transparent",
                color: isActive ? "var(--color-cream)" : "var(--color-ink)",
                outline:
                  isToday && !isActive
                    ? "2px solid var(--color-moss)"
                    : "none",
                outlineOffset: "-2px",
              };

              const dot = isToday ? (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    backgroundColor: "var(--color-apricot)",
                    display: "block",
                  }}
                />
              ) : null;

              const innerStyle: React.CSSProperties = {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                borderRadius: 8,
                position: "relative",
              };

              return (
                <td key={ci} style={tdStyle}>
                  {href ? (
                    <Link
                      href={href}
                      aria-label={`${cell.day}日の日記`}
                      style={innerStyle}
                    >
                      {cell.day}
                      {dot}
                    </Link>
                  ) : (
                    <div style={innerStyle}>
                      {cell.day}
                      {dot}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
