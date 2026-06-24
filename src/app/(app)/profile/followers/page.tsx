import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ObiePhoto";
import { FollowButton } from "@/components/FollowButton";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  level: string | null;
}

export default async function FollowersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Follower IDs (ordered by most recent)
  const { data: followerRows } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (followerRows ?? []).map((r) => r.follower_id);

  // Their profiles
  const followerProfiles: Profile[] =
    ids.length > 0
      ? ((await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, level")
          .in("id", ids)).data ?? [])
      : [];

  // Sort to match follows order
  const profileMap = new Map(followerProfiles.map((p) => [p.id, p]));
  const sorted = ids.map((id) => profileMap.get(id)).filter(Boolean) as Profile[];

  // Who do I follow back? (for FollowButton initialFollowing)
  const { data: myFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const myFollowingSet = new Set((myFollowing ?? []).map((r) => r.following_id));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="flex items-center gap-1 text-sm font-semibold text-moss-600 hover:text-pine">
          <Icon.arrow className="h-4 w-4 rotate-180" /> Profile
        </Link>
        <h1 className="font-serif text-2xl font-bold text-pine">
          Followers <span className="text-base font-normal text-muted">· {sorted.length}件</span>
        </h1>
      </div>

      {sorted.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-sm text-muted">まだフォロワーがいません。</p>
          <p className="mt-1 text-xs text-muted">No followers yet.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {sorted.map((p) => {
            const name = p.display_name || p.username || "Learner";
            const initials = name.slice(0, 2).toUpperCase();
            const isSelf = p.id === user.id;
            return (
              <li key={p.id}>
                <Card className="flex items-center gap-3 p-4">
                  <Link href={p.username ? `/profile/${p.username}` : "#"} className="flex min-w-0 flex-1 items-center gap-3">
                    {p.avatar_url ? (
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.avatar_url} alt={name} className="h-full w-full object-cover" />
                      </span>
                    ) : (
                      <Avatar initials={initials} size={40} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{name}</p>
                      {p.username && <p className="text-xs text-muted">@{p.username}</p>}
                      {p.level && (
                        <span className="mt-0.5 inline-block rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-pine">
                          {p.level}
                        </span>
                      )}
                    </div>
                  </Link>
                  {!isSelf && (
                    <FollowButton
                      targetUserId={p.id}
                      initialFollowing={myFollowingSet.has(p.id)}
                      size="sm"
                    />
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
