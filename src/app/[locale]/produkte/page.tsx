import Link from "next/link";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { Img } from "@/components/Img";
import { Ornament } from "@/components/decor";
import { IconArrow } from "@/components/icons";
import { Frame } from "@/components/Frame";
import { PRODUCTS } from "@/lib/products-data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.nav.produkte };
}

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await pageContext(params);
  const lang = locale === "en" ? "en" : "de";
  return (
    <Frame className="frame--produkte">
      <div className="produkte frame__fill">
        <section className="produkte__intro">
          <div className="above-decor stack" style={{ justifyItems: "center", textAlign: "center" }}>
            <p className="eyebrow">HPHUONG · {t.brand.descriptor}</p>
            <Ornament className="ornament--center" />
          </div>
          <h1 className="display display--md above-decor">
            {t.products.title1}
            <br />
            {t.products.title2}
          </h1>
          <p className="above-decor produkte__lead">{t.products.lead}</p>
          <div className="above-decor studio__partner">
            <img src="/partners/gertraud-gruber.png" alt="Gertraud Gruber Kosmetik Kultur" loading="lazy" />
            <p className="studio__products">{t.products.note}</p>
          </div>
          <div className="above-decor produkte__actions">
            <Link className="btn btn--lg" href={`/${locale}/termin`}>
              {t.products.book} <IconArrow />
            </Link>
            <Link className="btn btn--ghost" href={`/${locale}/kontakt`}>
              {t.products.ask}
            </Link>
          </div>
        </section>
        <section className="produkte__grid frame-scroll" aria-label={t.nav.produkte}>
          {PRODUCTS.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-card__img">
                <Img id={p.image} alt={p.name} sizes="(max-width: 900px) 46vw, 18vw" />
              </div>
              <div className="product-card__body">
                <h2 className="product-card__name">{p.name}</h2>
                {p.also && (
                  <ul className="product-card__also">
                    {p.also.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
                <p className="product-card__text">{p.text[lang]}</p>
                <span className="product-card__tag">{t.products.groups[p.group]}</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </Frame>
  );
}
