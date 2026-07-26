/**
 * Scenario for the interactive onboarding tour.
 *
 * Pure data — no React, no DOM. The overlay (part 2-B) reads this to decide
 * what to spotlight, whether clicks may pass through, and which route the step
 * belongs to.
 *
 * Targets are addressed by `data-tour="…"` attributes rather than CSS
 * selectors: /dashboard alone renders three separate `a[href="/write"]`
 * elements, so a selector cannot say which one the tour means.
 *
 * Several anchors are deliberately duplicated across the mobile and desktop
 * navigation (BottomNav is `lg:hidden`, Sidebar is `hidden lg:block`), so a
 * step lists every candidate and the overlay picks the one that is actually
 * visible at the current breakpoint.
 */

/** How the step behaves while it is showing. */
export type TourStepMode =
  /** Centred card, nothing spotlighted, the whole screen is inert. */
  | "modal"
  /** Spotlight a target but keep the screen inert — "look at this". */
  | "point"
  /** Spotlight a target and let real clicks through — "now press it". */
  | "click";

export interface TourStepDef {
  /** Stable name, used in logs and as the React key. */
  id: string;
  /**
   * Pathname this step belongs to. The overlay treats a move to any other
   * route as going off-script and stops the tour. null = valid anywhere.
   */
  route: string | null;
  /**
   * `data-tour` values to spotlight, best candidate first; the overlay uses
   * the first one that is currently visible. Empty for centred modals.
   */
  anchors: string[];
  /**
   * Spotlight every visible anchor at once, as one bounding box, instead of
   * just the first. Only for anchors that sit next to each other: on a phone
   * the hero CTA and the bottom-nav pencil are both visible but at opposite
   * ends of the screen, and combining those would cut a hole the size of the
   * whole page.
   */
  combine?: boolean;
  mode: TourStepMode;
  /**
   * For "click" steps: arriving at this pathname advances the tour. This is
   * the only way those steps move forward — there is no Next button.
   */
  advanceOn?: string;
  titleKey: string;
  descKey: string;
  /**
   * Show the static sample correction sheet (step 3 only). The sheet reuses
   * CorrectionResult with mockCorrection, so no /api/correct call is made and
   * no correction credit is consumed. Its container MUST be pointer-events:
   * none — CorrectionResult's vocabulary buttons write to Supabase for real.
   */
  sample?: boolean;
}

/**
 * Exactly TOUR_STEP_COUNT (7) entries — see @/lib/tour/state. Changing the
 * list means bumping TOUR_VERSION there so saved states are discarded.
 */
export const TOUR_SCENARIO: TourStepDef[] = [
  {
    id: "welcome",
    route: null,
    anchors: [],
    mode: "modal",
    titleKey: "tour.welcome.title",
    descKey: "tour.welcome.desc",
  },
  {
    id: "write-cta",
    route: "/dashboard",
    // Hero CTA first; on a narrow screen the bottom-nav pencil is the one the
    // user can actually reach without scrolling.
    anchors: ["write-cta", "nav-write"],
    mode: "click",
    advanceOn: "/write",
    titleKey: "tour.writeCta.title",
    descKey: "tour.writeCta.desc",
  },
  {
    id: "editor",
    route: "/write",
    // Adjacent siblings — the settings row sits directly above the textarea,
    // so one box around both is what the step is describing.
    anchors: ["write-options", "write-editor"],
    combine: true,
    mode: "point",
    titleKey: "tour.editor.title",
    descKey: "tour.editor.desc",
  },
  {
    id: "correct",
    route: "/write",
    anchors: ["write-correct"],
    mode: "point",
    sample: true,
    titleKey: "tour.correct.title",
    descKey: "tour.correct.desc",
  },
  {
    id: "feed-tab",
    route: "/write",
    anchors: ["nav-feed"],
    mode: "click",
    advanceOn: "/feed",
    titleKey: "tour.feedTab.title",
    descKey: "tour.feedTab.desc",
  },
  {
    id: "feed",
    route: "/feed",
    // Falls back to the page heading when the timeline is empty and the
    // timeline element is not rendered at all.
    anchors: ["feed-timeline", "feed-heading"],
    mode: "point",
    titleKey: "tour.feed.title",
    descKey: "tour.feed.desc",
  },
  {
    id: "done",
    route: "/feed",
    // The help entry point: the sidebar item on desktop, the header icon on
    // mobile. Both carry the same anchor. Spotlit rather than a plain modal,
    // because the whole point of the last step is "this is where you restart".
    anchors: ["nav-how-to-use"],
    mode: "point",
    titleKey: "tour.done.title",
    descKey: "tour.done.desc",
  },
];

/** CSS selector for a `data-tour` anchor. */
export function anchorSelector(anchor: string): string {
  return `[data-tour="${anchor}"]`;
}

/**
 * Anchor name for a navigation link, derived from its href. The mobile
 * BottomNav and the desktop Sidebar label the same destination differently
 * ("Write" vs "Write Diary"), but only one of the two is ever visible, so
 * deriving from the href gives both the same anchor for free.
 * "/how-to-use" → "nav-how-to-use".
 */
export function tourAnchor(href: string): string {
  return `nav-${href.replace(/^\//, "")}`;
}
