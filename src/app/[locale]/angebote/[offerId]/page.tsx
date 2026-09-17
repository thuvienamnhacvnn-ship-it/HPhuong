import Link from "next/link";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { getOffer } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { Img } from "@/components/Img";
import { Ornament } from "@/components/decor";
import { IconCheck } from "@/components/icons";
import { ComboRequestForm } from "@/components/ComboRequestForm";

type Props = { params: Promise<{ locale: string; offerId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, db } = await pageContext(params);
  const found = await getOffer(db, (await params).offerId);
  return { title: found ? found.offer.name[locale] : "404" };
}

export default async function OfferPage({ params }: Props) {
  const { locale, t, db } = await pageContext(params);
  const found = await getOffer(db, (await params).offerId);
  if (!found || !found.current) {
    return (
      <div className="page narrow">
        <div className="card card--pad empty">
          <p className="lead">{t.offers.expired}</p>
          <Link className="btn" href={`/${locale}/angebote`}>{t.nav.angebote}</Link>
        </div>
      </div>
    );
  }
  const { offer, components, image } = found;
  return (
    <div className="page">
      <div className="checkout">
        <section className="card checkout__form">
          <div className="stack-sm">
            <p className="eyebrow">{t.nav.angebote}</p>
            <h1 className="display display--md">{offer.name[locale]}</h1>
            <Ornament />
            <p className="lead">{t.offers.requestLead}</p>
          </div>
          <ComboRequestForm locale={locale} offerId={offer.id} />
        </section>
        <aside className="card checkout__aside">
          <div className="package__img" style={{ aspectRatio: "1.1", margin: 0 }}>
            <Img id={image?.id ?? "service-massage"} alt={image?.alt[locale] ?? ""} sizes="420px" />
          </div>
          <h2 className="h3">{t.offers.includes}</h2>
          <ul className="checklist">
            {components.map(({ service, variant }) => (
              <li key={service.id}>
                <IconCheck /> {service.name[locale]} · {variant.minutes} {t.common.min}
              </li>
            ))}
          </ul>
          <div className="summary">
            <div className="summary__row">
              <span>{t.common.total}</span>
              <span>{offer.treatmentMinutes} {t.common.min}</span>
            </div>
            <div className="summary__row summary__row--total">
              <span>{offer.isDemo ? t.common.demoPrice : t.common.total}</span>
              <span>{formatPrice(offer.priceCents, locale)}</span>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{t.offers.conditions}</p>
          <p className="small muted" style={{ margin: 0 }}>{t.appointment.pay}</p>
        </aside>
      </div>
    </div>
  );
}
