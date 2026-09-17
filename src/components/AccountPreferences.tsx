"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { api, errorText } from "./api";
import { IconInfo, IconMail, IconWhatsapp } from "./icons";

export function AccountPreferences({ locale, marketingEmail, whatsappOptIn, hasPhone }: { locale: Locale; marketingEmail: boolean; whatsappOptIn: boolean; hasPhone: boolean }) {
  const t = getDict(locale);
  const router = useRouter();
  const [marketing, setMarketing] = useState(marketingEmail);
  const [whatsapp, setWhatsapp] = useState(whatsappOptIn);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(patch: { marketingEmail?: boolean; whatsappOptIn?: boolean }) {
    setBusy(true);
    setStatus(null);
    try {
      await api("/api/account/preferences", { method: "PATCH", body: patch });
      setStatus(t.account.saved);
      router.refresh();
    } catch (e) {
      // Only reflect what the server stored.
      setMarketing(marketingEmail);
      setWhatsapp(whatsappOptIn);
      setStatus(errorText(t.errors, t.common.genericError, t.common.offline, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-sm">
      <p style={{ margin: 0 }}>{t.account.notificationsLead}</p>
      <label className="check">
        <input
          type="checkbox"
          checked={marketing}
          disabled={busy}
          onChange={(e) => {
            setMarketing(e.target.checked);
            void save({ marketingEmail: e.target.checked });
          }}
        />
        <span>
          <strong className="row" style={{ gap: 8 }}><IconMail width={20} height={20} /> {t.account.marketing}</strong>
          <span className="small muted">{t.account.marketingHint}</span>
        </span>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={whatsapp}
          disabled={busy || (!hasPhone && !whatsapp)}
          onChange={(e) => {
            setWhatsapp(e.target.checked);
            void save({ whatsappOptIn: e.target.checked });
          }}
        />
        <span>
          <strong className="row" style={{ gap: 8 }}><IconWhatsapp width={20} height={20} /> {t.account.whatsapp}</strong>
          <span className="small muted">{hasPhone ? t.account.whatsappHint : t.account.phoneMissing}</span>
        </span>
      </label>
      <p className="notice small" style={{ margin: 0 }}>
        <IconInfo /> {t.account.transactional}
      </p>
      {status && <p className="small" role="status" style={{ margin: 0 }}>{status}</p>}
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        style={{ justifySelf: "start" }}
        onClick={async () => {
          await api("/api/auth/logout", { body: {} }).catch(() => undefined);
          router.replace(`/${locale}/start`);
          router.refresh();
        }}
      >
        {t.account.logout}
      </button>
    </div>
  );
}
