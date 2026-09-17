"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { api, ApiError } from "./api";
import { GiftCard } from "./GiftCard";
import { IconCheck, IconHourglass, IconInfo } from "./icons";

type Order = { status: string; amountCents: number; currency: string; isTest: boolean; voucherIssued: boolean };

/** Polls the server: the page only says "paid" after the verified webhook set it. */
export function OrderStatus({ locale, token }: { locale: Locale; token: string }) {
  const t = getDict(locale);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let stop = false;
    let delay = 1500;
    const tick = async () => {
      try {
        const o = await api<Order>(`/api/voucher-orders/${token}`);
        if (stop) return;
        setOrder(o);
        setOffline(false);
        if (o.status !== "pending") return;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
          return;
        }
        setOffline(true);
      }
      delay = Math.min(delay * 1.5, 10000);
      if (!stop) setTimeout(tick, delay);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [token]);

  if (notFound) return <div className="card card--pad empty"><p className="lead">{t.order.notFound}</p></div>;
  if (!order) return <div className="card card--pad"><p className="row muted" role="status"><span className="spin" /> {t.common.loading}</p></div>;

  const paid = order.status === "paid";
  return (
    <section className="card card--pad stack" aria-live="polite">
      <div className="row row--between">
        <h1 className="h2">{t.order.title}</h1>
        {order.isTest && <span className="badge">{t.order.testBadge}</span>}
      </div>
      <span className={`status status--${order.status}`} style={{ justifySelf: "start" }}>
        {paid ? <IconCheck /> : <IconHourglass />}
        {order.status === "pending" ? t.order.pending : paid ? t.order.paid : order.status === "failed" ? t.order.failed : order.status === "refunded" ? t.order.refunded : t.order.cancelled}
      </span>
      <GiftCard locale={locale} amountCents={order.amountCents} />
      <p style={{ margin: 0 }}>
        {order.status === "pending" ? t.order.pendingHint : paid ? t.order.paidHint : order.status === "failed" ? t.order.failedHint : ""}
      </p>
      {offline && <p className="notice notice--warn">{t.common.offline}</p>}
      {paid && order.isTest && (
        <p className="small muted row" style={{ gap: 8, margin: 0 }}>
          <IconInfo width={18} height={18} /> {t.login.devOutbox}
        </p>
      )}
      {["failed", "cancelled"].includes(order.status) && (
        <Link className="btn" href={`/${locale}/checkout?amount=${order.amountCents}`} style={{ justifySelf: "start" }}>
          {t.order.tryAgain}
        </Link>
      )}
    </section>
  );
}
