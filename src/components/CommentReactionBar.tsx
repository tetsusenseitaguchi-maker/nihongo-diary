"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COMMENT_REACTIONS } from "@/lib/activity";

/**
 * Emoji reactions for a single comment.
 * Mirrors ReactionBar's optimistic-update pattern, but a user may have at
 * most ONE reaction per comment: pressing a different emoji changes it,
 * pressing the same emoji removes it.
 */
export function CommentReactionBar({
  commentId,
  initialCounts,
  initialMine,
}: {
  commentId: string;
  initialCounts: Record<string, number>;
  initialMine: string | null;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<string | null>(initialMine);
  const [busy, setBusy] = useState(false);

  async function toggle(type: string) {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const prev = mine;
    if (prev === type) {
      // Same emoji → remove
      setMine(null);
      setCounts((p) => ({ ...p, [type]: Math.max(0, (p[type] ?? 0) - 1) }));
      await supabase
        .from("comment_reactions")
        .delete()
        .eq("user_id", user.id)
        .eq("comment_id", commentId);
    } else {
      // New or different emoji → set/replace (one per user per comment)
      setMine(type);
      setCounts((p) => {
        const next = { ...p };
        if (prev) next[prev] = Math.max(0, (next[prev] ?? 0) - 1);
        next[type] = (next[type] ?? 0) + 1;
        return next;
      });
      await supabase
        .from("comment_reactions")
        .upsert(
          { user_id: user.id, comment_id: commentId, reaction_type: type },
          { onConflict: "user_id,comment_id" },
        );
    }
    setBusy(false);
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {COMMENT_REACTIONS.map((r) => {
        const active = mine === r.type;
        const count = counts[r.type] ?? 0;
        return (
          <button
            key={r.type}
            type="button"
            onClick={() => toggle(r.type)}
            disabled={busy}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
              active
                ? "border-moss/50 bg-mint text-pine"
                : "border-line bg-paper text-ink/70 hover:border-moss/40 hover:bg-mint/40"
            }`}
          >
            <span className="text-sm leading-none">{r.emoji}</span>
            {count > 0 && (
              <span className={active ? "text-moss-600" : "text-muted"}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
