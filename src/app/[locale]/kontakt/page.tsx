import type { Metadata } from "next";
import { isNull } from "drizzle-orm";
import { pageContext } from "@/lib/page";
import { getSettings } from "@/lib/catalog";
import { schema } from "@/lib/db";
import { Img } from "@/components/Img";
import { Ornament } from "@/components/decor";
import { IconChevronDown, IconClock, IconPhone, IconPin } from "@/components/icons";
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
  const hours = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
    day: t.contact.days[d - 1],
    ranges: rules.filter((r) => r.weekday === d).map((r) => `${r.startTime}–${r.endTime}`),
  }));
  // Demo shows "not provided yet"; a live site hides missing details instead of publishing placeholders.
  const showMissing = !settings.publicLaunchEnabled;
  const cards = [
    { key: "address", icon: IconPin, title: t.contact.address, value: settings.address },
    { key: "phone", icon: IconPhone, title: t.contact.phone, value: settings.phone, href: settings.phone ? `tel:${settings.phone.replace(/\s/g, "")}` : null },
  ].filter((c) => c.value || showMissing);

  return (
    <>
    <Frame className="frame--contact">
    <div className="contact frame__fill">
      <section className="contact__hero" aria-labelledby="contact-title">
        <Img id="ritual-still-life" alt="" priority sizes="(max-width: 1100px) 100vw, 60vw" />
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
        {cards.map(({ key, icon: Icon, title, value, href }) => (
          <div key={key} className="card info-card">
            <span className="icon-ring"><Icon /></span>
            <div>
              <h3>{title}</h3>
              {value ? (href ? <a className="link" href={href}>{value}</a> : <span>{value}</span>) : <span className="muted">{t.common.notConfigured}</span>}
            </div>
          </div>
        ))}
        <div className="card info-card">
          <span className="icon-ring"><IconClock /></span>
          <div>
            <h3>{settings.isDemo ? t.contact.hoursDemo : t.contact.hours}</h3>
            <dl className="hours">
              {hours.map((h) => (
                <div key={h.day} style={{ display: "contents" }}>
                  <dt>{h.day}</dt>
                  <dd>{h.ranges.length ? h.ranges.join(", ") : t.contact.closedDay}</dd>
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
          {settings.address && settings.mapUrl ? (
            <>
              <h2 className="h3">{settings.address}</h2>
              <a className="btn btn--sm" href={settings.mapUrl} target="_blank" rel="noopener noreferrer">Karte</a>
            </>
          ) : (
            <>
              <h2 className="h3">{t.contact.location}</h2>
              <p className="eyebrow">{t.contact.locationSub}</p>
            </>
          )}
        </div>
      </section>
    </div>
    </Frame>
    </>
  );
}
