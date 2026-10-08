/**
 * Single source for image assets: the build script (scripts/assets.ts)
 * renders these widths as AVIF + WebP into public/media, and <Img> builds
 * srcsets from the same table. Replace a photo → keep the id, re-run
 * `npm run assets`.
 *
 * Home banner photo: overwrite assets/images/hero-desktop.png (and hero-mobile.png
 * for ≤ 900px), fix width/height below if the size changed, run `npm run assets`.
 * Any size works — the arch frame sets the box, the photo only fills it. The focal
 * point is one variable, `--hero-pos`, at the top of the home block in
 * src/styles/decor.css; keep the face clear of the treatment card.
 */
export const MEDIA = {
  // The three logo files come from the studio's artwork via scripts/logo-brand.ts (`npm run logo:brand`):
  // alpha cleaned and cropped, nothing redrawn.
  // Asset 7A, full lockup (monogram + HPHUONG + arched "KOSMETIK & SPA") — where it is shown large enough to read.
  "logo-emblem": { file: "assets/brand/logo-emblem.png", width: 966, height: 1301, widths: [120, 240, 480, 966] },
  // Asset 7A, monogram only (HP + lily) — small sizes, next to the brand name set in type.
  "logo-mark": { file: "assets/brand/logo-mark.png", width: 829, height: 867, widths: [120, 240, 480, 829] },
  // Asset 8A, the lockup with the ring — home banner only.
  "logo-full": { file: "assets/brand/logo-full.png", width: 1119, height: 1343, widths: [240, 480, 800, 1119] },
  // Home banner: front frame of the turning 3D monogram (public/brand/hp-logo-*.webm) and the lettering
  // cut from logo-full (rows 930–1343) that stays still underneath it.
  "logo-3d-still": { file: "assets/brand/logo-3d-still.png", width: 720, height: 720, widths: [240, 480, 720] },
  "logo-wordmark": { file: "assets/brand/logo-wordmark.png", width: 1119, height: 413, widths: [240, 480, 800, 1119] },
  "logo-medallion": { file: "assets/brand/logo-medallion.png", width: 1254, height: 1254, widths: [96, 192, 320, 640] },
  "decor-lily": { file: "assets/images/decor-lily.png", width: 1254, height: 1254, widths: [320, 640, 960] },
  // Home banner decor from the studio's artwork (assets/source/home-decor-*.png), alpha cleaned and
  // cropped by scripts/home-decor.ts (`npm run decor:home`): the leaf + lily cluster and eight loose petals.
  "home-flora": { file: "assets/images/home-flora.png", width: 1397, height: 700, widths: [480, 800, 1397] },
  "home-petal-1": { file: "assets/images/home-petal-1.png", width: 203, height: 174, widths: [102, 203] },
  "home-petal-2": { file: "assets/images/home-petal-2.png", width: 177, height: 167, widths: [89, 177] },
  "home-petal-3": { file: "assets/images/home-petal-3.png", width: 119, height: 257, widths: [60, 119] },
  "home-petal-4": { file: "assets/images/home-petal-4.png", width: 245, height: 202, widths: [123, 245] },
  "home-petal-5": { file: "assets/images/home-petal-5.png", width: 476, height: 343, widths: [238, 476] },
  "home-petal-6": { file: "assets/images/home-petal-6.png", width: 292, height: 138, widths: [146, 292] },
  "home-petal-7": { file: "assets/images/home-petal-7.png", width: 218, height: 193, widths: [109, 218] },
  "home-petal-8": { file: "assets/images/home-petal-8.png", width: 309, height: 196, widths: [155, 309] },
  "gift-card-blank": { file: "assets/images/gift-card-blank.png", width: 1536, height: 1024, widths: [480, 960, 1536] },
  // hero-mobile is a crop of hero-desktop in the shape of the phone box (x 300–1340: face and both hands).
  "hero-desktop": { file: "assets/images/hero-desktop.png", width: 1448, height: 1086, widths: [640, 1024, 1448] },
  "hero-mobile": { file: "assets/images/hero-mobile.png", width: 1040, height: 1086, widths: [480, 800, 1040] },
  "ritual-still-life": { file: "assets/images/ritual-still-life.png", width: 1536, height: 1024, widths: [480, 960, 1536] },
  "service-facial": { file: "assets/images/service-facial.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-footcare": { file: "assets/images/service-footcare.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-headspa": { file: "assets/images/service-headspa.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-massage": { file: "assets/images/service-massage.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  // Generated 2026-10-07 in the studio's ChatGPT account, in the look of the four pictures above.
  "service-brows": { file: "assets/images/service-brows.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-nails": { file: "assets/images/service-nails.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-manicure": { file: "assets/images/service-manicure.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-sugaring": { file: "assets/images/service-sugaring.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-headmassage": { file: "assets/images/service-headmassage.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-acupressure": { file: "assets/images/service-acupressure.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-serum": { file: "assets/images/service-serum.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-antiage": { file: "assets/images/service-antiage.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-eyecare": { file: "assets/images/service-eyecare.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-cleansing": { file: "assets/images/service-cleansing.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-bodywrap": { file: "assets/images/service-bodywrap.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-hotstone": { file: "assets/images/service-hotstone.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-ayurveda": { file: "assets/images/service-ayurveda.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-footreflex": { file: "assets/images/service-footreflex.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-shoulder": { file: "assets/images/service-shoulder.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-facial-massage": { file: "assets/images/service-facial-massage.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "service-lashes": { file: "assets/images/service-lashes.png", width: 1122, height: 1402, widths: [160, 400, 800, 1122] },
  "offer-banner": { file: "assets/images/offer-banner.png", width: 1536, height: 1024, widths: [640, 1024, 1536] },
  "studio-interior": { file: "assets/images/studio-interior.png", width: 1660, height: 948, widths: [640, 1024, 1660] },
} as const;

export type MediaId = keyof typeof MEDIA;
export const isMediaId = (id: string | null | undefined): id is MediaId => !!id && id in MEDIA;
