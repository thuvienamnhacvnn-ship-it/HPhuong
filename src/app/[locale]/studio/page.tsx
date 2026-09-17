import Link from "next/link";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { Img } from "@/components/Img";
import { Lily, Ornament } from "@/components/decor";
import { IconArrow } from "@/components/icons";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.nav.studio };
}

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await pageContext(params);
  // Interior images are generated concept visuals — labelled as such, never presented as photos of the studio.
  const tiles: { id: string; label: string; pos: string }[] = [
    { id: "studio-interior", label: t.studio.tiles[0], pos: "20% 50%" },
    { id: "studio-interior", label: t.studio.tiles[1], pos: "62% 60%" },
    { id: "ritual-still-life", label: t.studio.tiles[2], pos: "80% 60%" },
  ];
  return (
    <Frame className="frame--studio">
    <div className="studio frame__fill">
      <div className="studio__visual">
        <Img id="studio-interior" alt={t.studio.visualisation} priority sizes="(max-width: 1000px) 100vw, 52vw" imgStyle={{ objectPosition: "55% 50%" }} />
        <div className="studio__overlay">
          <p className="display">
            {t.studio.heroTitle1}
            <br />
            {t.studio.heroTitle2}
          </p>
        </div>
        <span className="studio__label">{t.studio.visualisation}</span>
      </div>
      <section className="studio__body">
        <Lily position="tr-sm" />
        <div className="above-decor stack" style={{ justifyItems: "center", textAlign: "center", width: "100%" }}>
          <img src="/media/logo-emblem-240.webp" srcSet="/media/logo-emblem-240.webp 1x, /media/logo-emblem-480.webp 2x" alt="HPHUONG" width={132} height={150} style={{ objectFit: "contain" }} />
          <p className="eyebrow">HPHUONG · {t.brand.descriptor}</p>
          <Ornament className="ornament--center" />
        </div>
        <h1 className="display display--md above-decor">{t.studio.title}</h1>
        <p className="above-decor" style={{ fontSize: "1.1rem", margin: 0, maxWidth: 560 }}>{t.studio.lead}</p>
        <div className="tiles above-decor">
          {tiles.map((tile) => (
            <figure key={tile.label} className="tile">
              <Img id={tile.id} alt="" sizes="200px" imgStyle={{ objectPosition: tile.pos }} />
              <figcaption>{tile.label}</figcaption>
            </figure>
          ))}
        </div>
        <Link className="btn btn--lg above-decor" href={`/${locale}/behandlungen`}>
          {t.studio.cta} <IconArrow />
        </Link>
      </section>
    </div>
    </Frame>
  );
}
