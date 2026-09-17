import { z } from "zod";
import { readJson, route } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { createStaffAppointment } from "@/lib/scheduling";
import { kick } from "@/lib/background";

const Body = z.object({
  serviceId: z.string().max(80),
  variantId: z.string().max(20),
  date: z.string().max(10),
  time: z.string().max(5),
  staffId: z.string().max(40).nullable().optional(),
  name: z.string().max(120),
  email: z.string().max(200),
  phone: z.string().max(30).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  locale: z.enum(["de", "en"]),
});

export const POST = route(async (request, db) => {
  const user = await requireStaff("manager");
  const appointment = await createStaffAppointment(db, await readJson(request, Body), `usr:${user.id}`);
  kick();
  return { id: appointment.id, status: appointment.status };
});
