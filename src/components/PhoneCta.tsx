import { getDict, type Locale } from "@/i18n";
import { telHref, waHref } from "@/lib/contact";
import { IconPhone, IconWhatsapp } from "./icons";

type Props = {
  locale: Locale;
  phone: string | null;
  mobilePhone: string | null;
  /** One line with two text links instead of the boxed version with buttons. */
  inline?: boolean;
  className?: string;
};

/**
 * "Termin telefonisch oder per WhatsApp" — shown instead of a booking button for
 * treatments the studio lists without a duration (they cannot be scheduled online).
 */
export function PhoneCta({ locale, phone, mobilePhone, inline, className }: Props) {
  const t = getDict(locale);
  if (!phone && !mobilePhone) return null;
  const links = (
    <>
      {phone && (
        <a className={inline ? "link" : "btn btn--sm btn--outline"} href={telHref(phone)}>
          <IconPhone /> {inline ? phone : `${t.common.call} ${phone}`}
        </a>
      )}
      {mobilePhone && (
        <a className={inline ? "link" : "btn btn--sm btn--outline"} href={waHref(mobilePhone)} target="_blank" rel="noopener noreferrer">
          <IconWhatsapp /> {t.common.whatsapp} {mobilePhone}
        </a>
      )}
    </>
  );
  return (
    <div className={`phone-cta${inline ? " phone-cta--inline" : ""}${className ? ` ${className}` : ""}`}>
      <span className="phone-cta__label">{t.common.byPhone}</span>
      <span className="phone-cta__links">{links}</span>
    </div>
  );
}
