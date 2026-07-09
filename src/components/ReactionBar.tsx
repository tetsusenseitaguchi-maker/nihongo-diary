"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REACTIONS } from "@/lib/activity";

export function ReactionBar({
  activityId,
  initialCounts,
  initialMine,
}: {
  activityId: string;
  initialCounts: Record<string, number>;
  initialMine: string[];
}) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<string[]>(initialMine);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(type: string) {
    if (busy) return;
    setBusy(type);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(null);
      return;
    }
    const has = mine.includes(type);
    // optimistic
    setMine((p) => (has ? p.filter((t) => t !== type) : [...p, type]));
    setCounts((p) => ({ ...p, [type]: Math.max(0, (p[type] ?? 0) + (has ? -1 : 1)) }));

    if (has) {
      await supabase
        .from("reactions")
        .delete()
        .eq("user_id", user.id)
        .eq("activity_id", activityId)
        .eq("reaction_type", type);
    } else {
      await supabase
        .from("reactions")
        .insert({ user_id: user.id, activity_id: activityId, reaction_type: type });
    }
    setBusy(null);
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {REACTIONS.map((r) => {
        const active = mine.includes(r.type);
        const count = counts[r.type] ?? 0;
        return (
          <button
            key={r.type}
            onClick={() => toggle(r.type)}
            disabled={busy === r.type}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "border-moss/50 bg-mint text-pine"
                : "border-line bg-paper text-ink/70 hover:border-moss/40 hover:bg-mint/40"
            }`}
          >
            <span>{r.emoji}</span>
            {r.label}
            {count > 0 && <span className={active ? "text-moss-600" : "text-muted"}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
