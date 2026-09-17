"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconCalendar, IconChat, IconFlower, IconGift, IconHome, IconHourglass, IconLotus, IconSettings, IconUsers } from "../icons";
import { api } from "../api";
import { ThemeToggle, type Theme } from "../ThemeToggle";

const ITEMS = [
  { href: "/admin", label: "Übersicht", icon: IconHome, min: 1 },
  { href: "/admin/kalender", label: "Kalender", icon: IconCalendar, min: 1 },
  { href: "/admin/anfragen", label: "Anfragen", icon: IconHourglass, min: 2 },
  { href: "/admin/behandlungen", label: "Behandlungen", icon: IconFlower, min: 2 },
  { href: "/admin/gutscheine", label: "Gutscheine", icon: IconGift, min: 1 },
  { href: "/admin/kunden", label: "Kunden", icon: IconUsers, min: 2 },
  { href: "/admin/nachrichten", label: "Nachrichten", icon: IconChat, min: 2 },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: IconSettings, min: 2 },
];
const RANK: Record<string, number> = { therapist: 1, manager: 2, owner: 3 };
const ROLE_LABEL: Record<string, string> = { owner: "Inhaber:in", manager: "Leitung", therapist: "Mitarbeitende" };

export function AdminNav({ role, name, theme }: { role: string; name: string; theme: Theme }) {
  const pathname = usePathname();
  const router = useRouter();
  const rank = RANK[role] ?? 0;
  return (
    <aside className="rail admin-rail" aria-label="Verwaltung">
      <Link href="/admin" className="rail__brand">
        <img className="rail__logo" src="/media/logo-emblem-240.webp" alt="" width={80} height={92} style={{ objectFit: "contain" }} />
        <span className="rail__name">HPHUONG</span>
        <span className="rail__descriptor">Cosmetic &amp; Spa</span>
      </Link>
      <span className="rail__divider" aria-hidden />
      <nav className="admin-nav" aria-label="Bereiche">
        {ITEMS.filter((i) => rank >= i.min).map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              <Icon /> <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <span className="rail__spacer" />
      <div className="admin-user">
        <span className="ai-launch__orb" style={{ width: 52, height: 52 }}><IconLotus width={26} height={26} /></span>
        <ThemeToggle initial={theme} locale="de" />
        <strong>{name}</strong>
        <span className="small muted">{ROLE_LABEL[role]}</span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={async () => {
            await api("/api/admin/logout", { body: {} }).catch(() => undefined);
            router.replace("/admin/login");
            router.refresh();
          }}
        >
          Abmelden
        </button>
        <Link className="small link" href="/de/start" target="_blank">Website ansehen</Link>
      </div>
    </aside>
  );
}
