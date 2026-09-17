import type { schema } from "../db";
import { formatAmount, formatPrice } from "../money";
import { formatLocalDate, formatLocalTime } from "../time";

type Appointment = typeof schema.appointments.$inferSelect;
type Customer = typeof schema.customers.$inferSelect;
type Settings = typeof schema.businessSettings.$inferSelect;
type L = "de" | "en";

export type Rendered = { subject: string; text: string; whatsappTemplate?: string; whatsappParams?: string[] };

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3035").replace(/\/$/, "");

function describe(a: Appointment, locale: L) {
  const names = a.snapshot.segments.map((s) => `${s.name[locale]} (${s.minutes} Min.)`).join(" + ");
  const when = a.startsAt
    ? `${formatLocalDate(a.startsAt, a.timezone, locale)}, ${formatLocalTime(a.startsAt, a.timezone, locale)}${locale === "de" ? " Uhr" : ""}`
    : locale === "de" ? "Termin wird noch vereinbart" : "Time to be arranged";
  return { names, when, price: formatPrice(a.snapshot.totalCents, locale, a.snapshot.currency) };
}

function footer(settings: Settings, locale: L) {
  const contact = [settings.address, settings.phone, settings.email].filter(Boolean).join(" · ");
  return `\n\n—\n${settings.brand}${contact ? `\n${contact}` : ""}\n${locale === "de" ? "Diese Nachricht wurde automatisch versendet." : "This message was sent automatically."}`;
}

export function renderAppointment(template: string, a: Appointment, c: Customer, settings: Settings, links: { manage?: string } = {}): Rendered {
  const locale = (c.locale === "en" ? "en" : "de") as L;
  const d = describe(a, locale);
  const manage = links.manage ? `\n\n${locale === "de" ? "Termin ansehen oder absagen" : "View or cancel"}: ${links.manage}` : "";
  const pay = locale === "de" ? "Bezahlung vor Ort im Studio." : "Payment at the studio.";
  const greet = locale === "de" ? `Hallo ${c.name},` : `Hello ${c.name},`;
  const body = (de: string, en: string) => (locale === "de" ? de : en);

  switch (template) {
    case "appointment_request_received":
      return {
        subject: body("Deine Terminanfrage ist eingegangen", "We received your appointment request"),
        text: `${greet}\n\n${body(
          "danke für deine Anfrage. Sie ist noch NICHT bestätigt — wir prüfen sie und melden uns.",
          "thank you for your request. It is NOT confirmed yet — we will review it and get back to you.",
        )}\n\n${d.names}\n${d.when}\n${d.price} · ${pay}${manage}${footer(settings, locale)}`,
      };
    case "appointment_confirmed":
      return {
        subject: body("Dein Termin ist bestätigt", "Your appointment is confirmed"),
        text: `${greet}\n\n${body("dein Termin ist bestätigt.", "your appointment is confirmed.")}\n\n${d.names}\n${d.when}\n${d.price} · ${pay}${manage}${footer(settings, locale)}`,
        whatsappTemplate: process.env.WHATSAPP_TEMPLATE_CONFIRMED,
        whatsappParams: [c.name, d.names, d.when],
      };
    case "appointment_rejected":
      return {
        subject: body("Deine Terminanfrage konnten wir leider nicht bestätigen", "We could not confirm your request"),
        text: `${greet}\n\n${body(
          "leider können wir diesen Termin nicht anbieten. Wähle gern eine andere Zeit auf unserer Website.",
          "unfortunately we cannot offer this time. Feel free to choose another time on our website.",
        )}\n\n${d.names}\n${d.when}\n\n${appUrl()}/${locale}/termin${footer(settings, locale)}`,
      };
    case "appointment_cancelled":
      return {
        subject: body("Dein Termin wurde storniert", "Your appointment was cancelled"),
        text: `${greet}\n\n${body("dieser Termin ist storniert:", "this appointment has been cancelled:")}\n\n${d.names}\n${d.when}${footer(settings, locale)}`,
        whatsappTemplate: process.env.WHATSAPP_TEMPLATE_CANCELLED,
        whatsappParams: [c.name, d.names, d.when],
      };
    case "appointment_expired":
      return {
        subject: body("Deine Terminanfrage ist abgelaufen", "Your appointment request expired"),
        text: `${greet}\n\n${body(
          "wir konnten deine Anfrage nicht rechtzeitig bestätigen. Der Zeitraum ist wieder frei — bitte wähle einen neuen Termin.",
          "we could not confirm your request in time. The slot has been released — please choose a new time.",
        )}\n\n${d.names}\n${d.when}\n\n${appUrl()}/${locale}/termin${footer(settings, locale)}`,
      };
    case "appointment_rescheduled":
      return {
        subject: body("Dein Termin wurde verschoben", "Your appointment was moved"),
        text: `${greet}\n\n${body("dein Termin hat eine neue Zeit:", "your appointment has a new time:")}\n\n${d.names}\n${d.when}\n${
          a.status === "pending" ? body("Status: angefragt — wir bestätigen die neue Zeit noch.", "Status: requested — we still need to confirm the new time.") : ""
        }${manage}${footer(settings, locale)}`,
        whatsappTemplate: process.env.WHATSAPP_TEMPLATE_RESCHEDULED,
        whatsappParams: [c.name, d.names, d.when],
      };
    case "appointment_reminder":
      return {
        subject: body("Erinnerung an deinen Termin", "Reminder for your appointment"),
        text: `${greet}\n\n${body("wir freuen uns auf dich:", "we look forward to seeing you:")}\n\n${d.names}\n${d.when}${manage}${footer(settings, locale)}`,
        whatsappTemplate: process.env.WHATSAPP_TEMPLATE_REMINDER,
        whatsappParams: [c.name, d.names, d.when],
      };
    case "staff_new_request":
      return {
        subject: `Neue Terminanfrage: ${d.names}`,
        text: `Neue Anfrage (${a.kind === "combo_request" ? "Paket — bitte einplanen" : "Slot"}).\n\n${d.names}\n${d.when}\n\nPrüfen: ${appUrl()}/admin/anfragen`,
      };
    case "staff_pending_expiring":
      return {
        subject: `Anfrage läuft bald ab: ${d.names}`,
        text: `Diese Anfrage wurde noch nicht entschieden und gibt ihren Zeitraum bald frei.\n\n${d.names}\n${d.when}\n\n${appUrl()}/admin/anfragen`,
      };
    default:
      throw new Error(`unknown template ${template}`);
  }
}

