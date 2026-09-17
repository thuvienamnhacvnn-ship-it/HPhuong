import Link from "next/link";
import type { Metadata } from "next";
import { one, pageContext } from "@/lib/page";
import { appointmentTokenValid, findAppointmentByToken } from "@/lib/scheduling";
import { formatPrice } from "@/lib/money";
import { formatLocalDate, formatLocalTime } from "@/lib/time";
import { Img } from "@/components/Img";
import { Ornament } from "@/components/decor";
import { IconCalendar, IconClock, IconHourglass, IconCheck, IconInfo } from "@/components/icons";
import { CancelAppointment } from "@/components/CancelAppointment";
import { MEDIA } from "@/lib/media-config";

export const metadata: Metadata = { title: "Termin", robots: { index: false } };

const IMAGE_FOR: Record<string, keyof typeof MEDIA> = {
  gesichtspflege: "service-facial",
  "aroma-massage": "service-massage",
  "head-spa": "service-headspa",
  "wellness-fusspflege": "service-footcare",
};

/** Guest view of one appointment, reached by the unguessable link from the e-mail. */
export default async function AppointmentPage({ params, searchParams }: { params: Promise<{ locale: string; token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t, db } = await pageContext(params);
  const { token } = await params;
  const isNew = one((await searchParams).neu) === "1";
  const appointment = await findAppointmentByToken(db, token);

  if (!appointment || !appointmentTokenValid(appointment)) {
    return (
      <div className="page narrow">
        <div className="card card--pad empty">
          <p className="lead">{t.appointment.linkExpired}</p>
          <Link className="btn" href={`/${locale}/termin`}>{t.appointment.bookAgain}</Link>
        </div>
      </div>
    );
  }

  const s = appointment.snapshot;
  const status = appointment.status;
  const cancellable = ["pending", "confirmed", "requested"].includes(status) && (!appointment.startsAt || appointment.startsAt > new Date());
  const StatusIcon = status === "confirmed" ? IconCheck : IconHourglass;

  return (
    <div className="page narrow stack">
      <div className="stack-sm">
        <p className="eyebrow">{t.appointment.title}</p>
        <h1 className="display display--md">{s.segments.map((seg) => seg.name[locale]).join(" + ")}</h1>
        <Ornament />
      </div>
      {isNew && (
        <p className="notice notice--ok" role="status">
          <IconCheck /> {t.appointment.sentToEmail}
        </p>
      )}
      <section className="card card--pad stack">
        <div className="appt-card" style={{ border: 0, padding: 0 }}>
          <div className="appt-card__img">
            <Img id={IMAGE_FOR[s.segments[0].serviceId]} alt="" sizes="160px" />
          </div>
          <div className="stack-sm">
            <span className={`status status--${status}`} style={{ justifySelf: "start" }}>
              <StatusIcon /> {t.appointment.status[status] ?? status}
            </span>
            {appointment.startsAt ? (
              <>
                <p className="summary-line" style={{ margin: 0 }}><IconCalendar /> {formatLocalDate(appointment.startsAt, appointment.timezone, locale)}</p>
                <p className="summary-line" style={{ margin: 0 }}>
                  <IconClock /> {formatLocalTime(appointment.startsAt, appointment.timezone, locale)}
                  {appointment.endsAt ? `–${formatLocalTime(appointment.endsAt, appointment.timezone, locale)}` : ""} {t.booking.uhr} ({s.totalMinutes} {t.common.min})
                </p>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>{String(appointment.requestPreferences?.preferredDates ?? "")}</p>
            )}
            <p className="price" style={{ margin: 0 }}>{formatPrice(s.totalCents, locale, s.currency)}</p>
          </div>
        </div>
        <p style={{ margin: 0 }}>{t.appointment.statusText[status]}</p>
        <p className="small muted row" style={{ gap: 8, margin: 0 }}><IconInfo width={18} height={18} /> {t.appointment.pay}</p>
        {appointment.whatsappReminder && <p className="small muted" style={{ margin: 0 }}>{t.appointment.whatsappOn}</p>}
        <div className="row">
          {cancellable && <CancelAppointment locale={locale} token={token} label={status === "confirmed" ? t.appointment.cancelConfirmed : t.appointment.cancel} />}
          {["rejected", "cancelled", "expired"].includes(status) && (
            <Link className="btn" href={`/${locale}/termin?service=${s.segments[0].serviceId}&variant=${s.segments[0].variantId}`}>
              {t.appointment.bookAgain}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
