/**
 * Single source for image assets: the build script (scripts/assets.ts)
 * renders these widths as AVIF + WebP into public/media, and <Img> builds
 * srcsets from the same table. Replace a photo → keep the id, re-run
 * `npm run assets`.
 */
export const MEDIA = {
  // Derivative without the plate (scripts/logo-cutout.ts) — check against logo-original before print use.
  "logo-emblem": { file: "assets/brand/logo-emblem.png", width: 878, height: 1000, widths: [120, 240, 480, 878] },
  // Main cluster only (HP monogram + lily), text cropped off — the wordmark is set in type on the page.
  "logo-mark": { file: "assets/brand/logo-mark.png", width: 878, height: 752, widths: [120, 240, 480, 878] },
  "logo-medallion": { file: "assets/brand/logo-medallion.png", width: 1254, height: 1254, widths: [96, 192, 320, 640] },
  "decor-lily": { file: "assets/images/decor-lily.png", width: 1254, height: 1254, widths: [320, 640, 960] },
  "gift-card-blank": { file: "assets/images/gift-card-blank.png", width: 1536, height: 1024, widths: [480, 960, 1536] },
  "hero-desktop": { file: "assets/images/hero-desktop.png", width: 1659, height: 948, widths: [640, 1024, 1659] },
  "hero-mobile": { file: "assets/images/hero-mobile.png", width: 1024, height: 1536, widths: [480, 768, 1024] },
  "ritual-still-life": { file: "assets/images/ritual-still-life.png", width: 1536, height: 1024, widths: [480, 960, 1536] },
  "service-facial": { file: "assets/images/service-facial.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-footcare": { file: "assets/images/service-footcare.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-headspa": { file: "assets/images/service-headspa.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-massage": { file: "assets/images/service-massage.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "studio-interior": { file: "assets/images/studio-interior.png", width: 1660, height: 948, widths: [640, 1024, 1660] },
} as const;

export type MediaId = keyof typeof MEDIA;
export const isMediaId = (id: string | null | undefined): id is MediaId => !!id && id in MEDIA;
