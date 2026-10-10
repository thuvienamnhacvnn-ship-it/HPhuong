import { Fragment } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { bookableVariants, listServices } from "@/lib/catalog";
import { FEATURED_SERVICE_ID } from "@/lib/flyer-data";
import { Img } from "@/components/Img";
import { ArchFrame, Ornament } from "@/components/decor";
import { IconArrow, IconCalendar, IconFaceLine, IconHeadSpaLine, IconLeafLine, IconLotusLine } from "@/components/icons";
import { HomeFoot, HomePetals, HomeWave } from "@/components/SoftDecor";
import { Frame } from "@/components/Frame";
import { SpinLogo } from "@/components/SpinLogo";
import { BrandWord } from "@/components/BrandWord";

export const metadata: Metadata = { title: { absolute: "HPHUONG Beauty & Spa" } };

/** The four discs under the banner: same four icons as before, pointing at the studio's real treatment groups. */
const STRIP = [
  { key: "face", icon: IconFaceLine, categories: ["gesicht-pflege"], wide: false },
  { key: "massage", icon: IconLotusLine, categories: ["massage-wellness"], wide: true },
  { key: "relax", icon: IconHeadSpaLine, categories: ["entspannung-sugaring"], wide: false },
  { key: "care", icon: IconLeafLine, categories: ["manikuere", "pedikuere"], wide: false },
] as const;

