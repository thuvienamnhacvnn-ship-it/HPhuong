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
  // "HPHUONG" + leaf ornament only (rows 0–262 of logo-wordmark, the arched descriptor removed): the descriptor is live text now (BrandWord).
  "logo-name": { file: "assets/brand/logo-name.png", width: 1119, height: 262, widths: [240, 480, 800, 1119] },
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
  // Studio rooms (generated 2026-10-10): the home banner shows the studio itself, never a face.
  "home-space": { file: "assets/images/home-space.png", width: 1254, height: 1254, widths: [640, 1024, 1254] },
  "home-space-mobile": { file: "assets/images/home-space-mobile.png", width: 1024, height: 1536, widths: [480, 768, 1024] },
  "banner-treatments": { file: "assets/images/banner-treatments.png", width: 1536, height: 1024, widths: [640, 1024, 1536] },
  "banner-booking": { file: "assets/images/banner-booking.png", width: 1536, height: 1024, widths: [640, 1024, 1536] },
  "banner-contact": { file: "assets/images/banner-contact.png", width: 1536, height: 1024, widths: [640, 1024, 1536] },
  "hero-tall": { file: "assets/images/hero-tall.png", width: 1024, height: 1536, widths: [480, 800, 1024] },
  "studio-tall": { file: "assets/images/studio-tall.png", width: 1024, height: 1536, widths: [480, 800, 1024] },
  "studio-interior": { file: "assets/images/studio-interior.png", width: 1660, height: 948, widths: [640, 1024, 1660] },
  // Generated 2026-10-26 in the studio's ChatGPT account: guests in treatment (replaces the empty-bed pictures in the home slide show).
  "spa-woman-wide": { file: "assets/images/spa-woman-wide.png", width: 1536, height: 1024, widths: [640, 1024, 1536] },
  "new-party-c": { file: "assets/images/new-party-c.jpg", width: 1536, height: 2048, widths: [480, 800, 1024] },
  "new-party-d": { file: "assets/images/new-party-d.jpg", width: 1396, height: 1812, widths: [480, 800, 1024] },
  "new-gg-lake": { file: "assets/images/new-gg-lake.jpg", width: 1124, height: 1387, widths: [480, 800, 1024] },
  "new-gg-set": { file: "assets/images/new-gg-set.jpg", width: 1125, height: 1393, widths: [480, 800, 1024] },
  "new-gg-story": { file: "assets/images/new-gg-story.jpg", width: 1125, height: 1384, widths: [480, 800, 1024] },
  "new-gg-authentique": { file: "assets/images/new-gg-authentique.jpg", width: 1125, height: 1384, widths: [480, 800, 1024] },
  "new-gg-men": { file: "assets/images/new-gg-men.jpg", width: 1124, height: 1401, widths: [480, 800, 1024] },
  "men-facial-wide": { file: "assets/images/men-facial-wide.png", width: 1536, height: 1024, widths: [640, 1024, 1536] },
  "men-facial-tall": { file: "assets/images/men-facial-tall.png", width: 1024, height: 1536, widths: [480, 800, 1024] },
  "spa-man-wide": { file: "assets/images/spa-man-wide.png", width: 1536, height: 1024, widths: [640, 1024, 1536] },
  "spa-woman-tall": { file: "assets/images/spa-woman-tall.png", width: 1024, height: 1536, widths: [480, 800, 1024] },
  "spa-man-tall": { file: "assets/images/spa-man-tall.png", width: 1024, height: 1536, widths: [480, 800, 1024] },
  // Photos supplied by the owner (nen-flyer folder), added to the home slide show 2026-10-27.
  "flyer-heidelberg": { file: "assets/images/flyer-heidelberg.png", width: 1600, height: 1066, widths: [640, 1024, 1600] },
  "flyer-party-a": { file: "assets/images/flyer-party-a.png", width: 2048, height: 1365, widths: [640, 1024, 2048] },
  "flyer-shop-1": { file: "assets/images/flyer-shop-1.png", width: 1200, height: 1600, widths: [480, 800, 1024] },
  "flyer-shop-2": { file: "assets/images/flyer-shop-2.png", width: 1182, height: 1600, widths: [480, 800, 1024] },
  "flyer-shop-3": { file: "assets/images/flyer-shop-3.png", width: 1536, height: 2048, widths: [480, 800, 1024] },
  "flyer-shop-4": { file: "assets/images/flyer-shop-4.png", width: 1536, height: 2048, widths: [480, 800, 1024] },
  "flyer-birthday-1": { file: "assets/images/flyer-birthday-1.png", width: 1536, height: 2048, widths: [480, 800, 1024] },
  "flyer-party-b": { file: "assets/images/flyer-party-b.png", width: 2048, height: 1366, widths: [640, 1024, 2048] },
  "flyer-birthday-2": { file: "assets/images/flyer-birthday-2.png", width: 1200, height: 1600, widths: [480, 800, 1024] },
  // Product packshots made in ChatGPT from the owner's sample photos (2026-10-27), shown on /produkte.
  "produkt-aloe-vera-packung": { file: "assets/images/produkt-aloe-vera-packung.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-authentique": { file: "assets/images/produkt-authentique.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-cell-protect-cream": { file: "assets/images/produkt-cell-protect-cream.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-ceramid-ampulle": { file: "assets/images/produkt-ceramid-ampulle.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-exquisit-set": { file: "assets/images/produkt-exquisit-set.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-hydro-hyaluron-serum": { file: "assets/images/produkt-hydro-hyaluron-serum.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-isoflavon": { file: "assets/images/produkt-isoflavon.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-kennenlern-sets": { file: "assets/images/produkt-kennenlern-sets.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-lippenpflege": { file: "assets/images/produkt-lippenpflege.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  "produkt-men-xo": { file: "assets/images/produkt-men-xo.png", width: 1254, height: 1254, widths: [320, 640, 1024] },
  // More photos from the owner (nen-flyer/Thêm, 2026-10-28), added to the home slide show.
  "extra-1": { file: "assets/images/extra-1.png", width: 1086, height: 1448, widths: [480, 800, 1024] },
  "extra-2": { file: "assets/images/extra-2.png", width: 1124, height: 1394, widths: [480, 800, 1024] },
  "extra-3": { file: "assets/images/extra-3.png", width: 1124, height: 1387, widths: [480, 800, 1024] },
  "extra-4": { file: "assets/images/extra-4.png", width: 1125, height: 1403, widths: [480, 800, 1024] },
  "extra-5": { file: "assets/images/extra-5.png", width: 1125, height: 1384, widths: [480, 800, 1024] },
  "extra-6": { file: "assets/images/extra-6.png", width: 1125, height: 1393, widths: [480, 800, 1024] },
  "extra-7": { file: "assets/images/extra-7.png", width: 1125, height: 1405, widths: [480, 800, 1024] },
  "extra-8": { file: "assets/images/extra-8.png", width: 1125, height: 1384, widths: [480, 800, 1024] },
  "extra-9": { file: "assets/images/extra-9.png", width: 1086, height: 1448, widths: [480, 800, 1024] },
  "extra-10": { file: "assets/images/extra-10.png", width: 1125, height: 1377, widths: [480, 800, 1024] },
} as const;

export type MediaId = keyof typeof MEDIA;
export const isMediaId = (id: string | null | undefined): id is MediaId => !!id && id in MEDIA;
