import Link from "next/link";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { getSettings } from "@/lib/catalog";
import { findPaymentBySession } from "@/lib/payments";
import { formatAmount } from "@/lib/money";
import { unseal } from "@/lib/ids";
import { SandboxButtons } from "@/components/SandboxButtons";
import { Frame } from "@/components/Frame";

export const metadata: Metadata = { title: "Testkasse", robots: { index: false } };

/** Stand-in for a provider's hosted checkout while paymentMode = sandbox. */
export default async function SandboxCheckout({ params }: { params: Promise<{ locale: string; sessionId: string }> }) {
  const { locale, t, db } = await pageContext(params);
  const { sessionId } = await params;
  const settings = await getSettings(db);
  const found = settings.paymentMode === "sandbox" ? await findPaymentBySession(db, sessionId) : null;
  if (!found) {
    return (
      <Frame className="frame--center">
      <div className="page narrow frame__fill">
        <div className="card card--pad empty">
          <p className="lead">{t.order.notFound}</p>
          <Link className="btn" href={`/${locale}/gutschein`}>{t.offers.voucherCta}</Link>
        </div>
      </div>
      </Frame>
    );
  }
  const { payment, order } = found;
  const orderToken = order.publicTokenSealed ? unseal(order.publicTokenSealed) : null;
  return (
    <Frame className="frame--center">
    <div className="page narrow stack frame__fill">
      <p className="sandbox-banner" role="note">{t.sandbox.banner}</p>
      <section className="card card--pad stack">
        <h1 className="h2">{t.sandbox.title}</h1>
        <p className="muted" style={{ margin: 0 }}>{t.sandbox.lead}</p>
        <div className="summary">
          <div className="summary__row">
            <span>{t.sandbox.amount}</span>
            <strong>{formatAmount(payment.amountCents, locale, payment.currency)}</strong>
          </div>
          <div className="summary__row">
            <span>{t.sandbox.method}</span>
            <span>{order.paymentMethod === "card" ? t.voucher.card : t.voucher.paypal}</span>
          </div>
        </div>
        {payment.status === "pending" ? (
          <SandboxButtons locale={locale} sessionId={sessionId} />
        ) : (
          <>
            <p className="notice">{t.sandbox.already}</p>
            {orderToken && <Link className="btn" href={`/${locale}/bestellung/${orderToken}`}>{t.order.title}</Link>}
          </>
        )}
      </section>
    </div>
    </Frame>
  );
}
