import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: notifs, error } = await supabase
    .from("notifications")
    .select("id, type, actor_id, diary_entry_id, metadata, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Batch-fetch actor profiles for notifications that have an actor
  const actorIds = [
    ...new Set(
      (notifs ?? [])
        .filter((n) => n.actor_id)
        .map((n) => n.actor_id as string)
    ),
  ];

  let profileMap: Record<
    string,
    { display_name: string | null; username: string | null; avatar_url: string | null }
  > = {};

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", actorIds);
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  const notifications = (notifs ?? []).map((n) => ({
    ...n,
    actor: n.actor_id ? (profileMap[n.actor_id] ?? null) : null,
  }));

  return NextResponse.json({ notifications });
}
