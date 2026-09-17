/**
 * Responsive image pipeline: assets/**.png → public/media/<id>-<width>.{avif,webp}.
 * Originals in assets/ are never modified. Re-run after replacing an image.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { MEDIA } from "../src/lib/media-config";

const OUT = path.resolve("public", "media");
fs.mkdirSync(OUT, { recursive: true });

for (const [id, src] of Object.entries(MEDIA)) {
  const meta = await sharp(src.file).metadata();
  if (meta.width !== src.width || meta.height !== src.height) {
    console.warn(`  ! ${id}: file is ${meta.width}×${meta.height}, media-config says ${src.width}×${src.height} — update media-config.ts`);
  }
  for (const w of src.widths) {
    const base = path.join(OUT, `${id}-${w}`);
    await sharp(src.file).resize({ width: w }).webp({ quality: 80 }).toFile(`${base}.webp`);
    await sharp(src.file).resize({ width: w }).avif({ quality: 55 }).toFile(`${base}.avif`);
  }
  console.log(`  ${id}: ${src.widths.join(", ")}`);
}
await sharp(MEDIA["logo-medallion"].file).resize(64).png().toFile(path.resolve("public", "favicon.png"));
await sharp(MEDIA["logo-medallion"].file).resize(180).png().toFile(path.resolve("public", "apple-touch-icon.png"));
console.log("Media ready.");
