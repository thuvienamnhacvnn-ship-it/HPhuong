import Link from "next/link";
import type { Metadata } from "next";
import { one, pageContext } from "@/lib/page";
import { getService, getSettings, isTimed } from "@/lib/catalog";
import { CATEGORY_INFO, isCategory } from "@/lib/categories";
import { formatServicePrice } from "@/lib/money";
import { Lily, Ornament, PetalFrame } from "@/components/decor";
import { Frame } from "@/components/Frame";
import { PhoneCta } from "@/components/PhoneCta";
import { IconArrow, IconBack, IconDoc, IconInfo, IconLeaf, IconPlay } from "@/components/icons";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, db } = await pageContext(params);
  const service = await getService(db, (await params).id);
  return { title: service && !service.isAddon ? service.name[locale] : "404" };
}

export default async function TreatmentPage({ params, searchParams }: Props) {
  const { locale, t, db } = await pageContext(params);
  const { id } = await params;
  const service = await getService(db, id);
  // Add-ons ("Extras") are rows of their group's price list, not pages.
  if (!service || service.isAddon || service.variants.length === 0) {
    return (
      <Frame className="frame--center">
      <div className="page frame__fill">
        <div className="card empty">
          <p className="lead">{t.treatment.notFound}</p>
          <Link className="btn" href={`/${locale}/behandlungen`}>{t.treatment.backToList}</Link>
        </div>
      </div>
      </Frame>
    );
  }
  const sp = await searchParams;
  const settings = await getSettings(db);
  const variant = service.variants.find((v) => v.id === one(sp.variant)) ?? service.variants[0];
  const multi = service.variants.length > 1 || !!variant.label;
  const group = isCategory(service.category) ? CATEGORY_INFO[service.category] : null;
  const online = service.bookable && isTimed(variant);
  const anyOnline = service.bookable && service.variants.some(isTimed);
  const steps = service.steps[locale];
  // The flyer has no per-treatment preparation notes; the group's notes ("Bitte bringen Sie … ein kleines Handtuch mit.") go here.
  const notes = [...(group?.notes?.[locale] ?? []), ...service.preparation[locale]];
  const good = [t.treatment.noMedical, t.treatment.payAtStudio, ...(anyOnline ? [t.treatment.confirmByStudio] : [])];
  const hasPhoto = !!service.imageAssetId;
  const back = (
    <Link className="treatment__back" href={`/${locale}/behandlungen?category=${service.category}`}>
      <IconBack /> {t.treatment.backToList}
    </Link>
  );

  return (
    <Frame className="frame--treatment">
    <div className={`treatment frame__fill${hasPhoto ? "" : " treatment--text"}`}>
      {hasPhoto && (
        <div className="treatment__visual">
          {back}
          <PetalFrame imageId={service.imageAssetId ?? ""} alt={service.image?.alt[locale] ?? service.name[locale]} priority sizes="(max-width: 1000px) 100vw, 48vw" imgClassName="treatment__img" />
        </div>
      )}

      <article className="treatment__body frame-scroll">
        {!hasPhoto && (
          <>
            <Lily position="tr-sm" />
            {back}
          </>
        )}
        <div className="row row--between above-decor" style={{ alignItems: "flex-start" }}>
          <div className="stack-sm">
            <p className="eyebrow">{group ? group.name[locale] : t.treatment.eyebrow}</p>
            <h1 className="display display--md">{service.name[locale]}</h1>
            {service.teaser[locale] && <p className="lead">{service.teaser[locale]}</p>}
          </div>
          {/* A preview only appears when a real video file exists — no fake play button. */}
          {service.videoUrl && (
            <a className="video-thumb" href={service.videoUrl}>
              <span className="icon-btn icon-btn--ring"><IconPlay /></span>
              <span className="small">Video</span>
            </a>
          )}
        </div>

        {!multi && (
          <div className="treatment__facts" aria-live="polite">
            {variant.minutes !== null && (
              <>
                <span>{t.common.duration(variant.minutes)}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{formatServicePrice(variant.priceCents, locale, variant.priceFrom)}</span>
            {service.isDemo && <span className="badge">{t.common.demoPrice}</span>}
          </div>
        )}
        <Ornament />

        {service.description[locale] && <p className="above-decor" style={{ margin: 0, fontSize: "1.08rem" }}>{service.description[locale]}</p>}
        {!service.contentApproved && (
          <p className="notice notice--warn small" style={{ margin: 0 }}>
            <IconInfo /> {t.treatment.draftContent}
          </p>
        )}

        <div className={`info-cols info-cols--${(steps.length ? 1 : 0) + 1 + (notes.length ? 1 : 0)}`}>
          {steps.length > 0 && (
            <section className="info-col">
              <h2 className="h3"><IconLeaf /> {t.treatment.steps}</h2>
              <ul>
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="info-col">
            <h2 className="h3"><IconInfo /> {t.treatment.forWhom}</h2>
            <ul>
              {good.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          {notes.length > 0 && (
            <section className="info-col">
              <h2 className="h3"><IconDoc /> {t.treatment.notes}</h2>
              <ul>
                {notes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {multi &&
          (anyOnline ? (
            <div className="stack-sm">
              <h2 className="label" id="variant-label">{t.treatment.variantChoose}</h2>
              <nav className="variant-row variant-row--named" aria-labelledby="variant-label">
                {service.variants.map((v) => (
                  <Link key={v.id} className="variant" href={`/${locale}/behandlungen/${service.id}?variant=${v.id}`} aria-current={v.id === variant.id ? "true" : undefined} replace scroll={false}>
                    <span>{v.label?.[locale] ?? service.name[locale]}</span>
                    <span>
                      {v.minutes !== null ? `${t.common.duration(v.minutes)} · ` : ""}
                      {formatServicePrice(v.priceCents, locale, v.priceFrom)}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          ) : (
            <div className="stack-sm">
              <h2 className="label">{t.treatment.prices}</h2>
              <ul className="price-rows price-rows--detail">
                {service.variants.map((v) => (
                  <li key={v.id} className="price-row">
                    <span className="price-row__name">{v.label?.[locale] ?? service.name[locale]}</span>
                    <span className="price-row__dots" aria-hidden />
                    <span className="price-row__price">{formatServicePrice(v.priceCents, locale, v.priceFrom)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        {online ? (
          <Link className="btn btn--lg" style={{ justifySelf: "start" }} href={`/${locale}/termin?service=${service.id}&variant=${variant.id}`}>
            {t.common.chooseTime} <IconArrow />
          </Link>
        ) : (
          <PhoneCta locale={locale} phone={settings.phone} mobilePhone={settings.mobilePhone} />
        )}
        <p className="small muted treatment__price-note">{t.common.priceNote}</p>
      </article>
    </div>
    </Frame>
  );
}
