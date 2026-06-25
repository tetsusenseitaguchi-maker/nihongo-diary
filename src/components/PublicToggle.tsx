"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";
import { useT } from "@/contexts/locale";

export function PublicToggle({
  diaryId,
  initialPublic,
}: {
  diaryId: string;
  initialPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const t = useT();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !isPublic;
    const supabase = createClient();
    const { error } = await supabase
      .from("diary_entries")
      .update({ is_public: next })
      .eq("id", diaryId);
    if (!error) {
      setIsPublic(next);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={isPublic}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
        isPublic
          ? "border-moss/50 bg-mint text-pine"
          : "border-line bg-paper text-muted hover:border-moss/40"
      }`}
    >
      {isPublic ? <Icon.check className="h-4 w-4" /> : <Icon.book className="h-4 w-4" />}
      {isPublic ? t("public.publicLabel") : t("public.privateLabel")}
    </button>
  );
}
