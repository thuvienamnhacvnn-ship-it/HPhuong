import Link from "next/link";
import { and, asc, gt, inArray, lt, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { hasRole, pageStaff } from "@/lib/auth";
import { getSettings, listServices } from "@/lib/catalog";
import { dayBounds, todayLocal } from "@/lib/scheduling";
import { addDays, isoWeekday, isValidDateString, toLocalParts, formatLocalDate, formatLocalTime } from "@/lib/time";
import { one } from "@/lib/page";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { ManualBookingForm } from "@/components/admin/ManualBookingForm";
import { TimeOffForm } from "@/components/admin/TimeOffForm";
import { ActionButton } from "@/components/admin/ActionButton";

export const metadata = { title: "Kalender" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await pageStaff();
  const db = await getDb();
  const settings = await getSettings(db);
  const tz = settings.timezone;
  const today = todayLocal(tz);
  const anchor = one(sp.date) && isValidDateString(one(sp.date)!) ? one(sp.date)! : today;
  const monday = addDays(anchor, 1 - isoWeekday(anchor));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const from = dayBounds(monday, tz).from;
  const to = dayBounds(days[6], tz).to;

  const staffRows = await db.select().from(schema.staff).where(eq(schema.staff.active, true));
  const staffFilter = one(sp.staff) ?? (user.role === "therapist" && user.staffId ? user.staffId : "");
  const rows = await db
    .select({ appointment: schema.appointments, customer: schema.customers })
    .from(schema.appointments)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.appointments.customerId))
    .where(and(lt(schema.appointments.startsAt, to), gt(schema.appointments.endsAt, from), inArray(schema.appointments.status, ["pending", "confirmed"])))
    .orderBy(asc(schema.appointments.startsAt));
  const visible = rows.filter(({ appointment }) => !staffFilter || appointment.snapshot.segments.some((s) => s.staffId === staffFilter));
  const offs = await db.select().from(schema.timeOff).where(and(lt(schema.timeOff.startsAt, to), gt(schema.timeOff.endsAt, from))).orderBy(asc(schema.timeOff.startsAt));
  const resources = await db.select().from(schema.resources);
  const isManager = hasRole(user, "manager");
  const services = isManager ? await listServices(db, { bookableOnly: true }) : [];

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="display display--md">Kalender</h1>
        </div>
        <div className="day-nav">
          <Link className="icon-btn icon-btn--ring" href={`/admin/kalender?date=${addDays(monday, -7)}&staff=${staffFilter}`} aria-label="Vorige Woche"><IconChevronLeft /></Link>
          <strong>{formatLocalDate(from, tz, "de", false)} – {formatLocalDate(dayBounds(days[6], tz).from, tz, "de", false)}</strong>
          <Link className="icon-btn icon-btn--ring" href={`/admin/kalender?date=${addDays(monday, 7)}&staff=${staffFilter}`} aria-label="Nächste Woche"><IconChevronRight /></Link>
          <Link className="btn btn--sm btn--outline" href="/admin/kalender">Diese Woche</Link>
        </div>
      </div>

      <nav className="row" aria-label="Mitarbeitende filtern" style={{ gap: 8 }}>
        <Link className={`chip${!staffFilter ? " is-active" : ""}`} href={`/admin/kalender?date=${monday}`}>Alle</Link>
        {staffRows.map((s) => (
          <Link key={s.id} className={`chip${staffFilter === s.id ? " is-active" : ""}`} href={`/admin/kalender?date=${monday}&staff=${s.id}`}>{s.displayName}</Link>
        ))}
      </nav>

      <div className="week">
        {days.map((d) => {
          const items = visible.filter(({ appointment }) => toLocalParts(appointment.startsAt!, tz).date === d);
          const dayOffs = offs.filter((o) => toLocalParts(o.startsAt, tz).date <= d && toLocalParts(o.endsAt, tz).date >= d);
          return (
            <section key={d} className={`week__day${d === today ? " is-today" : ""}`} aria-label={d}>
              <strong>{new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}</strong>
              {dayOffs.map((o) => (
                <div key={o.id} className="week__item" style={{ borderLeftColor: "var(--disabled)", background: "var(--line-soft)" }}>
                  Blockiert: {o.resourceId ? resources.find((r) => r.id === o.resourceId)?.name.de : "Studio"}
                  <div className="small">{formatLocalTime(o.startsAt, tz, "de")}–{formatLocalTime(o.endsAt, tz, "de")} {o.reason ?? ""}</div>
                  {isManager && <ActionButton url="/api/admin/time-off" method="DELETE" body={{ id: o.id }} label="Aufheben" variant="ghost" confirm="Blockierung aufheben?" />}
                </div>
              ))}
              {items.length === 0 && dayOffs.length === 0 && <span className="small muted">—</span>}
              {items.map(({ appointment: a, customer: c }) => (
                <Link key={a.id} href={isManager ? `/admin/anfragen#${a.id}` : `/admin?date=${d}`} className={`week__item week__item--${a.status}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <strong>{formatLocalTime(a.startsAt!, tz, "de")}–{formatLocalTime(a.endsAt!, tz, "de")}</strong>
                  <div>{a.snapshot.segments.map((s) => s.name.de).join(" + ")}</div>
                  <div className="small">{isManager ? c.name : c.name.split(" ")[0]} · {a.status === "pending" ? "angefragt" : "bestätigt"}</div>
                  {a.customerNote && <div className="small muted">„{a.customerNote}“</div>}
                </Link>
              ))}
            </section>
          );
        })}
      </div>

      {isManager && (
        <div className="admin-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
          <section id="neu" className="card card--pad stack">
            <h2 className="h3">Termin manuell anlegen</h2>
            <p className="small muted" style={{ margin: 0 }}>Wird sofort bestätigt. Freie Zeiten werden wie online geprüft (Mitarbeitende, Raum, Geräte, Puffer).</p>
            <ManualBookingForm
              today={today}
              services={services.map((s) => ({ id: s.id, name: s.name.de, variants: s.variants.map((v) => ({ id: v.id, minutes: v.minutes, priceCents: v.priceCents })) }))}
              staff={staffRows.map((s) => ({ id: s.id, name: s.displayName }))}
            />
          </section>
          <section className="card card--pad stack">
            <h2 className="h3">Abwesenheit / Blockierung</h2>
            <p className="small muted" style={{ margin: 0 }}>Bestehende Termine bleiben erhalten; Überschneidungen werden angezeigt, damit Sie sie verschieben können.</p>
            <TimeOffForm today={today} resources={resources.map((r) => ({ id: r.id, name: `${r.kind === "staff" ? "Mitarbeitende" : r.kind === "room" ? "Raum" : "Gerät"}: ${r.name.de}` }))} />
          </section>
        </div>
      )}
    </div>
  );
}
