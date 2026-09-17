/**
 * Derivative logo without the cream plate: keeps the gold HP monogram, the lily
 * and the lettering exactly as drawn, removes plate + outer ring.
 * Output: assets/brand/logo-emblem.png (raster derivative, not a print vector —
 * compare with logo-original.png before publishing).
 *
 * Method: colour key against the plate colour sampled from an empty area,
 * soft alpha ramp, then un-mix the plate colour from semi-transparent edges.
 */
import sharp from "sharp";

const SRC = "assets/brand/logo-medallion.png";
const OUT = "assets/brand/logo-emblem.png";

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const cx = W / 2;
const cy = H / 2;

// Sample the plate in empty patches (left of the monogram, lower right) → median colour.
const samples: number[][] = [];
for (const [x0, y0] of [[150, 700], [200, 620], [627, 160], [480, 1000], [800, 1000], [627, 1150]]) {
  for (let y = y0; y < y0 + 8; y++) for (let x = x0; x < x0 + 8; x++) {
    const i = (y * W + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }
}
const median = (k: number) => samples.map((s) => s[k]).sort((a, b) => a - b)[samples.length >> 1];
const plate = [median(0), median(1), median(2)];
console.log("plate colour", plate);

const PLATE_RADIUS = 528; // inside the gold ring
const T0 = 30;
const T1 = 85;

const alpha = new Float32Array(W * H);
const rawLum = new Float32Array(W * H);
const rawChroma = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.hypot(x - cx, y - cy);
    if (dist > PLATE_RADIUS || data[i + 3] === 0) continue;
    const dr = r - plate[0], dg = g - plate[1], db = b - plate[2];
    const lum = dr * 0.3 + dg * 0.59 + db * 0.11;
    const chroma = Math.hypot(dr - lum, dg - lum, db - lum);
    // embossing shadows are darker plate colour (lum < 0, low chroma) — weigh them lightly
    const d = Math.hypot(chroma * 1.5, lum * (lum < 0 ? 0.45 : 0.8));
    rawLum[p] = lum;
    rawChroma[p] = chroma;
    let a = Math.min(1, Math.max(0, (d - T0) / (T1 - T0)));
    a *= Math.min(1, Math.max(0, (PLATE_RADIUS - dist) / 12));
    alpha[p] = a < 0.2 ? 0 : a;
  }
}

// Highlights inside the gold outlines look like plate colour. Anything the
// background cannot reach from the image border is part of the emblem → opaque.
const reached = new Uint8Array(W * H);
const stack: number[] = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const p = stack.pop()!;
  if (reached[p] || alpha[p] >= 0.5) continue;
  reached[p] = 1;
  const x = p % W;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (p >= W) stack.push(p - W);
  if (p < W * (H - 1)) stack.push(p + W);
}

// Enclosed regions are either highlights (fill) or letter counters showing the plate (keep transparent).
const holeFill = new Uint8Array(W * H);

const seen = new Uint8Array(W * H);
for (let start = 0; start < W * H; start++) {
  if (seen[start] || reached[start] || alpha[start] >= 0.5) continue;
  const comp: number[] = [];
  const q = [start];
  seen[start] = 1;
  let sumLum = 0;
  let sumChroma = 0;
  while (q.length) {
    const p = q.pop()!;
    comp.push(p);
    sumLum += rawLum[p];
    sumChroma += rawChroma[p];
    const x = p % W;
    for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
      if (n < 0 || n >= W * H || seen[n] || reached[n] || alpha[n] >= 0.5) continue;
      seen[n] = 1;
      q.push(n);
    }
  }
  const meanLum = sumLum / comp.length;
  const meanChroma = sumChroma / comp.length;
  // highlights are brighter or pinker than the plate; counters are plate-coloured or shaded
  // deep embossing shadow (lum well below the plate) = counter of a letter, stays transparent
  if (comp.length < 60 || (meanLum > -25 && meanChroma > 14)) for (const p of comp) holeFill[p] = 1;
}

const out = Buffer.alloc(W * H * 4);
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  let a = alpha[p];
  const hole = holeFill[p] === 1;
  if (hole) a = 1;
  if (a <= 0) continue;
  if (a >= 0.999 || hole) {
    out[i] = data[i]; out[i + 1] = data[i + 1]; out[i + 2] = data[i + 2]; out[i + 3] = 255;
    continue;
  }
  // soft edge: un-mix plate colour, but never brighten beyond the source (avoids orange glow)
  const un = (c: number, pc: number) => Math.round(Math.min(c, Math.max(0, (c - (1 - a) * pc) / a)));
  out[i] = un(data[i], plate[0]);
  out[i + 1] = un(data[i + 1], plate[1]);
  out[i + 2] = un(data[i + 2], plate[2]);
  out[i + 3] = Math.round(a * 255);
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toFile(OUT);
const meta = await sharp(OUT).metadata();
console.log(`wrote ${OUT} ${meta.width}×${meta.height}`);

// Previews on light and dark for visual QA (git-ignored data/).
for (const [name, bg] of [["light", "#fff9f3"], ["dark", "#1f1c21"]] as const) {
  const composed = await sharp({ create: { width: meta.width! + 80, height: meta.height! + 80, channels: 4, background: bg } })
    .composite([{ input: OUT, left: 40, top: 40 }])
    .png()
    .toBuffer();
  await sharp(composed).resize({ width: 700 }).toFile(`data/logo-emblem-${name}.png`);
}
