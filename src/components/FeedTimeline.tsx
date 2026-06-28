"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ObiePhoto";
import { ReactionBar } from "@/components/ReactionBar";
import { TagChips } from "@/components/TagChips";
import { activityMessage, relativeTime, type ActivityRow } from "@/lib/activity";
import { useT } from "@/contexts/locale";

export type FeedItem = {
  activityId: string;
  userId: string;
  activityType: string;
  diaryEntryId: string | null;
  createdAt: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatar: string | null;
  diaryIsPublic: boolean;
  diaryTitle: string | null;
  diaryTags: string[];
  diarySnippet: string;
  hasCorrectionResult: boolean;
  streak: number;
  monthlyCount: number;
  reactionCounts: Record<string, number>;
  myReactions: string[];
};

function FeedCard({ item }: { item: FeedItem }) {
  const t = useT();
  const isDiary =
    item.activityType === "wrote_diary" || item.activityType === "shared_diary";
  const isPublicDiary = isDiary && item.diaryIsPublic && !!item.diaryEntryId;

  const activityRow: ActivityRow = {
    id: item.activityId,
    user_id: item.userId,
    activity_type: item.activityType,
    diary_entry_id: item.diaryEntryId,
    metadata: {},
    created_at: item.createdAt,
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4">
        {/* Header: avatar + name + badges + time */}
        <div className="flex items-start gap-3">
          <Link
            href={item.authorUsername ? `/profile/${item.authorUsername}` : "#"}
            className="shrink-0"
          >
            {item.authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.authorAvatar}
                alt={item.authorName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-mint"
              />
            ) : (
              <Avatar
                initials={item.authorName.slice(0, 2).toUpperCase()}
                size={44}
              />
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {item.authorUsername ? (
                <Link
                  href={`/profile/${item.authorUsername}`}
                  className="font-semibold text-ink hover:text-pine"
                >
                  {item.authorName}
                </Link>
              ) : (
                <span className="font-semibold text-ink">{item.authorName}</span>
              )}
              {/* Streak badge */}
              {item.streak >= 2 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-apricot/15 px-2 py-0.5 text-[11px] font-bold text-apricot">
                  🔥 {item.streak}
                  {t("common.days")}
                </span>
              )}
              {/* Monthly count badge */}
              {item.monthlyCount >= 3 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-pine">
                  📅 {t("feed.monthlyCount", { n: item.monthlyCount })}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink/70">
              {activityMessage(activityRow)}
            </p>
            <p className="mt-0.5 text-xs text-muted">{relativeTime(item.createdAt)}</p>
          </div>
        </div>

        {/* Public diary: snippet */}
        {isPublicDiary && (item.diaryTitle || item.diarySnippet) && (
          <Link
            href={`/diary/${item.diaryEntryId}`}
            className="mt-3 block rounded-xl bg-mint/40 px-4 py-3 transition-colors hover:bg-mint/60 active:bg-mint/80"
          >
            {item.diaryTags.length > 0 && (
              <div className="mb-1.5">
                <TagChips tags={item.diaryTags} />
              </div>
            )}
            {item.diaryTitle && (
              <p className="mb-1 text-sm font-bold text-pine">{item.diaryTitle}</p>
            )}
            {item.diarySnippet && (
              <p className="font-jp text-sm leading-relaxed text-ink/80 line-clamp-3">
                {item.diarySnippet}
              </p>
            )}
            {!item.hasCorrectionResult && (
              <span className="mt-2 inline-block rounded-full border border-line bg-paper/80 px-2.5 py-0.5 text-[11px] font-medium text-muted">
                {t("feed.noCorrectionYet")}
              </span>
            )}
            <p className="mt-1.5 text-xs font-semibold text-moss-600">
              {t("feed.readDiary")}
            </p>
          </Link>
        )}
      </div>

      {/* Reaction + comment row */}
      <div className="border-t border-line bg-paper/60 px-4 py-3">
        <ReactionBar
          activityId={item.activityId}
          initialCounts={item.reactionCounts}
          initialMine={item.myReactions}
        />
        {isPublicDiary && item.diaryEntryId && (
          <Link
            href={`/diary/${item.diaryEntryId}#comments`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:border-moss/40 hover:bg-mint/40"
          >
            💬 {t("feed.comment")}
          </Link>
        )}
      </div>
    </Card>
  );
}

export function FeedTimeline({
  initialItems,
  feedUserIds,
  currentUserId,
  userStats,
  hasMore: initialHasMore,
}: {
  initialItems: FeedItem[];
  feedUserIds: string[];
  currentUserId: string;
  userStats: Record<string, { streak: number; monthlyCount: number }>;
  hasMore: boolean;
}) {
  const t = useT();
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  async function loadMore() {
    if (loading || !hasMore || items.length === 0) return;
    setLoading(true);
    const cursor = items[items.length - 1].createdAt;
    const supabase = createClient();

    const { data: actData } = await supabase
      .from("activity_feed")
      .select("id, user_id, activity_type, diary_entry_id, metadata, created_at")
      .in("user_id", feedUserIds)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!actData || actData.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const authorIds = Array.from(new Set(actData.map((a) => a.user_id)));
    const activityIds = actData.map((a) => a.id);
    const diaryIds = actData
      .filter((a) => a.diary_entry_id)
      .map((a) => a.diary_entry_id as string);

    const [{ data: profileData }, { data: rxData }, { data: dData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", authorIds),
      activityIds.length
        ? supabase
            .from("reactions")
            .select("activity_id, reaction_type, user_id")
            .in("activity_id", activityIds)
        : Promise.resolve({ data: [] }),
      diaryIds.length
        ? supabase
            .from("diary_entries")
            .select("id, is_public, title, tags, original_text, corrected_japanese")
            .in("id", diaryIds)
        : Promise.resolve({ data: [] }),
    ]);

    type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
    const profileMap = new Map<string, Profile>(
      (profileData ?? []).map((p) => [p.id, p as Profile]),
    );

    type DiaryMeta = { id: string; is_public: boolean; title: string | null; tags: string[]; original_text: string; corrected_japanese: string | null };
    const diaryMap = new Map<string, DiaryMeta>(
      (dData ?? []).map((d) => [d.id, d as DiaryMeta]),
    );

    const rxCounts = new Map<string, Record<string, number>>();
    const rxMine = new Map<string, string[]>();
    for (const r of rxData ?? []) {
      const c = rxCounts.get(r.activity_id) ?? {};
      c[r.reaction_type] = (c[r.reaction_type] ?? 0) + 1;
      rxCounts.set(r.activity_id, c);
      if (r.user_id === currentUserId)
        rxMine.set(r.activity_id, [...(rxMine.get(r.activity_id) ?? []), r.reaction_type]);
    }

    const newItems: FeedItem[] = actData.map((a) => {
      const p = profileMap.get(a.user_id);
      const d = a.diary_entry_id ? diaryMap.get(a.diary_entry_id) : undefined;
      const body = d?.original_text ?? "";
      const stats = userStats[a.user_id] ?? { streak: 0, monthlyCount: 0 };
      return {
        activityId: a.id,
        userId: a.user_id,
        activityType: a.activity_type,
        diaryEntryId: a.diary_entry_id ?? null,
        createdAt: a.created_at,
        authorName: p?.display_name || p?.username || "Learner",
        authorUsername: p?.username ?? null,
        authorAvatar: p?.avatar_url ?? null,
        diaryIsPublic: Boolean(d?.is_public),
        diaryTitle: d?.title ?? null,
        diaryTags: d?.tags ?? [],
        diarySnippet: body ? body.slice(0, 100) + (body.length > 100 ? "…" : "") : "",
        hasCorrectionResult: d?.corrected_japanese != null,
        streak: stats.streak,
        monthlyCount: stats.monthlyCount,
        reactionCounts: rxCounts.get(a.id) ?? {},
        myReactions: rxMine.get(a.id) ?? [],
      };
    });

    setItems((prev) => [...prev, ...newItems]);
    if (actData.length < 20) setHasMore(false);
    setLoading(false);
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="font-serif text-lg font-bold text-pine">{t("feed.empty")}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">{t("feed.emptyDesc")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <FeedCard key={item.activityId} item={item} />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full rounded-xl border border-line bg-paper py-3 text-sm font-semibold text-ink/70 transition-colors hover:bg-mint/40 disabled:opacity-60"
        >
          {loading ? t("common.loading") : t("feed.loadMore")}
        </button>
      )}
    </div>
  );
}
