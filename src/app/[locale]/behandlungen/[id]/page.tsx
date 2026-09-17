import Link from "next/link";
import type { Metadata } from "next";
import { one, pageContext } from "@/lib/page";
import { getService } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { Ornament, PetalFrame } from "@/components/decor";
import { Frame } from "@/components/Frame";
import { IconArrow, IconBack, IconDoc, IconInfo, IconLeaf, IconPlay } from "@/components/icons";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, db } = await pageContext(params);
  const service = await getService(db, (await params).id);
  return { title: service ? service.name[locale] : "404" };
}

export default async function TreatmentPage({ params, searchParams }: Props) {
  const { locale, t, db } = await pageContext(params);
  const { id } = await params;
  const service = await getService(db, id);
  if (!service || service.variants.length === 0) {
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
  const variant = service.variants.find((v) => v.id === one(sp.variant)) ?? service.variants[0];

  return (
    <Frame className="frame--treatment">
    <div className="treatment frame__fill">
      <div className="treatment__visual">
        <Link className="treatment__back" href={`/${locale}/behandlungen?category=${service.category}`}>
          <IconBack /> {t.treatment.backToList}
        </Link>
        <PetalFrame imageId={service.imageAssetId ?? ""} alt={service.image?.alt[locale] ?? service.name[locale]} priority sizes="(max-width: 1000px) 100vw, 48vw" imgClassName="treatment__img" />
      </div>

      <article className="treatment__body frame-scroll">
        <div className="row row--between" style={{ alignItems: "flex-start" }}>
          <div className="stack-sm">
            <p className="eyebrow">{t.treatment.eyebrow}</p>
            <h1 className="display display--md">{service.name[locale]}</h1>
            <p className="lead">{service.teaser[locale]}</p>
          </div>
          {/* A preview only appears when a real video file exists — no fake play button. */}
          {service.videoUrl && (
            <a className="video-thumb" href={service.videoUrl}>
              <span className="icon-btn icon-btn--ring"><IconPlay /></span>
              <span className="small">Video</span>
            </a>
          )}
        </div>

        <div className="treatment__facts" aria-live="polite">
          <span>
            {variant.minutes} {t.common.min}
          </span>
          <span aria-hidden>·</span>
          <span>{formatPrice(variant.priceCents, locale)}</span>
          {service.isDemo && <span className="badge">{t.common.demoPrice}</span>}
        </div>
        <Ornament />

        <p style={{ margin: 0, fontSize: "1.08rem" }}>{service.description[locale]}</p>
        {!service.contentApproved && (
          <p className="notice notice--warn small" style={{ margin: 0 }}>
            <IconInfo /> {t.treatment.draftContent}
          </p>
        )}

        <div className="info-cols">
          <section className="info-col">
            <h2 className="h3"><IconLeaf /> {t.treatment.steps}</h2>
            <ul>
              {service.steps[locale].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="info-col">
            <h2 className="h3"><IconInfo /> {t.treatment.forWhom}</h2>
            <ul>
              <li>{t.treatment.noMedical}</li>
              <li>{t.treatment.payAtStudio}</li>
              <li>{t.treatment.confirmByStudio}</li>
            </ul>
          </section>
          <section className="info-col">
            <h2 className="h3"><IconDoc /> {t.treatment.notes}</h2>
            <ul>
              {service.preparation[locale].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        </div>

        {service.variants.length > 1 && (
          <div className="stack-sm">
            <h2 className="label" id="variant-label">{t.treatment.duration}</h2>
            <nav className="variant-row" aria-labelledby="variant-label">
              {service.variants.map((v) => (
                <Link key={v.id} className="variant" href={`/${locale}/behandlungen/${service.id}?variant=${v.id}`} aria-current={v.id === variant.id ? "true" : undefined} replace scroll={false}>
                  <span>
                    {v.minutes} {t.common.min}
                  </span>
                  <span>{formatPrice(v.priceCents, locale)}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {service.bookable ? (
          <Link className="btn btn--lg" style={{ justifySelf: "start" }} href={`/${locale}/termin?service=${service.id}&variant=${variant.id}`}>
            {t.common.chooseTime} <IconArrow />
          </Link>
        ) : (
          <p className="notice">{t.catalog.notBookable}</p>
        )}
      </article>
    </div>
    </Frame>
  );
}
