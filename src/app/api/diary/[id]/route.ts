import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // Fetch entry — verify ownership and get attachment paths
  const { data: entry, error: fetchErr } = await supabase
    .from("diary_entries")
    .select("user_id, image_path, audio_path")
    .eq("id", id)
    .single();

  if (fetchErr || !entry) {
    return NextResponse.json({ error: "日記が見つかりません。" }, { status: 404 });
  }
  if (entry.user_id !== user.id) {
    return NextResponse.json({ error: "削除権限がありません。" }, { status: 403 });
  }

  // 1. Remove activity_feed rows linked to this diary entry
  await supabase
    .from("activity_feed")
    .delete()
    .eq("diary_entry_id", id)
    .eq("user_id", user.id);

  // 2. Remove storage files (best-effort — missing files are not an error)
  if (entry.image_path) {
    await supabase.storage.from("diary-images").remove([entry.image_path]);
  }
  if (entry.audio_path) {
    await supabase.storage.from("diary-audio").remove([entry.audio_path]);
  }

  // 3. Delete the diary entry (RLS also enforces user_id = auth.uid())
  const { error: deleteErr } = await supabase
    .from("diary_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) {
    return NextResponse.json(
      { error: "削除に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
