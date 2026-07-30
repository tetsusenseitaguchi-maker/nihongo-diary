import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ObiePhoto";
import { FollowButton } from "@/components/FollowButton";
import { FeedTimeline, type FeedItem } from "@/components/FeedTimeline";
import { DiscoveryTimeline } from "@/components/DiscoveryTimeline";
import { DiscoveryIntroModal } from "@/components/DiscoveryIntroModal";
import { FeedTabs } from "@/components/FeedTabs";
import { UserSearch } from "@/components/UserSearch";
import { getServerT } from "@/lib/i18n-server";
import { DiscoveryFilters } from "@/components/DiscoveryFilters";
import { seededShuffle, parseSeed, newSeed } from "@/lib/discovery/shuffle";
import {
  parseFilters,
  parseSort,
  hasAnyFilter,
  discoveryHref as buildDiscoveryHref,
  NO_FILTERS,
} from "@/lib/discovery/filters";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: string | null;
  country: string | null;
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

/**
 * Rows pulled for Discovery before anything is excluded.
 *
 * Self, people already followed and blocks in both directions are subtracted
 * in JS, so the query has to over-fetch: filtering a 20-row page would leave
 * 20 minus whatever was dropped, and someone following widely could page into
 * an empty screen while plenty was left unseen. 300 in, DISCOVERY_MAX out.
 */
const DISCOVERY_POOL = 300;

