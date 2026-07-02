import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { blocked_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { blocked_id } = body;
  if (typeof blocked_id !== "string" || blocked_id.trim().length === 0) {
    return NextResponse.json({ error: "invalid_blocked_id" }, { status: 400 });
  }
  if (blocked_id === user.id) {
    return NextResponse.json({ error: "cannot_block_self" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blocked_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id }, { status: 200 });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "insert_failed", message: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const blockedId = searchParams.get("blocked_id");
  if (!blockedId) {
    return NextResponse.json({ error: "invalid_blocked_id" }, { status: 400 });
  }

  const { error: deleteErr } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  if (deleteErr) {
    return NextResponse.json({ error: "delete_failed", message: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
