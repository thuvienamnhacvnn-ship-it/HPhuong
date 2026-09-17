"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { formatAmount, formatPrice } from "@/lib/money";
import { api, errorText } from "./api";
import { GiftCard } from "./GiftCard";
import { Ornament } from "./decor";
import { IconArrow, IconCard, IconLock, IconMail, IconPaypal } from "./icons";

type Props = { locale: Locale; amounts: number[]; initialAmount: number; maxMessage: number; sandbox: boolean };

const newKey = () => `vo_${crypto.randomUUID().replace(/-/g, "")}`;

export function VoucherCheckout({ locale, amounts, initialAmount, maxMessage, sandbox }: Props) {
  const t = getDict(locale);
  const router = useRouter();
  const pathname = usePathname();
  const [amount, setAmount] = useState(initialAmount);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  // One key per filled form: double clicks and retries reuse it, a changed form gets a new one.
  const keyRef = useRef<{ key: string; fingerprint: string } | null>(null);

  function chooseAmount(a: number) {
    setAmount(a);
    window.history.replaceState(null, "", `${pathname}?amount=${a}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const bad: Record<string, boolean> = {};
    if (!buyerName.trim()) bad.name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) bad.email = true;
    setInvalid(bad);
    if (Object.keys(bad).length) {
      setError(bad.name ? t.errors.invalid_name : t.errors.invalid_email);
      return;
    }
    if (busy) return;
    setBusy(true);
    setError(null);
    const fingerprint = JSON.stringify([amount, buyerName, buyerEmail, recipient, message, method]);
    if (!keyRef.current || keyRef.current.fingerprint !== fingerprint) keyRef.current = { key: newKey(), fingerprint };
    try {
      const r = await api<{ redirectUrl: string }>("/api/voucher-orders", {
        body: { amountCents: amount, buyerName, buyerEmail, recipientName: recipient || null, message: message || null, paymentMethod: method, idempotencyKey: keyRef.current.key, locale },
      });
      router.push(r.redirectUrl);
    } catch (err) {
      setError(errorText(t.errors, t.common.genericError, t.common.offline, err));
      setBusy(false);
    }
  }

  return (
    <form className="checkout" onSubmit={submit} noValidate>
      <div className="stack">
        <div className="stack-sm">
          <p className="eyebrow">{t.voucher.eyebrow}</p>
          <h1 className="display">
            {t.voucher.title1}
            <br />
            {t.voucher.title2}
          </h1>
          <p className="lead">{t.voucher.lead}</p>
        </div>
        <section className="card checkout__form">
          <div className="form-step">
            <span className="form-step__num">1</span>
            <div className="stack-sm">
              <h2>{t.voucher.buyer} <small>{t.voucher.buyerHint}</small></h2>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="v-name">{t.contact.name} *</label>
                  <input id="v-name" className="input" autoComplete="name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} aria-invalid={invalid.name || undefined} maxLength={120} required />
                </div>
                <div className="field">
                  <label htmlFor="v-email">{t.contact.email} *</label>
                  <input id="v-email" className="input" type="email" autoComplete="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} aria-invalid={invalid.email || undefined} maxLength={200} required />
                </div>
              </div>
            </div>
          </div>
          <div className="form-step">
            <span className="form-step__num">2</span>
            <div className="stack-sm">
              <h2>{t.voucher.recipient} <small>({t.common.optional})</small></h2>
              <div className="field">
                <label htmlFor="v-recipient">{t.voucher.recipientLabel}</label>
                <input id="v-recipient" className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={t.voucher.recipientPlaceholder} maxLength={120} />
              </div>
            </div>
          </div>
          <div className="form-step">
            <span className="form-step__num">3</span>
            <div className="stack-sm">
              <h2>{t.voucher.delivery}</h2>
              <label className="pay-option" style={{ gridTemplateColumns: "26px 36px minmax(0,1fr)" }}>
                <input type="radio" name="delivery" checked readOnly />
                <IconMail />
                <span>
                  <strong>{t.voucher.deliveryToMe}</strong>
                  <span className="small muted" style={{ display: "block" }}>{t.voucher.deliveryToMeHint}</span>
                </span>
              </label>
            </div>
          </div>
          <div className="form-step">
            <span className="form-step__num">4</span>
            <div className="stack-sm">
              <h2>{t.voucher.message} <small>({t.common.optional})</small></h2>
              <div className="field">
                <label htmlFor="v-message" className="sr-only">{t.voucher.message}</label>
                <textarea id="v-message" className="textarea" value={message} onChange={(e) => setMessage(e.target.value.slice(0, maxMessage))} placeholder={t.voucher.messagePlaceholder} maxLength={maxMessage} aria-describedby="v-count" />
                <span id="v-count" className="counter" aria-live="polite">{message.length} / {maxMessage}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside className="card checkout__aside">
        <div className="row" style={{ gap: 16 }}>
          <h2 className="h3">{t.voucher.yourVoucher}</h2>
        </div>
        <Ornament />
        <GiftCard locale={locale} amountCents={amount} recipient={recipient || undefined} />
        <div className="amounts" role="group" aria-label={t.voucher.chooseAmount}>
          {amounts.map((a) => (
            <button key={a} type="button" className="amount" aria-pressed={a === amount} onClick={() => chooseAmount(a)}>
              {formatPrice(a, locale)}
            </button>
          ))}
        </div>
        <div className="summary">
          <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem" }}>{t.voucher.summary}</strong>
          <div className="summary__row">
            <span>{t.voucher.value}</span>
            <span>{formatAmount(amount, locale)}</span>
          </div>
          <div className="summary__row summary__row--total">
            <span>{t.common.total}</span>
            <span>{formatAmount(amount, locale)}</span>
          </div>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-sm">
          <legend className="h3" style={{ fontSize: "1.3rem", marginBottom: 6 }}>
            {t.voucher.payment} {sandbox && <small className="muted" style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 400 }}>{t.voucher.testEnv}</small>}
          </legend>
          <label className="pay-option">
            <input type="radio" name="method" value="card" checked={method === "card"} onChange={() => setMethod("card")} />
            <IconCard />
            <span>
              <strong>{t.voucher.card}</strong> {sandbox && <span className="muted">{t.voucher.testPayment}</span>}
              <span className="small muted" style={{ display: "block" }}>{t.voucher.cardHint}</span>
            </span>
          </label>
          <label className="pay-option">
            <input type="radio" name="method" value="paypal" checked={method === "paypal"} onChange={() => setMethod("paypal")} />
            <IconPaypal />
            <span>
              <strong>{t.voucher.paypal}</strong> {sandbox && <span className="muted">{t.voucher.testPayment}</span>}
              <span className="small muted" style={{ display: "block" }}>{t.voucher.paypalHint}</span>
            </span>
          </label>
        </fieldset>
        {error && <p className="notice notice--danger" role="alert">{error}</p>}
        <button type="submit" className="btn btn--lg btn--block" disabled={busy}>
          {busy ? <><span className="spin" /> {t.voucher.processing}</> : <>{sandbox ? t.voucher.start : t.voucher.startLive} <IconArrow /></>}
        </button>
        {sandbox && (
          <p className="small muted row" style={{ gap: 8, margin: 0 }}>
            <IconLock width={18} height={18} /> {t.voucher.testNote}
          </p>
        )}
        <p className="small muted" style={{ margin: 0 }}>{t.voucher.noCardStored}</p>
      </aside>
    </form>
  );
}