/** How much of the shuffled pool is sent to the client — three pages' worth. */
const DISCOVERY_MAX = 60;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    sort?: string;
    seed?: string;
    level?: string;
    country?: string;
    tag?: string;
    seeking?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = await getServerT();

  // Who I follow, and who's blocked in either direction
  const [{ data: followRows }, { data: blockedByMe }, { data: blockedMe }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    supabase.from("blocks").select("blocker_id").eq("blocked_id", user.id),
  ]);
  const followingIds = (followRows ?? []).map((r) => r.following_id as string);
  const blockedUserIds = new Set<string>([
    ...(blockedByMe ?? []).map((r) => r.blocked_id as string),
    ...(blockedMe ?? []).map((r) => r.blocker_id as string),
  ]);
  const feedUserIds = [user.id, ...followingIds.filter((id) => !blockedUserIds.has(id))];

  const params = await searchParams;
  const tab = params.tab === "discovery" ? "discovery" : "following";

  // Under "random", Discovery keeps its seed in the URL so the order survives
  // paging and the back button. Arriving at the tab mints a fresh one, so
  // choosing random twice is two different shuffles rather than the same one.
  //
  // A seed is minted even under "new", where it orders nothing. It is what the
  // link that switches to "random" needs, and minting it here rather than in
  // the filter bar is deliberate: that component renders on both sides, and a
  // Math.random() in it would put a different number in the href on each,
  // which is a hydration mismatch.
  const seed = parseSeed(params.seed) ?? newSeed();
  const sort = parseSort(params.sort);
  const filters = parseFilters(params);
  const followingHref = "/feed";
  // Staying on Discovery keeps the order, the seed and the filters; arriving
  // from Following starts clean — newest-first, with nothing narrowed.
  const discoveryHref =
    tab === "discovery"
      ? buildDiscoveryHref(sort, seed, filters)
      : buildDiscoveryHref(sort, newSeed(), NO_FILTERS);
  const tabs = (
    <FeedTabs
      active={tab}
      followingHref={followingHref}
      discoveryHref={discoveryHref}
      followingLabel={t("feed.tabFollowing")}
      discoveryLabel={t("feed.tabDiscovery")}
    />
  );

  // ── Discovery ──────────────────────────────────────────────────────────────
  // Returns before any of the Following queries below, so nothing about that
  // tab changes and none of its work runs on this one.
  //
  // Reads discovery_entries rather than diary_entries: the view already drops
  // private diaries and anyone who opted out, and opt-out cannot be applied
  // here because discovery_settings is readable only by its owner.
  if (tab === "discovery") {
    // Filters are applied to the query, not to what comes back. Narrowing
    // afterwards would leave however many of 300 happened to match, which for
    // anything selective is a nearly empty screen while plenty went unseen.
    // author_level and author_country are the two columns appended to the view
    // for exactly this.
    let poolQuery = supabase
      .from("discovery_entries")
      .select(
        "id, user_id, diary_date, title, tags, original_text, corrected_japanese, seeking_peer_correction, created_at",
      )
      .neq("user_id", user.id);

    if (filters.level) poolQuery = poolQuery.eq("author_level", filters.level);
    if (filters.country) poolQuery = poolQuery.eq("author_country", filters.country);
    if (filters.tag) poolQuery = poolQuery.contains("tags", [filters.tag]);
    if (filters.seeking) poolQuery = poolQuery.eq("seeking_peer_correction", true);

    const { data: poolData } = await poolQuery
      .order("created_at", { ascending: false })
      .limit(DISCOVERY_POOL);

    type DiscoveryRow = {
      id: string;
      user_id: string;
      title: string | null;
      tags: string[];
      original_text: string;
      corrected_japanese: string | null;
      seeking_peer_correction: boolean;
      created_at: string;
    };

    // Blocks are subtracted by the caller here, as they are in /feed above,
    // /api/peer-corrections and CommentsSection — the view does not apply them
    // and could not, since it runs as its owner and has no viewer to compare
    // against. Already-followed authors come out too: they are what the
    // Following tab is for.
    const followingSet = new Set(followingIds);
    const eligible = ((poolData ?? []) as DiscoveryRow[]).filter(
      (d) => !followingSet.has(d.user_id) && !blockedUserIds.has(d.user_id),
    );

    // The pool was fetched newest-first and .filter() keeps that order, so
    // "new" is not a second ordering — it is this one, left alone. Shuffling
    // is the step that has to be asked for.
    const ordered = sort === "random" ? seededShuffle(eligible, seed) : eligible;
    const picked = ordered.slice(0, DISCOVERY_MAX);
    const discoveryDiaryIds = picked.map((d) => d.id);
    const discoveryAuthorIds = Array.from(new Set(picked.map((d) => d.user_id)));

    // Reactions belong to activity_feed rows, not to diaries, so they are
    // reached the way diary/[id] reaches them: look the activity row up by
    // diary_entry_id after the fact.
    const [{ data: discoveryAuthors }, { data: activityRows }] = await Promise.all([
      discoveryAuthorIds.length
        ? supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, level, country")
            .in("id", discoveryAuthorIds)
        : Promise.resolve({ data: [] as Profile[] }),
      discoveryDiaryIds.length
        ? supabase
            .from("activity_feed")
            .select("id, diary_entry_id")
            .eq("activity_type", "wrote_diary")
            .in("diary_entry_id", discoveryDiaryIds)
        : Promise.resolve({ data: [] as { id: string; diary_entry_id: string }[] }),
    ]);

    const activityByDiary = new Map(
      (activityRows ?? []).map((a) => [a.diary_entry_id as string, a.id as string]),
    );
    const discoveryActivityIds = Array.from(activityByDiary.values());

    const { data: discoveryReactions } = discoveryActivityIds.length
      ? await supabase
          .from("reactions")
          .select("activity_id, reaction_type, user_id")
          .in("activity_id", discoveryActivityIds)
      : { data: [] as { activity_id: string; reaction_type: string; user_id: string }[] };

    const dRxCounts = new Map<string, Record<string, number>>();
    const dRxMine = new Map<string, string[]>();
    for (const r of discoveryReactions ?? []) {
      const c = dRxCounts.get(r.activity_id) ?? {};
      c[r.reaction_type] = (c[r.reaction_type] ?? 0) + 1;
      dRxCounts.set(r.activity_id, c);
      if (r.user_id === user.id)
        dRxMine.set(r.activity_id, [...(dRxMine.get(r.activity_id) ?? []), r.reaction_type]);
    }

    const discoveryProfiles = new Map(
      (discoveryAuthors ?? []).map((p) => [p.id, p as Profile]),
    );

    const discoveryItems: FeedItem[] = picked.map((d) => {
      const p = discoveryProfiles.get(d.user_id);
      const body = d.original_text ?? "";
      const activityId = activityByDiary.get(d.id) ?? "";
      return {
        activityId,
        userId: d.user_id,
        activityType: "wrote_diary",
        diaryEntryId: d.id,
        createdAt: d.created_at,
        authorName: nameOf(p),
        authorUsername: p?.username ?? null,
        authorAvatar: p?.avatar_url ?? null,
        authorCountry: p?.country ?? null,
        // Everything the view returns is public by definition.
        diaryIsPublic: true,
        diaryTitle: d.title ?? null,
        diaryTags: d.tags ?? [],
        diarySnippet: body ? body.slice(0, 100) + (body.length > 100 ? "…" : "") : "",
        hasCorrectionResult: d.corrected_japanese != null,
        seekingPeerCorrection: d.seeking_peer_correction ?? false,
        // Streak and monthly count are left at zero rather than computed. The
        // Following tab can afford them because it already knows its handful
        // of authors; here it would mean a 60-day diary-date scan across up to
        // sixty strangers to decide whether to draw a badge.
        streak: 0,
        monthlyCount: 0,
        reactionCounts: dRxCounts.get(activityId) ?? {},
        myReactions: dRxMine.get(activityId) ?? [],
      };
    });

    return (
      <div className="space-y-5">
        <DiscoveryIntroModal />
        <div>
          <p className="text-sm font-medium text-muted">{t("discovery.subtitle")}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">
            {t("feed.title")}
          </h1>
        </div>

        {tabs}

        <DiscoveryFilters sort={sort} seed={seed} filters={filters} />

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <DiscoveryTimeline
            items={discoveryItems}
            clearFiltersHref={
              // Clearing the filters keeps the order and the seed: only the
              // narrowing is being undone.
              hasAnyFilter(filters) ? buildDiscoveryHref(sort, seed, NO_FILTERS) : null
            }
          />

          <div className="space-y-4">
            <UserSearch />
            <Card accent="none" className="gloss-green p-5">
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
          .select("id, username, display_name, avatar_url, level, country")
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
          .select("id, is_public, title, tags, original_text, corrected_japanese, seeking_peer_correction")
          .in("id", diaryIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            is_public: boolean;
            title: string | null;
            tags: string[];
            original_text: string;
            corrected_japanese: string | null;
            seeking_peer_correction: boolean;
          }[],
        }),
  ]);

  // Build lookup maps
  const authors = new Map((authorData ?? []).map((p) => [p.id, p as Profile]));

  type DiaryMeta = { id: string; is_public: boolean; title: string | null; tags: string[]; original_text: string; corrected_japanese: string | null; seeking_peer_correction: boolean };
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

  const excluded = new Set([user.id, ...followingIds, ...blockedUserIds]);
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
      authorCountry: p?.country ?? null,
      diaryIsPublic: Boolean(d?.is_public),
      diaryTitle: d?.title ?? null,
      diaryTags: d?.tags ?? [],
      diarySnippet: body ? body.slice(0, 100) + (body.length > 100 ? "…" : "") : "",
      hasCorrectionResult: d?.corrected_japanese != null,
      seekingPeerCorrection: d?.seeking_peer_correction ?? false,
      streak: stats.streak,
      monthlyCount: stats.monthlyCount,
      reactionCounts: rxCounts.get(a.id) ?? {},
      myReactions: rxMine.get(a.id) ?? [],
    };
  });

  return (
    <div className="space-y-5">
      {/* On both tabs, because whichever one the user lands on is the one that
          has to carry the notice. It shows once per browser either way. */}
      <DiscoveryIntroModal />
      <div>
        <p className="text-sm font-medium text-muted">{t("feed.subtitle")}</p>
        {/* Fallback anchor for the tour: the timeline element does not exist
            when the feed is empty. */}
        <h1 data-tour="feed-heading" className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">{t("feed.title")}</h1>
      </div>

      {tabs}

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

          <Card accent="none" className="gloss-green p-5">
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
