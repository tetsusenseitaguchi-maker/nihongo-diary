"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { FeedCard, type FeedItem } from "@/components/FeedTimeline";
import { useT } from "@/contexts/locale";

const PAGE_SIZE = 20;

/**
 * The Discovery timeline. Same card as Following — this only decides how many
 * of them are on screen.
 *
 * Load-more reveals more of what it already holds rather than fetching, which
 * is the one thing that makes seeded shuffling work end to end. The server
 * shuffled the whole pool once and handed over the result in order; asking the
 * database for "the next 20 random rows" would reshuffle and start repeating
 * and skipping entries. Running out means going back to the tab for a new seed.
 */
export function DiscoveryTimeline({ items }: { items: FeedItem[] }) {
  const t = useT();
  const [shown, setShown] = useState(PAGE_SIZE);

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="font-serif text-lg font-bold text-pine">{t("discovery.empty")}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">{t("discovery.emptyDesc")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.slice(0, shown).map((item) => (
        // Keyed by diary, not by activity: a diary whose activity row is
        // missing carries an empty activityId, and every one of those would
        // collide on the same key.
        <FeedCard key={item.diaryEntryId ?? item.activityId} item={item} />
      ))}
      {shown < items.length && (
        <button
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          className="w-full rounded-xl border border-line bg-paper py-3 text-sm font-semibold text-ink/70 transition-colors hover:bg-mint/40"
        >
          {t("feed.loadMore")}
        </button>
      )}
    </div>
  );
}
