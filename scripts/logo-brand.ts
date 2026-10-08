/**
 * Brand logos from the studio's own artwork (assets/brand/asset-7a.png, asset-8a.png).
 * Nothing is redrawn or recoloured: stray near-transparent pixels are cleared
 * (alpha ≤ 8 → 0, the exports carry colour junk there) and the canvas is cropped
 * to the artwork.
 *
 *   asset-8a (with the ring)   → logo-full.png    home banner
 *   asset-7a (without the ring) → logo-emblem.png  full lockup: monogram + HPHUONG + KOSMETIK & SPA
 *                               → logo-mark.png    monogram only, for small sizes (header, rail)
 *
 * Run `npm run logo:brand`, then `npm run assets`. Sizes are printed — keep
 * src/lib/media-config.ts in step.
 */
import sharp from "sharp";

const DIR = "assets/brand";
const ALPHA_MIN = 8;

async function load(file: string) {
  const { data, info } = await sharp(`${DIR}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) if (data[i] <= ALPHA_MIN) data[i] = 0;
  return { data, info };
}

/** Rows/columns that hold artwork. `minRun` ignores specks narrower than that. */
function bounds(data: Buffer, w: number, h: number, y0 = 0, y1 = h) {
  let left = w, right = -1, top = h, bottom = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function write(src: Awaited<ReturnType<typeof load>>, box: { left: number; top: number; width: number; height: number }, out: string) {
  await sharp(src.data, { raw: src.info }).extract(box).png().toFile(`${DIR}/${out}`);
  console.log(`  ${out}: ${box.width}×${box.height}  (from ${box.left},${box.top})`);
}

const a8 = await load("asset-8a.png");
await write(a8, bounds(a8.data, a8.info.width, a8.info.height), "logo-full.png");

const a7 = await load("asset-7a.png");
const { width: W, height: H } = a7.info;
const full = bounds(a7.data, W, H);
await write(a7, full, "logo-emblem.png");

// Monogram = everything above the widest empty band between the HP feet and the HPHUONG lettering.
const rowEmpty = (y: number) => {
  let n = 0;
  for (let x = 0; x < W; x++) if (a7.data[(y * W + x) * 4 + 3] > 0) n++;
  return n < 3;
};
let best = { start: -1, len: 0 };
for (let y = full.top + Math.round(full.height * 0.4), run = 0; y < full.top + full.height; y++) {
  run = rowEmpty(y) ? run + 1 : 0;
  if (run > best.len) best = { start: y - run + 1, len: run };
}
if (best.len < 6) throw new Error("no gap found between monogram and lettering — check asset-7a.png");
await write(a7, bounds(a7.data, W, H, 0, best.start), "logo-mark.png");
