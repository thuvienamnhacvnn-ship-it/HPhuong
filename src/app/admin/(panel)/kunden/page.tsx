import { asc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { pageStaff } from "@/lib/auth";
import { formatLocalDate } from "@/lib/time";

export const metadata = { title: "Kunden" };

export default async function CustomersAdmin() {
  await pageStaff("manager");
  const db = await getDb();
  const customers = await db.select().from(schema.customers).orderBy(asc(schema.customers.name));
  const appointments = await db.select({ customerId: schema.appointments.customerId, status: schema.appointments.status }).from(schema.appointments);
  const consents = await db.select().from(schema.consents);

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="display display--md">Kunden</h1>
          <p className="muted" style={{ margin: 0 }}>Nur für Leitung und Inhaberin. Keine Gesundheitsdaten speichern.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Kontakt</th><th>Termine</th><th>Einwilligungen</th><th>Seit</th></tr></thead>
          <tbody>
            {customers.map((c) => {
              const mine = appointments.filter((a) => a.customerId === c.id);
              const cons = consents.filter((x) => x.customerId === c.id);
              return (
                <tr key={c.id}>
                  <td>{c.name}{c.isDemo && <div className="small muted">Demo</div>}</td>
                  <td className="small"><a className="link" href={`mailto:${c.email}`}>{c.email}</a>{c.phone ? <div>{c.phone}</div> : null}</td>
                  <td className="small">{mine.length} ({mine.filter((a) => a.status === "confirmed").length} bestätigt)</td>
                  <td className="small">
                    WhatsApp: {c.whatsappOptIn ? "ja" : "nein"} · Newsletter: {c.marketingEmail ? "ja" : "nein"}
                    {cons.map((x) => (
                      <div key={x.id} className="muted">{x.channel} {x.granted ? "erteilt" : "widerrufen"} · {x.source} · {x.textVersion} · {formatLocalDate(x.createdAt, "Europe/Berlin", "de", false)}</div>
                    ))}
                  </td>
                  <td className="small">{formatLocalDate(c.createdAt, "Europe/Berlin", "de", false)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
