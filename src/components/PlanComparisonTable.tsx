import { Icon } from "@/components/icons";
import { NoteTooltip } from "@/components/NoteTooltip";
import { PlanPrice } from "@/components/PlanPrice";
import { PurchaseButton } from "@/components/PurchaseButton";
// Still needed below the table: the Teacher note is web-only. The free
// column's "$0" → "Free" swap used it too, and that use is gone with the
// column.
import { NativeGate } from "@/components/NativeGate";
import { PLAN_LABELS } from "@/lib/plans";
import {
  COMPARISON_GROUPS,
  COMPARISON_PLANS,
  COMPARISON_CHROME_KEYS as K,
  type Cell,
  type ComparisonPlan,
} from "@/lib/plan-comparison";

/**
 * Feature-by-feature plan comparison: features down, plans across.
 *
 * Replaces the pricing cards, which wrote the paid tiers as diffs
 * ("Everything in Free") and so listed ten bullets under Free against five
 * under Plus — counted as bullets, the free tier looked like the richest one.
 * Here the same facts sit on one row each, so 1 → 10 → 25 and 300 → 500 read
 * as a ladder. plan-comparison.ts orders the four rows whose numbers climb
 * first, together, for exactly that reason.
 *
 * A Server Component, like PricingGrid: `t` arrives as a function prop and the
 * client pieces (PlanPrice, PurchaseButton, NativeGate) are rendered, not
 * imitated. None of them is modified here.
 *
 * ⚠️ This renders the table and its purchase buttons — nothing else. The App
 * Store apparatus that lives *outside* PricingGrid's tier loop stays there and
 * is shared by both layouts: Restore Purchases (Guideline 3.1.1), the Stripe →
 * Apple footer swap, and the renewal terms with the EULA and privacy links
 * (Guideline 3.1.2(c), which build 3 was rejected over). Do not duplicate them
 * here — one copy, rendered once, is the point.
 *
 * What this component *does* have to carry, because it replaces the loop:
 * PlanPrice for paid columns, the "$0" → "Free" swap for the free column, the
 * in-app subscription-management link for Apple subscribers, and PurchaseButton
 * itself. Teacher is absent by design — see plan-comparison.ts.
 */

/**
 * The plans that get a column of their own.
 *
 * Free is not one of them — it appears under each row's label instead, as
 * "Free: 1". Three columns left ~73px each at 375px, which is where the
 * price overflow, the wrapped values and the two-line labels all came from;
 * two columns give the labels ~143px and the values ~96px and the crowding
 * goes away.
 *
 * Deliberately local, and deliberately not COMPARISON_PLANS. plan-comparison.ts
 * still lists all three and still carries every free value — this is a
 * presentation choice about which of them get a column, and the purchase
 * buttons below the table go on iterating COMPARISON_PLANS so Free keeps its
 * "Current plan" entry.
 */
const COLUMN_PLANS = ["plus", "pro"] as const satisfies readonly ComparisonPlan[];

/** The plan shown inline under each label rather than in a column. */
const INLINE_PLAN: ComparisonPlan = "free";

/**
 * i18n for the inline free line.
 *
 * Not added to COMPARISON_CHROME_KEYS: that inventory belongs to
 * plan-comparison.ts, which this change deliberately leaves alone. These two
 * keys exist only because of how this component chooses to lay the table out.
 */
const FREE_INLINE_KEY = "plans.freeInline";
const FREE_INLINE_NO_KEY = "plans.freeInlineNo";

/** Per-column display data the table cannot derive from PLAN_LIMITS. */
export interface PlanColumnMeta {
  /**
   * Static USD price. Web only: PlanPrice never renders it on native, where
   * the real StoreKit priceString is fetched instead (Guideline 3.1.2).
   */
  priceFallback: string;
  cadence?: string;
  /** Marks the tier PricingGrid's TIERS flags as `highlight`. */
  highlight?: boolean;
}

