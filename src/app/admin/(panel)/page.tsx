import Link from "next/link";
import { dayView } from "@/lib/admin-data";
import { getDb } from "@/lib/db";
import { hasRole, pageStaff } from "@/lib/auth";
import { addDays, formatLocalDate, formatLocalTime } from "@/lib/time";
import { one } from "@/lib/page";
import { Ornament } from "@/components/decor";
import { IconCheck, IconChevronLeft, IconChevronRight, IconDoc, IconDoor, IconHourglass, IconChat } from "@/components/icons";
import { ActionButton } from "@/components/admin/ActionButton";
import { TeamNote } from "@/components/admin/TeamNote";

export const metadata = { title: "Übersicht" };

const HOUR_FROM = 8;
const HOUR_TO = 20;

export default async function AdminOverview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const by = one(sp.by) === "staff" ? "staff" : "room";
  const db = await getDb();
  const user = await pageStaff();
  const view = await dayView(db, one(sp.date), by);
  const { settings, date, columns, blocks, offBlocks, pending, kpis } = view;
  const tz = settings.timezone;
  const dateLabel = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const top = (min: number) => `calc(${(min / 60 - HOUR_FROM).toFixed(3)} * var(--hour))`;
  const height = (a: number, b: number) => `calc(${((b - a) / 60).toFixed(3)} * var(--hour))`;
  const isManager = hasRole(user, "manager");

  return (
    <>
      <div className="admin-head">
        <div className="stack-sm">
          <p className="eyebrow">Studio Verwaltung</p>
          <h1 className="display display--md">Guten Tag, {user.name.split(" ").slice(-1)[0]}.</h1>
          <p className="muted" style={{ margin: 0 }}>Hier behalten Sie den Überblick über Termine, Anfragen und Ihr Studio.</p>
        </div>
        {settings.isDemo && <span className="badge">Demo-Daten</span>}
      </div>

      <div className="admin-grid">
        <section className="card card--pad stack" aria-label="Tagesplan">
          <div className="day-nav">
            <Link className="icon-btn icon-btn--ring" href={`/admin?date=${addDays(date, -1)}&by=${by}`} aria-label="Vorheriger Tag"><IconChevronLeft /></Link>
            <h2>{dateLabel}</h2>
            <Link className="icon-btn icon-btn--ring" href={`/admin?date=${addDays(date, 1)}&by=${by}`} aria-label="Nächster Tag"><IconChevronRight /></Link>
            <Link className="btn btn--sm btn--outline" href={`/admin?by=${by}`}>Heute</Link>
            <span className="row" style={{ gap: 6 }}>
              <Link className={`chip${by === "room" ? " is-active" : ""}`} href={`/admin?date=${date}&by=room`}>Räume</Link>
              <Link className={`chip${by === "staff" ? " is-active" : ""}`} href={`/admin?date=${date}&by=staff`}>Mitarbeitende</Link>
            </span>
          </div>

          <div className="timeline" style={{ ["--cols" as string]: columns.length, ["--span" as string]: HOUR_TO - HOUR_FROM }}>
            <div className="timeline__head" style={{ borderLeft: 0 }} />
            {columns.map((c) => (
              <div key={c.id} className="timeline__head">
                <strong>{c.name.de}</strong>
                <span className="small muted">{c.description?.de ?? ""}</span>
              </div>
            ))}
            <div className="timeline__hours" aria-hidden>
              {Array.from({ length: HOUR_TO - HOUR_FROM }, (_, i) => (
                <span key={i} style={{ top: `calc(${i} * var(--hour) + 10px)` }}>{String(HOUR_FROM + i).padStart(2, "0")}:00</span>
              ))}
            </div>
            {columns.map((c) => (
              <div key={c.id} className="timeline__col">
                {offBlocks
                  .filter((o) => o.resourceId === c.id || o.resourceId === null)
                  .map((o) => (
                    <div key={o.id} className="slot-block slot-block--off" style={{ top: top(Math.max(o.startMin, HOUR_FROM * 60)), height: height(Math.max(o.startMin, HOUR_FROM * 60), Math.min(o.endMin, HOUR_TO * 60)) }}>
                      <strong>Blockiert</strong> {o.start}–{o.end} {o.reason ? `· ${o.reason}` : ""}
                    </div>
                  ))}
                {(blocks.get(c.id) ?? []).map((b) => (
                  <Link key={`${b.appointmentId}-${b.start}`} href={`/admin/anfragen#${b.appointmentId}`} className={`slot-block slot-block--${b.status}`} style={{ top: top(b.startMin), height: height(b.startMin, b.endMin) }}>
                    <span className="small">{b.start} – {b.end}</span>
                    <strong>{isManager ? b.customerName : b.customerName.split(" ")[0]}</strong>
                    <span>{b.serviceName}</span>{" "}
                    <span className="small">{b.status === "pending" ? "· Angefragt" : "· Bestätigt"}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <p className="small muted" style={{ margin: 0 }}>Zeiten in {tz}. Gestreift = angefragt (hält den Zeitraum bis zur Entscheidung).</p>
        </section>

        <div className="stack">
          {isManager && (
            <section className="card card--pad stack" aria-labelledby="open-req">
              <div className="row row--between">
                <h2 id="open-req" className="h3">Offene Anfragen</h2>
                <span className="status status--pending">{pending.total}</span>
              </div>
              {pending.items.length === 0 && <p className="muted" style={{ margin: 0 }}>Keine offenen Anfragen.</p>}
              {pending.items.map(({ appointment: a, customer }) => (
                <div key={a.id} className="request">
                  <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                    <span className="icon-ring" style={{ width: 40, height: 40 }}><IconHourglass /></span>
                    <div>
                      <strong>{customer.name}</strong>
                      <div className="small">
                        {a.startsAt ? `${formatLocalDate(a.startsAt, tz, "de", false)} · ${formatLocalTime(a.startsAt, tz, "de")}–${formatLocalTime(a.endsAt!, tz, "de")}` : "Paket – Termin einplanen"}
                      </div>
                      <div className="small muted">{a.snapshot.segments.map((s) => s.name.de).join(" + ")}</div>
                    </div>
                  </div>
                  {a.customerNote && (
                    <p className="small row" style={{ gap: 8, margin: 0 }}><IconChat width={18} height={18} /> <em>„{a.customerNote}“</em></p>
                  )}
                  {a.status === "pending" ? (
                    <div className="row" style={{ gap: 8 }}>
                      <ActionButton url={`/api/admin/appointments/${a.id}`} method="PATCH" body={{ action: "approve" }} label="Bestätigen" />
                      <ActionButton url={`/api/admin/appointments/${a.id}`} method="PATCH" body={{ action: "reject" }} label="Ablehnen" variant="outline" confirm="Anfrage wirklich ablehnen?" />
                    </div>
                  ) : (
                    <Link className="btn btn--sm" href={`/admin/anfragen#${a.id}`} style={{ justifySelf: "start" }}>Prüfen</Link>
                  )}
                </div>
              ))}
              {pending.total > pending.items.length && <Link className="link small" href="/admin/anfragen">Alle {pending.total} Anfragen</Link>}
            </section>
          )}

          <section className="card card--pad stack" aria-labelledby="day-sum">
            <h2 id="day-sum" className="h3">Tagesübersicht</h2>
            <div className="kpis">
              <Link className="kpi" href="/admin/anfragen"><span className="icon-ring"><IconDoc /></span><strong>{kpis.pendingToday}</strong><span>Anfragen heute</span></Link>
              <Link className="kpi" href={`/admin/kalender?date=${date}`}><span className="icon-ring"><IconCheck /></span><strong>{kpis.confirmedToday}</strong><span>Bestätigt</span></Link>
              <div className="kpi"><span className="icon-ring"><IconDoor /></span><strong>{kpis.roomsFree}</strong><span>Raum frei (ganzer Tag)</span></div>
            </div>
          </section>

          <section className="card card--pad stack" aria-labelledby="note">
            <h2 id="note" className="h3">Hinweis für das Team</h2>
            <TeamNote initial={settings.teamNote ?? ""} canEdit={isManager} />
          </section>
        </div>
      </div>
      <Ornament className="ornament--center" />
    </>
  );
}
