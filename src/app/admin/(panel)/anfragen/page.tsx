import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import Link from "next/link";
import { pageStaff } from "@/lib/auth";
import { pendingRequests } from "@/lib/admin-data";
import { getSettings } from "@/lib/catalog";
import { todayLocal } from "@/lib/scheduling";
import { formatPrice } from "@/lib/money";
import { formatLocalDate, formatLocalTime } from "@/lib/time";
import { ActionButton } from "@/components/admin/ActionButton";
import { SchedulePicker } from "@/components/admin/SchedulePicker";

export const metadata = { title: "Anfragen & Termine" };

function expiresWithin(at: Date | null, hours: number) {
  return !!at && at.getTime() - Date.now() < hours * 3600_000;
}

const STATUS: Record<string, string> = { pending: "Angefragt", requested: "Paket-Anfrage", confirmed: "Bestätigt", cancelled: "Storniert", rejected: "Abgelehnt", expired: "Abgelaufen" };

export default async function RequestsPage() {
  await pageStaff("manager");
  const db = await getDb();
  const settings = await getSettings(db);
  const tz = settings.timezone;
  const today = todayLocal(tz);
  const pending = await pendingRequests(db);
  const upcoming = await db
    .select({ appointment: schema.appointments, customer: schema.customers })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.appointments.customerId))
    .where(and(eq(schema.appointments.status, "confirmed"), gt(schema.appointments.startsAt, new Date())))
    .orderBy(schema.appointments.startsAt)
    .limit(50);
  const recent = await db
    .select({ appointment: schema.appointments, customer: schema.customers })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.appointments.customerId))
    .where(inArray(schema.appointments.status, ["cancelled", "rejected", "expired"]))
    .orderBy(desc(schema.appointments.updatedAt))
    .limit(20);

  const when = (a: typeof schema.appointments.$inferSelect) =>
    a.startsAt ? `${formatLocalDate(a.startsAt, tz, "de")}, ${formatLocalTime(a.startsAt, tz, "de")}–${formatLocalTime(a.endsAt!, tz, "de")}` : `Wunsch: ${String(a.requestPreferences?.preferredDates ?? "")} (${String(a.requestPreferences?.preferredTime ?? "")})`;

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="display display--md">Anfragen &amp; Termine</h1>
        </div>
        <Link className="btn" href="/admin/kalender#neu">Termin manuell anlegen</Link>
      </div>

      <section className="stack" aria-labelledby="p">
        <h2 id="p">Offen ({pending.total})</h2>
        {pending.items.length === 0 && <p className="muted">Keine offenen Anfragen.</p>}
        {pending.items.map(({ appointment: a, customer: c }) => {
          const expiresSoon = expiresWithin(a.pendingExpiresAt, 3);
          return (
            <article key={a.id} id={a.id} className="request">
              <div className="row row--between">
                <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.35rem" }}>{a.snapshot.segments.map((s) => `${s.name.de} ${s.minutes} Min.`).join(" + ")}</strong>
                <span className={`status status--${a.status}`}>{STATUS[a.status]}</span>
              </div>
              <div className="small">{when(a)} · {formatPrice(a.snapshot.totalCents, "de")}</div>
              <div className="small">
                {c.name} · <a className="link" href={`mailto:${c.email}`}>{c.email}</a>
                {c.phone ? ` · ${c.phone}` : ""}
                {a.whatsappReminder ? " · WhatsApp-Erinnerung gewünscht" : ""}
              </div>
              {a.customerNote && <p className="small" style={{ margin: 0 }}><em>„{a.customerNote}“</em></p>}
              {a.pendingExpiresAt && (
                <p className={`small ${expiresSoon ? "notice notice--warn" : "muted"}`} style={{ margin: 0 }}>
                  Hält den Zeitraum bis {formatLocalDate(a.pendingExpiresAt, tz, "de", false)}, {formatLocalTime(a.pendingExpiresAt, tz, "de")} Uhr — danach wird er automatisch freigegeben.
                </p>
              )}
              <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                {a.status === "pending" && <ActionButton url={`/api/admin/appointments/${a.id}`} method="PATCH" body={{ action: "approve" }} label="Bestätigen" />}
                {a.status === "requested" && <SchedulePicker mode={{ kind: "schedule", appointmentId: a.id }} today={today} label="Paket einplanen" />}
                {a.status === "pending" && (
                  <SchedulePicker mode={{ kind: "reschedule", appointmentId: a.id, serviceId: a.snapshot.segments[0].serviceId, variantId: a.snapshot.segments[0].variantId }} today={today} label="Andere Zeit" />
                )}
                <ActionButton url={`/api/admin/appointments/${a.id}`} method="PATCH" body={{ action: "reject" }} label="Ablehnen" variant="outline" confirm="Anfrage ablehnen? Der Gast wird per E-Mail informiert." />
              </div>
            </article>
          );
        })}
      </section>

      <section className="stack" aria-labelledby="u">
        <h2 id="u">Bestätigte Termine</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Zeit</th><th>Behandlung</th><th>Gast</th><th>Ressourcen</th><th>Aktionen</th></tr>
            </thead>
            <tbody>
              {upcoming.length === 0 && <tr><td colSpan={5} className="muted">Keine anstehenden Termine.</td></tr>}
              {upcoming.map(({ appointment: a, customer: c }) => (
                <tr key={a.id} id={a.id}>
                  <td>{when(a)}</td>
                  <td>{a.snapshot.segments.map((s) => s.name.de).join(" + ")}<div className="small muted">{formatPrice(a.snapshot.totalCents, "de")} · {a.source === "admin" ? "manuell" : "online"}</div></td>
                  <td>{c.name}<div className="small muted">{c.email}</div></td>
                  <td className="small">{a.snapshot.segments.map((s) => `${s.staffId ?? "?"} / ${s.roomId ?? "?"}`).join(", ")}</td>
                  <td>
                    <div className="stack-sm">
                      {a.snapshot.segments.length === 1 && (
                        <SchedulePicker mode={{ kind: "reschedule", appointmentId: a.id, serviceId: a.snapshot.segments[0].serviceId, variantId: a.snapshot.segments[0].variantId }} today={today} label="Verschieben" />
                      )}
                      <ActionButton url={`/api/admin/appointments/${a.id}`} method="PATCH" body={{ action: "cancel" }} label="Stornieren" variant="danger" confirm="Termin stornieren? Erinnerungen werden gestoppt." />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack" aria-labelledby="r">
        <h2 id="r">Zuletzt beendet</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Status</th><th>Behandlung</th><th>Gast</th><th>Zeit</th></tr></thead>
            <tbody>
              {recent.map(({ appointment: a, customer: c }) => (
                <tr key={a.id}>
                  <td><span className={`status status--${a.status}`}>{STATUS[a.status]}</span></td>
                  <td>{a.snapshot.segments.map((s) => s.name.de).join(" + ")}</td>
                  <td>{c.name}</td>
                  <td className="small">{when(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
