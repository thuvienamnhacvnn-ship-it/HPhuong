import Link from "next/link";
import { getDict, type Locale } from "@/i18n";
import { formatPrice } from "@/lib/money";
import { Img } from "./Img";
import { IconArrow, IconClock } from "./icons";

export type RecCardData = {
  serviceId: string;
  variantId: string;
  name: { de: string; en: string };
  minutes: number;
  priceCents: number;
  imageAssetId: string | null;
  teaser: { de: string; en: string };
  reason?: string;
  withinBudget: boolean | null;
  suggestedDate?: string;
  suggestedTime?: string;
};

export function RecCard({ card, locale }: { card: RecCardData; locale: Locale }) {
  const t = getDict(locale);
  const book = new URLSearchParams({ service: card.serviceId, variant: card.variantId });
  if (card.suggestedDate) book.set("date", card.suggestedDate);
  return (
    <article className="card rec-card">
      <div className="rec-card__img">
        <Img id={card.imageAssetId} alt={card.name[locale]} sizes="(max-width: 600px) 90vw, 300px" />
        {card.withinBudget === false && <span className="badge">{t.assistant.aboveBudget}</span>}
      </div>
      <h3 className="service-card__title">{card.name[locale]}</h3>
      <div className="meta-row">
        <span className="duration">
          <IconClock /> {card.minutes} {t.common.min}
        </span>
        <span className="price">{formatPrice(card.priceCents, locale)}</span>
      </div>
      <p className="service-card__teaser">{card.reason || card.teaser[locale]}</p>
      <Link className="link small" href={`/${locale}/behandlungen/${card.serviceId}?variant=${card.variantId}`}>
        {t.assistant.more} →
      </Link>
      <Link className="btn btn--sm btn--block" href={`/${locale}/termin?${book}`}>
        {t.common.chooseTime} <IconArrow />
      </Link>
    </article>
  );
}
