import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { one, pageContext } from "@/lib/page";
import { getSettings, isBookableOnline, isTimed, listServices, type ServiceWithVariants } from "@/lib/catalog";
import { CATEGORIES, CATEGORY_INFO, parseCategories, type Category } from "@/lib/categories";
import { formatServicePrice } from "@/lib/money";
import { Img } from "@/components/Img";
import { AutoTabs } from "@/components/AutoTabs";
import { Lily, Ornament } from "@/components/decor";
import {
  IconArrow,
  IconCheck,
  IconClock,
  IconDrop,
  IconEye,
  IconFlower,
  IconFoot,
  IconGift,
  IconHand,
  IconHeart,
  IconLash,
  IconLotus,
  IconNail,
  IconSparkle,
  IconStones,
} from "@/components/icons";
import { CatalogFilters } from "@/components/CatalogFilters";
import { PhoneCta } from "@/components/PhoneCta";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.nav.behandlungen };
}

type Icon = (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
const TAB_ICONS: Record<Category | "alle", Icon> = {
  alle: IconLotus,
  "gesicht-pflege": IconFlower,
  "spezial-koerper": IconSparkle,
  "entspannung-sugaring": IconDrop,
  "massage-wellness": IconStones,
  manikuere: IconHand,
  pedikuere: IconFoot,
  nageldesign: IconNail,
  wimpernverlaengerung: IconLash,
  augenkosmetik: IconEye,
};

type Search = Promise<Record<string, string | string[] | undefined>>;

/** A service has its own page when there is more to read than a price row. */
const hasDetails = (s: ServiceWithVariants) => !s.isAddon && (!!s.description.de || s.steps.de.length > 0 || isBookableOnline(s));

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Search }) {
  const { locale, t, db } = await pageContext(params);
  const sp = await searchParams;
  const selected = parseCategories(one(sp.category));
  const settings = await getSettings(db);
  const services = await listServices(db, {
    category: selected.join(","),
    q: one(sp.q),
    maxPriceCents: Number(one(sp.maxPrice)) || null,
    maxMinutes: Number(one(sp.maxMinutes)) || null,
    bookableOnly: one(sp.bookable) === "1",
  });
  const groups = CATEGORIES.map((id) => ({ id, info: CATEGORY_INFO[id], items: services.filter((s) => s.category === id) })).filter((g) => g.items.length > 0);
  const previewable = services.filter(hasDetails);
  const preview = previewable.find((s) => s.id === one(sp.preview)) ?? previewable[0];

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

  const duration = (minutes: number | null) => (minutes === null ? null : t.common.duration(minutes));
  const detailHref = (s: ServiceWithVariants, variantId?: string) => `/${locale}/behandlungen/${s.id}${variantId ? `?variant=${variantId}` : ""}`;

  return (
    <Frame className="frame--catalog" label={t.nav.behandlungen}>
      <section className="band band--photo">
        <div className="band__photo" aria-hidden>
          <Img id="banner-treatments" alt="" priority sizes="(max-width: 900px) 45vw, 46vw" />
        </div>
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
        <div className="catalog-toolbar catalog-toolbar--groups">
          <nav className="tabs" aria-label={t.catalog.filters}>
            <AutoTabs />
            {(["alle", ...CATEGORIES] as const).map((c) => {
              const Icon = TAB_ICONS[c];
              const active = c === "alle" ? selected.length === 0 : selected.includes(c);
              return (
                <Link key={c} className={`chip${active ? " is-active" : ""}`} aria-current={active ? "true" : undefined} href={hrefWith({ category: c === "alle" ? null : c, preview: null })} scroll={false}>
                  <Icon /> {c === "alle" ? t.categories.alle : CATEGORY_INFO[c].name[locale]}
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

        <div className={`catalog${preview ? "" : " catalog--full"}`}>
          {services.length === 0 ? (
            <div className="card empty">
              <p className="lead">{t.catalog.empty}</p>
              <Link className="btn btn--outline" href={`/${locale}/behandlungen`}>
                {t.catalog.resetFilters}
              </Link>
            </div>
          ) : (
            <div className="catalog-list frame-scroll">
              {groups.map(({ id, info, items }, groupIndex) => {
                // A card shows one price: treatments with several price rows stay in the price list,
                // with their picture on top of their block.
                const cards = items.filter((s) => s.imageAssetId && !s.isAddon && s.variants.length === 1);
                const rows = items.filter((s) => !s.isAddon && !cards.includes(s));
                // A list without any picture of its own gets the group's picture as its first tile.
                const groupPhoto = cards.length === 0 && rows.length > 0 && rows.every((s) => !s.imageAssetId) ? info.image : null;
                const addons = items.filter((s) => s.isAddon);
                const needsPhone = items.some((s) => !s.isAddon && s.variants.some((v) => !isTimed(v) || !s.bookable));
                return (
                  <section key={id} className="cat-group" aria-labelledby={`group-${id}`}>
                    <header className="cat-group__head">
                      <h2 id={`group-${id}`} className="cat-group__title">{info.name[locale]}</h2>
                      {info.subtitle && <p className="cat-group__sub">{info.subtitle[locale]}</p>}
                      {info.intro?.[locale].map((p) => (
                        <p key={p} className="cat-group__intro">{p}</p>
                      ))}
                    </header>

                    {cards.length > 0 && (
                      <div className="service-grid">
                        {cards.map((s, i) => {
                          const v = s.variants[0];
                          const online = isBookableOnline(s);
                          return (
                            <article key={s.id} className={`card service-card${preview?.id === s.id ? " is-selected" : ""}`}>
                              <Link href={hasDetails(s) ? hrefWith({ preview: s.id }) : detailHref(s)} scroll={false} className="service-card__img" aria-label={`${s.name[locale]} – ${t.common.details}`}>
                                <Img id={s.imageAssetId} alt={s.image?.alt[locale] ?? ""} sizes="(max-width: 600px) 90vw, 260px" priority={groupIndex === 0 && i < 2} />
                              </Link>
                              <div className="service-card__body">
                                <h3 className="service-card__title">{s.name[locale]}</h3>
                                <div className="meta-row">
                                  {duration(v.minutes) ? (
                                    <span className="duration">
                                      <IconClock /> {duration(v.minutes)}
                                    </span>
                                  ) : (
                                    <span />
                                  )}
                                  <span className="price">{formatServicePrice(v.priceCents, locale, v.priceFrom)}</span>
                                </div>
                                {(s.teaser[locale] || s.description[locale]) && <p className="service-card__teaser">{s.teaser[locale] || s.description[locale]}</p>}
                                <div className="service-card__actions">
                                  {hasDetails(s) && (
                                    <Link className="btn btn--sm btn--block" href={detailHref(s, v.id)}>
                                      {t.common.details} <IconArrow />
                                    </Link>
                                  )}
                                  {!online && <span className="small muted service-card__phone">{t.common.byPhone}</span>}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {rows.length > 0 && (
                      <div className="price-list">
                        {groupPhoto && (
                          <div className="price-photo">
                            <Img id={groupPhoto} alt="" sizes="(max-width: 600px) 90vw, 360px" />
                          </div>
                        )}
                        {rows.map((s) => {
                          const single = s.variants.length === 1 && !s.variants[0].label ? s.variants[0] : null;
                          const online = isBookableOnline(s);
                          return (
                            <article key={s.id} className="price-item">
                              {s.imageAssetId && (
                                <div className="price-photo price-photo--item">
                                  <Img id={s.imageAssetId} alt={s.image?.alt[locale] ?? ""} sizes="(max-width: 600px) 90vw, 360px" />
                                </div>
                              )}
                              <div className="price-row price-row--head">
                                <h3 className="price-item__title">{s.name[locale]}</h3>
                                {single && (
                                  <>
                                    <span className="price-row__dots" aria-hidden />
                                    {duration(single.minutes) && <span className="price-row__time">{duration(single.minutes)}</span>}
                                    <span className="price-row__price">{formatServicePrice(single.priceCents, locale, single.priceFrom)}</span>
                                  </>
                                )}
                              </div>
                              {s.teaser[locale] && <p className="price-item__sub">{s.teaser[locale]}</p>}
                              {s.description[locale] && <p className="price-item__desc">{s.description[locale]}</p>}
                              {!single && (
                                <ul className="price-rows">
                                  {s.variants.map((v) => (
                                    <li key={v.id} className="price-row">
                                      <span className="price-row__name">{v.label?.[locale] ?? s.name[locale]}</span>
                                      <span className="price-row__dots" aria-hidden />
                                      {duration(v.minutes) && <span className="price-row__time">{duration(v.minutes)}</span>}
                                      <span className="price-row__price">{formatServicePrice(v.priceCents, locale, v.priceFrom)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {(hasDetails(s) || online) && (
                                <div className="price-item__actions">
                                  {hasDetails(s) && (
                                    <Link className="link small" href={detailHref(s)}>
                                      {t.common.details} →
                                    </Link>
                                  )}
                                  {online && (
                                    <Link className="btn btn--sm" href={`/${locale}/termin?service=${s.id}`}>
                                      {t.common.chooseTime} <IconArrow />
                                    </Link>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {addons.map((s) => (
                      <div key={s.id} className="price-list price-list--extras">
                        <article className="price-item">
                          <h3 className="price-item__title">{s.name[locale]}</h3>
                          <ul className="price-rows">
                            {s.variants.map((v) => (
                              <li key={v.id} className="price-row">
                                <span className="price-row__name">{v.label?.[locale] ?? s.name[locale]}</span>
                                <span className="price-row__dots" aria-hidden />
                                <span className="price-row__price">{formatServicePrice(v.priceCents, locale, v.priceFrom)}</span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      </div>
                    ))}

                    {info.notes?.[locale].map((n) => (
                      <p key={n} className="cat-group__note">{n}</p>
                    ))}
                    {needsPhone && <PhoneCta locale={locale} phone={settings.phone} mobilePhone={settings.mobilePhone} inline />}
                  </section>
                );
              })}

              <footer className="catalog-foot">
                <p className="catalog-foot__note">{t.common.priceNote}</p>
                <div className="catalog-foot__tips">
                  <p className="catalog-foot__tip">
                    <IconGift /> <span><strong>{t.catalog.voucherTipTitle}:</strong> {t.catalog.voucherTip}</span>{" "}
                    <Link className="link" href={`/${locale}/gutschein`}>{t.catalog.toVoucher} →</Link>
                  </p>
                  <p className="catalog-foot__tip">
                    <IconHeart /> <span>{t.catalog.studentDiscount}</span>
                  </p>
                </div>
              </footer>
            </div>
          )}

          {preview && (
            <aside className="card card--flourish preview-panel" aria-label={preview.name[locale]}>
              {preview.imageAssetId && (
                <div className="preview-panel__img">
                  <Img id={preview.imageAssetId} alt="" sizes="320px" />
                </div>
              )}
              <h2 className="service-card__title">{preview.name[locale]}</h2>
              {preview.teaser[locale] && <p className="preview-panel__sub">{preview.teaser[locale]}</p>}
              {preview.variants.length === 1 ? (
                <div className="meta-row">
                  {duration(preview.variants[0].minutes) ? (
                    <span className="duration">
                      <IconClock /> {duration(preview.variants[0].minutes)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="price">{formatServicePrice(preview.variants[0].priceCents, locale, preview.variants[0].priceFrom)}</span>
                </div>
              ) : (
                <ul className="price-rows">
                  {preview.variants.map((v) => (
                    <li key={v.id} className="price-row">
                      <span className="price-row__name">{v.label?.[locale] ?? preview.name[locale]}</span>
                      <span className="price-row__dots" aria-hidden />
                      {duration(v.minutes) && <span className="price-row__time">{duration(v.minutes)}</span>}
                      <span className="price-row__price">{formatServicePrice(v.priceCents, locale, v.priceFrom)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {preview.description[locale] && <p style={{ margin: 0 }}>{preview.description[locale]}</p>}
              {!preview.contentApproved && <p className="small muted" style={{ margin: 0 }}>{t.treatment.draftContent}</p>}
              {preview.steps[locale].length > 0 && (
                <>
                  <Ornament className="ornament--center" />
                  <div>
                    <h3 className="h3" style={{ fontSize: "1.2rem", marginBottom: 6 }}>{t.treatment.steps}</h3>
                    <ul className="checklist">
                      {preview.steps[locale].map((step) => (
                        <li key={step}>
                          <IconCheck /> {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {isBookableOnline(preview) ? (
                <Link className="btn btn--block" href={`/${locale}/termin?service=${preview.id}`}>
                  {t.common.chooseTime} <IconArrow />
                </Link>
              ) : (
                <PhoneCta locale={locale} phone={settings.phone} mobilePhone={settings.mobilePhone} />
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
