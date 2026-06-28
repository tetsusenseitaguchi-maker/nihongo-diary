import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ObiePhoto";
import { FollowButton } from "@/components/FollowButton";
import { FeedTimeline, type FeedItem } from "@/components/FeedTimeline";
import { UserSearch } from "@/components/UserSearch";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: string | null;
};

function nameOf(p?: Profile) {
  return p?.display_name || p?.username || "Learner";
}
function initialsOf(p?: Profile) {
  return nameOf(p).slice(0, 2).toUpperCase();
}

/** Compute consecutive-day streak from a sorted-desc list of unique diary dates (YYYY-MM-DD). */
function computeStreak(sortedDesc: string[]): number {
  if (sortedDesc.length === 0) return 0;
  const toMs = (d: string) => new Date(d + "T00:00:00").getTime();
  const DAY = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = today.getTime();
  for (const d of sortedDesc) {
    const ms = toMs(d);
    if (ms === cursor || ms === cursor - DAY) {
      streak++;
      cursor = ms - DAY;
    } else {
      break;
    }
  }
  return streak;
}

function countThisMonth(dates: string[]): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return dates.filter((d) => d.startsWith(prefix)).length;
}

const PAGE_SIZE = 20;

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getServerT();

  // Who I follow
  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = (followRows ?? []).map((r) => r.following_id as string);
  const feedUserIds = [user.id, ...followingIds];

  // Compute 60-day window for streak calculation
  const since = new Date();
  since.setDate(since.getDate() - 62);
  const sinceStr = since.toISOString().slice(0, 10);

  // All parallel fetches
  const [
    { data: activityData },
    { data: authorData },
    { data: dateData },
    { data: peopleData },
  ] = await Promise.all([
    supabase
      .from("activity_feed")
      .select("id, user_id, activity_type, diary_entry_id, metadata, created_at")
      .in("user_id", feedUserIds)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1),
    feedUserIds.length
      ? supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, level")
          .in("id", feedUserIds)
      : Promise.resolve({ data: [] as Profile[] }),
    // Diary dates for streak + monthly count per user
    feedUserIds.length
      ? supabase
          .from("diary_entries")
          .select("user_id, diary_date")
          .in("user_id", feedUserIds)
          .gte("diary_date", sinceStr)
          .order("diary_date", { ascending: false })
      : Promise.resolve({ data: [] as { user_id: string; diary_date: string }[] }),
    // People to suggest (not already following)
    supabase.from("profiles").select("id, username, display_name, avatar_url, level").limit(20),
  ]);

  const activities = (activityData ?? []).slice(0, PAGE_SIZE);
  const hasMore = (activityData ?? []).length > PAGE_SIZE;

  // Build per-user stats
  const userStats: Record<string, { streak: number; monthlyCount: number }> = {};
  const datesByUser = new Map<string, string[]>();
  for (const row of dateData ?? []) {
    const arr = datesByUser.get(row.user_id) ?? [];
    arr.push(row.diary_date as string);
    datesByUser.set(row.user_id, arr);
  }
  for (const uid of feedUserIds) {
    const dates = datesByUser.get(uid) ?? [];
    const unique = Array.from(new Set(dates)).sort().reverse();
    userStats[uid] = {
      streak: computeStreak(unique),
      monthlyCount: countThisMonth(unique),
    };
  }

  // Fetch reactions and diary snippets for the first page of activities
  const activityIds = activities.map((a) => a.id);
  const diaryIds = activities
    .filter((a) => a.diary_entry_id)
    .map((a) => a.diary_entry_id as string);

  const [{ data: reactionData }, { data: diaryData }] = await Promise.all([
    activityIds.length
      ? supabase
          .from("reactions")
          .select("activity_id, reaction_type, user_id")
          .in("activity_id", activityIds)
      : Promise.resolve({ data: [] as { activity_id: string; reaction_type: string; user_id: string }[] }),
    diaryIds.length
      ? supabase
          .from("diary_entries")
          .select("id, is_public, title, tags, original_text, corrected_japanese")
          .in("id", diaryIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            is_public: boolean;
            title: string | null;
            tags: string[];
            original_text: string;
            corrected_japanese: string | null;
          }[],
        }),
  ]);

  // Build lookup maps
  const authors = new Map((authorData ?? []).map((p) => [p.id, p as Profile]));

  type DiaryMeta = { id: string; is_public: boolean; title: string | null; tags: string[]; original_text: string; corrected_japanese: string | null };
  const diaryMap = new Map<string, DiaryMeta>(
    (diaryData ?? []).map((d) => [d.id, d as DiaryMeta]),
  );

  const rxCounts = new Map<string, Record<string, number>>();
  const rxMine = new Map<string, string[]>();
  for (const r of reactionData ?? []) {
    const c = rxCounts.get(r.activity_id) ?? {};
    c[r.reaction_type] = (c[r.reaction_type] ?? 0) + 1;
    rxCounts.set(r.activity_id, c);
    if (r.user_id === user.id)
      rxMine.set(r.activity_id, [...(rxMine.get(r.activity_id) ?? []), r.reaction_type]);
  }

  const excluded = new Set([user.id, ...followingIds]);
  const suggestions = (peopleData ?? [])
    .filter((p) => !excluded.has(p.id))
    .slice(0, 6) as Profile[];

  // Build serialisable FeedItem array for client component
  const initialItems: FeedItem[] = activities.map((a) => {
    const p = authors.get(a.user_id);
    const d = a.diary_entry_id ? diaryMap.get(a.diary_entry_id) : undefined;
    const body = d?.original_text ?? "";
    const stats = userStats[a.user_id] ?? { streak: 0, monthlyCount: 0 };
    return {
      activityId: a.id,
      userId: a.user_id,
      activityType: a.activity_type,
      diaryEntryId: a.diary_entry_id ?? null,
      createdAt: a.created_at,
      authorName: nameOf(p),
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

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted">{t("feed.subtitle")}</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">{t("feed.title")}</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Timeline */}
        <FeedTimeline
          initialItems={initialItems}
          feedUserIds={feedUserIds}
          currentUserId={user.id}
          userStats={userStats}
          hasMore={hasMore}
        />

        {/* Right rail (desktop) / Bottom section (mobile) */}
        <div className="space-y-4">
          <UserSearch />
          <Card className="p-5">
            <h2 className="mb-1 font-serif text-lg font-bold text-pine">{t("feed.findLearners")}</h2>
            <p className="mb-3 text-xs text-muted">{t("feed.findLearnersDesc")}</p>
            {suggestions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">{t("feed.noSuggestions")}</p>
            ) : (
              <ul className="space-y-3">
                {suggestions.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    {p.avatar_url ? (
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.avatar_url} alt={nameOf(p)} className="h-full w-full object-cover" />
                      </span>
                    ) : (
                      <Avatar initials={initialsOf(p)} size={36} />
                    )}
                    <div className="min-w-0 flex-1">
                      {p.username ? (
                        <Link
                          href={`/profile/${p.username}`}
                          className="block truncate text-sm font-semibold text-ink hover:text-pine"
                        >
                          {nameOf(p)}
                        </Link>
                      ) : (
                        <span className="block truncate text-sm font-semibold text-ink">{nameOf(p)}</span>
                      )}
                      {p.level && <span className="text-xs text-muted">{p.level}</span>}
                    </div>
                    <FollowButton targetUserId={p.id} initialFollowing={false} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="gloss-green p-5">
            <p className="font-jp text-sm font-medium text-cream">
              毎日(まいにち)ちょっとずつ、いっしょに。
            </p>
            <p className="mt-0.5 text-xs text-cream/75">👍 💪 🔥 🎉</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
