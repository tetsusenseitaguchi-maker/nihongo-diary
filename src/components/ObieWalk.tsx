import { Fragment } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Furigana } from "@/components/Furigana";
import { ObieSprite } from "@/components/ObieSprite";
import { getLocaleFromCookie, getServerT } from "@/lib/i18n-server";
import { planWalk, seasonOf, type Destination, type Season, type WalkStep } from "@/lib/walk";
import { walkArtFor } from "@/lib/walk-art";

/**
 * Obie's walk: one footprint per diary, Obie at the front, the next two places
 * ahead of him.
 *
 * A server component with no client JavaScript at all. Everything that can be
 * pressed is HTML (the footprints are links); everything else is decoration in
 * CSS and one small SVG.
 *
 * ── Layout ────────────────────────────────────────────────────────────────
 * The past is drawn to scale, one STEP per diary, in stretches that
 * end at each destination reached. Every stretch has content-visibility: auto,
 * and its size is known from its count, so off-screen stretches cost nothing
 * to paint and nothing jumps when they come into view.
 *
 * The future is NOT to scale. It is a short fixed strip — see Ahead — and the
 * count of the places beyond it is in the header, so that the road ahead
 * takes as little of a 343px phone card as it can and the rest is footprints.
 *
 * The scroller is flex-row-reverse, which makes browsers start it at the right
 * edge: Obie and the road ahead are what is on screen, with no script moving
 * the scroll position after the page has painted.
 *
 * ── Motion ────────────────────────────────────────────────────────────────
 * Obie's existing one-shot walk (obie-walk-burst) and nothing else. No loop,
 * no keyframe of its own, no smooth scrolling.
 */

const H = 120; // scene height
const ROAD_BOTTOM = 22;
const ROAD_H = 14;
const ROAD_TOP = ROAD_BOTTOM + ROAD_H;
/**
 * One diary. 22px, not the 44 first drawn: at 44 a 343px phone card had room
 * for one or two footprints beside Obie and the road ahead, and the road read
 * as empty. The target is 8+ footprints on screen at 375px.
 *
 * Each footprint's tap target is 22px wide and 36px tall, and alternate ones
 * sit 10px apart vertically, so neighbouring centres are sqrt(22² + 10²) ≈
 * 24.2px apart — which is what WCAG 2.5.8 asks of a target smaller than 24px.
 * Do not remove the zigzag without widening STEP back to 24.
 */
const STEP = 22;
const ZIGZAG = 5;
const MARK_W = 64; // a destination reached, inside the past
/**
 * Obie's slot is narrower than his 56px sprite: the drawing has ~9px of
 * transparent margin on each side (45/288 of the frame), so the slot holds
 * what is drawn and the margins overhang harmlessly.
 */
const OBIE_W = 44;
const OBIE_SIZE = 56;
const OBIE_MARGIN = 9; // transparent px around the drawing at 56px, incl. under the feet
/** Pale footprints ahead: one per diary still to write, up to MAX_GHOSTS. */
const GHOST = 11;
const MAX_GHOSTS = 5;
const NEXT_W = 40;
const AFTER_W = 26;

/**
 * Roughly how wide a destination's name is drawn, in px — its visible
 * characters (readings excluded) times the font size, which is close for CJK.
 *
 * Needed because nothing here may overflow its box: a stretch of past road has
 * content-visibility: auto, which clips paint to the stretch, and the strip
 * ahead sits at the right edge of a row-reverse scroller, where overflow to the
 * right cannot be scrolled to. Either way a long name (北海道神宮の鳥居) would
 * be cut off, so boxes are sized to hold it.
 */
function nameWidth(name: string, fontPx: number): number {
  return [...name.replace(/\([^)]*\)/g, "")].length * fontPx;
}

const SEASON_TINT: Record<Season, string> = {
  spring: "var(--walk-spring)",
  summer: "var(--walk-summer)",
  autumn: "var(--walk-autumn)",
  winter: "var(--walk-winter)",
};
const SEASON_MARK: Record<Season, string> = {
  spring: "🌸",
  summer: "🍃",
  autumn: "🍁",
  winter: "❄️",
};

