"use client";

import { useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { api, errorText } from "./api";
import { IconArrow, IconInfo, IconMail } from "./icons";

export function MagicLinkForm({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="stack-sm">
        <p className="notice notice--ok" role="status">{t.login.sent}</p>
        <p className="small muted row" style={{ gap: 8, margin: 0 }}><IconInfo width={18} height={18} /> {t.login.devOutbox}</p>
      </div>
    );
  }
  return (
    <form
      className="stack"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/auth/magic-link", { body: { email, locale } });
          setSent(true);
        } catch (err) {
          setError(errorText(t.errors, t.common.genericError, t.common.offline, err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="m-email">{t.login.email}</label>
        <div className="input-icon">
          <IconMail />
          <input id="m-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} />
        </div>
      </div>
      {error && <p className="notice notice--danger" role="alert">{error}</p>}
      <button className="btn btn--lg" type="submit" disabled={busy}>
        {busy && <span className="spin" />} {t.login.send} <IconArrow />
      </button>
    </form>
  );
}
