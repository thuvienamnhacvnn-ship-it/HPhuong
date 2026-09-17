import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { pageStaff } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { assistantEnabled } from "@/lib/assistant";
import { emailProvider, whatsappConfigured } from "@/lib/notifications/adapters";
import { formatLocalDate, formatLocalTime } from "@/lib/time";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Einstellungen" };

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default async function SettingsAdmin() {
  const user = await pageStaff("manager");
  const db = await getDb();
  const settings = await getSettings(db);
  const resources = await db.select().from(schema.resources).orderBy(asc(schema.resources.kind));
  const rules = await db.select().from(schema.availabilityRules);
  const auditRows = user.role === "owner" ? await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(40) : [];
  const tz = settings.timezone;

  const integrations = [
    ["KI-Assistent", assistantEnabled() ? "Claude API aktiv" : "Aus — Auswahlhilfe ohne KI (ANTHROPIC_API_KEY fehlt)"],
    ["E-Mail", emailProvider() === "resend" ? "Resend aktiv" : "Demo-Postausgang (RESEND_API_KEY + MAIL_FROM fehlen)"],
    ["WhatsApp", whatsappConfigured(settings) ? "Cloud API aktiv" : settings.whatsappEnabled ? "In Einstellungen an, aber Zugangsdaten fehlen" : "Aus"],
    ["Zahlung", settings.paymentMode === "sandbox" ? "Sandbox — keine echten Zahlungen" : settings.paymentMode],
    ["Datenbank", process.env.DATABASE_URL ? "PostgreSQL" : "PGlite (lokal/Demo)"],
  ];

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="display display--md">Einstellungen</h1>
          {user.role !== "owner" && <p className="muted" style={{ margin: 0 }}>Nur die Inhaberin kann Einstellungen ändern.</p>}
        </div>
      </div>

      <section className="card card--pad stack-sm">
        <h2 className="h3">Integrationen</h2>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {integrations.map(([k, v]) => (
                <tr key={k}><th style={{ width: 180 }}>{k}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card--pad stack">
        <h2 className="h3">Studio &amp; Buchungsregeln</h2>
        <SettingsForm
          canEdit={user.role === "owner"}
          initial={{
            address: settings.address ?? "",
            phone: settings.phone ?? "",
            email: settings.email ?? "",
            mapUrl: settings.mapUrl ?? "",
            instagram: settings.socialLinks.instagram ?? "",
            facebook: settings.socialLinks.facebook ?? "",
            youtube: settings.socialLinks.youtube ?? "",
            tiktok: settings.socialLinks.tiktok ?? "",
            staffNotifyEmail: settings.staffNotifyEmail ?? "",
            bookingMode: settings.bookingMode,
            holdTtlMinutes: settings.holdTtlMinutes,
            pendingTtlHours: settings.pendingTtlHours,
            minLeadMinutes: settings.minLeadMinutes,
            bookingHorizonDays: settings.bookingHorizonDays,
            reminderHoursBefore: settings.reminderHoursBefore,
            slotStepMinutes: settings.slotStepMinutes,
            whatsappEnabled: settings.whatsappEnabled,
          }}
        />
      </section>

      <section className="card card--pad stack-sm">
        <h2 className="h3">Ressourcen &amp; Arbeitszeiten</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Ressource</th><th>Art</th><th>Zeiten</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Studio (Öffnungszeiten)</strong></td>
                <td>—</td>
                <td className="small">{rules.filter((r) => !r.resourceId).sort((a, b) => a.weekday - b.weekday).map((r) => `${DAYS[r.weekday - 1]} ${r.startTime}–${r.endTime}`).join(" · ")}</td>
              </tr>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td>{r.name.de}<div className="small muted">{r.id}</div></td>
                  <td>{r.kind}{r.type ? ` · ${r.type}` : ""}</td>
                  <td className="small">{rules.filter((x) => x.resourceId === r.id).sort((a, b) => a.weekday - b.weekday).map((x) => `${DAYS[x.weekday - 1]} ${x.startTime}–${x.endTime}`).join(" · ") || "wie Öffnungszeiten"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Arbeitszeiten und Ressourcen werden in dieser Version per Seed/Datenbank gepflegt; Abwesenheiten im Kalender.</p>
      </section>

      {auditRows.length > 0 && (
        <section className="card card--pad stack-sm">
          <h2 className="h3">Protokoll</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Zeit</th><th>Wer</th><th>Aktion</th><th>Objekt</th></tr></thead>
              <tbody>
                {auditRows.map((a) => (
                  <tr key={a.id}>
                    <td className="small">{formatLocalDate(a.createdAt, tz, "de", false)} {formatLocalTime(a.createdAt, tz, "de")}</td>
                    <td className="small">{a.actor}</td>
                    <td>{a.action}</td>
                    <td className="small">{a.entity} {a.entityId ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
