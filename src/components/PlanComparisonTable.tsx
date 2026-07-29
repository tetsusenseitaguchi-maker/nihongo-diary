import { Fragment } from "react";
import { Icon } from "@/components/icons";
import { PlanPrice } from "@/components/PlanPrice";
import { PurchaseButton } from "@/components/PurchaseButton";
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

          {/* 38% for the labels, the rest split three ways. colgroup rather
              than per-cell widths so the group heading rows, which span the
              whole table, cannot pull the columns out of alignment. */}
          <colgroup>
            <col style={{ width: "38%" }} />
            <col style={{ width: "20.66%" }} />
            <col style={{ width: "20.67%" }} />
            <col style={{ width: "20.67%" }} />
          </colgroup>

          <thead>
            <tr className="border-b border-line">
              <td />
              {COMPARISON_PLANS.map((p) => {
                const col = columns[p];
                return (
                  <th key={p} scope="col" className="px-1 pb-3 pt-1 text-center align-top">
                    {/* Fixed-height slot, rendered for every column whether or
                        not it has a badge. Previously the badge existed only
                        under Plus and pushed that column's name and price out
                        of line with Free and Pro. align-top plus a
                        single-line name then puts all three names at the same
                        y whatever the price below them does. */}
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
                    <span className="mt-0.5 block leading-tight">
                      {p === "free" ? (
                        // The hardcoded "$0" is an external USD price under
                        // Guideline 3.1.1. Server-side when the native UA is
                        // known; NativeGate covers requests where it isn't.
                        isNative ? (
                          <FreePrice label={t("pricing.freeNativePrice")} />
                        ) : (
                          <NativeGate fallback={<FreePrice label={t("pricing.freeNativePrice")} />}>
                            <FreePrice label={col.priceFallback} />
                          </NativeGate>
                        )
                      ) : (
                        <PlanPrice
                          plan={p}
                          fallback={col.priceFallback}
                          cadence={col.cadence}
                          isNative={isNative}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {COMPARISON_GROUPS.map((group) => (
              <GroupRows key={group.id} group={group} t={t} />
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
 * The free column's price.
 *
 * Carries PlanPrice's exact classes for the price itself, deliberately: the
 * paid columns render through PlanPrice, which hardcodes text-3xl, and a
 * smaller size here gave the three header cells different line heights and
 * so different baselines. PlanPrice is shared with the card layout and is
 * not modified, so this side matches it instead.
 */
function FreePrice({ label }: { label: string }) {
  return <span className="font-serif text-3xl font-bold text-pine">{label}</span>;
}

function GroupRows({
  group,
  t,
}: {
  group: (typeof COMPARISON_GROUPS)[number];
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={COMPARISON_PLANS.length + 1}
          className="pb-1 pt-5 text-left text-[11px] font-bold uppercase tracking-wide text-moss-600"
        >
          {t(group.headingKey)}
        </th>
      </tr>

      {group.rows.map((row) => {
        // The tint has to cover the note row as well, so a row and its note
        // read as one band instead of a highlighted row with a loose line
        // underneath.
        const tint = row.emphasis ? "bg-mint/40" : "";
        // When a note follows, it carries the row's bottom padding. Keeping
        // py-2.5 on both put 10px between a label and its own note, which is
        // what made those rows look out of step with their values.
        const pad = row.noteKey ? "pt-2.5 pb-0.5" : "py-2.5";
        return (
          // Fragment, not <>: a row plus its optional note are two <tr>s, and
          // the key has to sit on what map() returns.
          <Fragment key={row.id}>
            <tr className={`border-t border-line/60 ${tint}`}>
              {/* align-middle throughout. Table cells default to
                  vertical-align: baseline, which lines up the *first* line of
                  each cell — so a label that wrapped to two lines sat with its
                  first line against a single-line value and everything looked
                  a row out. */}
              <th
                scope="row"
                className={`${pad} pr-2 text-left align-middle leading-snug ${
                  row.emphasis ? "font-semibold text-ink" : "font-medium text-ink/80"
                }`}
              >
                {t(row.labelKey)}
              </th>
              {COMPARISON_PLANS.map((p) => (
                <td
                  key={p}
                  className={`${pad} px-1 text-center align-middle leading-snug ${
                    row.emphasis ? "text-sm font-bold text-pine sm:text-base" : "text-ink/80"
                  }`}
                >
                  <CellValue cell={row.cells[p]} t={t} />
                </td>
              ))}
            </tr>

            {row.noteKey && (
              // Spans the full width rather than sitting under the label: at
              // 38% of a 340px table the label column is ~130px, and these
              // notes would stack six lines deep in it.
              <tr className={tint}>
                <td
                  colSpan={COMPARISON_PLANS.length + 1}
                  className="pb-2.5 pr-2 text-left text-[11px] leading-snug text-muted"
                >
                  {t(row.noteKey)}
                </td>
              </tr>
            )}
          </Fragment>
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
