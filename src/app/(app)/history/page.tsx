import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HistoryWithTabs } from "@/components/HistoryWithTabs";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("diary_entries")
    .select(
      "id, diary_date, title, tags, original_text, level, correction_style, image_path, audio_path",
    )
    .eq("user_id", user.id)
    .order("diary_date", { ascending: false })
    .order("created_at", { ascending: false });

  const params = await searchParams;
  const initialTab = params.tab === "vocab" ? "vocab" : "diary";

  return <HistoryWithTabs entries={data ?? []} initialTab={initialTab} />;
}
