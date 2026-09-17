import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "@/styles/globals.css";
import "@/styles/theme.css";
import "@/styles/decor.css";
import "@/styles/frames.css";
import { cookies } from "next/headers";
import { getDict, isLocale, LOCALES } from "@/i18n";
import { Chrome } from "@/components/Chrome";
import { PetalDefs } from "@/components/decor";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/catalog";
import { currentCustomer } from "@/lib/auth";

const cormorant = Cormorant_Garamond({ subsets: ["latin", "latin-ext", "vietnamese"], weight: ["500", "600", "700"], variable: "--font-cormorant", display: "swap" });
const inter = Inter({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-inter", display: "swap" });

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDict(isLocale(locale) ? locale : "de");
  const db = await getDb();
  const settings = await getSettings(db);
  return {
    title: { default: t.meta.title, template: `%s · HPHUONG` },
    description: t.meta.description,
    icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
    robots: settings.publicLaunchEnabled ? undefined : { index: false, follow: false },
    alternates: { languages: { de: "/de/start", en: "/en/start" } },
  };
}

export const viewport: Viewport = { themeColor: "#f8eee8", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const db = await getDb();
  const settings = await getSettings(db);
  const customer = await currentCustomer();
  const theme = (await cookies()).get("hp-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang={locale} data-theme={theme} className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <PetalDefs />
        <Chrome locale={locale} socialLinks={settings.socialLinks} demo={settings.isDemo} signedIn={!!customer} theme={theme}>
          {children}
        </Chrome>
      </body>
    </html>
  );
}
