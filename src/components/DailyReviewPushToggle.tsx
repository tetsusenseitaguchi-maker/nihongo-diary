"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/contexts/locale";

/**
 * "Remind me about yesterday's sentence."
 *
 * Built alongside the notification rather than after it, on purpose. A daily
 * push with no switch inside the app leaves iOS Settings as the only way to
 * stop it — and turning it off there silences follows, comments, reactions and
 * replies too. One feature would cost the learner all of them.
 *
 * ── Shape, and where it differs from DiscoveryOptOutToggle ─────────────────
 * Same switch, same four states, same put-it-back-on-failure rule: a control
 * that stays flipped after a failed write shows a state the database does not
 * hold, and for a preference about being contacted that is not acceptable.
 *
 * The difference is where the value lives. Discovery has a table of its own,
 * which is what keeps it away from the fifteen queries that read profiles.plan.
 * This one is a column ON profiles, so the isolation has to be done by hand:
 * the page reads it in a query of its own, and this writes exactly one column
 * by name. Neither touches plan, and neither can widen a select that does.
 *
 * ⚠️ Do not fold this read or write into any query that also reads plan. A
 * column that is missing in one environment takes the whole row down with it,
 * normalizePlan(undefined) answers "free", and every paying learner is
 * downgraded until someone notices.
 *
 * Sense is the plain one: on means the reminder arrives. Discovery's switch is
 * an opt-OUT and reads inverted; this is not, and the two should not be made to
 * look alike at the cost of what they say.
 */
export function DailyReviewPushToggle({
  userId,
  initialEnabled,
}: {
  userId: string;
  initialEnabled: boolean;
}) {
  const t = useT();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function toggle() {
    if (status === "saving") return;

    const next = !enabled;
    setEnabled(next);
    setStatus("saving");

    const supabase = createClient();
    // One column, named. The row is the learner's own — profiles already
    // carries a "Users can update their own profile" policy, which is what
    // preferred_language, push_token and timezone are written through.
    const { error } = await supabase
      .from("profiles")
      .update({ daily_review_push: next })
      .eq("id", userId);

    if (error) {
      setEnabled(!next);
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <span id="daily-review-push-label" className="text-sm font-medium text-ink">
          {t("profile.dailyReview.toggle")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="daily-review-push-label"
          onClick={toggle}
          disabled={status === "saving"}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
            enabled ? "border-moss/50 bg-moss-600" : "border-line bg-mint/60"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-paper shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {status === "saving" && (
        <p className="mt-2 text-xs text-muted">{t("profile.dailyReview.saving")}</p>
      )}
      {status === "saved" && (
        <p className="mt-2 text-xs font-semibold text-moss-600">
          ✓ {t("profile.dailyReview.saved")}
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs font-semibold text-red-600">
          {t("profile.dailyReview.error")}
        </p>
      )}
    </div>
  );
}
