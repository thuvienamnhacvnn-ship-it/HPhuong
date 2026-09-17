"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { api, errorText } from "./api";
import { IconArrow } from "./icons";

export function ComboRequestForm({ locale, offerId }: { locale: Locale; offerId: string }) {
  const t = getDict(locale);
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", preferredDates: "", preferredTime: "any", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="stack"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await api<{ publicToken: string }>("/api/combo-requests", {
            body: { offerId, ...f, phone: f.phone || null, note: f.note || null, locale },
          });
          router.replace(`/${locale}/termin/${r.publicToken}?neu=1`);
        } catch (err) {
          setError(errorText(t.errors, t.common.genericError, t.common.offline, err));
          setBusy(false);
        }
      }}
    >
      <div className="grid-2">
        <div className="field">
          <label htmlFor="c-dates">{t.offers.preferredDates} *</label>
          <input id="c-dates" className="input" value={f.preferredDates} onChange={set("preferredDates")} placeholder={t.offers.preferredDatesPlaceholder} maxLength={300} required />
        </div>
        <div className="field">
          <label htmlFor="c-time">{t.offers.preferredTime}</label>
          <select id="c-time" className="select" value={f.preferredTime} onChange={set("preferredTime")}>
            {Object.entries(t.offers.times).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="c-name">{t.booking.name} *</label>
          <input id="c-name" className="input" autoComplete="name" value={f.name} onChange={set("name")} maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor="c-email">{t.booking.email} *</label>
          <input id="c-email" className="input" type="email" autoComplete="email" value={f.email} onChange={set("email")} maxLength={200} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-phone">{t.booking.phone} ({t.common.optional})</label>
        <input id="c-phone" className="input" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} maxLength={30} />
      </div>
      <div className="field">
        <label htmlFor="c-note">{t.booking.note} ({t.common.optional})</label>
        <textarea id="c-note" className="textarea" value={f.note} onChange={set("note")} maxLength={500} placeholder={t.booking.notePlaceholder} />
      </div>
      {error && <p className="notice notice--danger" role="alert">{error}</p>}
      <button className="btn btn--lg" type="submit" disabled={busy} style={{ justifySelf: "start" }}>
        {busy && <span className="spin" />} {t.offers.sendRequest} <IconArrow />
      </button>
      <p className="small muted" style={{ margin: 0 }}>{t.booking.confirmHint}</p>
    </form>
  );
}
