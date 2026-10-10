import type { Metadata } from "next";
import { isNull } from "drizzle-orm";
import { pageContext } from "@/lib/page";
import { getSettings } from "@/lib/catalog";
import { schema } from "@/lib/db";
import { Img } from "@/components/Img";
import { Ornament } from "@/components/decor";
import { IconChevronDown, IconClock, IconPhone, IconPin } from "@/components/icons";
import { telHref, waHref } from "@/lib/contact";
import { ContactForm } from "@/components/ContactForm";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.nav.kontakt };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t, db } = await pageContext(params);
  const settings = await getSettings(db);
  const rules = await db.select().from(schema.availabilityRules).where(isNull(schema.availabilityRules.resourceId));
  const clock = (hhmm: string) => hhmm.replace(/^0/, ""); // "09:30" → "9:30", as the studio prints it
  const hours = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
    day: t.contact.days[d - 1],
    ranges: rules.filter((r) => r.weekday === d).map((r) => `${clock(r.startTime)}–${clock(r.endTime)}`),
    // e.g. Saturday "nach Vereinbarung": no opening rule (so no online slots), but not simply closed
    note: settings.hoursNotes[String(d)]?.[locale] ?? null,
  }));
  // Demo shows "not provided yet"; a live site hides missing details instead of publishing placeholders.
  const showMissing = !settings.publicLaunchEnabled;
  const reach = [
    settings.phone ? { key: "tel", label: "Tel.", value: settings.phone, href: telHref(settings.phone), external: false } : null,
    settings.mobilePhone ? { key: "mobile", label: t.contact.mobile, value: settings.mobilePhone, href: waHref(settings.mobilePhone), external: true } : null,
    settings.email ? { key: "mail", label: t.contact.email, value: settings.email, href: `mailto:${settings.email}`, external: false } : null,
  ].filter((x) => x !== null);

  return (
    <>
    <Frame className="frame--contact">
    <div className="contact frame__fill">
      <section className="contact__hero" aria-labelledby="contact-title">
        <Img id="banner-contact" alt="" priority sizes="(max-width: 1100px) 100vw, 60vw" />
        <div className="contact__copy">
          <h1 id="contact-title" className="display">
            {t.contact.title1}
            <br />
            {t.contact.title2}
          </h1>
          <Ornament />
          <p style={{ margin: 0, fontSize: "1.05rem" }}>{t.contact.lead}</p>
        </div>
      </section>

      <section className="card card--pad stack" aria-labelledby="form-title">
        <h2 id="form-title">{t.contact.form}</h2>
        <ContactForm locale={locale} />
      </section>

    </div>
    </Frame>
    <Frame className="frame--contact frame--contact-2">
    <div className="contact contact--more frame__fill">
      <div className="info-cards">
        {(settings.address || showMissing) && (
          <div className="card info-card">
            <span className="icon-ring"><IconPin /></span>
            <div className="info-card__lines">
              <h3>{t.contact.address}</h3>
              {settings.address ? (
                <>
                  {settings.address.split(", ").map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  {settings.mapUrl && (
                    <a className="link small" href={settings.mapUrl} target="_blank" rel="noopener noreferrer">{t.contact.map} →</a>
                  )}
                </>
              ) : (
                <span className="muted">{t.common.notConfigured}</span>
              )}
            </div>
          </div>
        )}
        {(reach.length > 0 || showMissing) && (
          <div className="card info-card">
            <span className="icon-ring"><IconPhone /></span>
            <div className="info-card__lines">
              <h3>{t.contact.reach}</h3>
              {reach.length === 0 && <span className="muted">{t.common.notConfigured}</span>}
              {reach.map((r) => (
                <span key={r.key}>
                  <span className="small">{r.label}</span>{" "}
                  <a className="link" href={r.href} {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{r.value}</a>
                  {r.key === "mobile" && settings.mobilePhone && (
                    <>
                      {" "}
                      <a className="link small" href={telHref(settings.mobilePhone)}>({t.common.call})</a>
                    </>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="card info-card">
          <span className="icon-ring"><IconClock /></span>
          <div>
            <h3>{t.contact.hours}</h3>
            <dl className="hours">
              {hours.map((h) => (
                <div key={h.day} style={{ display: "contents" }}>
                  <dt>{h.day}</dt>
                  <dd className={h.ranges.length || !h.note ? undefined : "hours__note"}>{h.ranges.length ? h.ranges.join(", ") : (h.note ?? t.contact.closedDay)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <section className="card card--pad faq" aria-labelledby="faq-title">
        <h2 id="faq-title">{t.contact.faq}</h2>
        {t.contact.faqs.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q} <IconChevronDown />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="location-card">
        <Img id="ritual-still-life" alt="" sizes="600px" imgStyle={{ objectPosition: "20% 70%" }} />
        <div>
          <IconPin width={40} height={40} />
          {settings.address && (
            <>
              <h2 className="h3">{settings.address}</h2>
              {settings.mapUrl && (
                <a className="btn btn--sm" href={settings.mapUrl} target="_blank" rel="noopener noreferrer">{t.contact.map}</a>
              )}
            </>
          )}        </div>
      </section>
    </div>
    </Frame>
    </>
  );
}
