import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/peer-corrections?diaryEntryId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const diaryEntryId = searchParams.get("diaryEntryId");
  if (!diaryEntryId) {
    return NextResponse.json({ error: "diaryEntryId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ data, error }, { data: blockedByMe }, { data: blockedMe }] = await Promise.all([
    supabase
      .from("peer_corrections")
      .select(
        `id,
         diary_entry_id,
         corrector_id,
         start_offset,
         end_offset,
         original_excerpt,
         corrected_text,
         comment,
         corrector_level,
         created_at,
         updated_at,
         profiles:corrector_id (
           username,
           display_name,
           avatar_url,
           country
         )`
      )
      .eq("diary_entry_id", diaryEntryId)
      .order("start_offset", { ascending: true }),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    supabase.from("blocks").select("blocker_id").eq("blocked_id", user.id),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mutual block filter: hide corrections from correctors I've blocked or who've blocked me
  const blockedIds = new Set<string>([
    ...(blockedByMe ?? []).map((r) => r.blocked_id as string),
    ...(blockedMe ?? []).map((r) => r.blocker_id as string),
  ]);
  const corrections = (data ?? []).filter((c) => !blockedIds.has(c.corrector_id as string));

  return NextResponse.json({ corrections });
}

// POST /api/peer-corrections
export async function POST(request: Request) {
  let body: {
    diaryEntryId?: string;
    startOffset?: number;
    endOffset?: number;
    originalExcerpt?: string;
    correctedText?: string;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { diaryEntryId, startOffset, endOffset, originalExcerpt, correctedText, comment } = body;

  if (!diaryEntryId || startOffset == null || endOffset == null || !originalExcerpt?.trim() || !correctedText?.trim()) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (startOffset < 0 || endOffset <= startOffset) {
    return NextResponse.json({ error: "Invalid text range." }, { status: 400 });
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

  // Snapshot corrector's current level
  const { data: profile } = await supabase
    .from("profiles")
    .select("level")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("peer_corrections")
    .insert({
      diary_entry_id: diaryEntryId,
      corrector_id: user.id,
      start_offset: startOffset,
      end_offset: endOffset,
      original_excerpt: originalExcerpt.trim(),
      corrected_text: correctedText.trim(),
      comment: comment?.trim() || null,
      corrector_level: profile?.level ?? null,
    })
    .select(
      `id,
       diary_entry_id,
       corrector_id,
       start_offset,
       end_offset,
       original_excerpt,
       corrected_text,
       comment,
       corrector_level,
       created_at,
       updated_at,
       profiles:corrector_id (
         username,
         display_name,
         avatar_url,
         country
       )`
    )
    .single();

  if (error) {
    // RLS violation = trying to correct own diary or a private one
    if (error.code === "42501" || error.code === "23514") {
      return NextResponse.json(
        { error: "Cannot correct your own diary or a private diary." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ correction: data }, { status: 201 });
}
