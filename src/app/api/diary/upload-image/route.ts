import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

export const runtime = "nodejs";

// POST: receive photo + entryId, rotate EXIF on server, upload to Supabase Storage
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await request.formData();
  const photoFile = fd.get("photo") as File | null;
  const entryId = fd.get("entryId") as string | null;

  if (!photoFile || photoFile.size === 0 || !entryId) {
    return NextResponse.json({ error: "Missing photo or entryId" }, { status: 400 });
  }

  const ext = (photoFile.name.split(".").pop() ?? "jpg").toLowerCase();
  const storagePath = `${user.id}/${entryId}.${ext}`;

  const fileBuffer = Buffer.from(await photoFile.arrayBuffer());
  const rotatedBuffer = await sharp(fileBuffer).rotate().toBuffer();

  const { error: upErr } = await supabase.storage
    .from("diary-images")
    .upload(storagePath, rotatedBuffer, { contentType: photoFile.type });

  if (upErr) {
    return NextResponse.json({ error: `Photo upload failed: ${upErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ path: storagePath });
}
