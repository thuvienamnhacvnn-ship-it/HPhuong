import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { Lily, Ornament } from "@/components/decor";
import { AssistantWorkspace } from "@/components/AssistantWorkspace";
import { Frame } from "@/components/Frame";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.nav.assistant };
}

export default async function AdvicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale, t } = await pageContext(params);
  return (
    <Frame className="frame--assistant">
    <div className="assistant-page frame__fill">
      <Lily position="tr" />
      <div className="above-decor stack-sm">
        <h1 className="display display--md">
          {t.assistant.title1}
          <br />
          {t.assistant.title2}
        </h1>
        <p className="eyebrow">{t.assistant.eyebrow}</p>
        <Ornament />
      </div>
      <AssistantWorkspace locale={locale} />
    </div>
    </Frame>
  );
}
