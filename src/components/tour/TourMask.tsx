"use client";

/**
 * The dark mask with a hole cut out for the current target.
 *
 * A single full-screen element cannot do this: `pointer-events: none` lets
 * every click through and `auto` blocks them all. So the mask is drawn as four
 * panels around the target and nothing is rendered over the hole itself — the
 * real button underneath keeps receiving real clicks, including next/link
 * navigation.
 *
 * When the step is only pointing at something ("look at this" rather than
 * "press this"), a transparent blocker is laid over the hole as well, so the
 * target is highlighted but cannot be pressed. That is what keeps the tour
 * from firing a real AI correction on the /write step.
 */

export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SHADE = "rgba(0, 0, 0, 0.52)";

function Panel({ style }: { style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "fixed",
        background: SHADE,
        // Panels swallow clicks: the only way through the mask is the hole.
        pointerEvents: "auto",
        ...style,
      }}
    />
  );
}

export function TourMask({
  rect,
  clickThrough,
}: {
  /** null = no target for this step; the whole screen is shaded. */
  rect: TourRect | null;
  /** true = the hole is live and the element underneath can be pressed. */
  clickThrough: boolean;
}) {
  if (!rect) {
    return <Panel style={{ inset: 0 }} />;
  }

  const bottomOfHole = rect.top + rect.height;
  const rightOfHole = rect.left + rect.width;

  return (
    <>
      <Panel style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
      <Panel style={{ top: bottomOfHole, left: 0, right: 0, bottom: 0 }} />
      <Panel style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} />
      <Panel style={{ top: rect.top, left: rightOfHole, right: 0, height: rect.height }} />

      {/* Highlight ring — decorative, never in the way of a click. */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 14,
          boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.7), 0 0 22px 4px rgba(255, 255, 255, 0.25)",
          pointerEvents: "none",
          transition: "top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease",
        }}
      />

      {!clickThrough && (
        <div
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            pointerEvents: "auto",
          }}
        />
      )}
    </>
  );
}
