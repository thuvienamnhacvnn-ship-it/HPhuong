import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { OrderStatus } from "@/components/OrderStatus";
import { Frame } from "@/components/Frame";

export const metadata: Metadata = { title: "Bestellung", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale } = await pageContext(params);
  const { token } = await params;
  return (
    <Frame className="frame--center">
    <div className="page narrow frame__fill">
      <OrderStatus locale={locale} token={token} />
    </div>
    </Frame>
  );
}
