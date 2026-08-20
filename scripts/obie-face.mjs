#!/usr/bin/env node
/**
 * Cut a circular avatar face out of a full-body Obie illustration.
 *
 *   node scripts/obie-face.mjs sitting ~/Downloads/F8FCD029-….PNG
 *   → public/obie/obie-face-sitting.webp   (256×256)
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * The twenty-three illustrations are whole figures. An avatar is not: it is a
 * "who is this" marker, read by the face, and it is drawn at 28-56px. Put a
 * whole dog in a 44px circle and the head lands at about 16px — legible as a
 * dog, useless as an identifier. Measured before this was written: the head is
 * roughly the top 40% of the figure, so the face in an avatar is under half
 * the size the same circle used to give it.
 *
 * So the face is cropped out and becomes its own asset. Different job,
 * different file — the same conclusion an earlier survey reached when it said
 * the old round avatar and the new full-body art were not interchangeable. The
 * difference is that the face can now be cut FROM the new art, so the two
 * share a hand.
 *
 * ── Finding the head without eyeballing it ─────────────────────────────────
 * The crop is derived from the drawing, not from numbers typed in by whoever
 * ran this. Row by row, measure how wide the inked area is:
 *
 *   1. The widest row in the top half is the EAR LINE. On this character the
 *      ears flare wider than anything above them and wider than the neck.
 *   2. Searching DOWN from there, the narrowest row is the NECK. Everything
 *      above it is head.
 *
 * Searching for the neck without finding the ears first does not work: the
 * minimum then lands at the crown, where the head is still narrowing, and the
 * crop comes out as a sliver. That was the first attempt and it returned a
 * 144px "head" on a 1193px figure.
 *
 * The square is then the longer side of the head box plus 12%, centred on it.
 * At 12% the head fills about 89% of the square, which inside a circle leaves
 * a few percent of air at the sides and nothing clipped. Raise MARGIN for more
 * air, lower it to fill the circle harder.
 *
 * ⚠️ Assumes a front-facing pose whose ears are the widest part of the head.
 * sitting and laughing qualify. A pose in profile, or one where a raised paw
 * is wider than the ears, will find the wrong ear line — check the printed
 * numbers against the drawing before shipping the result.
 *
 * The background is removed with the same two-pass flood fill as every other
 * asset here; see scripts/obie-sprite.mjs for why it is two passes.
 */

import sharp from "sharp";
import { statSync } from "node:fs";
import path from "node:path";

const T_SEED = 243;
const T_SHADOW = 180;
const T_EDGE = 222;
const GROW = 2;

/** Air around the head, as a fraction of its longer side. */
const MARGIN = 0.12;

const [pose, src] = process.argv.slice(2);
if (!pose || !src) {
  console.error("usage: node scripts/obie-face.mjs <pose> <source.png>");
  process.exit(1);
}

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels, N = W * H;

const minc = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const o = p * C;
  minc[p] = Math.min(data[o], data[o + 1], data[o + 2]);
}

// ── the head, from the width profile ───────────────────────────────────────
const inked = (x, y) => minc[y * W + x] < 235;
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (inked(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}
const prof = [];
for (let y = y0; y <= y1; y++) {
  let a = -1, b = -1;
  for (let x = x0; x <= x1; x++) if (inked(x, y)) { if (a < 0) a = x; b = x; }
  prof.push({ y, w: a < 0 ? 0 : b - a + 1, a, b });
}
const half = Math.round(prof.length * 0.5);
let ear = prof[0];
for (let i = 0; i < half; i++) if (prof[i].w > ear.w) ear = prof[i];
const earIdx = prof.findIndex((p) => p.y === ear.y);
let neck = prof[earIdx], minW = Infinity;
for (let i = earIdx; i < half; i++) if (prof[i].w < minW) { minW = prof[i].w; neck = prof[i]; }

const headRows = prof.filter((p) => p.y <= neck.y);
const hx0 = Math.min(...headRows.map((p) => p.a));
const hx1 = Math.max(...headRows.map((p) => p.b));
const hw = hx1 - hx0 + 1, hh = neck.y - y0 + 1;

console.log(`figure    ${x1 - x0 + 1}×${y1 - y0 + 1} at (${x0},${y0})`);
console.log(`ear line  y=${ear.y}  width ${ear.w}`);
console.log(`neck      y=${neck.y}  width ${neck.w}`);
console.log(`head      ${hw}×${hh}`);
if (neck.y - y0 < (y1 - y0) * 0.15) {
  console.log("  ⚠️ head is under 15% of the figure — the ear line is probably wrong for this pose");
}

// ── background out ─────────────────────────────────────────────────────────
const bg = new Uint8Array(N);
const stack = new Int32Array(N);
let sp = 0, TH = T_SEED;
const push = (p) => { if (!bg[p] && minc[p] >= TH) { bg[p] = 1; stack[sp++] = p; } };
const drain = () => {
  while (sp > 0) {
    const p = stack[--sp], x = p % W, y = (p - x) / W;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (y > 0) push(p - W);
    if (y < H - 1) push(p + W);
  }
};
for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
drain();
TH = T_SHADOW;
for (let p = 0; p < N; p++) if (bg[p]) stack[sp++] = p;
drain();
for (let g = 0; g < GROW; g++) {
  const add = [];
  for (let p = 0; p < N; p++) {
    if (bg[p] || minc[p] < T_EDGE) continue;
    const x = p % W, y = (p - x) / W;
    if ((x > 0 && bg[p - 1]) || (x < W - 1 && bg[p + 1]) || (y > 0 && bg[p - W]) || (y < H - 1 && bg[p + W])) add.push(p);
  }
  for (const p of add) bg[p] = 1;
}
const rgba = Buffer.alloc(N * 4);
for (let p = 0; p < N; p++) {
  const o = p * C;
  rgba[p * 4] = data[o]; rgba[p * 4 + 1] = data[o + 1]; rgba[p * 4 + 2] = data[o + 2];
  rgba[p * 4 + 3] = bg[p] ? 0 : 255;
}

// ── crop ───────────────────────────────────────────────────────────────────
const side = Math.round(Math.max(hw, hh) * (1 + MARGIN));
const cx = Math.round((hx0 + hx1) / 2), cy = Math.round((y0 + neck.y) / 2);
const left = Math.max(0, cx - Math.round(side / 2));
const top = Math.max(0, cy - Math.round(side / 2));
const w = Math.min(side, W - left), h = Math.min(side, H - top);

const out = path.join("public", "obie", `obie-face-${pose}.webp`);
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left, top, width: w, height: h })
  .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 82, alphaQuality: 92 })
  .toFile(out);

console.log(`\ncrop      ${w}×${h} at (${left},${top}) — head fills ${(Math.max(hw, hh) / side * 100).toFixed(0)}% of it`);
console.log(`wrote     ${out}  ${(statSync(out).size / 1024).toFixed(1)}KB  256×256`);
