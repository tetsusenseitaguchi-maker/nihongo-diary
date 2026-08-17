import { startOfWeek } from "@/lib/date-tz";

/**
 * Weeks of "did I write", as a 7-row grid of squares.
 *
 * ── Why a grid and not a line ─────────────────────────────────────────────
 * A line chart needs points to be a line. Measured across the 530 learners
 * active in the last 30 days: 20.4% wrote on 5 or more days, 9.4% on ten or
 * more. A two-point line is not a chart, it is the visualisation of having
 * nothing. A grid is legible at one filled cell and rewarding at eighty — the
 * form degrades gracefully in the direction the data actually goes.
 *
 * ── The day it lights is diary_date ───────────────────────────────────────
 * ⚠️ Not created_at. MiniCalendar lights its days from diary_date too
 * (lib/diary.ts builds activeDaysThisMonth off `e.diary_date`), and the two
 * sit in the same card — a grid keyed on "the day you pressed save" would
 * disagree with the calendar directly above it for anyone who has used the
 * 「昨日」 toggle. Everything else in the app dates the same way: the streak,
 * the weekly goal, the cumulative card, the notifications.
 *
 * ── ⚠️ Monday columns, next to a Sunday calendar ──────────────────────────
 * Rows run Monday→Sunday, because a column here IS a week and the weekly goal
 * defines a week as Monday-start (lib/date-tz startOfWeek). MiniCalendar,
 * directly above, is Sunday-first — lib/dates.ts weekdayLabels begins "S" and
 * buildMonthGrid uses getDay(). The two genuinely differ, deliberately, and
 * nothing computes across them. This note exists so the next reader does not
 * "fix" one to match the other and silently move a week boundary that the
 * weekly goal depends on.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 * Binary, so a two-step sequential ramp rather than a categorical palette:
 * mint for a day that did not happen, pine for one that did. Lightness is
 * monotonic (0.945 → 0.334) and the empty step is deliberately quiet — absence
 * should not shout — but it is a fill rather than an outline, so the grid keeps
 * its shape on a white card.
 */

const ROWS = 7;
/** Columns, when the caller does not say. The dashboard card's width. */
const DEFAULT_WEEKS = 12;

/** Mon…Sun, matching the row order. Not the app's Sunday-first calendar. */
const ROW_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ActivityGrid({
  writtenDates,
  endDate,
  animate = false,
  weeks = DEFAULT_WEEKS,
  cellPx = 20,
  showLabels = true,
  summaryLabel,
}: {
  /** Every diary_date the learner has. Only the visible window is read. */
  writtenDates: Set<string>;
  /** "YYYY-MM-DD" — the week containing this date is the last column. */
  endDate: string;
  /**
   * Run the diagonal wave. The dashboard card renders静止; only the recap
   * overlay animates, and only once a day.
   */
  animate?: boolean;
  /**
   * How many weeks wide. 12 in the dashboard card, where there is room for a
   * three-month shape; 4 in the recap overlay, where 84 cells at 375px came out
   * too small to read and the point is the last few weeks anyway.
   */
  weeks?: number;
  cellPx?: number;
  /** Hidden inside the overlay, where the panel is narrower and captionless. */
  showLabels?: boolean;
  /** Read out in place of the cells. The grid is one image to a screen reader. */
  summaryLabel: string;
}) {
  // Column 0 is the oldest week; the last column contains endDate.
  const firstMonday = addDays(startOfWeek(endDate), -7 * (weeks - 1));

  return (
    <div
      role="img"
      aria-label={summaryLabel}
      className={animate ? "activity-grid-wave" : undefined}
      style={{ display: "flex", flexDirection: "column", gap: 3 }}
    >
      {Array.from({ length: ROWS }, (_, row) => (
        <div key={row} style={{ display: "flex", gap: 3, alignItems: "center" }}>
          {showLabels && (
            <span
              aria-hidden
              style={{
                width: 16,
                flex: "none",
                fontSize: 9,
                lineHeight: 1,
                color: "var(--color-muted)",
                textAlign: "center",
              }}
            >
              {ROW_LABELS[row]}
            </span>
          )}
          {Array.from({ length: weeks }, (_, col) => {
            const date = addDays(firstMonday, col * 7 + row);
            const future = date > endDate;
            const on = !future && writtenDates.has(date);
            return (
              <span
                key={col}
                // The hover layer, for free and without JS. Omitted in the
                // overlay, where every pointer event closes the surface and a
                // tooltip would be a promise the screen does not keep.
                title={animate ? undefined : date}
                aria-hidden
                className="activity-cell"
                style={
                  {
                    "--c": col,
                    "--r": row,
                    width: cellPx,
                    height: cellPx,
                    borderRadius: 2,
                    display: "block",
                    flex: "none",
                    // ⚠️ The empty cell is a FILL, not an outline. It used to
                    // be paper with a 1px hairline; dropping the hairline
                    // without changing the fill would have made empty cells
                    // white-on-white inside this card and erased the grid's
                    // shape entirely, leaving dark squares floating in space.
                    // Mint is the quietest step that still reads as a cell.
                    background: on ? "var(--color-pine)" : "var(--color-mint)",
                    // A day that has not happened yet is not a day you missed.
                    opacity: future ? 0.35 : 1,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
