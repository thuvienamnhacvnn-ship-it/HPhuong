"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../api";
import { adminError } from "./ActionButton";

type Values = {
  address: string;
  phone: string;
  email: string;
  mapUrl: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  staffNotifyEmail: string;
  bookingMode: string;
  holdTtlMinutes: number;
  pendingTtlHours: number;
  minLeadMinutes: number;
  bookingHorizonDays: number;
  reminderHoursBefore: number;
  slotStepMinutes: number;
  whatsappEnabled: boolean;
};

export function SettingsForm({ initial, canEdit }: { initial: Values; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const text = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const num = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });
  const orNull = (s: string) => (s.trim() ? s.trim() : null);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const socialLinks = Object.fromEntries(
            (["instagram", "facebook", "youtube", "tiktok"] as const).filter((k) => v[k].trim()).map((k) => [k, v[k].trim()]),
          );
          await api("/api/admin/settings", {
            method: "PATCH",
            body: {
              address: orNull(v.address),
              phone: orNull(v.phone),
              email: orNull(v.email),
              mapUrl: orNull(v.mapUrl),
              staffNotifyEmail: orNull(v.staffNotifyEmail),
              socialLinks,
              bookingMode: v.bookingMode,
              holdTtlMinutes: v.holdTtlMinutes,
              pendingTtlHours: v.pendingTtlHours,
              minLeadMinutes: v.minLeadMinutes,
              bookingHorizonDays: v.bookingHorizonDays,
              reminderHoursBefore: v.reminderHoursBefore,
              slotStepMinutes: v.slotStepMinutes,
              whatsappEnabled: v.whatsappEnabled,
            },
          });
          setMsg({ ok: true, text: "Gespeichert." });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: adminError(err) });
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={!canEdit} className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label">Kontakt (leer = auf der Website ausgeblendet)</legend>
        <div className="grid-2">
          <div className="field"><label htmlFor="s-addr">Adresse</label><input id="s-addr" className="input" value={v.address} onChange={text("address")} /></div>
          <div className="field"><label htmlFor="s-phone">Telefon</label><input id="s-phone" className="input" value={v.phone} onChange={text("phone")} /></div>
          <div className="field"><label htmlFor="s-mail">E-Mail</label><input id="s-mail" className="input" type="email" value={v.email} onChange={text("email")} /></div>
          <div className="field"><label htmlFor="s-map">Karten-Link</label><input id="s-map" className="input" type="url" value={v.mapUrl} onChange={text("mapUrl")} /></div>
          <div className="field"><label htmlFor="s-ig">Instagram-URL</label><input id="s-ig" className="input" type="url" value={v.instagram} onChange={text("instagram")} /></div>
          <div className="field"><label htmlFor="s-fb">Facebook-URL</label><input id="s-fb" className="input" type="url" value={v.facebook} onChange={text("facebook")} /></div>
          <div className="field"><label htmlFor="s-yt">YouTube-URL</label><input id="s-yt" className="input" type="url" value={v.youtube} onChange={text("youtube")} /></div>
          <div className="field"><label htmlFor="s-tt">TikTok-URL</label><input id="s-tt" className="input" type="url" value={v.tiktok} onChange={text("tiktok")} /></div>
          <div className="field"><label htmlFor="s-staff">Team-Benachrichtigungen an</label><input id="s-staff" className="input" type="email" value={v.staffNotifyEmail} onChange={text("staffNotifyEmail")} /></div>
        </div>
        <legend className="label">Buchung</legend>
        <div className="inline-form">
          <div className="field">
            <label htmlFor="s-mode">Modus</label>
            <select id="s-mode" className="select" value={v.bookingMode} onChange={(e) => setV({ ...v, bookingMode: e.target.value })}>
              <option value="manual_confirmation">Anfrage → Bestätigung durch Studio</option>
              <option value="instant">Sofort bestätigt</option>
            </select>
          </div>
          <div className="field"><label htmlFor="s-hold">Reservierung (Min.)</label><input id="s-hold" className="input" type="number" min={3} max={30} value={v.holdTtlMinutes} onChange={num("holdTtlMinutes")} /></div>
          <div className="field"><label htmlFor="s-pend">Anfrage hält (Std.)</label><input id="s-pend" className="input" type="number" min={1} max={168} value={v.pendingTtlHours} onChange={num("pendingTtlHours")} /></div>
          <div className="field"><label htmlFor="s-lead">Vorlauf (Min.)</label><input id="s-lead" className="input" type="number" min={0} value={v.minLeadMinutes} onChange={num("minLeadMinutes")} /></div>
          <div className="field"><label htmlFor="s-hor">Buchbar (Tage)</label><input id="s-hor" className="input" type="number" min={1} max={365} value={v.bookingHorizonDays} onChange={num("bookingHorizonDays")} /></div>
          <div className="field"><label htmlFor="s-rem">Erinnerung (Std. vorher)</label><input id="s-rem" className="input" type="number" min={1} max={168} value={v.reminderHoursBefore} onChange={num("reminderHoursBefore")} /></div>
          <div className="field"><label htmlFor="s-step">Zeitraster (Min.)</label><input id="s-step" className="input" type="number" min={5} max={120} value={v.slotStepMinutes} onChange={num("slotStepMinutes")} /></div>
        </div>
        <label className="check">
          <input type="checkbox" checked={v.whatsappEnabled} onChange={(e) => setV({ ...v, whatsappEnabled: e.target.checked })} />
          <span>WhatsApp-Erinnerungen anbieten (nur mit offizieller WhatsApp Cloud API und Zugangsdaten auf dem Server)</span>
        </label>
      </fieldset>
      {msg && <p className={`notice ${msg.ok ? "notice--ok" : "notice--danger"}`} role="status">{msg.text}</p>}
      {canEdit && (
        <button className="btn btn--sm" type="submit" disabled={busy} style={{ justifySelf: "start" }}>
          {busy && <span className="spin" />} Speichern
        </button>
      )}
    </form>
  );
}