export default async function StartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t, db } = await pageContext(params);
  const services = await listServices(db, { bookableOnly: true });
  const featured = services.find((s) => s.id === FEATURED_SERVICE_ID) ?? services[0];
  const featuredVariant = featured ? bookableVariants(featured)[0] : undefined;

  // The column is drawn for "for you." (8 characters); a longer second line (DE) shrinks to the same width.
  const titleFit = Math.min(1, 8 / Math.max(t.home.title1.length, t.home.title2.length));

  return (
    <Frame className="frame--home">
      {/* Phones (≤ 900px): one fixed screen — photo, turning logo with the lettering, headline. The
          desktop banner below is hidden there; the dock carries the navigation. */}
      <div className="m-home">
        <div className="m-home__photo">
          <Img id="home-space-mobile" alt={t.meta.title} priority sizes="100vw" />
        </div>
        <div className="m-home__brand">
          <div className="m-home__logo logo-spin">
            {/* eslint-disable-next-line @next/next/no-img-element -- still frame under the video, from the media pipeline */}
            <img src="/media/logo-3d-still-480.webp" width={480} height={480} alt="HPHUONG Beauty & Spa" />
            <SpinLogo className="logo-spin__video" />
          </div>
          <BrandWord id="bw-arc-m" className="m-home__word" sizes="60vw" descriptor={t.brand.descriptor} />
          <p className="m-home__title">
            <span>{t.home.title1}</span> <em>{t.home.title2}</em>
          </p>
          <p className="m-home__lead">{t.home.lead}</p>
        </div>
      </div>
      <div className="home frame__fill">
        <HomePetals />
        <section className="home__stage" aria-labelledby="home-title">
          <div className="home__copy">
            <p className="eyebrow home__eyebrow" data-mo="rise" style={{ ["--i" as string]: 0 }}>
              {t.home.eyebrow.map((e) => (
                <span key={e}>{e}</span>
              ))}
            </p>
            <h1 id="home-title" className="home__title" style={{ ["--fit" as string]: titleFit }}>
              <span className="home__title-a" data-mo="mask" style={{ ["--i" as string]: 1 }}>{t.home.title1}</span>
              <span className="home__title-b" data-mo="mask" style={{ ["--i" as string]: 2 }}>{t.home.title2}</span>
            </h1>
            <Ornament className="home__rule" i={3} />
            <p className="home__lead" data-mo="rise" style={{ ["--i" as string]: 4 }}>
              {t.home.lead.split(/(?<=\.)\s+/).map((sentence, i) => (
                <Fragment key={sentence}>
                  {i > 0 && " "}
                  <span>{sentence}</span>
                </Fragment>
              ))}
            </p>
            <div className="home__actions">
              <Link className="btn btn--lg" href={`/${locale}/termin`} data-mo="rise" data-mo-magnet="" style={{ ["--i" as string]: 5 }}>
                <span className="btn__in">
                  {t.home.cta} <IconArrow />
                </span>
              </Link>
              <Link className="btn btn--lg btn--outline" href={`/${locale}/behandlungen`} data-mo="rise" data-mo-magnet="" style={{ ["--i" as string]: 6 }}>
                <span className="btn__in">
                  {t.home.explore} <IconArrow />
                </span>
              </Link>
            </div>
            <div className="home__side side-quote" aria-hidden data-mo="fade" style={{ ["--i" as string]: 7 }}>
              {t.home.side.map((s) => (
                <div key={s}>{s}</div>
              ))}
              <Ornament className="ornament--sm ornament--center" />
            </div>
          </div>

          <div className="home__emblem" data-mo="logo" data-mo-tilt="" data-mo-depth="6" style={{ ["--i" as string]: 7 }}>
            {/* Turning 3D monogram over its own still frame; the lettering below it stands still.
                Same box as the old one-piece logo (logo-full), so nothing around it moves. */}
            <div className="pic home__logo3d">
              <Img id="logo-3d-still" alt="HPHUONG Beauty & Spa" priority sizes="(max-width: 900px) 46vw, 30vw" className="home__logo3d-still" />
              <SpinLogo />
              <BrandWord id="bw-arc" className="home__logo3d-word" sizes="(max-width: 900px) 46vw, 30vw" descriptor={t.brand.descriptor} />
            </div>
          </div>

          <div className="home__visual" data-mo="visual" style={{ ["--i" as string]: 8 }}>
            {/* Banner photo = its own layer. Swap it: overwrite assets/images/hero-desktop.png (+ hero-mobile.png),
                then `npm run assets`. Any size; the box is near-square, so a landscape photo is cropped at the sides. Focal point = --hero-pos in decor.css. */}
            <ArchFrame imageId="home-space" alt={t.meta.title} priority sizes="(max-width: 900px) 100vw, max(42vw, calc(112vh - 145px))" mobile={{ id: "home-space-mobile", sizes: "100vw" }}
              slides={[
                { id: "hero-desktop", pos: "28% 50%" },
                { id: "studio-interior", pos: "55% 50%" },
                { id: "service-ayurveda", pos: "50% 42%" },
                { id: "banner-contact", pos: "82% 50%" },
                { id: "service-facial-massage", pos: "50% 36%" },
              ]}
            >
              {featured && featuredVariant && (
                <div className="treatment-dock" data-mo="rise-lg" style={{ ["--i" as string]: 10 }}>
                  <div className="treatment-dock__img">
                    <Img id={featured.imageAssetId} alt="" sizes="110px" />
                  </div>
                  <div className="treatment-dock__text">
                    <div className="treatment-dock__title">{featured.name[locale]}</div>
                    <div className="treatment-dock__meta">
                      {t.common.duration(featuredVariant.minutes)}
                    </div>
                  </div>
                  <div className="treatment-dock__go">
                    <IconCalendar aria-hidden />
                    <Link className="btn btn--sm" href={`/${locale}/termin?service=${featured.id}&variant=${featuredVariant.id}`}>
                      <span className="btn__in">
                        {t.common.chooseTime} <IconArrow />
                      </span>
                    </Link>
                  </div>
                </div>
              )}
            </ArchFrame>
          </div>

          {/* Leaf + lily cluster at the foot of the logo — a decor layer of its own (not part of the logo or
              the photo). Sits above the photo's lower-left corner, below the card; the wave covers its base. */}
          <div className="home__flora" aria-hidden data-mo="fade" data-mo-depth="5" data-mo-depth-y="2" style={{ ["--i" as string]: 8 }}>
            <Img id="home-flora" alt="" sizes="(max-width: 900px) 30vw, 38vw" />
          </div>
        </section>

        <HomeWave />
        <nav className="cat-strip" aria-label={t.nav.behandlungen}>
          <HomeFoot />
          {STRIP.map(({ key, icon: Icon, categories, wide }, n) => (
            <Link key={key} className="cat-strip__item" href={`/${locale}/behandlungen?category=${categories.join(",")}`} data-mo="rise" style={{ ["--i" as string]: 11 + n }}>
              <span className={wide ? "cat-strip__disc cat-strip__disc--wide" : "cat-strip__disc"}>
                <Icon />
              </span>
              <span className="cat-strip__label">{t.home.strip[key]}</span>
            </Link>
          ))}
          <div className="cat-strip__quote side-quote" aria-hidden data-mo="fade" style={{ ["--i" as string]: 15 }}>
            <div>{t.brand.tagline}</div>
            <Ornament className="ornament--sm ornament--center" />
          </div>
        </nav>
      </div>
    </Frame>
  );
}