export function renderVoucherIssued(
  order: typeof schema.voucherOrders.$inferSelect,
  code: string,
  settings: Settings,
): Rendered {
  const locale = (order.locale === "en" ? "en" : "de") as L;
  const amount = formatAmount(order.amountCents, locale, order.currency);
  const test = order.isTest
    ? locale === "de"
      ? "\n\nTESTUMGEBUNG: Dieser Gutschein stammt aus einer Testzahlung und ist nicht einlösbar."
      : "\n\nTEST MODE: This voucher comes from a test payment and cannot be redeemed."
    : "";
  const recipient = order.recipientName ? (locale === "de" ? `\nFür: ${order.recipientName}` : `\nFor: ${order.recipientName}`) : "";
  const message = order.message ? `\n\n„${order.message}“` : "";
  return {
    subject: locale === "de" ? `Dein Gutschein über ${amount}` : `Your voucher for ${amount}`,
    text:
      (locale === "de"
        ? `Hallo ${order.buyerName},\n\ndanke für deinen Kauf. Hier ist dein Wertgutschein — du kannst ihn selbst weitergeben.\n\nWert: ${amount}${recipient}\nCode: ${code}${message}\n\nEinlösung vor Ort im Studio. Bitte bewahre den Code sicher auf.`
        : `Hello ${order.buyerName},\n\nthank you for your purchase. Here is your gift voucher — you can pass it on yourself.\n\nValue: ${amount}${recipient}\nCode: ${code}${message}\n\nRedeemable at the studio. Please keep the code safe.`) +
      test +
      footer(settings, locale),
  };
}

export function renderMagicLink(email: string, link: string, locale: L, settings: Settings): Rendered {
  return {
    subject: locale === "de" ? "Dein Anmeldelink" : "Your sign-in link",
    text:
      (locale === "de"
        ? `Hallo,\n\nmit diesem Link meldest du dich an (gültig 20 Minuten, nur einmal nutzbar):\n\n${link}\n\nDu hast das nicht angefordert? Dann ignoriere diese E-Mail.`
        : `Hello,\n\nuse this link to sign in (valid for 20 minutes, single use):\n\n${link}\n\nDidn't request this? Just ignore this e-mail.`) + footer(settings, locale),
  };
}

export function renderContactCopy(name: string, locale: L, settings: Settings): Rendered {
  return {
    subject: locale === "de" ? "Deine Nachricht ist bei uns angekommen" : "We received your message",
    text:
      (locale === "de"
        ? `Hallo ${name},\n\ndanke für deine Nachricht. Wir melden uns so bald wie möglich.`
        : `Hello ${name},\n\nthank you for your message. We will get back to you as soon as possible.`) + footer(settings, locale),
  };
}