export function PlanComparisonTable({
  columns,
  currentPlan,
  hasActiveSubscription = false,
  billingSource = null,
  isNative = false,
  checkoutEnabled = false,
  t,
}: {
  /**
   * Prices and emphasis per column. Passed in rather than imported from
   * PricingGrid's TIERS: PricingGrid will import *this* component in the next
   * step, and importing TIERS back out of it would close the cycle.
   */
  columns: Record<ComparisonPlan, PlanColumnMeta>;
  currentPlan?: string;
  hasActiveSubscription?: boolean;
  billingSource?: "stripe" | "apple_iap" | null;
  /**
   * True when the request came from the native iOS shell (server-side, via
   * User-Agent). Passed down to PlanPrice so the USD fallback is never even
   * sent to the native app, rather than hidden after hydration.
   */
  isNative?: boolean;
  checkoutEnabled?: boolean;
  /**
   * Translator. Takes vars because two cells interpolate {n} from
   * RECHECK_LIMITS instead of writing the numbers into the copy.
   */
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-5">
      {/* min-w keeps three value columns legible on a narrow phone; the
          scroll container is the safety net, not the plan — the table is
          sized to fit without it at 340px and up. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] table-fixed border-collapse text-xs sm:text-sm">
          <caption className="sr-only">{t(K.caption)}</caption>

          {/* One column per COLUMN_PLANS entry, plus the labels. colgroup
              rather than per-cell widths so the group heading rows, which span
              the whole table, cannot pull the columns out of alignment.
              44/28/28 at 375px is ~143px for a label and ~96px for a value,
              against ~115px and ~73px on three columns — enough that the
              longest values and all but one label now hold a single line. */}
          <colgroup>
            <col style={{ width: "44%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>

          <thead>
            <tr className="border-b border-line">
              <td />
              {COLUMN_PLANS.map((p) => {
                const col = columns[p];
                return (
                  <th key={p} scope="col" className="px-1 pb-3 pt-1 text-center align-top">
                    {/* Fixed-height slot, rendered for every column whether or
                        not it has a badge. Keep it: only Plus has a badge, and
                        without the slot reserved it pushes Plus's name and
                        price down while Pro's stay up — the misalignment this
                        was added to fix. Two columns give the badge more room
                        horizontally; they do not remove the need for the slot.
                        align-top plus a single-line name then puts both names
                        at the same y whatever the price below them does. */}
                    <span className="mb-1 flex h-5 items-center justify-center">
                      {col.highlight && (
                        <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-pine">
                          {t("pricing.mostPopular")}
                        </span>
                      )}
                    </span>
                    <span className="block font-serif text-sm font-bold text-pine sm:text-base">
                      {PLAN_LABELS[p]}
                    </span>
                    {/*
                      Every column here is a paid plan, so every price goes
                      through PlanPrice — which shows the real StoreKit
                      priceString on native and never falls back to the USD
                      figure (Guidelines 3.1.1 / 3.1.2). Dropping the free
                      column took its "$0" → "Free" swap with it, one fewer
                      place a USD string could reach the native shell.

                      PlanPrice hardcodes text-3xl and a w-16 skeleton, both
                      sized for the cards, and is shared with that layout so it
                      is not modified. The size is capped from out here
                      instead: inside this wrapper the only .font-serif is
                      PlanPrice's price (the plan name is a sibling above) and
                      the only .animate-pulse is its skeleton.
                    */}
                    <span className="mt-0.5 block leading-tight [&_.animate-pulse]:w-10 [&_.font-serif]:text-xl sm:[&_.animate-pulse]:w-16 sm:[&_.font-serif]:text-2xl">
                      <PlanPrice plan={p} fallback={col.priceFallback} isNative={isNative} />
                    </span>
                    {/*
                      The cadence is rendered here instead of being handed to
                      PlanPrice, which puts it inline beside the price — the
                      pair is what overflowed. On its own line it always fits.
                      It is not dropped on small screens: Guideline 3.1.2(c)
                      wants the billing period stated on the purchase screen
                      itself, so hiding it below sm would trade a layout bug
                      for a review one.
                    */}
                    {col.cadence && (
                      <span className="mt-0.5 block text-[10px] leading-none text-muted">
                        {col.cadence}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {COMPARISON_GROUPS.map((group, i) => (
              <GroupRows key={group.id} group={group} isFirst={i === 0} t={t} />
            ))}
          </tbody>
        </table>
      </div>

      {/*
        Purchase buttons live outside the table, full width and stacked.
        Squeezed into three ~70px cells they would fall well under a 44pt
        target on a phone. The arbitrary variant sets the height without
        touching PurchaseButton, which owns its own styling and is shared
        with the card layout.
      */}
      <div className="mx-auto max-w-sm space-y-3 [&_button]:min-h-[44px]">
        {COMPARISON_PLANS.map((p) => {
          if (currentPlan === p) {
            return (
              <div key={p} className="space-y-2">
                {/* Named, unlike in the cards: "Current plan" sitting in a
                    stack has no column header above it to say which one. */}
                <p className="text-center text-xs font-semibold text-muted">{PLAN_LABELS[p]}</p>
                <button
                  disabled
                  className="w-full rounded-full border border-line bg-mint/50 px-4 py-2.5 text-sm font-semibold text-pine"
                >
                  {t("pricing.currentPlan")}
                </button>
                {billingSource === "apple_iap" && (
                  // Guideline 3.1.2 wants an in-app route to managing and
                  // cancelling. Same link the cards show.
                  <a
                    href="https://apps.apple.com/account/subscriptions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-muted underline"
                  >
                    {t("pricing.manageInAppInstructions")}
                  </a>
                )}
              </div>
            );
          }

          // Nothing to buy on the free tier, and nothing to say: the cards
          // render a dead "Upgrade soon" button here, which in a stack would
          // read as a broken control rather than an absent one.
          if (p === "free") return null;

          return (
            <PurchaseButton
              key={p}
              plan={p}
              billingSource={billingSource}
              hasActiveSubscription={hasActiveSubscription}
              checkoutEnabled={checkoutEnabled}
            />
          );
        })}
      </div>

      {/* The rows that would be a tick under every plan, moved out of the
          table: three identical columns say "these tiers are alike" at
          exactly the moment the table is trying to show they differ. */}
      <p className="text-center text-xs leading-relaxed text-muted">{t(K.commonFeatures)}</p>

      {/* Teacher is not a column: unbuyable, and PLAN_LIMITS gives it the same
          limits as Pro, so it would duplicate that column cell for cell. Web
          only — it names a tier with no IAP product behind it (Guideline
          3.1.1). Doubled guard, as everywhere else: server-side on isNative,
          client-side via NativeGate. */}
      {!isNative && (
        <NativeGate>
          <div className="rounded-[var(--radius-card)] border border-line bg-paper px-5 py-4 text-center">
            <p className="text-xs font-bold text-pine">{t(K.teacherTitle)}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t(K.teacherDesc)}</p>
          </div>
        </NativeGate>
      )}
    </div>
  );
}

/**
 * The free tier's value for a row, as the line that sits under its label.
 *
 * "Not on Free" rather than "Free: —" where the tier does not get the feature.
 * A bare dash worked while Free had a column, because the header said which
 * plan the cell belonged to; under a label it reads as a missing value rather
 * than an absent feature.
 *
 * Returns a string, not a node, so the "yes" case borrows the sr-only wording
 * the table already uses for a tick and nothing has to interpolate an icon.
 */
function freeInline(
  cell: Cell,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  switch (cell.kind) {
    case "no":
      return t(FREE_INLINE_NO_KEY);
    case "num":
      return t(FREE_INLINE_KEY, { value: cell.n });
    case "i18n":
      return t(FREE_INLINE_KEY, { value: t(cell.key, cell.vars) });
    case "yes":
      return t(FREE_INLINE_KEY, { value: t(K.included) });
  }
}

function GroupRows({
  group,
  isFirst,
  t,
}: {
  group: (typeof COMPARISON_GROUPS)[number];
  /** The first group already has the header's rule above it. */
  isFirst: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <>
      {/* The only rules left in the body. With one under every row the table
          read as a grid of boxes; the groups are the divisions that carry
          meaning, and the rows separate themselves by banding instead. */}
      <tr>
        <th
          scope="colgroup"
          colSpan={COLUMN_PLANS.length + 1}
          className={`pb-1 pt-5 text-left text-[11px] font-bold uppercase tracking-wide text-moss-600 ${
            isFirst ? "" : "border-t border-line"
          }`}
        >
          {t(group.headingKey)}
        </th>
      </tr>

      {group.rows.map((row, i) => {
        // Banding in place of rules. Emphasis keeps its mint, so the four rows
        // whose numbers climb still read as one block, and everything else
        // alternates against the page.
        const tint = row.emphasis ? "bg-mint/40" : i % 2 === 1 ? "bg-sand/30" : "";
        return (
          <tr key={row.id} className={tint}>
            {/*
              align-baseline, and every cell carries the same py-2.5.

              Baseline is what a comparison table wants and what middle got
              wrong: "3 / correction" wraps to two lines in a narrow column
              while its label "Revise & recheck" is one, so centring put the
              label level with the gap between the value's two lines — the
              label reading as though it had dropped below its own row.
              Aligning first-line baselines instead puts the label next to the
              value's first line whatever either of them wraps to, and it holds
              across the size step on the emphasis rows too, where the values
              are a size larger than their labels.
            */}
            <th
              scope="row"
              className={`py-2.5 pr-2 text-left align-baseline leading-snug ${
                row.emphasis ? "font-semibold text-ink" : "font-medium text-ink/80"
              }`}
            >
              {t(row.labelKey)}
              {/* Folded away rather than dropped. Both notes are what keep
                  their row from overstating itself, so NoteTooltip keeps the
                  text in the DOM for assistive technology whether it is
                  showing or not. */}
              {row.noteKey && (
                <NoteTooltip text={t(row.noteKey)} label={t(K.noteToggle)} />
              )}
              {/*
                Free, inline. Small and grey rather than a column of its own,
                which is the point: as an equal third column the free tier
                competed with the paid ones, and this table exists because the
                cards before it made Free look like the richer choice.

                Every row carries it, including the ones Free does not get.
                There is no "Free" column header any more, so the word has to
                be on each line or the number underneath a label means nothing.
                Below the label rather than beside it, so the first line — and
                with it the row's baseline, and the values aligned to it — does
                not move.
              */}
              <span className="mt-0.5 block text-[10px] font-normal leading-snug text-muted">
                {freeInline(row.cells[INLINE_PLAN], t)}
              </span>
            </th>
            {COLUMN_PLANS.map((p) => (
              // No horizontal padding, and a step down in size below sm. The
              // ordinary cells hold the longest strings — at 375px
              // "3 / correction" comes to ~70px against a ~69px content box
              // with px-0.5, so the padding is the difference between one line
              // and two. The cells are centred, so they still read as
              // separated. Emphasis cells are short numbers and keep their
              // size.
              <td
                key={p}
                className={`px-0 py-2.5 text-center align-baseline leading-snug ${
                  row.emphasis
                    ? "text-sm font-bold text-pine sm:text-base"
                    : "text-[11px] text-ink/80 sm:text-sm"
                }`}
              >
                <CellValue cell={row.cells[p]} t={t} />
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

function CellValue({
  cell,
  t,
}: {
  cell: Cell;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  switch (cell.kind) {
    case "num":
      return <>{cell.n}</>;
    case "i18n":
      return <>{t(cell.key, cell.vars)}</>;
    case "yes":
      return (
        <>
          <Icon.check className="mx-auto h-4 w-4 text-moss" aria-hidden />
          <span className="sr-only">{t(K.included)}</span>
        </>
      );
    case "no":
      return (
        <>
          <span aria-hidden className="text-muted">
            —
          </span>
          <span className="sr-only">{t(K.notIncluded)}</span>
        </>
      );
  }
}
