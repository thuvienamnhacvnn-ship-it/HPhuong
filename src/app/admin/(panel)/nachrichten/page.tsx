import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { pageStaff } from "@/lib/auth";
import { getSettings } from "@/lib/catalog";
import { emailProvider, whatsappConfigured } from "@/lib/notifications/adapters";
import { formatLocalDate, formatLocalTime } from "@/lib/time";
import { ActionButton } from "@/components/admin/ActionButton";

export const metadata = { title: "Nachrichten" };

const JOB_STATUS: Record<string, string> = {
  queued: "geplant",
  sending: "wird gesendet",
  sent: "zugestellt an Anbieter",
  dev_outbox: "Demo-Postausgang (nicht versendet)",
  failed: "fehlgeschlagen",
  cancelled: "abgebrochen",
  skipped: "übersprungen",
};

export default async function MessagesAdmin() {
  await pageStaff("manager");
  const db = await getDb();
  const settings = await getSettings(db);
  const jobs = await db.select().from(schema.notificationJobs).orderBy(desc(schema.notificationJobs.createdAt)).limit(100);
  const outbox = await db.select().from(schema.outbox).orderBy(desc(schema.outbox.createdAt)).limit(30);
  const tickets = await db.select().from(schema.contactTickets).orderBy(desc(schema.contactTickets.createdAt)).limit(50);
  const tz = settings.timezone;
  const when = (d: Date) => `${formatLocalDate(d, tz, "de", false)} ${formatLocalTime(d, tz, "de")}`;

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="display display--md">Nachrichten</h1>
        </div>
      </div>

      <section className="card card--pad stack-sm">
        <h2 className="h3">Kanäle</h2>
        <p style={{ margin: 0 }}>
          E-Mail: <strong>{emailProvider() === "resend" ? "Resend (live)" : "Demo-Postausgang — E-Mails werden NICHT versendet"}</strong>
        </p>
        <p style={{ margin: 0 }}>
          WhatsApp: <strong>{whatsappConfigured(settings) ? "WhatsApp Cloud API (live)" : "nicht eingerichtet — Nachrichten werden übersprungen, E-Mail bleibt Hauptkanal"}</strong>
        </p>
      </section>

      <section className="stack" aria-labelledby="t">
        <h2 id="t">Kontaktanfragen</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Eingang</th><th>Von</th><th>Nachricht</th><th>Status</th></tr></thead>
            <tbody>
              {tickets.length === 0 && <tr><td colSpan={4} className="muted">Keine Nachrichten.</td></tr>}
              {tickets.map((k) => (
                <tr key={k.id}>
                  <td className="small">{when(k.createdAt)}</td>
                  <td>{k.name}<div className="small"><a className="link" href={`mailto:${k.email}`}>{k.email}</a></div></td>
                  <td style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>{k.message}</td>
                  <td>
                    <span className={`status status--${k.status === "open" ? "pending" : k.status === "answered" ? "confirmed" : "spam"}`}>{k.status}</span>
                    {k.status === "open" && <ActionButton url={`/api/admin/tickets/${k.id}`} method="PATCH" body={{ status: "answered" }} label="Erledigt" variant="ghost" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack" aria-labelledby="j">
        <h2 id="j">Versandaufträge</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Geplant</th><th>Kanal</th><th>Vorlage</th><th>Empfänger</th><th>Status</th><th>Versuche</th><th></th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="small">{when(j.runAt)}</td>
                  <td>{j.channel}</td>
                  <td className="small">{j.template}</td>
                  <td className="small">{j.recipient.replace(/^(.{2}).*(@.*)$/, "$1…$2")}</td>
                  <td><span className={`status status--${j.status}`}>{JOB_STATUS[j.status] ?? j.status}</span>{j.lastError && <div className="small muted">{j.lastError}</div>}</td>
                  <td>{j.attempts}</td>
                  <td>{j.status === "failed" && <ActionButton url={`/api/admin/jobs/${j.id}`} label="Erneut" variant="outline" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {emailProvider() === "dev_outbox" && (
        <section className="stack" aria-labelledby="o">
          <h2 id="o">Demo-Postausgang</h2>
          <p className="small muted" style={{ margin: 0 }}>So würden die E-Mails aussehen. Zum Testen: Anmeldelinks und Gutscheincodes stehen hier.</p>
          {outbox.map((m) => (
            <details key={m.id} className="card card--pad">
              <summary style={{ cursor: "pointer" }}>
                <strong>{m.subject}</strong> <span className="small muted">→ {m.recipient} · {when(m.createdAt)}</span>
              </summary>
              <pre className="pre" style={{ marginTop: 10 }}>{m.body}</pre>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
