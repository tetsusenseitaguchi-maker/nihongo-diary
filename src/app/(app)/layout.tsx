import { Sidebar } from "@/components/Sidebar";
import { Logo } from "@/components/Logo";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
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
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", user.id)
      .single();
    name = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Learner";
    initials = name.slice(0, 2).toUpperCase();
    avatarUrl = profile?.avatar_url || "";
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line bg-paper lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-cream/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" size="sm" />
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
          </footer>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
