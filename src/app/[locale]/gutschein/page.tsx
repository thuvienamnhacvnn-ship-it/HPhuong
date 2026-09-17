import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { getSettings } from "@/lib/catalog";
import { Lily, Ornament } from "@/components/decor";
import { GiftCard } from "@/components/GiftCard";
import { VoucherQuickPick } from "@/components/VoucherQuickPick";
import { IconInfo } from "@/components/icons";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.voucher.eyebrow };
}

export default async function VoucherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t, db } = await pageContext(params);
  const settings = await getSettings(db);
  return (
    <div className="page" style={{ position: "relative", overflow: "hidden" }}>
      <Lily position="tr-sm" />
      <div className="checkout above-decor">
        <section className="stack">
          <p className="eyebrow">{t.voucher.eyebrow}</p>
          <h1 className="display">
            {t.voucher.title1}
            <br />
            {t.voucher.title2}
          </h1>
          <Ornament />
          <p className="lead">{t.voucher.lead}</p>
          <div className="card card--pad stack" style={{ maxWidth: 520 }}>
            <h2 className="h3">{t.voucher.chooseAmount}</h2>
            <VoucherQuickPick locale={locale} amounts={settings.voucherDenominationsCents} target="checkout" />
            <p className="small muted row" style={{ gap: 8, margin: 0 }}>
              <IconInfo width={18} height={18} /> {t.voucher.info}
            </p>
          </div>
        </section>
        <aside className="stack">
          <GiftCard locale={locale} amountCents={settings.voucherDenominationsCents[1] ?? settings.voucherDenominationsCents[0]} />
          <p className="small muted" style={{ margin: 0 }}>{t.offers.conditions}</p>
        </aside>
      </div>
    </div>
  );
}
