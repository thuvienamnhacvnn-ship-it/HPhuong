import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { one, pageContext } from "@/lib/page";
import { CATEGORIES, listServices } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { Img } from "@/components/Img";
import { Lily, Ornament } from "@/components/decor";
import { IconArrow, IconCheck, IconClock, IconDrop, IconFlower, IconHeart, IconLeaf, IconLotus, IconStones } from "@/components/icons";
import { CatalogFilters } from "@/components/CatalogFilters";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.nav.behandlungen };
}

const TAB_ICONS: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  alle: IconLotus,
  gesicht: IconFlower,
  massage: IconStones,
  "head-spa": IconDrop,
  pflege: IconLeaf,
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Search }) {
  const { locale, t, db } = await pageContext(params);
  const sp = await searchParams;
  const rawCategory = one(sp.category);
  const category = rawCategory && (CATEGORIES as readonly string[]).includes(rawCategory) ? rawCategory : "alle";
  const services = await listServices(db, {
    category,
    q: one(sp.q),
    maxPriceCents: Number(one(sp.maxPrice)) || null,
    maxMinutes: Number(one(sp.maxMinutes)) || null,
    bookableOnly: one(sp.bookable) === "1",
  });
  const preview = services.find((s) => s.id === one(sp.preview)) ?? services[0];

  const hrefWith = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "focus") next.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return `/${locale}/behandlungen${s ? `?${s}` : ""}`;
  };

  return (
    <Frame className="frame--catalog" label={t.nav.behandlungen}>
      <section className="band">
        <Lily position="tr" />
        <div className="band__inner above-decor">
          <h1 className="display display--md">
            {t.catalog.title1}
            <br />
            {t.catalog.title2}
          </h1>
          <div className="band__aside">
            <p className="lead" style={{ maxWidth: 260 }}>{t.catalog.lead}</p>
            <Ornament className="ornament--sm" />
          </div>
        </div>
      </section>

      <div className="page frame__fill catalog-page">
        <div className="catalog-toolbar">
        <nav className="tabs" aria-label={t.catalog.filters}>
          {["alle", ...CATEGORIES].map((c) => {
            const Icon = TAB_ICONS[c];
            return (
              <Link key={c} className={`chip${category === c ? " is-active" : ""}`} aria-current={category === c ? "true" : undefined} href={hrefWith({ category: c === "alle" ? null : c, preview: null })} scroll={false}>
                <Icon /> {t.categories[c as keyof typeof t.categories]}
              </Link>
            );
          })}
        </nav>
        <Suspense>
          <CatalogFilters locale={locale} />
        </Suspense>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {t.catalog.results(services.length)}
        </p>

        <div className="catalog">
          {services.length === 0 ? (
            <div className="card empty">
              <p className="lead">{t.catalog.empty}</p>
              <Link className="btn btn--outline" href={`/${locale}/behandlungen`}>
                {t.catalog.resetFilters}
              </Link>
            </div>
          ) : (
            <div className="service-grid">
              {services.map((s, i) => {
                const v = s.variants[0];
                return (
                  <article key={s.id} className={`card service-card${preview?.id === s.id ? " is-selected" : ""}`}>
                    <Link href={hrefWith({ preview: s.id })} scroll={false} className="service-card__img" aria-label={`${s.name[locale]} – ${t.common.details}`}>
                      <Img id={s.imageAssetId} alt={s.image?.alt[locale] ?? ""} sizes="(max-width: 600px) 90vw, 260px" priority={i < 2} />
                      {s.isDemo && <span className="badge badge--light">{t.common.demoPrices}</span>}
                    </Link>
                    <div className="service-card__body">
                      <h2 className="service-card__title">{s.name[locale]}</h2>
                      <div className="meta-row">
                        <span className="duration">
                          <IconClock /> {s.variants.map((x) => x.minutes).join(" / ")} {t.common.min}
                        </span>
                        <span className="price">
                          {s.variants.length > 1 && <span className="small muted" style={{ fontFamily: "var(--font-body)", fontWeight: 400 }}>{t.common.from} </span>}
                          {formatPrice(v.priceCents, locale)}
                        </span>
                      </div>
                      <p className="service-card__teaser">{s.teaser[locale]}</p>
                      <div className="service-card__actions">
                        <Link className="btn btn--sm btn--block" href={`/${locale}/behandlungen/${s.id}?variant=${v.id}`}>
                          {t.common.details} <IconArrow />
                        </Link>
                        {!s.bookable && <span className="small muted">{t.catalog.notBookable}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {preview && (
            <aside className="card card--flourish preview-panel" aria-label={preview.name[locale]}>
              <div className="preview-panel__img">
                <Img id={preview.imageAssetId} alt="" sizes="320px" />
              </div>
              <h2 className="service-card__title">{preview.name[locale]}</h2>
              <div className="meta-row">
                <span className="duration">
                  <IconClock /> {preview.variants[0].minutes} {t.common.min}
                </span>
                <span className="price">{formatPrice(preview.variants[0].priceCents, locale)}</span>
              </div>
              <p style={{ margin: 0 }}>{preview.description[locale]}</p>
              {!preview.contentApproved && <p className="small muted" style={{ margin: 0 }}>{t.treatment.draftContent}</p>}
              <Ornament className="ornament--center" />
              <div>
                <h3 className="h3" style={{ fontSize: "1.2rem", marginBottom: 6 }}>{t.catalog.services}</h3>
                <ul className="checklist">
                  {preview.steps[locale].map((step) => (
                    <li key={step}>
                      <IconCheck /> {step}
                    </li>
                  ))}
                </ul>
              </div>
              {preview.bookable && (
                <Link className="btn btn--block" href={`/${locale}/termin?service=${preview.id}&variant=${preview.variants[0].id}`}>
                  {t.common.chooseTime} <IconArrow />
                </Link>
              )}
            </aside>
          )}
        </div>

        <div className="trust-row">
          {[IconDrop, IconLotus, IconHeart].map((Icon, i) => (
            <div key={i} className="trust-row__item">
              <span className="icon-ring"><Icon /></span>
              {t.catalog.trust[i]}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
