import Link from "next/link";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { getOffer, getSettings, listOffers } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { Img } from "@/components/Img";
import { Ornament } from "@/components/decor";
import { IconArrow, IconFlower, IconGift, IconHeart, IconLeaf, IconStones } from "@/components/icons";
import { VoucherQuickPick } from "@/components/VoucherQuickPick";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.nav.angebote };
}

export default async function OffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t, db } = await pageContext(params);
  const settings = await getSettings(db);
  const offers = await listOffers(db);
  const details = (await Promise.all(offers.map((o) => getOffer(db, o.id)))).filter((d) => d !== null);

  return (
    <Frame className="frame--offers" label={t.nav.angebote}>
      <div className="offers frame__fill">
        <section className="offers__hero" aria-labelledby="offers-title">
          <div className="offers__hero-img">
            <Img id="ritual-still-life" alt="" priority sizes="(max-width: 1100px) 100vw, 60vw" />
          </div>
          <div className="offers__copy">
            <h1 id="offers-title" className="display">
              {t.offers.title1}
              <br />
              {t.offers.title2}
            </h1>
            <Ornament className="ornament--center" />
            <p className="lead">{t.offers.lead}</p>
            <div className="card voucher-card">
              <h2 className="h3">{t.offers.voucherTitle}</h2>
              <p className="muted" style={{ margin: 0 }}>{t.offers.voucherLead}</p>
              <VoucherQuickPick locale={locale} amounts={settings.voucherDenominationsCents} />
            </div>
          </div>
        </section>

        <div className="stack">
          {/* Studio notes from the price list — information only, nothing is deducted in the booking flow. */}
          <section className="card offer-banner" aria-label={t.catalog.studentDiscount}>
            {/* The picture keeps its left two thirds empty for the words; nothing is laid over it. */}
            <div className="offer-banner__art">
              <Img id="offer-banner" alt="" sizes="(max-width: 1100px) 100vw, 40vw" />
              <div className="offer-banner__text">
                <p className="offer-banner__eyebrow">{t.offers.banner.eyebrow}</p>
                <h2 className="offer-banner__title">
                  <span className="offer-banner__pct">{t.offers.banner.percent}</span>
                  <span className="offer-banner__word">{t.offers.banner.word}</span>
                </h2>
                <p className="offer-banner__who">{t.offers.banner.who}</p>
                <Link className="btn btn--sm" href={`/${locale}/termin`}>
                  {t.home.cta} <IconArrow />
                </Link>
              </div>
            </div>
            <ul className="offer-notes">
              <li><IconGift /> <span><strong>{t.catalog.voucherTipTitle}:</strong> {t.catalog.voucherTip}</span></li>
              <li><IconHeart /> {t.common.priceNote}</li>
            </ul>
          </section>
          {details.map(({ offer, components, image }) => (
            <article key={offer.id} className="card package">
              <div className="package__img">
                <Img id={image?.id ?? "service-massage"} alt={image?.alt[locale] ?? ""} sizes="(max-width: 1100px) 100vw, 420px" />
              </div>
              <div className="package__body">
                <h2>{offer.name[locale]}</h2>
                <p className="muted" style={{ margin: 0 }}>{offer.description[locale]}</p>
                <div className="plus-row">
                  {components.map(({ service }, i) => (
                    <span key={service.id} className="row" style={{ gap: 8 }}>
                      {i > 0 && <span aria-hidden>+</span>}
                      <span className="icon-ring" style={{ width: 44, height: 44 }}>{i === 0 ? <IconFlower /> : <IconStones />}</span>
                      {service.name[locale]}
                    </span>
                  ))}
                </div>
                <div className="row" style={{ justifyContent: "center", gap: 18, fontFamily: "var(--font-heading)", fontSize: "1.4rem", fontWeight: 600 }}>
                  <span>{offer.treatmentMinutes} {t.common.min}</span>
                  <span aria-hidden>|</span>
                  <span>{formatPrice(offer.priceCents, locale)}</span>
                  {offer.isDemo && <span className="badge">{t.common.demoPrice}</span>}
                </div>
                <Link className="btn btn--outline btn--block" href={`/${locale}/angebote/${offer.id}`}>
                  {t.offers.packageCta} <IconArrow />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="feature-row" style={{ position: "relative" }}>
        {[IconGift, IconHeart, IconLeaf].map((Icon, i) => (
          <div key={i} className="feature">
            <span className="icon-ring" style={{ width: 72, height: 72 }}><Icon /></span>
            <div>
              <strong>{t.offers.features[i][0]}</strong>
              <span className="muted">{t.offers.features[i][1]}</span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
