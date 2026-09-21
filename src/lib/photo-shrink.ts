/**
 * Shrink a photo in the browser before it is sent anywhere.
 *
 * ── Why the client, not the server ───────────────────────────────────────
 * Every diary photo goes through /api/diary/upload-image (and, on edit,
 * PATCH /api/diary/[id]) so sharp can bake the EXIF orientation in and strip
 * the rest of the metadata. Both are Vercel Functions, and a Vercel Function
 * refuses any request body over 4.5 MB with a 413 before our code runs —
 * plan-independent, not configurable. A current iPhone hands the picker a
 * 5–10 MB JPEG, so the old 5 MB client cap let through a band (4.5–5 MB) that
 * failed only after the correction had been spent and the row inserted.
 * Raising the cap cannot fix that; only sending fewer bytes can.
 *
 * ── Orientation ──────────────────────────────────────────────────────────
 * Re-encoding through a canvas drops every metadata block, EXIF orientation
 * included. That is fine because the pixels drawn are already upright: since
 * Chrome 81 / Safari 13.1 / Firefox 26 an <img> is decoded with the EXIF
 * orientation applied (`image-orientation: from-image` is the default), and
 * drawImage() copies that oriented bitmap. Server-side sharp().rotate() then
 * finds no orientation tag and does nothing — it stays for the files this
 * helper passes through untouched.
 *
 * The <img> route is chosen over createImageBitmap on purpose: asking that
 * API for `imageOrientation: "from-image"` explicitly only works from Safari
 * 16 / Chrome 112, and older builds silently ignore EXIF instead.
 *
 * GPS goes with the rest of the EXIF. The upload route was already stripping
 * it on the server so nothing leaves the device that did not before — it now
 * leaves the device even less.
 *
 * ── What is passed through ───────────────────────────────────────────────
 * A file that is already small enough on both axes (bytes and pixels) is
 * returned as it came in: a PNG stays a PNG, a WebP stays a WebP, and its
 * EXIF is left for sharp to handle as before. Only the ones that need it are
 * re-encoded, and those come out as JPEG with a .jpg name, because the upload
 * route takes the storage extension from the name and the content type from
 * the File — a re-encoded blob under the original .png name would be JPEG
 * bytes stored as image/png.
 */

/** Longest edge after shrinking. 2048 on the long side of a 4:3 photo is
 *  2048×1536 — larger than any place the app shows a diary photo. */
export const PHOTO_MAX_EDGE = 2048;

export const PHOTO_JPEG_QUALITY = 0.85;

/** A file at or under this many bytes, whose long edge is also within
 *  PHOTO_MAX_EDGE, is sent as it is. */
export const PHOTO_PASSTHROUGH_BYTES = 2 * 1024 * 1024;

/** The browser could not decode the file as an image at all. Distinct from
 *  a canvas failure, which falls back to the original file inside shrinkPhoto. */
export class PhotoUnreadableError extends Error {
  constructor() {
    super("photo could not be decoded");
    this.name = "PhotoUnreadableError";
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new PhotoUnreadableError());
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY));
}

/**
 * Returns the file to upload: the original when it is small enough, a JPEG
 * within PHOTO_MAX_EDGE otherwise.
 *
 * Throws PhotoUnreadableError when the browser cannot decode the file. Any
 * other failure (canvas allocation, toBlob returning null) resolves to the
 * ORIGINAL file — the caller's size check decides whether that is sendable,
 * so a shrinking failure never loses a photo that would have gone through
 * before this helper existed.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new PhotoUnreadableError();

    const longEdge = Math.max(w, h);
    if (file.size <= PHOTO_PASSTHROUGH_BYTES && longEdge <= PHOTO_MAX_EDGE) return file;

    try {
      const scale = Math.min(1, PHOTO_MAX_EDGE / longEdge);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      // A 48 MP photo comes down 4× in one step; the default filter leaves
      // that visibly aliased. Firefox ignores the hint, which only means the
      // default filter there.
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas);
      if (!blob) return file;
      return new File([blob], "photo.jpg", { type: "image/jpeg", lastModified: file.lastModified });
    } catch {
      return file;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}
