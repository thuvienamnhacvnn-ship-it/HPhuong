import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { pageContext } from "@/lib/page";
import { currentCustomer } from "@/lib/auth";
import { schema } from "@/lib/db";
import { formatAmount, formatPrice } from "@/lib/money";
import { formatLocalDate, formatLocalTime } from "@/lib/time";
import { unseal } from "@/lib/ids";
import { Img } from "@/components/Img";
import { Lily, Ornament } from "@/components/decor";
import { IconBell, IconCalendar, IconClock, IconGift, IconHourglass, IconCheck, IconLotus } from "@/components/icons";
import { AccountPreferences } from "@/components/AccountPreferences";
import { CATEGORY_IMAGE } from "@/components/categories";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.account.title, robots: { index: false } };
}

/** A customer sees exactly their own appointments and vouchers (matched by account e-mail). */
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t, db } = await pageContext(params);
  const customer = await currentCustomer();
  if (!customer) redirect(`/${locale}/login`);

  const appointments = await db.select().from(schema.appointments).where(eq(schema.appointments.customerId, customer.id)).orderBy(desc(schema.appointments.createdAt));
  const now = new Date();
  const upcoming = appointments
    .filter((a) => ["pending", "confirmed", "requested"].includes(a.status) && (!a.startsAt || a.startsAt > now))
    .sort((a, b) => (a.startsAt?.getTime() ?? Infinity) - (b.startsAt?.getTime() ?? Infinity));
  const next = upcoming[0];
  const past = appointments.filter((a) => a !== next);

  const orders = await db.select().from(schema.voucherOrders).where(eq(schema.voucherOrders.buyerEmail, customer.email)).orderBy(desc(schema.voucherOrders.createdAt));
  const vouchers = orders.length ? await db.select().from(schema.vouchers).where(inArray(schema.vouchers.orderId, orders.map((o) => o.id))) : [];
  const services = await db.select({ id: schema.services.id, category: schema.services.category }).from(schema.services);
  const imageFor = (serviceId: string) => CATEGORY_IMAGE[services.find((s) => s.id === serviceId)?.category ?? ""] ?? "service-facial";
  const tokenOf = (sealed: string | null) => (sealed ? unseal(sealed) : null);

  return (
    <Frame className="frame--account">
    <div className="page frame__fill" style={{ position: "relative", overflow: "hidden" }}>
      <Lily position="tr" />
      <div className="above-decor stack-sm">
        <p className="eyebrow">{t.account.eyebrow}</p>
        <h1 className="display">{t.account.title}</h1>
        <Ornament />
        <p className="lead">{t.account.lead}</p>
      </div>

      <div className="account-grid">
        <section className="card card--pad" aria-labelledby="acc-next">
          <div className="panel-title">
            <span className="icon-ring"><IconCalendar /></span>
            <h2 id="acc-next">{t.account.nextAppointment}</h2>
          </div>
          {next ? (
            <div className="stack">
              <div className="appt-card">
                <div className="appt-card__img">
                  <Img id={imageFor(next.snapshot.segments[0].serviceId)} alt="" sizes="160px" />
                </div>
                <div className="stack-sm">
                  <h3 className="h3">{next.snapshot.segments.map((s) => s.name[locale]).join(" + ")}</h3>
                  {next.startsAt && (
                    <>
                      <p className="summary-line" style={{ margin: 0 }}><IconCalendar /> {formatLocalDate(next.startsAt, next.timezone, locale, false)}</p>
                      <p className="summary-line" style={{ margin: 0 }}><IconClock /> {formatLocalTime(next.startsAt, next.timezone, locale)} {t.booking.uhr} ({next.snapshot.totalMinutes} {t.common.min})</p>
                    </>
                  )}
                  <span className={`status status--${next.status}`} style={{ justifySelf: "start" }}>
                    {next.status === "confirmed" ? <IconCheck /> : <IconHourglass />} {t.appointment.status[next.status]}
                  </span>
                  <span className="price" style={{ fontSize: "1.3rem" }}>{formatPrice(next.snapshot.totalCents, locale)}</span>
                </div>
              </div>
              <p className="muted" style={{ margin: 0 }}>{t.appointment.statusText[next.status]}</p>
              {tokenOf(next.publicTokenSealed) && (
                <Link className="btn" href={`/${locale}/termin/${tokenOf(next.publicTokenSealed)}`} style={{ justifySelf: "start" }}>
                  {t.common.details}
                </Link>
              )}
            </div>
          ) : (
            <div className="stack-sm">
              <p className="muted">{t.account.noAppointment}</p>
              <Link className="btn" href={`/${locale}/termin`} style={{ justifySelf: "start" }}>{t.nav.book}</Link>
            </div>
          )}
          {past.length > 0 && (
            <details style={{ marginTop: 16 }}>
              <summary className="link" style={{ cursor: "pointer" }}>{t.account.history} ({past.length})</summary>
              <ul className="stack-sm" style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
                {past.map((a) => (
                  <li key={a.id} className="row row--between" style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: 8 }}>
                    <span>
                      {a.snapshot.segments.map((s) => s.name[locale]).join(" + ")}
                      {a.startsAt ? ` · ${formatLocalDate(a.startsAt, a.timezone, locale, false)}` : ""}
                    </span>
                    <span className={`status status--${a.status}`}>{t.appointment.status[a.status]}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="card card--pad" aria-labelledby="acc-vouchers">
          <div className="panel-title">
            <span className="icon-ring"><IconGift /></span>
            <h2 id="acc-vouchers">{t.account.vouchers}</h2>
          </div>
          {vouchers.length === 0 ? (
            <p className="muted">{t.account.noVouchers}</p>
          ) : (
            <div className="stack">
              {vouchers.map((v) => (
                <div key={v.id} className="stack-sm" style={{ textAlign: "center" }}>
                  <p className="eyebrow">{t.account.balance}</p>
                  <p className="balance" style={{ margin: 0 }}>{formatAmount(v.balanceCents, locale, v.currency)}</p>
                  <p className="small muted" style={{ margin: 0 }}>
                    ··· {v.codeLast4} · {v.isTest ? t.order.testBadge : t.appointment.status.confirmed}
                  </p>
                </div>
              ))}
              <p className="small muted" style={{ margin: 0 }}>{t.account.voucherHint}</p>
            </div>
          )}
          {orders.filter((o) => o.status !== "paid").map((o) => (
            <p key={o.id} className="small row row--between" style={{ margin: "8px 0 0" }}>
              <span>{t.account.order} {formatAmount(o.amountCents, locale)}</span>
              {tokenOf(o.publicTokenSealed) ? <Link className="link" href={`/${locale}/bestellung/${tokenOf(o.publicTokenSealed)}`}>{o.status}</Link> : <span>{o.status}</span>}
            </p>
          ))}
        </section>

        <section className="card card--pad" aria-labelledby="acc-notify">
          <div className="panel-title">
            <span className="icon-ring"><IconBell /></span>
            <h2 id="acc-notify">{t.account.notifications}</h2>
          </div>
          <AccountPreferences locale={locale} marketingEmail={customer.marketingEmail} whatsappOptIn={customer.whatsappOptIn} hasPhone={!!customer.phone} />
        </section>
      </div>

      <div className="card card--pad row row--between above-decor" style={{ marginTop: 18 }}>
        <span className="row" style={{ gap: 16 }}>
          <span className="icon-ring"><IconLotus /></span>
          <em style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem" }}>{t.account.quote}</em>
        </span>
        <span className="side-quote">{t.brand.tagline}</span>
      </div>
    </div>
    </Frame>
  );
}
