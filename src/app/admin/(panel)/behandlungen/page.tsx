import { getDb, schema } from "@/lib/db";
import { pageStaff } from "@/lib/auth";
import { listServices } from "@/lib/catalog";
import { ServiceEditor } from "@/components/admin/ServiceEditor";

export const metadata = { title: "Behandlungen" };

export default async function ServicesAdmin() {
  const user = await pageStaff("manager");
  const db = await getDb();
  const services = await listServices(db, { includeHidden: true });
  const staff = await db.select().from(schema.staff);
  const skills = await db.select().from(schema.staffSkills);

  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Verwaltung</p>
          <h1 className="display display--md">Behandlungen</h1>
          <p className="muted" style={{ margin: 0 }}>
            Preise und Dauer ändern nur neue Buchungen — bestehende Termine behalten ihren gespeicherten Preis. Preise darf nur die Inhaberin ändern.
          </p>
        </div>
      </div>
      {services.map((s) => (
        <ServiceEditor
          key={s.id}
          canEditPrices={user.role === "owner"}
          staff={staff.map((m) => ({ id: m.id, name: m.displayName }))}
          service={{
            id: s.id,
            name: s.name.de,
            category: s.category,
            visible: s.visible,
            bookable: s.bookable,
            contentApproved: s.contentApproved,
            isDemo: s.isDemo,
            bufferBeforeMinutes: s.bufferBeforeMinutes,
            bufferAfterMinutes: s.bufferAfterMinutes,
            roomTypes: s.roomTypes,
            equipmentTypes: s.equipmentTypes,
            videoUrl: s.videoUrl,
            teaser: s.teaser,
            description: s.description,
            variants: s.variants.map((v) => ({ id: v.id, minutes: v.minutes, priceCents: v.priceCents, active: v.active })),
            skills: skills.filter((k) => k.serviceId === s.id).map((k) => k.staffId),
          }}
        />
      ))}
    </div>
  );
}
