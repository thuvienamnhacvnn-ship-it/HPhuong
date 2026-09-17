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
