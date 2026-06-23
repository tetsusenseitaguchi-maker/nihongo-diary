import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, LinkButton } from "@/components/ui";
import { Avatar } from "@/components/ObiePhoto";
import { LogoutButton } from "@/components/LogoutButton";
import { computeStats, type DiaryRow } from "@/lib/diary";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: diaryData } = await supabase
    .from("diary_entries")
    .select("diary_date")
    .eq("user_id", user.id);
  const stats = computeStats((diaryData ?? []) as DiaryRow[]);

  const [{ count: followers }, { count: followingCount }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
  ]);

  const name = profile?.display_name || profile?.username || "Learner";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-pine">Profile</h1>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-sage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
            </span>
          ) : (
            <Avatar initials={initials} size={64} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-serif text-xl font-bold text-pine">{name}</h2>
              {profile?.level && <Badge tone="moss">{profile.level}</Badge>}
            </div>
            <p className="text-sm text-muted">{profile?.username ? `@${profile.username}` : user.email}</p>
          </div>
        </div>

        {profile?.bio && (
          <p className="mt-4 rounded-xl bg-mint/40 p-4 text-[15px] leading-relaxed text-ink/80">{profile.bio}</p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <Stat label="Streak" value={stats.currentStreak} />
          <Stat label="Total" value={stats.total} />
          <Stat label="This month" value={stats.thisMonthCount} />
          <Stat label="Followers" value={followers ?? 0} />
          <Stat label="Following" value={followingCount ?? 0} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <LinkButton href="/profile-setup" variant="secondary">Edit profile</LinkButton>
          {profile?.username && (
            <Link href={`/profile/${profile.username}`} className="text-sm font-semibold text-moss-600 hover:text-pine">
              View public profile →
            </Link>
          )}
          <span className="ml-auto"><LogoutButton /></span>
        </div>
      </Card>

      {/* Privacy settings */}
      <Card className="p-6">
        <h2 className="font-serif text-lg font-bold text-pine">Privacy</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/75">
          Your diaries are <span className="font-semibold text-pine">private by default</span>. Only you can read them.
          You can make any single diary public from its detail page — public diaries show on your profile and in your
          followers&apos; feed. Your learning activity (like “wrote a diary”) is shared with people who follow you, but
          never the diary text unless you make it public.
        </p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-mint/40 p-3 text-center">
      <p className="font-serif text-xl font-bold text-pine">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
