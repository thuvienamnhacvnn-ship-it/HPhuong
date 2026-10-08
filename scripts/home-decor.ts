/**
 * Home banner decor from the studio's own artwork (assets/source/):
 *   home-decor-flora.png   leaf + lily cluster  → assets/images/home-flora.png
 *   home-decor-petals.png  sheet of 17 petals   → assets/images/home-petal-1…N.png (the ones the page uses)
 *
 * Nothing is redrawn or recoloured. The exports carry colour junk in near-transparent pixels,
 * so: alpha ≤ ALPHA_MIN → 0, then only connected blobs of at least MIN_AREA px are kept
 * (stray specks go, soft petal edges stay). Each piece is cropped to its own alpha box.
 *
 * Run `npm run decor:home`, then `npm run assets`. Previews on cream and graphite go to data/,
 * with a numbered overview of the petal sheet (data/home-petals-sheet.png) to choose from.
 */
import fs from "node:fs";
import sharp from "sharp";

const SRC = "assets/source";
const OUT = "assets/images";
const ALPHA_MIN = 8;
const MIN_AREA = 600;
/** Petals the home page uses: numbers on the overview sheet, in file order (home-petal-1 = first). */
const USE: number[] = process.env.PETALS ? JSON.parse(process.env.PETALS) : [6, 12, 3, 2, 8, 9, 14, 5];

type Blob = { left: number; top: number; right: number; bottom: number; area: number; id: number };

async function clean(file: string) {
  const { data, info } = await sharp(`${SRC}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let junk = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] <= ALPHA_MIN) {
      if (data[i]) junk++;
      data[i] = 0;
    }
  }
  // connected components over alpha > 0 (4-neighbour flood)
  const label = new Int32Array(W * H);
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let s = 0; s < W * H; s++) {
    if (label[s] || data[s * 4 + 3] === 0) continue;
    const b: Blob = { left: W, top: H, right: 0, bottom: 0, area: 0, id: blobs.length + 1 };
    label[s] = b.id;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % W;
      const y = (p / W) | 0;
      b.area++;
      if (x < b.left) b.left = x;
      if (x > b.right) b.right = x;
      if (y < b.top) b.top = y;
      if (y > b.bottom) b.bottom = y;
      for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (n >= 0 && !label[n] && data[n * 4 + 3] > 0) {
          label[n] = b.id;
          stack.push(n);
        }
      }
    }
    blobs.push(b);
  }
  const keep = blobs.filter((b) => b.area >= MIN_AREA);
  const ok = new Set(keep.map((b) => b.id));
  let specks = 0;
  for (let p = 0; p < W * H; p++) {
    if (label[p] && !ok.has(label[p])) {
      data[p * 4 + 3] = 0;
      specks++;
    }
  }
  const sizes = blobs.filter((b) => b.area < MIN_AREA).map((b) => b.area);
  console.log(`${file}: ${junk} px with alpha 1–${ALPHA_MIN} cleared; ${sizes.length} specks removed (${specks} px, largest ${Math.max(0, ...sizes)} px); ${keep.length} piece(s) kept, smallest ${Math.min(...keep.map((b) => b.area))} px`);
  return { data, W, H, label, blobs: keep };
}

async function previews(file: string, name: string) {
  fs.mkdirSync("data", { recursive: true });
  const m = await sharp(file).metadata();
  for (const [tag, bg] of [["light", "#fdf2ec"], ["dark", "#2a2426"]] as const) {
    await sharp({ create: { width: m.width! + 40, height: m.height! + 40, channels: 3, background: bg } })
      .composite([{ input: file, left: 20, top: 20 }])
      .png()
      .toFile(`data/${name}-${tag}.png`);
  }
}

// ------------------------------------------------------------------ flora
{
  const { data, W, H, blobs } = await clean("home-decor-flora.png");
  const box = blobs.reduce(
    (a, b) => ({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) }),
    { left: W, top: H, right: 0, bottom: 0 },
  );
  const file = `${OUT}/home-flora.png`;
  const w = box.right - box.left + 1;
  const h = box.bottom - box.top + 1;
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: box.left, top: box.top, width: w, height: h }).png().toFile(file);
  await previews(file, "home-flora");
  console.log(`  home-flora.png: ${w}×${h}`);
}

// ----------------------------------------------------------------- petals
{
  const { data, W, H, label, blobs } = await clean("home-decor-petals.png");
  blobs.sort((a, b) => (Math.abs(a.top - b.top) > 120 ? a.top - b.top : a.left - b.left));
  const marks = blobs
    .map((b, i) => `<text x="${b.left}" y="${b.top + 30}" font-size="34" font-family="Arial" fill="#ffffff" stroke="#000" stroke-width="1">${i + 1}</text>`)
    .join("");
  const sheet = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  fs.mkdirSync("data", { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: "#2a2426" } })
    .composite([{ input: sheet }, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${marks}</svg>`) }])
    .png()
    .toFile("data/home-petals-sheet.png");
  for (const [n, pick] of USE.entries()) {
    const b = blobs[pick - 1];
    if (!b) throw new Error(`no petal ${pick} on the sheet`);
    const w = b.right - b.left + 1;
    const h = b.bottom - b.top + 1;
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (b.top + y) * W + b.left + x;
        if (label[p] !== b.id) continue; // a neighbour's tip inside this box stays out
        data.copy(out, (y * w + x) * 4, p * 4, p * 4 + 4);
      }
    }
    const file = `${OUT}/home-petal-${n + 1}.png`;
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
    await previews(file, `home-petal-${n + 1}`);
    console.log(`  home-petal-${n + 1}.png (sheet #${pick}): ${w}×${h}`);
  }
}
