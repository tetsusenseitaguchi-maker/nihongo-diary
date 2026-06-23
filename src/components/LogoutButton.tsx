"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";

export function LogoutButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:border-apricot hover:text-apricot ${className}`}
    >
      <Icon.arrow className="h-4 w-4" /> Log out
    </button>
  );
}
