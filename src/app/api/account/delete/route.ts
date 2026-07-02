import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlan } from "@/lib/plans";

export const runtime = "nodejs";

const STORAGE_BUCKETS = ["avatars", "diary-images", "diary-audio"] as const;

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (normalizePlan(profile?.plan) !== "free") {
    return NextResponse.json(
      { error: "active_plan", message: "Please cancel your subscription before deleting your account." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  // Storage first: an orphaned file (if deleteUser ran first and this failed)
  // is unrecoverable since nothing references it anymore.
  for (const bucket of STORAGE_BUCKETS) {
    const { data: files, error: listErr } = await admin.storage.from(bucket).list(user.id);
    if (listErr) {
      return NextResponse.json(
        { error: "storage_list_failed", message: `Failed to list files in ${bucket}: ${listErr.message}` },
        { status: 500 },
      );
    }
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      const { error: removeErr } = await admin.storage.from(bucket).remove(paths);
      if (removeErr) {
        return NextResponse.json(
          { error: "storage_remove_failed", message: `Failed to remove files in ${bucket}: ${removeErr.message}` },
          { status: 500 },
        );
      }
    }
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    return NextResponse.json(
      { error: "delete_user_failed", message: deleteErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
