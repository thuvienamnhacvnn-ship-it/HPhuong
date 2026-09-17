import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/theme.css";
import "@/styles/admin.css";
import { cookies } from "next/headers";

const cormorant = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], variable: "--font-cormorant", display: "swap" });
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Studio Verwaltung", template: "%s · HPHUONG Verwaltung" },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("hp-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="de" data-theme={theme} className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
