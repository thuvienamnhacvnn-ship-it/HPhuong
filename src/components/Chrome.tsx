"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDict, type Locale } from "@/i18n";
import {
  IconCalendar,
  IconClose,
  IconDots,
  IconFacebook,
  IconHome,
  IconInstagram,
  IconLeaf,
  IconLotus,
  IconSearch,
  IconTiktok,
  IconUser,
  IconYoutube,
} from "./icons";
import { AssistantChat } from "./AssistantChat";
import { ThemeToggle, type Theme } from "./ThemeToggle";

type Props = {
  locale: Locale;
  socialLinks: Record<string, string>;
  demo: boolean;
  signedIn: boolean;
  theme: Theme;
  children: React.ReactNode;
};

const SOCIAL_ICONS: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  instagram: IconInstagram,
  facebook: IconFacebook,
  youtube: IconYoutube,
  tiktok: IconTiktok,
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Chrome({ locale, socialLinks, demo, signedIn, theme, children }: Props) {
  const t = getDict(locale);
  const pathname = usePathname();
  const router = useRouter();
  // Overlays remember the path they were opened on, so navigating closes them without an effect.
  const [assistantAt, setAssistantAt] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const assistantOpen = assistantAt === pathname;
  const menuOpen = menuAt === pathname;
  const setAssistantOpen = (v: boolean) => setAssistantAt(v ? pathname : null);
  const setMenuOpen = (v: boolean) => setMenuAt(v ? pathname : null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const section = pathname.split("/")[2] ?? "start";
  const is = (...names: string[]) => names.includes(section);
  const current = (...names: string[]) => (is(...names) ? ("page" as const) : undefined);

  const nav = [
    { key: "start", href: `/${locale}/start`, label: t.nav.start, match: ["start"] },
    { key: "behandlungen", href: `/${locale}/behandlungen`, label: t.nav.behandlungen, match: ["behandlungen"] },
    { key: "angebote", href: `/${locale}/angebote`, label: t.nav.angebote, match: ["angebote", "gutschein", "checkout", "bestellung"] },
    { key: "studio", href: `/${locale}/studio`, label: t.nav.studio, match: ["studio"] },
    { key: "kontakt", href: `/${locale}/kontakt`, label: t.nav.kontakt, match: ["kontakt"] },
  ];

  const otherLocale = locale === "de" ? "en" : "de";
  const switchHref = (to: Locale) => `/${to}${pathname.slice(3)}`;
  // Keep filters/selection when switching language (query read at click time, no Suspense needed).
  const keepQuery = (to: Locale) => (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`${switchHref(to)}${window.location.search}`);
  };

  const open = useCallback((setter: (v: boolean) => void) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setter(true);
  }, []);

  const close = useCallback(() => {
    setAssistantAt(null);
    setMenuAt(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);


  const socials = Object.entries(socialLinks).filter(([k, v]) => SOCIAL_ICONS[k] && /^https:\/\//.test(v));
  const onAssistantPage = is("beratung");

  return (
    <>
      <a className="skip-link" href="#inhalt">{t.nav.skip}</a>
      <div className="shell" inert={assistantOpen || menuOpen ? true : undefined}>
        <div className="main">
          {demo && <div className="demo-bar" role="note">{t.common.demoNotice}</div>}
          <header className="header">
            <Link href={`/${locale}/start`} className="brand" aria-label={`HPHUONG ${t.brand.descriptor} — ${t.nav.home}`}>
              <img className="brand__emblem" src="/media/logo-emblem-120.webp" srcSet="/media/logo-emblem-120.webp 1x, /media/logo-emblem-240.webp 2x" width={42} height={48} alt="" />
              <span>
                <span className="brand__name">HPHUONG</span>
                <span className="brand__descriptor">{t.brand.descriptor}</span>
              </span>
            </Link>
            <nav className="header__nav" aria-label={t.nav.mainNav}>
              {nav.map((n) => (
                <Link key={n.key} href={n.href} className="header__link" aria-current={current(...n.match)}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="header__tools">
              <div className="lang" aria-label={t.nav.language}>
                <Link onClick={keepQuery("de")} href={switchHref("de")} aria-current={locale === "de" ? "true" : undefined} lang="de" hrefLang="de">DE</Link>
                <span aria-hidden>|</span>
                <Link onClick={keepQuery("en")} href={switchHref("en")} aria-current={locale === "en" ? "true" : undefined} lang="en" hrefLang="en">EN</Link>
              </div>
              <Link className="icon-btn" href={`/${locale}/behandlungen?focus=search`} title={t.nav.search}>
                <IconSearch />
                <span className="sr-only">{t.nav.search}</span>
              </Link>
              <ThemeToggle initial={theme} locale={locale} />
              <Link className="icon-btn" href={signedIn ? `/${locale}/konto` : `/${locale}/login`} title={t.nav.account} aria-current={current("konto", "login")}>
                <IconUser />
                <span className="sr-only">{t.nav.account}</span>
              </Link>
              {!onAssistantPage && (
                <button type="button" className="ai-pill" onClick={() => open(setAssistantOpen)} aria-haspopup="dialog">
                  <IconLotus /> <span>{t.nav.assistantShort}</span>
                </button>
              )}
              <Link className="btn btn--sm header__cta" href={`/${locale}/termin`} aria-current={current("termin")}>
                <IconCalendar width={18} height={18} /> {t.nav.book}
              </Link>
            </div>
          </header>

          <header className="m-header">
            <Link href={`/${locale}/start`} className="m-header__brand" aria-label={`HPHUONG ${t.brand.descriptor} — ${t.nav.home}`}>
              <img src="/media/logo-emblem-120.webp" srcSet="/media/logo-emblem-120.webp 1x, /media/logo-emblem-240.webp 2x" width={40} height={46} alt="" />
              <span>
                <span className="m-header__name">HPHUONG</span>
                <span className="m-header__descriptor">{t.brand.descriptor}</span>
              </span>
            </Link>
            <div className="m-header__tools">
              <ThemeToggle initial={theme} locale={locale} />
              <Link className="icon-btn" onClick={keepQuery(otherLocale)} href={switchHref(otherLocale)} hrefLang={otherLocale} title={t.nav.language}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.08em" }}>{otherLocale.toUpperCase()}</span>
              </Link>
              <Link className="icon-btn" href={signedIn ? `/${locale}/konto` : `/${locale}/login`} title={t.nav.account}>
                <IconUser />
                <span className="sr-only">{t.nav.account}</span>
              </Link>
            </div>
          </header>

          <main id="inhalt" className="content" tabIndex={-1}>
            {children}
          </main>

          <footer className="site-footer">
            <span>{t.home.eyebrow.join(" · ")}</span>
            <nav aria-label="Rechtliches">
              <Link href={`/${locale}/rechtliches/impressum`}>{t.footer.impressum}</Link>
              <Link href={`/${locale}/rechtliches/datenschutz`}>{t.footer.datenschutz}</Link>
            </nav>
            <span>{t.brand.tagline}</span>
          </footer>
        </div>

        {!onAssistantPage && (
          <button type="button" className="ai-fab" onClick={() => open(setAssistantOpen)} aria-haspopup="dialog">
            <span className="ai-launch__orb"><IconLotus /></span>
            <span>{t.nav.assistantShort}</span>
          </button>
        )}

        <nav className="dock" aria-label={t.nav.quickNav}>
          <Link href={`/${locale}/start`} aria-current={current("start")}>
            <IconHome />
            <span>{t.nav.start}</span>
          </Link>
          <Link href={`/${locale}/behandlungen`} aria-current={current("behandlungen")}>
            <IconLeaf />
            <span>{t.nav.care}</span>
          </Link>
          <Link href={`/${locale}/termin`} aria-current={current("termin")}>
            <IconCalendar />
            <span>{t.nav.appointments}</span>
          </Link>
          <button type="button" onClick={() => open(setMenuOpen)} aria-haspopup="dialog" aria-expanded={menuOpen}>
            <IconDots />
            <span>{t.nav.more}</span>
          </button>
        </nav>
      </div>

      {assistantOpen && (
        <Dialog label={t.nav.assistant} onClose={close}>
          <div className="modal__head">
            <div>
              <p className="eyebrow">{t.assistant.eyebrow}</p>
              <h2>{t.assistant.greeting}</h2>
            </div>
            <button type="button" className="icon-btn icon-btn--ring" onClick={close}>
              <IconClose />
              <span className="sr-only">{t.nav.close}</span>
            </button>
          </div>
          <AssistantChat locale={locale} compact />
          <Link className="link small" href={`/${locale}/beratung`}>{t.assistant.openFull}</Link>
        </Dialog>
      )}

      {menuOpen && (
        <Dialog label={t.nav.menu} onClose={close} sheet>
          <div className="sheet__head">
            <h2>{t.nav.menu}</h2>
            <button type="button" className="icon-btn icon-btn--ring" onClick={close}>
              <IconClose />
              <span className="sr-only">{t.nav.close}</span>
            </button>
          </div>
          <ul className="sheet__list">
            {[...nav, { key: "beratung", href: `/${locale}/beratung`, label: t.nav.assistant, match: ["beratung"] }, { key: "gutschein", href: `/${locale}/gutschein`, label: t.offers.voucherTitle, match: ["gutschein"] }, { key: "konto", href: signedIn ? `/${locale}/konto` : `/${locale}/login`, label: t.nav.account, match: ["konto", "login"] }].map((n) => (
              <li key={n.key}>
                <Link href={n.href} aria-current={current(...n.match)} onClick={() => setMenuOpen(false)}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 16 }}>
            <ThemeToggle initial={theme} locale={locale} withLabel />
            <Link className="chip" onClick={keepQuery("de")} href={switchHref("de")} aria-current={locale === "de" ? "true" : undefined}>Deutsch</Link>
            <Link className="chip" onClick={keepQuery("en")} href={switchHref("en")} aria-current={locale === "en" ? "true" : undefined}>English</Link>
          </div>
          {socials.length > 0 && (
            <div className="row" style={{ marginTop: 12 }}>
              {socials.map(([key, href]) => {
                const Icon = SOCIAL_ICONS[key];
                return (
                  <a key={key} className="icon-btn icon-btn--ring" href={href} target="_blank" rel="noopener noreferrer">
                    <Icon />
                    <span className="sr-only">{key}</span>
                  </a>
                );
              })}
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}

/** Modal with focus trap, Escape, and focus return (handled by the caller's onClose). */
function Dialog({ label, onClose, sheet, children }: { label: string; onClose: () => void; sheet?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current!;
    const first = node.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const [a, b] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  if (sheet) {
    return (
      <>
        <div className="sheet-backdrop" onClick={onClose} />
        <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
          {children}
        </div>
      </>
    );
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {children}
      </div>
    </div>
  );
}
