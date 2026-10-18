import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { eq } from "drizzle-orm";
import { schema } from "../src/lib/db";
import { processDueJobs } from "../src/lib/notifications/worker";
import { createHold, submitAppointment } from "../src/lib/scheduling";
import { NOW, TUESDAY, contact, testDb } from "./helpers";

function gateway() {
  const calls: URL[] = [];
  const server = http.createServer((req, res) => {
    calls.push(new URL(req.url!, "http://x"));
    res.end("ok");
  });
  return new Promise<{ calls: URL[]; url: string; close: () => void }>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ calls, url: `http://127.0.0.1:${(server.address() as { port: number }).port}/send`, close: () => server.close() })),
  );
}

test("owner gets a WhatsApp message for every new booking, exactly once", async () => {
  const gw = await gateway();
  process.env.OWNER_WHATSAPP_PHONE = "+49 151 2345678";
  process.env.CALLMEBOT_APIKEY = "k123";
  process.env.CALLMEBOT_URL = gw.url;
  try {
    const db = await testDb();
    const h = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
    await submitAppointment(db, { ...contact({ name: "Test Kundin", phone: "+49 170 0000000" }), holdToken: h.holdToken }, NOW);
    await processDueJobs(db, NOW);
    await processDueJobs(db, NOW);
    assert.equal(gw.calls.length, 1, "one message, not two");
    assert.equal(gw.calls[0].searchParams.get("phone"), "491512345678");
    assert.equal(gw.calls[0].searchParams.get("apikey"), "k123");
    const text = gw.calls[0].searchParams.get("text")!;
    assert.match(text, /Neue Buchung/);
    assert.match(text, /Test Kundin/);
    const [job] = await db.select().from(schema.notificationJobs).where(eq(schema.notificationJobs.template, "owner_new_booking"));
    assert.equal(job.status, "sent");
    assert.equal(job.channel, "whatsapp");
    // the customer is never contacted on WhatsApp without opt-in
    const toCustomer = await db.select().from(schema.notificationJobs).where(eq(schema.notificationJobs.recipient, "+49 170 0000000"));
    assert.equal(toCustomer.length, 0);
  } finally {
    gw.close();
    delete process.env.OWNER_WHATSAPP_PHONE;
    delete process.env.CALLMEBOT_APIKEY;
    delete process.env.CALLMEBOT_URL;
  }
});

test("without a gateway key the owner alert lands in the dev outbox, never marked sent", async () => {
  process.env.OWNER_WHATSAPP_PHONE = "4915112345678";
  try {
    const db = await testDb();
    const h = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
    await submitAppointment(db, { ...contact(), holdToken: h.holdToken }, NOW);
    await processDueJobs(db, NOW);
    const [job] = await db.select().from(schema.notificationJobs).where(eq(schema.notificationJobs.template, "owner_new_booking"));
    assert.equal(job.status, "dev_outbox");
    const out = await db.select().from(schema.outbox).where(eq(schema.outbox.channel, "whatsapp"));
    assert.equal(out.length, 1);
  } finally {
    delete process.env.OWNER_WHATSAPP_PHONE;
  }
});

test("owner gets an SMS (seven.io format) when SMS_API_KEY is set, exactly once", async () => {
  const bodies: { key: string | undefined; form: URLSearchParams }[] = [];
  const server = http.createServer((req, res) => {
    const c: Buffer[] = [];
    req.on("data", (d) => c.push(d));
    req.on("end", () => {
      bodies.push({ key: req.headers["x-api-key"] as string | undefined, form: new URLSearchParams(Buffer.concat(c).toString()) });
      res.setHeader("content-type", "application/json");
      res.end('{"success":"100"}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.OWNER_WHATSAPP_PHONE = "+49 174 9050519";
  process.env.SMS_API_KEY = "sk1";
  process.env.SMS_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/sms`;
  try {
    const db = await testDb();
    const h = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
    await submitAppointment(db, { ...contact({ name: "SMS Kundin" }), holdToken: h.holdToken }, NOW);
    await processDueJobs(db, NOW);
    await processDueJobs(db, NOW);
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].key, "sk1");
    assert.equal(bodies[0].form.get("to"), "491749050519");
    assert.match(bodies[0].form.get("text")!, /SMS Kundin/);
    const [job] = await db.select().from(schema.notificationJobs).where(eq(schema.notificationJobs.template, "owner_new_booking"));
    assert.equal(job.channel, "sms");
    assert.equal(job.status, "sent");
  } finally {
    server.close();
    delete process.env.OWNER_WHATSAPP_PHONE;
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_URL;
  }
});

test("owner SMS can go out through the studio's own SIM (Android SMS gateway)", async () => {
  const got: { auth?: string; body: { phoneNumbers: string[]; message: string } }[] = [];
  const server = http.createServer((req, res) => {
    const c: Buffer[] = [];
    req.on("data", (d) => c.push(d));
    req.on("end", () => {
      got.push({ auth: req.headers.authorization, body: JSON.parse(Buffer.concat(c).toString()) });
      res.statusCode = 202;
      res.end("{}");
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.OWNER_WHATSAPP_PHONE = "+49 174 9050519";
  process.env.SMS_GATE_USER = "u";
  process.env.SMS_GATE_PASS = "p";
  process.env.SMS_GATE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}/m`;
  try {
    const db = await testDb();
    const h = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date: TUESDAY, time: "10:00" }, NOW);
    await submitAppointment(db, { ...contact({ name: "SIM Kundin" }), holdToken: h.holdToken }, NOW);
    await processDueJobs(db, NOW);
    assert.equal(got.length, 1);
    assert.equal(got[0].auth, `Basic ${Buffer.from("u:p").toString("base64")}`);
    assert.deepEqual(got[0].body.phoneNumbers, ["+491749050519"]);
    assert.match(got[0].body.message, /SIM Kundin/);
  } finally {
    server.close();
    for (const k of ["OWNER_WHATSAPP_PHONE", "SMS_GATE_USER", "SMS_GATE_PASS", "SMS_GATE_URL"]) delete process.env[k];
  }
});
