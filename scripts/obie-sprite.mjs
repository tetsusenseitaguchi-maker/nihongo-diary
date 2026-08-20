#!/usr/bin/env node
/**
 * Build a flip-book sprite for one Obie pose.
 *
 *   node scripts/obie-sprite.mjs tailwag ~/Downloads/A.PNG ~/Downloads/B.PNG
 *
 * Takes any number of source frames, cuts the white background out of each,
 * and lays them out left to right in a single webp at public/obie/. The
 * filename carries the frame count — obie-tailwag-2f.webp — so the CSS's
 * background-size and steps() can be checked against the file that feeds them.
 * Two frames today, four when a run cycle needs them: nothing here is written
 * for exactly two.
 *
 * The cutout is the same two-pass flood fill the still assets went through, and
 * it has to be, or a frame would carry a white square its neighbour does not.
 * Pass 1 takes the page white and stops at the ground shadows, which are soft
 * grey and have no outline; pass 2 re-seeds from pass 1 and drains them, held
 * back everywhere else by the artwork's black outlines — which is why the
 * plate, the sneakers, the book pages and the speech bubbles keep their white.
 * See the memory note on these assets, or the commit that first cut them.
 *
 * ⚠️ Frames must be the same pixel size and framed identically. A pose drawn a
 * little larger in frame 2 will read as a zoom rather than as movement, and no
 * amount of timing will hide it. The check below refuses mismatched sizes and
 * reports how far apart the frames are so a pair that barely differs — or one
 * that differs wildly — can be caught before it reaches the page.
 */

import sharp from "sharp";
import { statSync } from "fs";
import path from "path";

const T_SEED = 243;   // the page white itself
const T_SHADOW = 180; // the ground shadows: no outline, so a second pass drains them
const T_EDGE = 222;   // the anti-aliased ring, eaten so no white fringe survives scaling
const GROW = 2;

/** Cut the white background out of one source, returning raw RGBA. */
async function cutout(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, N = W * H;

  const minc = new Uint8Array(N);
  for (let p = 0; p < N; p++) {
    const o = p * C;
    minc[p] = Math.min(data[o], data[o + 1], data[o + 2]);
  }

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
    rgba[p * 4] = data[o];
    rgba[p * 4 + 1] = data[o + 1];
    rgba[p * 4 + 2] = data[o + 2];
    rgba[p * 4 + 3] = bg[p] ? 0 : 255;
  }
  return { rgba, W, H };
}

/** Mean absolute greyscale difference, 0-255. Sanity, not science. */
async function frameDistance(a, b) {
  const sig = async (buf, W, H) =>
    sharp(buf, { raw: { width: W, height: H, channels: 4 } })
      .flatten({ background: "#ffffff" }).resize(48, 48, { fit: "fill" }).greyscale().raw().toBuffer();
  const [x, y] = [await sig(a.rgba, a.W, a.H), await sig(b.rgba, b.W, b.H)];
  let s = 0;
  for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]);
  return s / x.length;
}

const [pose, ...sources] = process.argv.slice(2);
if (!pose || sources.length < 2) {
  console.error("usage: node scripts/obie-sprite.mjs <pose> <frame1> <frame2> [frame3 ...]");
  process.exit(1);
}

// The still assets are 400px for the poses that carry a moment and 288px for
// the rest; a sprite frame matches whichever the still uses so the animated and
// static versions of a pose are the same size on screen.
const BIG = new Set(["tailwag", "running", "sleeping", "writing", "laughing", "sitting", "reading"]);
const SIZE = BIG.has(pose) ? 400 : 288;

const cuts = [];
for (const src of sources) cuts.push(await cutout(src));

const [w0, h0] = [cuts[0].W, cuts[0].H];
for (const [i, c] of cuts.entries()) {
  if (c.W !== w0 || c.H !== h0) {
    console.error(`frame ${i + 1} is ${c.W}x${c.H}, frame 1 is ${w0}x${h0} — frames must match`);
    process.exit(1);
  }
}

console.log(`pose ${pose} · ${cuts.length} frames · ${w0}x${h0} → ${SIZE}px each`);
for (let i = 1; i < cuts.length; i++) {
  const d = await frameDistance(cuts[i - 1], cuts[i]);
  const note = d < 1 ? "  ⚠️ all but identical — is this really a second frame?"
    : d > 40 ? "  ⚠️ very far apart — will read as a cut, not as movement"
    : "";
  console.log(`  frame ${i} → ${i + 1}: difference ${d.toFixed(1)}${note}`);
}

const scaled = [];
for (const c of cuts) {
  scaled.push(
    await sharp(c.rgba, { raw: { width: c.W, height: c.H, channels: 4 } })
      .resize(SIZE, SIZE, { fit: "inside" }).png().toBuffer(),
  );
}

const out = path.join("public", "obie", `obie-${pose}-${cuts.length}f.webp`);
await sharp({
  create: { width: SIZE * cuts.length, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(scaled.map((input, i) => ({ input, left: i * SIZE, top: 0 })))
  .webp({ quality: 80, alphaQuality: 90 })
  .toFile(out);

console.log(`\nwrote ${out}  ${(statSync(out).size / 1024).toFixed(1)}KB  (${SIZE * cuts.length}x${SIZE})`);
console.log(`CSS: background-size ${cuts.length * 100}% 100%   steps(${cuts.length}, jump-none)`);
