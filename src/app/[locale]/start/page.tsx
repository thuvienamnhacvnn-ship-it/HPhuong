import Link from "next/link";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { listServices } from "@/lib/catalog";
import { Img } from "@/components/Img";
import { Ornament, PetalFrame } from "@/components/decor";
import { IconArrow, IconCalendar } from "@/components/icons";
import { CATEGORY_IMAGE } from "@/components/categories";
import { FloatingPetals, SoftWave } from "@/components/SoftDecor";
import { Frame } from "@/components/Frame";

export const metadata: Metadata = { title: { absolute: "HPHUONG Cosmetic & Spa" } };

export default async function StartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t, db } = await pageContext(params);
  const services = await listServices(db, { bookableOnly: true });
  const featured = services.find((s) => s.id === "gesichtspflege") ?? services[0];
  const featuredVariant = featured?.variants[0];
  const categories = ["gesicht", "massage", "head-spa", "pflege"].filter((c) => services.some((s) => s.category === c));

  return (
    <Frame className="frame--home">
    <div className="home frame__fill">
      <FloatingPetals count={9} />
      <section className="home__stage" aria-labelledby="home-title">
        <div className="home__emblem">
          <Img id="logo-emblem" alt={`HPHUONG ${t.brand.descriptor}`} priority sizes="(max-width: 900px) 58vw, (max-width: 1280px) 210px, 470px" />
        </div>
        <div className="home__copy">
          <p className="eyebrow home__eyebrow">
            {t.home.eyebrow.map((e) => (
              <span key={e}>{e}</span>
            ))}
          </p>
          <h1 id="home-title" className="display">
            {t.home.title1}
            <br />
            {t.home.title2}
          </h1>
          <Ornament />
          <p className="lead">{t.home.lead}</p>
          <div className="home__actions">
            <Link className="btn btn--lg" href={`/${locale}/termin`}>
              {t.home.cta} <IconArrow />
            </Link>
            <Link className="btn btn--lg btn--outline" href={`/${locale}/behandlungen`}>
              {t.home.explore} <IconArrow />
            </Link>
          </div>
        </div>

        <div className="home__visual">
          <PetalFrame
            imageId="hero-desktop"
            alt={t.meta.title}
            priority
            sizes="60vw"
            mobile={{ id: "hero-mobile", sizes: "64vw" }}
            imgClassName="home__hero-img"
          />
          <div className="home__side side-quote" aria-hidden>
            {t.home.side.map((s) => (
              <div key={s}>{s}</div>
            ))}
            <Ornament className="ornament--sm ornament--center" />
          </div>
          {featured && featuredVariant && (
            <div className="treatment-dock">
              <div className="treatment-dock__img">
                <Img id={featured.imageAssetId} alt="" sizes="92px" />
              </div>
              <div>
                <div className="treatment-dock__title">{featured.name[locale]}</div>
                <div className="muted">
                  {featuredVariant.minutes} {t.common.min}
                </div>
              </div>
              <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                <IconCalendar width={26} height={26} aria-hidden />
                <Link className="btn btn--sm" href={`/${locale}/termin?service=${featured.id}&variant=${featuredVariant.id}`}>
                  {t.common.chooseTime} <IconArrow />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <SoftWave />
      <nav className="cat-strip" aria-label={t.nav.behandlungen}>
        {categories.map((c) => (
          <Link key={c} className="cat-strip__item" href={`/${locale}/behandlungen?category=${c}`}>
            <span className="medallion">
              <Img id={CATEGORY_IMAGE[c]} alt="" sizes="104px" />
            </span>
            <span className="cat-strip__label">{t.categories[c as keyof typeof t.categories]}</span>
          </Link>
        ))}
        <div className="cat-strip__quote side-quote" aria-hidden>
          <div>{t.brand.tagline}</div>
          <Ornament className="ornament--sm ornament--center" />
        </div>
      </nav>
    </div>
    </Frame>
  );
}
