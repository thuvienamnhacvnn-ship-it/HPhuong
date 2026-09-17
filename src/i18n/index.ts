import de, { type Dict } from "./de";
import en from "./en";

export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export type { Dict };

export const isLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);
export const getDict = (locale: Locale): Dict => (locale === "en" ? en : de);
