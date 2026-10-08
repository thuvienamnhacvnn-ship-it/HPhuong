/** Phone helpers. No database access — safe in client components. */

/** "030 78 71 29 51" → "+493078712951". National numbers are read as German. */
export function toE164(raw: string, countryCode = "49"): string {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("00")) return `+${d.slice(2)}`;
  return `+${countryCode}${d.replace(/^0/, "")}`;
}

export const telHref = (raw: string) => `tel:${toE164(raw)}`;

/** WhatsApp click-to-chat link for the studio's mobile number. */
export const waHref = (raw: string) => `https://wa.me/${toE164(raw).slice(1)}`;
