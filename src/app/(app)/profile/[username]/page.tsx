import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ObiePhoto";
import { FollowButton } from "@/components/FollowButton";
import { TagChips } from "@/components/TagChips";
import { computeStats, type DiaryRow } from "@/lib/diary";
import { formatShort } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, bio")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const isSelf = profile.id === user.id;
  const name = profile.display_name || profile.username || "Learner";
  const initials = name.slice(0, 2).toUpperCase();

  // Stats from this user's wrote_diary activities (no private text needed)
  const { data: acts } = await supabase
    .from("activity_feed")
    .select("metadata, created_at")
    .eq("user_id", profile.id)
    .eq("activity_type", "wrote_diary");
  const seen = new Set<string>();
  const dateRows: DiaryRow[] = [];
  for (const a of acts ?? []) {
    const d = (a.metadata as { diary_date?: string } | null)?.diary_date || a.created_at.slice(0, 10);
    if (!seen.has(d)) {
      seen.add(d);
      dateRows.push({ diary_date: d } as DiaryRow);
    }
  }
  const stats = computeStats(dateRows);

  // Follow counts
  const [{ count: followers }, { count: followingCount }, { data: rel }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle(),
  ]);

  // Public diaries
  const { data: publicDiaries } = await supabase
    .from("diary_entries")
    .select("id, diary_date, title, tags, original_text, level")
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("diary_date", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {profile.avatar_url ? (
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
            </span>
          ) : (
            <Avatar initials={initials} size={80} />
          )}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <div>
                <h1 className="font-serif text-2xl font-bold text-pine">{name}</h1>
                <p className="text-sm text-muted">@{profile.username}</p>
              </div>
              {isSelf ? (
                <Link href="/profile" className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-pine hover:border-moss">
                  Edit profile
                </Link>
              ) : (
                <FollowButton targetUserId={profile.id} initialFollowing={Boolean(rel)} />
              )}
            </div>
            {profile.level && (
              <span className="mt-2 inline-block rounded-full bg-mint px-3 py-1 text-xs font-semibold text-pine">{profile.level}</span>
            )}
            {profile.bio && <p className="mt-2 text-sm text-ink/80">{profile.bio}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Streak" value={`${stats.currentStreak}`} />
          <Stat label="Total" value={`${stats.total}`} />
          <Stat label="This month" value={`${stats.thisMonthCount}`} />
          <Stat label="Followers" value={`${followers ?? 0}`} />
          <Stat label="Following" value={`${followingCount ?? 0}`} />
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-serif text-xl font-bold text-pine">Public diaries</h2>
        {(publicDiaries ?? []).length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            No public diaries yet. {isSelf && "You can make a diary public from its detail page."}
          </Card>
        ) : (
          <ul className="space-y-3">
            {(publicDiaries ?? []).map((d) => (
              <li key={d.id}>
                <Link href={`/diary/${d.id}`}>
                  <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-lift">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-[11px] font-bold text-pine">
                      {formatShort(d.diary_date)}
                    </span>
                    <span className="min-w-0 flex-1">
                      {d.title ? (
                        <span className="block truncate font-semibold text-sm text-pine">{d.title}</span>
                      ) : (
                        <span className="block truncate font-jp text-sm text-ink">{d.original_text}</span>
                      )}
                      {(d.tags ?? []).length > 0 && (
                        <span className="mt-0.5 block">
                          <TagChips tags={d.tags ?? []} />
                        </span>
                      )}
                    </span>
                    {d.level && <span className="shrink-0 rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-ink/70">{d.level}</span>}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-mint/40 p-3 text-center">
      <p className="font-serif text-xl font-bold text-pine">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
