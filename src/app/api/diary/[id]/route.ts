import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ── PATCH: update attachments (photo / audio / places) ──────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership + get current attachment paths
  const { data: entry, error: fetchErr } = await supabase
    .from("diary_entries")
    .select("user_id, image_path, audio_path")
    .eq("id", id)
    .single();

  if (fetchErr || !entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fd = await request.formData();
  const photoFile = fd.get("photo") as File | null;
  const removePhoto = fd.get("removePhoto") === "true";
  const audioFile = fd.get("audio") as File | null;
  const removeAudio = fd.get("removeAudio") === "true";
  const placesJson = fd.get("places") as string | null;

  let imagePath: string | null = (entry.image_path as string | null) ?? null;
  let audioPath: string | null = (entry.audio_path as string | null) ?? null;
  let attachmentsChanged = false;

  // ── Photo ──────────────────────────────────────────────────────────────────
  if (removePhoto || (photoFile && photoFile.size > 0)) {
    // Remove old file from storage
    if (imagePath) {
      await supabase.storage.from("diary-images").remove([imagePath]);
      imagePath = null;
    }
    // Upload new file
    if (photoFile && photoFile.size > 0) {
      const ext = (photoFile.name.split(".").pop() ?? "jpg").toLowerCase();
      const storagePath = `${user.id}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diary-images")
        .upload(storagePath, photoFile, { contentType: photoFile.type, upsert: true });
      if (upErr) {
        return NextResponse.json({ error: `Photo upload failed: ${upErr.message}` }, { status: 500 });
      }
      imagePath = storagePath;
    }
    attachmentsChanged = true;
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  if (removeAudio || (audioFile && audioFile.size > 0)) {
    // Remove old file from storage
    if (audioPath) {
      await supabase.storage.from("diary-audio").remove([audioPath]);
      audioPath = null;
    }
    // Upload new file
    if (audioFile && audioFile.size > 0) {
      const ext = (audioFile.name.split(".").pop() ?? "webm").toLowerCase();
      const storagePath = `${user.id}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("diary-audio")
        .upload(storagePath, audioFile, { contentType: audioFile.type, upsert: true });
      if (upErr) {
        return NextResponse.json({ error: `Audio upload failed: ${upErr.message}` }, { status: 500 });
      }
      audioPath = storagePath;
    }
    attachmentsChanged = true;
  }

  // Update diary_entries if photo or audio changed
  if (attachmentsChanged) {
    const { error: updateErr } = await supabase
      .from("diary_entries")
      .update({ image_path: imagePath, audio_path: audioPath })
      .eq("id", id)
      .eq("user_id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: `Update failed: ${updateErr.message}` }, { status: 500 });
    }
  }

  // ── Places ─────────────────────────────────────────────────────────────────
  if (placesJson !== null) {
    type PlaceInput = { lat: number; lng: number; name: string | null };
    const places = JSON.parse(placesJson) as PlaceInput[];

    // Replace all existing places for this entry
    await supabase.from("diary_places").delete().eq("diary_entry_id", id);

    if (places.length > 0) {
      await supabase.from("diary_places").insert(
        places.map((p) => ({
          diary_entry_id: id,
          user_id: user.id,
          lat: p.lat,
          lng: p.lng,
          place_name: p.name ?? null,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

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
