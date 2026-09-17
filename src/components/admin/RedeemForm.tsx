"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../api";
import { adminError } from "./ActionButton";

type Voucher = { id: string; last4: string; balanceCents: number; initialCents: number; status: string; isTest: boolean };
const eur = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

export function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="stack-sm">
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          setVoucher(null);
          try {
            setVoucher(await api<Voucher>("/api/admin/vouchers/lookup", { body: { code } }));
          } catch (err) {
            setMsg({ ok: false, text: adminError(err) });
          }
        }}
      >
        <div className="field">
          <label htmlFor="r-code">Gutscheincode</label>
          <input id="r-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="HP-XXXX-XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} style={{ minWidth: 260 }} />
        </div>
        <button className="btn btn--sm btn--outline" type="submit">Prüfen</button>
      </form>
      {voucher && (
        <form
          className="request"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(null);
            try {
              const cents = Math.round(Number(amount.replace(",", ".")) * 100);
              const r = await api<{ balanceCents: number }>("/api/admin/vouchers/redeem", { body: { code, amountCents: cents, note: note || null } });
              setMsg({ ok: true, text: `Eingelöst. Restguthaben: ${eur(r.balanceCents)}` });
              setVoucher({ ...voucher, balanceCents: r.balanceCents });
              setAmount("");
              router.refresh();
            } catch (err) {
              setMsg({ ok: false, text: adminError(err) });
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row row--between">
            <strong>Gutschein ··· {voucher.last4}</strong>
            <span className={`status status--${voucher.status === "active" ? "confirmed" : voucher.status}`}>{voucher.status}</span>
          </div>
          <div>Guthaben: <strong>{eur(voucher.balanceCents)}</strong> von {eur(voucher.initialCents)} {voucher.isTest && <span className="badge">Testgutschein</span>}</div>
          <div className="inline-form">
            <div className="field"><label htmlFor="r-amt">Betrag (€)</label><input id="r-amt" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
            <div className="field"><label htmlFor="r-note">Notiz</label><input id="r-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="z. B. Gesichtspflege 60" /></div>
            <button className="btn btn--sm" type="submit" disabled={busy || voucher.status !== "active"}>{busy && <span className="spin" />} Abbuchen</button>
          </div>
        </form>
      )}
      {msg && <p className={`notice ${msg.ok ? "notice--ok" : "notice--danger"}`} role="status">{msg.text}</p>}
    </div>
  );
}
