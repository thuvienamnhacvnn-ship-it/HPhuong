/** Run after a build: npx tsx scripts/brand-share.tsx (uses the machine's installed Playwright). */
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { BrandWord } from "../src/components/BrandWord";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.APPDATA || "", "npm/node_modules/rea-agents/node_modules/playwright-core"));
const dist = process.env.NEXT_DIST_DIR || ".next";
const chunks = await readdir(path.join(dist, "static/css")).then(() => path.join(dist, "static/css"), () => path.join(dist, "static/chunks"));
const cssFiles = await readdir(chunks);
const fontFaces = new Set<string>();
for (const file of cssFiles.filter(f => f.endsWith(".css"))) {
  const css = await readFile(path.join(chunks, file), "utf8");
  for (const face of css.match(/@font-face\{[^}]+\}/g) || []) {
    if (!/Cormorant|cormorant/.test(face) || !face.includes("font-style:normal")) continue;
    const url = face.match(/url\(["']?(?:\.\.\/media\/|\/_next\/static\/media\/)([^)"']+)/);
    if (!url) continue;
    const font = await readFile(path.join(dist, "static/media", url[1]));
    fontFaces.add(face.replace(/font-family:[^;]+;/, 'font-family:"Brand Cormorant";').replace(/url\([^)]+\)/, `url(data:font/woff2;base64,${font.toString("base64")})`));
  }
}
assert(fontFaces.size, "Build first so the existing Cormorant font is available");
const css = await readFile("src/styles/brand.css", "utf8");
// The 3D still is the current emblem with no obsolete lettering baked in.
const emblem = `data:image/png;base64,${(await readFile("assets/brand/logo-3d-still.png")).toString("base64")}`;
const lettering = renderToStaticMarkup(<BrandWord />);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<html><style>${[...fontFaces].join("\n")}${css}
    :root{--font-cormorant:"Brand Cormorant"}*{box-sizing:border-box}body{margin:0;background:#211d22;display:grid;justify-items:center;align-content:center;width:1200px;height:630px}
    img{width:390px;height:390px;object-fit:contain;margin-top:-20px}.brand-word{width:540px;margin-top:-24px}
    </style><body><img src="${emblem}" alt=""/>${lettering}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/og-image.png" });
  // Icons retain the recognizable monogram at small sizes, removing the old HPHUONG name.
  for (const [file, size] of [["favicon.png", 64], ["apple-touch-icon.png", 180]] as const) {
    await sharp("assets/brand/logo-3d-still.png").trim().resize(size - 12, size - 12, { fit: "contain" }).extend({ top: 6, bottom: 6, left: 6, right: 6, background: "#211d22" }).flatten({ background: "#211d22" }).png().toFile(`public/${file}`);
  }
  const meta = await sharp("public/og-image.png").metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  console.log("Generated OG card 1200×630 and current emblem icons.");
} finally {
  await browser.close();
}
