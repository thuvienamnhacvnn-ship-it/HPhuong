import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { one, pageContext } from "@/lib/page";
import { currentCustomer } from "@/lib/auth";
import { Lily, Ornament } from "@/components/decor";
import { MagicLinkForm } from "@/components/MagicLinkForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.login.title, robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, t } = await pageContext(params);
  if (await currentCustomer()) redirect(`/${locale}/konto`);
  const expired = one((await searchParams).error) === "expired";
  return (
    <div className="page" style={{ position: "relative", overflow: "hidden", minHeight: "70vh" }}>
      <Lily position="tr" />
      <div className="narrow stack above-decor">
        <h1 className="display display--md">{t.login.title}</h1>
        <Ornament />
        <p className="lead">{t.login.lead}</p>
        {expired && <p className="notice notice--warn" role="alert">{t.login.expired}</p>}
        <div className="card card--pad">
          <MagicLinkForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
