import { formatPrice } from "@/lib/money";
import { getDict, type Locale } from "@/i18n";
import { Img } from "./Img";

/** Blank card photo + HTML overlay. Value and texts are never rasterised into the image. */
export function GiftCard({ locale, amountCents, recipient }: { locale: Locale; amountCents: number; recipient?: string }) {
  const t = getDict(locale);
  return (
    <figure className="gift" style={{ margin: 0 }} aria-label={`${t.voucher.value} ${formatPrice(amountCents, locale)}`}>
      <Img id="gift-card-blank" alt="" sizes="(max-width: 1000px) 90vw, 480px" />
      <div className="gift__overlay" aria-hidden>
        <div className="gift__logo">
          <img src="/media/logo-emblem-240.webp" alt="" width={105} height={120} style={{ objectFit: "contain" }} />
          <span>HPHUONG</span>
          <small>{t.brand.descriptor}</small>
        </div>
        <span className="gift__sep" />
        <div className="gift__value">
          <small>{t.voucher.value}</small>
          <strong>{formatPrice(amountCents, locale)}</strong>
          {recipient ? <span className="gift__for">{recipient}</span> : <em>{t.brand.tagline}</em>}
        </div>
      </div>
    </figure>
  );
}
