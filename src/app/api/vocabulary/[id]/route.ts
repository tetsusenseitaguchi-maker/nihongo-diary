import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await supabase
    .from("vocabulary_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // RLS guard: users can only delete their own entries

  return NextResponse.json({ ok: true });
}
