import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ObiePhoto";
import { ReactionBar } from "@/components/ReactionBar";
import { FollowButton } from "@/components/FollowButton";
import { activityMessage, relativeTime, REACTIONS, type ActivityRow } from "@/lib/activity";
import { UserSearch } from "@/components/UserSearch";

export const dynamic = "force-dynamic";

type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; level: string | null };

function nameOf(p?: Profile) {
  return p?.display_name || p?.username || "Learner";
}
function initialsOf(p?: Profile) {
  return nameOf(p).slice(0, 2).toUpperCase();
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Who I follow
  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = (followRows ?? []).map((r) => r.following_id as string);
  const feedUserIds = [user.id, ...followingIds];

  // Activities from me + people I follow
  const { data: activityData } = await supabase
    .from("activity_feed")
    .select("id, user_id, activity_type, diary_entry_id, metadata, created_at")
    .in("user_id", feedUserIds)
    .order("created_at", { ascending: false })
    .limit(40);
  const activities = (activityData ?? []) as ActivityRow[];

  // Author profiles, reactions, and suggestions fetched in parallel
  const authorIds = Array.from(new Set(activities.map((a) => a.user_id)));
  const activityIds = activities.map((a) => a.id);
  const excluded = new Set([user.id, ...followingIds]);

  // Collect diary_entry_ids from diary activities to fetch live is_public + snippet
  const diaryEntryIds = activities
    .filter((a) => a.diary_entry_id && (a.activity_type === "wrote_diary" || a.activity_type === "shared_diary"))
    .map((a) => a.diary_entry_id as string);

  const [{ data: authorData }, { data: reactionData }, { data: peopleData }, { data: diaryData }] = await Promise.all([
    authorIds.length
      ? supabase.from("profiles").select("id, username, display_name, avatar_url, level").in("id", authorIds)
      : Promise.resolve({ data: [] as Profile[] }),
    activityIds.length
      ? supabase.from("reactions").select("activity_id, reaction_type, user_id").in("activity_id", activityIds)
      : Promise.resolve({ data: [] as { activity_id: string; reaction_type: string; user_id: string }[] }),
    supabase.from("profiles").select("id, username, display_name, avatar_url, level").limit(20),
    // RLS ensures only public entries (or own entries) are returned here
    diaryEntryIds.length
      ? supabase.from("diary_entries").select("id, is_public, original_text").in("id", diaryEntryIds)
      : Promise.resolve({ data: [] as { id: string; is_public: boolean; original_text: string }[] }),
  ]);

  // Map diary_entry_id → { is_public, snippet }
  type DiaryMeta = { isPublic: boolean; snippet: string };
  const diaryMeta = new Map<string, DiaryMeta>();
  for (const d of diaryData ?? []) {
    diaryMeta.set(d.id, {
      isPublic: Boolean(d.is_public),
      snippet: d.original_text ? d.original_text.slice(0, 80) + (d.original_text.length > 80 ? "…" : "") : "",
    });
  }

  const authors = new Map((authorData ?? []).map((p) => [p.id, p as Profile]));
  const counts = new Map<string, Record<string, number>>();
  const mine = new Map<string, string[]>();
  for (const r of reactionData ?? []) {
    const c = counts.get(r.activity_id) ?? {};
    c[r.reaction_type] = (c[r.reaction_type] ?? 0) + 1;
    counts.set(r.activity_id, c);
    if (r.user_id === user.id) mine.set(r.activity_id, [...(mine.get(r.activity_id) ?? []), r.reaction_type]);
  }
  const suggestions = (peopleData ?? []).filter((p) => !excluded.has(p.id)).slice(0, 6) as Profile[];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted">Learning Together</p>
        <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-pine">Learning Feed</h1>
        <p className="mt-1 text-ink/70">Cheer each other on — a little every day. 🌸</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Feed */}
        <div className="space-y-4">
          {activities.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-serif text-lg font-bold text-pine">Your feed is quiet for now</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">
                Follow other learners to see their progress here. Find someone in “Find learners” →
              </p>
            </Card>
          ) : (
            activities.map((a) => {
              const author = authors.get(a.user_id);
              // Use live is_public from diary_entries (not stale activity metadata)
              const dm = a.diary_entry_id ? diaryMeta.get(a.diary_entry_id) : undefined;
              const isDiaryActivity =
                a.activity_type === "wrote_diary" || a.activity_type === "shared_diary";
              const isPublicDiary = isDiaryActivity && !!a.diary_entry_id && dm?.isPublic;
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex items-center gap-3">
                    {author?.avatar_url ? (
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={author.avatar_url} alt={nameOf(author)} className="h-full w-full object-cover" />
                      </span>
                    ) : (
                      <Avatar initials={initialsOf(author)} size={40} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        {author?.username ? (
                          <Link href={`/profile/${author.username}`} className="font-semibold hover:text-pine">
                            {nameOf(author)}
                          </Link>
                        ) : (
                          <span className="font-semibold">{nameOf(author)}</span>
                        )}{" "}
                        {activityMessage(a)}
                      </p>
                      <p className="text-xs text-muted">{relativeTime(a.created_at)}</p>
                    </div>
                  </div>

                  {/* Public diary: show Japanese snippet + read link */}
                  {isPublicDiary && dm?.snippet && (
                    <Link
                      href={`/diary/${a.diary_entry_id}`}
                      className="mt-3 block rounded-xl bg-mint/40 px-4 py-3 transition-colors hover:bg-mint/60"
                    >
                      <p className="font-jp text-sm leading-relaxed text-ink line-clamp-2">{dm.snippet}</p>
                      <p className="mt-1.5 text-xs font-semibold text-moss-600">Read diary →</p>
                    </Link>
                  )}
                  {isPublicDiary && !dm?.snippet && (
                    <Link
                      href={`/diary/${a.diary_entry_id}`}
                      className="mt-3 inline-block rounded-lg bg-mint/50 px-3 py-2 text-sm font-semibold text-moss-600 hover:text-pine"
                    >
                      Read diary →
                    </Link>
                  )}

                  <ReactionBar
                    activityId={a.id}
                    initialCounts={counts.get(a.id) ?? {}}
                    initialMine={mine.get(a.id) ?? []}
                  />
                </Card>
              );
            })
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-4">
          <UserSearch />

          <Card className="p-5">
            <h2 className="mb-1 font-serif text-lg font-bold text-pine">Find learners</h2>
            <p className="mb-3 text-xs text-muted">Follow people to fill your feed.</p>
            {suggestions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No one to suggest yet.</p>
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
                        <Link href={`/profile/${p.username}`} className="block truncate text-sm font-semibold text-ink hover:text-pine">
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
            <p className="font-jp text-sm font-medium text-cream">毎日(まいにち)ちょっとずつ、いっしょに。</p>
            <p className="mt-0.5 text-xs text-cream/75">Reactions: {REACTIONS.map((r) => r.label).join(" · ")}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
