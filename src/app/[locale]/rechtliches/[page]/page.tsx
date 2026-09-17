import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { pageContext } from "@/lib/page";
import { schema } from "@/lib/db";
import { Ornament } from "@/components/decor";
import { Frame } from "@/components/Frame";

type Props = { params: Promise<{ locale: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, db } = await pageContext(params);
  const [page] = await db.select().from(schema.contentPages).where(eq(schema.contentPages.id, (await params).page));
  return { title: page ? page.title[locale] : "404" };
}

/** Legal texts come from the CMS table; unapproved drafts are marked as such. */
export default async function LegalPage({ params }: Props) {
  const { locale, t, db } = await pageContext(params);
  const [page] = await db.select().from(schema.contentPages).where(eq(schema.contentPages.id, (await params).page));
  if (!page) notFound();
  return (
    <Frame className="frame--center">
    <div className="page narrow stack frame__fill">
      <h1 className="display display--md">{page.title[locale]}</h1>
      <Ornament />
      {!page.approved && <p className="notice notice--warn">{t.footer.draft}</p>}
      <div style={{ whiteSpace: "pre-wrap" }}>{page.body[locale]}</div>
    </div>
    </Frame>
  );
}
