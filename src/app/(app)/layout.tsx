import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Logo } from "@/components/Logo";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Avatar } from "@/components/ObiePhoto";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let name = "Learner";
  let initials = "U";
  let avatarUrl = "";
  let currentStreak = 0;
  if (user) {
    const [{ data: profile }, { data: dateData }] = await Promise.all([
      supabase.from("profiles").select("display_name, username, avatar_url").eq("id", user.id).single(),
      supabase.from("diary_entries").select("diary_date").eq("user_id", user.id),
    ]);
    name = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Learner";
    initials = name.slice(0, 2).toUpperCase();
    avatarUrl = profile?.avatar_url || "";

    const toYMD = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dateSet = new Set<string>((dateData ?? []).map((r: { diary_date: string }) => r.diary_date));
    const cursor = new Date();
    if (!dateSet.has(toYMD(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dateSet.has(toYMD(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line bg-paper lg:block">
        <Sidebar currentStreak={currentStreak} />
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-cream/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" size="sm" />
        <Link href="/profile" aria-label="プロフィール" className="overflow-hidden rounded-full ring-1 ring-line hover:ring-moss">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-9 w-9 object-cover" />
          ) : (
            <Avatar initials={initials} size={36} />
          )}
        </Link>
      </header>

      <div className="lg:pl-[264px]">
        {/* Desktop top bar */}
        <div className="sticky top-0 z-20 hidden border-b border-line bg-cream/85 px-6 py-3 backdrop-blur lg:block lg:px-10">
          <TopBar name={name} initials={initials} avatarUrl={avatarUrl} />
        </div>

        <main className="mx-auto max-w-6xl overflow-x-hidden px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          {children}

          <footer className="mt-12 border-t border-line pt-6 text-center text-xs leading-relaxed text-muted">
            <p>AI corrections may not be perfect. Please use them as learning support.</p>
            <p className="mt-1">
              Nihongo Diary · public beta ·{" "}
              <a href="/upgrade" className="font-semibold text-moss-600 hover:text-pine">Plans</a> · By using this app you agree to our Terms &amp; Privacy. Your diaries stay private unless you make them public.
            </p>
            <p className="mt-1">
              Created by{" "}
              <a href="https://www.youtube.com/@tetsusenseidesuyo" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-pine">Tetsu Sensei</a>
              {" "}·{" "}
              <a href="https://www.youtube.com/@tetsusenseidesuyo" target="_blank" rel="noopener noreferrer" className="hover:text-pine">YouTube</a>
              {" "}·{" "}
              <a href="https://www.skool.com/tetsu-senseis-lounge-8620/about" target="_blank" rel="noopener noreferrer" className="hover:text-pine">Skool</a>
            </p>
          </footer>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
