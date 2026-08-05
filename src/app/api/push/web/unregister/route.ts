import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Forget a Web Push subscription.
 *
 * No service role here, deliberately. The delete runs as the learner, so the
 * RLS policy — `using (auth.uid() = user_id)` — is what confines it to their
 * own rows. Someone posting a stranger's endpoint deletes nothing and is told
 * the same thing as someone posting their own: the row is gone, which it is,
 * from their point of view.
 *
 * Idempotent on purpose. Turning the toggle off twice, or off after the
 * browser has already dropped the subscription, is not an error worth showing
 * anyone.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[push/web/unregister] delete failed:", error.message);
    return NextResponse.json({ error: "Could not remove the subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
