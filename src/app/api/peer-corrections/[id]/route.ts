import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// PATCH /api/peer-corrections/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { correctedText?: string; comment?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { correctedText, comment } = body;
  if (!correctedText?.trim()) {
    return NextResponse.json({ error: "correctedText is required." }, { status: 400 });
  }
  if (correctedText.trim().length > 500) {
    return NextResponse.json({ error: "Correction is too long (max 500 chars)." }, { status: 400 });
  }
  if (comment && comment.length > 500) {
    return NextResponse.json({ error: "Comment is too long (max 500 chars)." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("peer_corrections")
    .update({
      corrected_text: correctedText.trim(),
      comment: comment?.trim() || null,
    })
    .eq("id", id)
    .eq("corrector_id", user.id)
    .select("id, corrected_text, comment, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Not found or forbidden." },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json({ correction: data });
}

// DELETE /api/peer-corrections/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // RLS enforces: corrector_id = auth.uid() OR diary owner
  const { error } = await supabase
    .from("peer_corrections")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
