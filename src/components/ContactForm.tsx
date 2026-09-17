"use client";

import { useEffect, useRef, useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { api, errorText } from "./api";
import { IconArrow, IconCheck } from "./icons";

export function ContactForm({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [f, setF] = useState({ name: "", email: "", message: "", website: "" });
  const startedAt = useRef(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  if (sent) {
    return (
      <p className="notice notice--ok" role="status">
        <IconCheck /> {t.contact.sent}
      </p>
    );
  }

  return (
    <form
      className="stack"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim()) return setError(t.errors.invalid_name);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError(t.errors.invalid_email);
        setBusy(true);
        setError(null);
        try {
          await api("/api/contact", { body: { ...f, locale, startedAt: startedAt.current } });
          setSent(true);
        } catch (err) {
          setError(errorText(t.errors, t.common.genericError, t.common.offline, err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="k-name">{t.contact.name} *</label>
        <input id="k-name" className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} required />
      </div>
      <div className="field">
        <label htmlFor="k-email">{t.contact.email} *</label>
        <input id="k-email" className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={200} required />
      </div>
      <div className="field">
        <label htmlFor="k-message">{t.contact.message} *</label>
        <textarea id="k-message" className="textarea" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value.slice(0, 500) })} maxLength={500} required aria-describedby="k-count k-hint" />
        <span id="k-count" className="counter">{f.message.length} / 500</span>
        <span id="k-hint" className="hint">{t.contact.privacyHint}</span>
      </div>
      {/* honeypot: hidden from people and assistive tech */}
      <div aria-hidden style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="k-website">Website</label>
        <input id="k-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      </div>
      {error && <p className="notice notice--danger" role="alert">{error}</p>}
      <button className="btn btn--lg btn--block" type="submit" disabled={busy}>
        {busy && <span className="spin" />} {t.contact.send} <IconArrow />
      </button>
    </form>
  );
}