export async function ObieWalk({
  steps,
  todayStr,
  className = "",
}: {
  /**
   * Every diary the learner has, oldest first — id and diary_date only.
   *
   * ⚠️ This must be ALL of them. The dashboard's diary_entries query has no
   * .limit(), and this is the reason not to add one there without giving the
   * walk its own count: with a limit, the road would silently stop at that
   * number and the destinations past it would never be reached.
   */
  steps: WalkStep[];
  /** The learner's today, for the season of the road under Obie. */
  todayStr: string;
  /** Placement from the caller — on the dashboard, a grid span. */
  className?: string;
}) {
  const t = await getServerT();
  const locale = await getLocaleFromCookie();
  const plan = planWalk(steps);
  const todayYear = todayStr.slice(0, 4);

  const dateLabel = (d: string) => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
    if (d.slice(0, 4) !== todayYear) opts.year = "numeric";
    return new Date(`${d}T00:00:00Z`).toLocaleDateString(locale, opts);
  };

  const toNext = plan.next
    ? t(plan.next.at - plan.total === 1 ? "dashboard.walk.toNextOne" : "dashboard.walk.toNext", {
        n: plan.next.at - plan.total,
      })
    : null;

  const beyondLabel =
    plan.beyond > 0
      ? plan.beyond === 1
        ? t("dashboard.walk.beyondOne")
        : t("dashboard.walk.beyond", { n: plan.beyond })
      : null;

  let offset = 0; // running footprint index across stretches

  return (
    <Card accent="apricot" className={`overflow-hidden p-0 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pt-4">
        <h2 className="font-serif text-lg font-bold text-pine">{t("dashboard.walk.title")}</h2>
        <p className="text-xs text-ink/70">
          {/* No number at zero — the same rule as the cumulative card: a
              count with nothing in it is a receipt, not encouragement. */}
          {plan.total > 0 && (
            <>
              <span className="font-semibold text-pine">
                {plan.total === 1
                  ? t("dashboard.walk.countOne")
                  : t("dashboard.walk.count", { n: plan.total })}
              </span>
              {" · "}
            </>
          )}
          {plan.next && toNext ? (
            <WithPlace text={toNext} place={plan.next.name} />
          ) : (
            t("dashboard.walk.allReached")
          )}
          {/* In the header rather than the scene: the scene's width belongs to
              the footprints. */}
          {beyondLabel && <span className="block text-right text-[11px] text-muted">{beyondLabel}</span>}
        </p>
      </div>

      <div
        role="region"
        aria-label={t("dashboard.walk.scrollLabel")}
        tabIndex={0}
        className="walk-scene flex flex-row-reverse overflow-x-auto overscroll-x-contain pb-2"
      >
        {/* mr-auto: when everything fits (a new learner), the strip sits at
            the left rather than floating to the right edge. When it does not
            fit, the margin is zero and row-reverse starts at the right. */}
        <div className="mr-auto flex shrink-0 pl-3">
          {plan.legs.map((leg, k) => {
            const start = offset;
            offset += leg.steps.length;
            const markW = leg.reached ? Math.max(MARK_W, nameWidth(leg.reached.name, 11) + 8) : 0;
            const w = leg.steps.length * STEP + markW;
            return (
              <div
                key={leg.reached?.slug ?? "tail"}
                className="walk-leg relative shrink-0"
                style={{ width: w, height: H, containIntrinsicSize: `${w}px ${H}px` }}
              >
                <div
                  aria-hidden
                  className={`absolute ${k === 0 ? "rounded-l-full" : ""}`}
                  style={{ left: 0, right: 0, bottom: ROAD_BOTTOM, height: ROAD_H, background: roadGradient(leg.steps) }}
                />
                {leg.steps.map((s, i) => {
                  const n = start + i;
                  return (
                    <Fragment key={s.id}>
                      {n % 6 === 3 && (
                        <span
                          aria-hidden
                          className="absolute text-[11px] leading-none opacity-70"
                          style={{ left: i * STEP + 4, bottom: ROAD_TOP + 24 + (n % 12 < 6 ? 0 : 12) }}
                        >
                          {SEASON_MARK[seasonOf(s.diary_date)]}
                        </span>
                      )}
                      {/* prefetch={false}: this is the screen everyone opens
                          first, and a dozen footprints on screen would each
                          fetch a diary nobody asked for. Going back is the
                          occasional action here, not the likely next one. */}
                      <Link
                        href={`/diary/${s.id}`}
                        prefetch={false}
                        aria-label={t("dashboard.walk.footprint", { date: dateLabel(s.diary_date) })}
                        className="walk-paw absolute block h-9 rounded-full"
                        style={{
                          left: i * STEP,
                          width: STEP,
                          bottom: ROAD_BOTTOM + ROAD_H / 2 - 18 + (n % 2 ? ZIGZAG : -ZIGZAG),
                        }}
                      />
                    </Fragment>
                  );
                })}
                {leg.reached && (
                  <div
                    className="absolute flex justify-center"
                    style={{ left: leg.steps.length * STEP, width: markW, bottom: ROAD_TOP - 4 }}
                  >
                    <Landmark dest={leg.reached} reached size={40} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Obie, at the front. The drawing faces left and the road runs
              right, so the wrapper mirrors him; the walk itself only moves
              background-position, which the mirror does not touch. */}
          <div className="relative shrink-0" style={{ width: OBIE_W, height: H }}>
            <div
              aria-hidden
              className={`absolute ${plan.legs.length === 0 ? "rounded-l-full" : ""}`}
              style={{ left: 0, right: 0, bottom: ROAD_BOTTOM, height: ROAD_H, background: SEASON_TINT[seasonOf(todayStr)] }}
            />
            {/* Feet on the middle of the road: the sprite's own bottom margin is
                subtracted so it is the drawn paws that land, not the image box. */}
            <span
              className="absolute -scale-x-100"
              style={{ left: (OBIE_W - OBIE_SIZE) / 2, bottom: ROAD_BOTTOM + ROAD_H / 2 - OBIE_MARGIN }}
            >
              <ObieSprite art="walking" frames={2} motion="obie-walk-burst" className="h-14 w-14" />
            </span>
          </div>

          <Ahead
            next={plan.next}
            after={plan.after}
            remaining={plan.next ? plan.next.at - plan.total : 0}
            tint={SEASON_TINT[seasonOf(todayStr)]}
          />
        </div>
      </div>
    </Card>
  );
}

/**
 * The road ahead: one pale footprint per diary still to write (up to five,
 * then a dotted gap), so "5 more" is five marks on the road; then the next
 * place and, smaller, the one after — both standing on a level road with their
 * names above them. Only the size says which is further away; a road that
 * climbed read as a slope rather than as distance.
 */
function Ahead({
  next,
  after,
  remaining,
  tint,
}: {
  next: Destination | null;
  after: Destination | null;
  remaining: number;
  tint: string;
}) {
  if (!next) return <div className="shrink-0" style={{ width: 24, height: H }} />;

  const ghosts = Math.min(remaining, MAX_GHOSTS);
  const dotted = remaining > MAX_GHOSTS;
  const nextX = 2 + ghosts * GHOST + (dotted ? 8 : 0) + 2;
  // Both names sit above their signs at nearly the same height, so the one
  // after must start where the next one's name ends, not where its sign ends.
  const nextMid = nextX + NEXT_W / 2;
  const afterX = after
    ? Math.max(
        nextX + NEXT_W + 4,
        nextMid + nameWidth(next.name, 11) / 2 + 4 + nameWidth(after.name, 9) / 2 - AFTER_W / 2,
      )
    : 0;
  const w = Math.ceil(
    Math.max(
      (after ? afterX + AFTER_W : nextX + NEXT_W) + 2,
      nextMid + nameWidth(next.name, 11) / 2 + 2,
      after ? afterX + AFTER_W / 2 + nameWidth(after.name, 9) / 2 + 2 : 0,
    ),
  );
  // Level, narrowing a little toward the far end.
  const top = H - ROAD_TOP;
  const bottom = H - ROAD_BOTTOM;
  const road = `0,${top} ${w},${top + 3} ${w},${bottom - 3} 0,${bottom}`;

  return (
    <div className="relative shrink-0" style={{ width: w, height: H }}>
      <svg aria-hidden className="absolute inset-0" width={w} height={H} viewBox={`0 0 ${w} ${H}`}>
        <polygon points={road} fill={tint} />
      </svg>
      {Array.from({ length: ghosts }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="walk-paw-ghost absolute block"
          style={{
            left: 2 + i * GHOST,
            width: GHOST,
            height: GHOST,
            bottom: ROAD_BOTTOM + ROAD_H / 2 - GHOST / 2 + (i % 2 ? 2 : -2),
          }}
        />
      ))}
      {dotted && (
        <span
          aria-hidden
          className="absolute block w-1.5 border-t-2 border-dotted border-muted/50"
          style={{ left: 3 + ghosts * GHOST, bottom: ROAD_BOTTOM + ROAD_H / 2 }}
        />
      )}
      <div className="absolute flex justify-center" style={{ left: nextX, width: NEXT_W, bottom: ROAD_TOP - 4 }}>
        <Landmark dest={next} reached={false} size={32} />
      </div>
      {after && (
        <div className="absolute flex justify-center" style={{ left: afterX, width: AFTER_W, bottom: ROAD_TOP - 3 }}>
          <Landmark dest={after} reached={false} size={20} small />
        </div>
      )}
    </div>
  );
}

/**
 * A destination: its picture if public/walk/ has one, a signpost if not.
 *
 * Reached and not-yet-reached differ by opacity alone, on the picture only —
 * the name stays readable either way. The pictures keep their own colours.
 */
function Landmark({
  dest,
  reached,
  size,
  small = false,
}: {
  dest: Destination;
  reached: boolean;
  size: number;
  small?: boolean;
}) {
  const src = walkArtFor(dest.slug);
  return (
    <div className="flex flex-col items-center">
      <Furigana
        text={dest.name}
        className={`mb-0.5 whitespace-nowrap font-jp leading-none ${small ? "text-[9px] text-muted" : "text-[11px] font-semibold text-pine"}`}
      />
      <span className="block" style={{ opacity: reached ? 1 : 0.35 }}>
        {src ? (
          // A plain <img>: the files are already small and drawn at a fixed
          // size, and next/image would add an optimisation request per picture.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className="block" />
        ) : (
          <span aria-hidden className="walk-sign block" style={{ width: size, height: size }} />
        )}
      </span>
    </div>
  );
}

/** "{n} more to {place}", with the place rendered as ruby wherever it falls. */
function WithPlace({ text, place }: { text: string; place: string }) {
  const [before, after = ""] = text.split("{place}");
  return (
    <>
      {before}
      <Furigana text={place} className="font-jp font-semibold text-pine" />
      {after}
    </>
  );
}

/**
 * The road under one stretch, coloured by the season of each diary on it.
 * One element with hard colour stops rather than one element per season run.
 * The destination at the end of a stretch continues the last diary's colour.
 */
function roadGradient(steps: WalkStep[]): string {
  if (steps.length === 0) return "transparent";
  const stops: string[] = [];
  let runStart = 0;
  let cur = seasonOf(steps[0].diary_date);
  for (let i = 1; i <= steps.length; i++) {
    const s = i < steps.length ? seasonOf(steps[i].diary_date) : null;
    if (s !== cur) {
      const from = runStart * STEP;
      const to = i < steps.length ? `${i * STEP}px` : "100%";
      stops.push(`${SEASON_TINT[cur]} ${from}px ${to}`);
      if (s) {
        runStart = i;
        cur = s;
      }
    }
  }
  return stops.length === 1 ? SEASON_TINT[cur] : `linear-gradient(to right, ${stops.join(", ")})`;
}
