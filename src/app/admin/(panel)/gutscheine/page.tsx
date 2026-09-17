import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { hasRole, pageStaff } from "@/lib/auth";
import { formatAmount } from "@/lib/money";
import { formatLocalDate } from "@/lib/time";
import { RedeemForm } from "@/components/admin/RedeemForm";
import { ActionButton } from "@/components/admin/ActionButton";

export const metadata = { title: "Gutscheine" };

const ORDER_STATUS: Record<string, string> = { pending: "Zahlung offen", paid: "Bezahlt", failed: "Fehlgeschlagen", cancelled: "Abgebrochen", refunded: "Erstattet" };

export default async function VouchersAdmin() {
  const user = await pageStaff();
  const db = await getDb();
  const isManager = hasRole(user, "manager");
  const isOwner = user.role === "owner";
  const orders = isManager ? await db.select().from(schema.voucherOrders).orderBy(desc(schema.voucherOrders.createdAt)).limit(100) : [];
  const vouchers = isManager ? await db.select().from(schema.vouchers).orderBy(desc(schema.vouchers.issuedAt)).limit(100) : [];
  const ledger = isManager ? await db.select().from(schema.voucherLedger).orderBy(desc(schema.voucherLedger.createdAt)).limit(200) : [];

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="display display--md">Gutscheine</h1>
        </div>
      </div>

      <section className="card card--pad stack" aria-labelledby="redeem">
        <h2 id="redeem" className="h3">Gutschein vor Ort einlösen</h2>
        <p className="small muted" style={{ margin: 0 }}>Code eingeben, Guthaben prüfen, Betrag abbuchen. Jede Buchung landet im Ledger; doppelte Abbuchungen über das Guthaben hinaus sind ausgeschlossen.</p>
        <RedeemForm />
      </section>

      {isManager && (
        <>
          <section className="stack" aria-labelledby="orders">
            <h2 id="orders">Bestellungen</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Datum</th><th>Käufer:in</th><th>Wert</th><th>Status</th><th>Zahlung</th><th></th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={6} className="muted">Noch keine Bestellungen.</td></tr>}
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="small">{formatLocalDate(o.createdAt, "Europe/Berlin", "de", false)}</td>
                      <td>{o.buyerName}<div className="small muted">{o.buyerEmail}{o.recipientName ? ` · für ${o.recipientName}` : ""}</div></td>
                      <td>{formatAmount(o.amountCents, "de", o.currency)}</td>
                      <td><span className={`status status--${o.status}`}>{ORDER_STATUS[o.status]}</span>{o.isTest && <div className="small muted">Test</div>}</td>
                      <td className="small">{o.paymentMethod === "card" ? "Karte" : "PayPal"}</td>
                      <td>
                        {isOwner && o.status === "paid" && (
                          <div className="stack-sm">
                            <ActionButton url={`/api/admin/orders/${o.id}/refund`} body={{ note: "Erstattung" }} label="Erstatten" variant="outline" confirm="Voll erstatten? Nur möglich, wenn noch nichts eingelöst wurde." />
                            <ActionButton url={`/api/admin/orders/${o.id}/refund`} body={{ allowPartial: true, note: "Teilerstattung Restguthaben" }} label="Restguthaben erstatten" variant="ghost" confirm="Nur das Restguthaben erstatten und Gutschein schließen?" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="stack" aria-labelledby="vouchers">
            <h2 id="vouchers">Ausgestellte Gutscheine</h2>
            <p className="small muted" style={{ margin: 0 }}>Codes werden nur gehasht gespeichert; hier sind nur die letzten 4 Zeichen sichtbar.</p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Code</th><th>Wert</th><th>Guthaben</th><th>Status</th><th>Ledger</th><th></th></tr></thead>
                <tbody>
                  {vouchers.length === 0 && <tr><td colSpan={6} className="muted">Noch keine Gutscheine.</td></tr>}
                  {vouchers.map((v) => (
                    <tr key={v.id}>
                      <td>··· {v.codeLast4}{v.isTest && <div className="small muted">Test</div>}</td>
                      <td>{formatAmount(v.initialCents, "de")}</td>
                      <td><strong>{formatAmount(v.balanceCents, "de")}</strong></td>
                      <td><span className={`status status--${v.status === "active" ? "confirmed" : v.status}`}>{v.status}</span></td>
                      <td className="small">
                        {ledger.filter((l) => l.voucherId === v.id).map((l) => (
                          <div key={l.id}>{l.type} {formatAmount(l.amountCents, "de")} → {formatAmount(l.balanceAfterCents, "de")} {l.note ? `(${l.note})` : ""}</div>
                        ))}
                      </td>
                      <td>{isOwner && v.status === "active" && <ActionButton url={`/api/admin/vouchers/${v.id}/void`} body={{ note: "Storniert durch Inhaberin" }} label="Sperren" variant="danger" confirm="Gutschein sperren? Restguthaben verfällt (Ledger bleibt erhalten)." />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
