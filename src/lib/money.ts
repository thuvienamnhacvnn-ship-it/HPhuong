export type Locale = "de" | "en";

/** "69 €" for whole euros, "69,50 €" otherwise. de-DE formatting in both UI languages keeps EUR amounts familiar. */
export function formatPrice(cents: number, locale: Locale = "de", currency = "EUR"): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Always two decimals — order summaries and ledgers. */
export function formatAmount(cents: number, locale: Locale = "de", currency = "EUR"): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-IE", { style: "currency", currency }).format(cents / 100);
}

/**
 * Price of a treatment as the studio prints it: always two decimals, and "ab" / "from" in
 * front of a starting price — "ab 25,00 €", "from €25.00".
 */
export function formatServicePrice(cents: number, locale: Locale = "de", from = false, currency = "EUR"): string {
  const amount = formatAmount(cents, locale, currency);
  return from ? `${locale === "de" ? "ab" : "from"} ${amount}` : amount;
}

/** Total of a booked appointment; "ab" when a single treatment was booked at a starting price. */
export function formatSnapshotPrice(
  snapshot: { totalCents: number; currency: string; offerId?: string; segments: { priceFrom?: boolean }[] },
  locale: Locale = "de",
): string {
  return formatServicePrice(snapshot.totalCents, locale, !snapshot.offerId && snapshot.segments.some((s) => s.priceFrom), snapshot.currency);
}
