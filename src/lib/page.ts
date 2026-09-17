import "server-only";
import { notFound } from "next/navigation";
import { getDict, isLocale, type Locale } from "@/i18n";
import { getDb } from "./db";

export async function pageContext(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { locale: locale as Locale, t: getDict(locale), db: await getDb() };
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
