import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * POST: receive an avatar, re-encode it through sharp, upload to Storage.
 *
 * The point is the re-encode: sharp drops every metadata block unless asked to
 * keep it, so EXIF — GPS tags included — does not survive the round trip. The
 * avatars bucket is public and profiles.avatar_url is rendered all over the
 * app, so a selfie straight off a phone used to publish wherever it was taken.
 * Same reason /api/diary/upload-image exists; this is the path that was missed.
 *
 * A route of its own rather than widening that one: it is bound to the
 * diary-images bucket, requires an entryId and keys the object by it, and does
 * not upsert, while an avatar has one fixed path per user and has to overwrite.
 * Giving it a bucket parameter would move the choice of destination into the
 * request body, which is the one thing worth keeping out of the caller's hands.
 */

/** Extension and MIME are taken from what sharp actually produced, not from the
 *  uploaded filename. An SVG comes back rasterised as PNG, so trusting the name
 *  would store PNG bytes labelled image/svg+xml and the avatar would not render. */
const OUTPUT: Record<string, { ext: string; mime: string }> = {
  jpeg: { ext: "jpg", mime: "image/jpeg" },
  png: { ext: "png", mime: "image/png" },
  webp: { ext: "webp", mime: "image/webp" },
  gif: { ext: "gif", mime: "image/gif" },
  avif: { ext: "avif", mime: "image/avif" },
  heif: { ext: "heic", mime: "image/heic" },
  tiff: { ext: "tiff", mime: "image/tiff" },
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fd = await request.formData();
  const file = fd.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Missing avatar" }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  let cleaned: Buffer;
  let format: string;
  try {
    const out = await sharp(fileBuffer).rotate().toBuffer({ resolveWithObject: true });
    cleaned = out.data;
    format = out.info.format;
  } catch {
    return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
  }

  const target = OUTPUT[format];
  if (!target) {
    return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
  }

  const path = `${user.id}/avatar.${target.ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, cleaned, { upsert: true, contentType: target.mime });

  if (upErr) {
    return NextResponse.json({ error: `Avatar upload failed: ${upErr.message}` }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

  return NextResponse.json({ path, publicUrl: pub.publicUrl });
}
