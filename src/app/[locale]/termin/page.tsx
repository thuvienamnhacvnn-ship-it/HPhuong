import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { one, pageContext } from "@/lib/page";
import { getSettings, listServices } from "@/lib/catalog";
import { todayLocal } from "@/lib/scheduling";
import { addDays } from "@/lib/time";
import { whatsappConfigured } from "@/lib/notifications/adapters";
import { BookingFlow } from "@/components/BookingFlow";
import { Lily, Ornament } from "@/components/decor";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.booking.mobileTitle };
}

export default async function BookingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t, db } = await pageContext(params);
  const sp = await searchParams;
  if (one(sp.offer)) redirect(`/${locale}/angebote/${one(sp.offer)}`);
  const settings = await getSettings(db);
  const services = await listServices(db, { bookableOnly: true });
  const today = todayLocal(settings.timezone);

  return (
    <>
      <section className="band">
        <Lily position="tr" />
        <div className="above-decor stack-sm">
          <h1 className="display display--md">
            <span className="hide-on-mobile">{t.booking.title}</span>
            <span className="show-mobile-block">{t.booking.mobileTitle}</span>
          </h1>
          <p className="lead">{t.booking.lead}</p>
          <Ornament />
        </div>
      </section>
      <div className="page" style={{ paddingTop: 0 }}>
        <BookingFlow
          locale={locale}
          services={services.map((s) => ({ id: s.id, name: s.name, imageAssetId: s.imageAssetId, variants: s.variants.map((v) => ({ id: v.id, minutes: v.minutes, priceCents: v.priceCents })) }))}
          today={today}
          lastDay={addDays(today, settings.bookingHorizonDays)}
          timezone={settings.timezone}
          whatsappAvailable={whatsappConfigured(settings)}
          initial={{ service: one(sp.service), variant: one(sp.variant), date: one(sp.date), time: one(sp.time), staff: one(sp.staff) }}
        />
      </div>
    </>
  );
}
