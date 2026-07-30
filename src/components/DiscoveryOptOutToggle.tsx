"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/contexts/locale";

/**
 * "Don't show my entries in Discovery."
 *
 * Reads and writes discovery_settings, which is a table of its own and not a
 * column on profiles. Fifteen queries read profiles.plan, and the outage where
 * a missing column made the whole row null and turned every user Free came from
 * widening one of them. Nothing here can reach those queries.
 *
 * Absence of a row means opted_out false, so the default costs no backfill.
 * Turning the switch off writes false rather than deleting the row: the two are
 * equivalent to every reader, and an update is one statement that either
 * succeeds or does not, where a delete invites the question of what a missing
 * row meant.
 *
 * The switch is not the enforcement point — discovery_entries resolves the
 * exclusion in SQL. This only records the intent.
 */
export function DiscoveryOptOutToggle({
  userId,
  initialOptedOut,
}: {
  userId: string;
  initialOptedOut: boolean;
}) {
  const t = useT();
  const [optedOut, setOptedOut] = useState(initialOptedOut);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function toggle() {
    if (status === "saving") return;

    const next = !optedOut;
    setOptedOut(next);
    setStatus("saving");

    const supabase = createClient();
    const { error } = await supabase
      .from("discovery_settings")
      .upsert({ user_id: userId, opted_out: next }, { onConflict: "user_id" });

    if (error) {
      // Put the switch back where it was. A control that stays flipped after a
      // failed write is worse than one that visibly refuses: this setting is
      // about who can see the user's writing, so it must never show a state
      // the database does not hold.
      setOptedOut(!next);
      setStatus("error");
      return;
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <span id="discovery-optout-label" className="text-sm font-medium text-ink">
          {t("profile.discovery.toggle")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={optedOut}
          aria-labelledby="discovery-optout-label"
          onClick={toggle}
          disabled={status === "saving"}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
            optedOut ? "border-moss/50 bg-moss-600" : "border-line bg-mint/60"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-paper shadow transition-transform ${
              optedOut ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {status === "saving" && (
        <p className="mt-2 text-xs text-muted">{t("profile.discovery.saving")}</p>
      )}
      {status === "saved" && (
        <p className="mt-2 text-xs font-semibold text-moss-600">
          ✓ {t("profile.discovery.saved")}
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs font-semibold text-red-600">
          {t("profile.discovery.error")}
        </p>
      )}
    </div>
  );
}
