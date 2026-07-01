import { NextResponse } from "next/server";
import { sendPush } from "@/lib/apns";

export const runtime = "nodejs";

/**
 * Internal endpoint for sending a push notification to a known device token.
 * Accepts { token, title, body } in the request body.
 *
 * Optional: set PUSH_INTERNAL_SECRET env var to require x-push-secret header.
 * Useful for future cron jobs or Supabase webhooks.
 */
export async function POST(req: Request) {
  const secret = process.env.PUSH_INTERNAL_SECRET;
  if (secret && req.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let token: string | undefined;
  let title: string | undefined;
  let body: string | undefined;
  try {
    const parsed = await req.json();
    token = typeof parsed.token === "string" ? parsed.token.trim() : undefined;
    title = typeof parsed.title === "string" ? parsed.title.trim() : undefined;
    body = typeof parsed.body === "string" ? parsed.body.trim() : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!token || !title || !body) {
    return NextResponse.json(
      { error: "token, title and body are required" },
      { status: 400 },
    );
  }

  await sendPush(token, title, body);
  return NextResponse.json({ ok: true });
}
