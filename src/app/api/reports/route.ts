import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TARGET_TYPES = ["diary_entry", "comment", "peer_correction", "reply"] as const;
type TargetType = (typeof TARGET_TYPES)[number];

const MAX_REASON_LENGTH = 500;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { target_type?: unknown; target_id?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { target_type, target_id, reason } = body;

  if (typeof target_type !== "string" || !TARGET_TYPES.includes(target_type as TargetType)) {
    return NextResponse.json({ error: "invalid_target_type" }, { status: 400 });
  }
  if (typeof target_id !== "string" || target_id.trim().length === 0) {
    return NextResponse.json({ error: "invalid_target_id" }, { status: 400 });
  }
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  if (trimmedReason.length === 0) {
    return NextResponse.json({ error: "invalid_reason" }, { status: 400 });
  }
  if (trimmedReason.length > MAX_REASON_LENGTH) {
    return NextResponse.json({ error: "reason_too_long" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("target_type", target_type)
    .eq("target_id", target_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already_reported" }, { status: 409 });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      target_type,
      target_id,
      reason: trimmedReason,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "insert_failed", message: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
