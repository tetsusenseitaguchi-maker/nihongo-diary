"use client";

import { useState, useEffect } from "react";
import { Furigana } from "@/components/Furigana";
import { useT } from "@/contexts/locale";
import { createClient } from "@/lib/supabase/client";
import type { MistakeItem } from "@/lib/types";

type ReviewEntry = {
  id: string;
  diary_date: string;
  grammar_focus: MistakeItem;
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}/${parseInt(m)}/${parseInt(d)}`;
}

export function GrammarReviewList() {
  const t = useT();
  const [items, setItems] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("diary_entries")
        .select("id, diary_date, grammar_focus")
        .eq("user_id", user.id)
        .not("grammar_focus", "is", null)
        .order("diary_date", { ascending: false })
        .limit(50);
      setItems((data ?? []) as ReviewEntry[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-pine border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line py-14 text-center">
        <span className="text-3xl">🌱</span>
        <p className="font-semibold text-ink/70">{t("review.noReviews")}</p>
        <p className="text-sm text-ink/50">{t("review.noReviewsHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((entry) => (
        <div
          key={entry.id}
          className="rounded-[var(--radius-card)] border border-line bg-paper p-4"
        >
          <p className="mb-2 text-xs font-medium text-muted">{fmtDate(entry.diary_date)}</p>
          <div className="flex flex-wrap items-center gap-2 font-jp text-sm">
            <span className="text-ink/50 line-through">
              <Furigana text={entry.grammar_focus.before} />
            </span>
            <span className="font-bold text-moss-600">→</span>
            <span className="font-semibold text-pine">
              <Furigana text={entry.grammar_focus.after} />
            </span>
          </div>
          {entry.grammar_focus.note && (
            <p className="mt-1.5 text-xs leading-relaxed text-ink/70">
              {entry.grammar_focus.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
