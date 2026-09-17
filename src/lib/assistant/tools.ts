/**
 * Read-only tools for the beauty assistant. Every input is validated here on
 * the server; IDs and prices the model mentions are never trusted — cards are
 * rebuilt from the database. None of these tools can book, pay, message or
 * change anything.
 */
import { z } from "zod";
import type { DbOrTx } from "../db";
import { getOffer, getService, getSettings, listOffers, listServices, type ServiceWithVariants } from "../catalog";
import { getAvailability, todayLocal } from "../scheduling";
import { addDays, isValidDateString } from "../time";
import { DomainError } from "../errors";

export type Card = {
  serviceId: string;
  variantId: string;
  name: { de: string; en: string };
  minutes: number;
  priceCents: number;
  imageAssetId: string | null;
  teaser: { de: string; en: string };
  reason: string;
  withinBudget: boolean | null;
  suggestedDate?: string;
  suggestedTime?: string;
};

export const TOOL_DEFS = [
  {
    name: "search_services",
    description:
      "List the studio's bookable treatments with variants (minutes, priceCents). Optional filters. Use this before recommending anything.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", enum: ["gesicht", "massage", "head-spa", "pflege"] },
        maxPriceCents: { type: "integer", minimum: 0 },
        maxMinutes: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_service",
    description: "Details of one treatment: approved description, steps, preparation notes, variants.",
    input_schema: { type: "object" as const, properties: { serviceId: { type: "string" } }, required: ["serviceId"], additionalProperties: false },
  },
  {
    name: "get_offer",
    description: "Current offers/packages, or one offer by id, with price, total minutes and booking mode.",
    input_schema: { type: "object" as const, properties: { offerId: { type: "string" } }, additionalProperties: false },
  },
  {
    name: "get_availability",
    description: "Free start times for a treatment variant, from a date (YYYY-MM-DD, studio time zone) for up to 7 days.",
    input_schema: {
      type: "object" as const,
      properties: {
        serviceId: { type: "string" },
        variantId: { type: "string" },
        fromDate: { type: "string", description: "YYYY-MM-DD" },
        days: { type: "integer", minimum: 1, maximum: 7 },
      },
      required: ["serviceId", "variantId"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_booking",
    description:
      "Show the guest a recommendation card with a button to view or choose a time. This does NOT book anything. Call once per recommended treatment (max 3). Set withinBudget honestly against the guest's stated budget (null if no budget given).",
    input_schema: {
      type: "object" as const,
      properties: {
        serviceId: { type: "string" },
        variantId: { type: "string" },
        reason: { type: "string", description: "One short sentence in the guest's language, no health promises." },
        withinBudget: { type: ["boolean", "null"] },
        date: { type: "string", description: "Optional YYYY-MM-DD from get_availability" },
        time: { type: "string", description: "Optional HH:MM from get_availability" },
      },
      required: ["serviceId", "variantId", "reason", "withinBudget"],
      additionalProperties: false,
    },
  },
];

const schemas = {
  search_services: z.object({
    category: z.enum(["gesicht", "massage", "head-spa", "pflege"]).optional(),
    maxPriceCents: z.number().int().min(0).optional(),
    maxMinutes: z.number().int().min(0).optional(),
  }).strict(),
  get_service: z.object({ serviceId: z.string().max(80) }).strict(),
  get_offer: z.object({ offerId: z.string().max(80).optional() }).strict(),
  get_availability: z.object({
    serviceId: z.string().max(80),
    variantId: z.string().max(20),
    fromDate: z.string().optional(),
    days: z.number().int().min(1).max(7).optional(),
  }).strict(),
  propose_booking: z.object({
    serviceId: z.string().max(80),
    variantId: z.string().max(20),
    reason: z.string().min(1).max(240),
    withinBudget: z.boolean().nullable(),
    date: z.string().optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).strict(),
};

const publicService = (s: ServiceWithVariants, locale: "de" | "en") => ({
  serviceId: s.id,
  category: s.category,
  name: s.name[locale],
  teaser: s.teaser[locale],
  bookable: s.bookable,
  variants: s.variants.map((v) => ({ variantId: v.id, minutes: v.minutes, priceCents: v.priceCents })),
  contentApprovedByStudio: s.contentApproved,
});

export async function runTool(db: DbOrTx, name: string, rawInput: unknown, locale: "de" | "en", cards: Card[], now = new Date()): Promise<unknown> {
  switch (name) {
    case "search_services": {
      const input = schemas.search_services.parse(rawInput);
      const list = await listServices(db, { category: input.category, maxPriceCents: input.maxPriceCents, maxMinutes: input.maxMinutes, bookableOnly: true });
      return { services: list.map((s) => publicService(s, locale)), currency: "EUR", note: "Prices are demo prices pending studio approval." };
    }
    case "get_service": {
      const { serviceId } = schemas.get_service.parse(rawInput);
      const s = await getService(db, serviceId);
      if (!s) return { error: "service_not_found" };
      return { ...publicService(s, locale), description: s.description[locale], steps: s.steps[locale], preparation: s.preparation[locale] };
    }
    case "get_offer": {
      const { offerId } = schemas.get_offer.parse(rawInput);
      if (offerId) {
        const found = await getOffer(db, offerId, now);
        if (!found || !found.current) return { error: "offer_not_available" };
        return {
          offerId: found.offer.id,
          name: found.offer.name[locale],
          priceCents: found.offer.priceCents,
          treatmentMinutes: found.offer.treatmentMinutes,
          components: found.components.map((c) => c.service.name[locale]),
          bookingMode: found.offer.bookingMode === "staff_scheduling_request" ? "request_only_staff_schedule" : "bookable",
        };
      }
      const offers = await listOffers(db, now);
      return { offers: offers.map((o) => ({ offerId: o.id, name: o.name[locale], priceCents: o.priceCents, treatmentMinutes: o.treatmentMinutes })) };
    }
    case "get_availability": {
      const input = schemas.get_availability.parse(rawInput);
      const settings = await getSettings(db);
      const today = todayLocal(settings.timezone, now);
      const from = input.fromDate && isValidDateString(input.fromDate) && input.fromDate >= today ? input.fromDate : today;
      try {
        const result = await getAvailability(db, { serviceId: input.serviceId, variantId: input.variantId, from, days: input.days ?? 3 }, now);
        return {
          timezone: settings.timezone,
          days: result.days.map((d) => ({ date: d.date, closed: d.closed, times: d.slots.slice(0, 8).map((s) => s.time) })),
          note: "Times are not reserved. The guest must choose and submit on the booking page; staff confirm.",
          lastDay: addDays(today, settings.bookingHorizonDays),
        };
      } catch (error) {
        if (error instanceof DomainError) return { error: error.code };
        throw error;
      }
    }
    case "propose_booking": {
      const input = schemas.propose_booking.parse(rawInput);
      if (cards.length >= 3) return { error: "max_three_cards" };
      const s = await getService(db, input.serviceId);
      const variant = s?.variants.find((v) => v.id === input.variantId);
      if (!s || !variant || !s.bookable) return { error: "unknown_service_or_variant" };
      if (cards.some((c) => c.serviceId === s.id && c.variantId === variant.id)) return { ok: true, note: "already shown" };
      cards.push({
        serviceId: s.id,
        variantId: variant.id,
        name: s.name,
        minutes: variant.minutes,
        priceCents: variant.priceCents, // from the database, never from the model
        imageAssetId: s.imageAssetId,
        teaser: s.teaser,
        reason: input.reason,
        withinBudget: input.withinBudget,
        suggestedDate: input.date && isValidDateString(input.date) ? input.date : undefined,
        suggestedTime: input.date && input.time ? input.time : undefined,
      });
      return { ok: true, shownPriceCents: variant.priceCents, shownMinutes: variant.minutes };
    }
    default:
      return { error: "unknown_tool" };
  }
}
