"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/contexts/locale";

export function FollowButton({
  targetUserId,
  initialFollowing,
  size = "md",
}: {
  targetUserId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const t = useT();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      setFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: targetUserId });
      setFollowing(true);
    }
    setBusy(false);
    router.refresh();
  }

  const pad = size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm";

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full font-semibold transition-colors ${pad} ${
        following
          ? "border border-line bg-paper text-pine hover:border-apricot hover:text-apricot"
          : "gloss-btn text-cream hover:brightness-105"
      }`}
    >
      {following ? t("follow.following") : t("follow.follow")}
    </button>
  );
}
