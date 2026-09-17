import type { Metadata } from "next";
import { one, pageContext } from "@/lib/page";
import { getSettings } from "@/lib/catalog";
import { VoucherCheckout } from "@/components/VoucherCheckout";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.voucher.eyebrow, robots: { index: false } };
}

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, db } = await pageContext(params);
  const settings = await getSettings(db);
  const requested = Number(one((await searchParams).amount));
  const amounts = settings.voucherDenominationsCents;
  return (
    <Frame className="frame--checkout">
    <div className="page frame__fill">
      <VoucherCheckout
        locale={locale}
        amounts={amounts}
        initialAmount={amounts.includes(requested) ? requested : (amounts[1] ?? amounts[0])}
        maxMessage={settings.voucherMessageMaxLength}
        sandbox={settings.paymentMode === "sandbox"}
      />
    </div>
    </Frame>
  );
}
