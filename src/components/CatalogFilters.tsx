"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { formatPrice } from "@/lib/money";
import { IconSearch } from "./icons";

/** Filters live in the URL: reload, share and Back/Forward keep them. */
export function CatalogFilters({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get("focus") === "search") inputRef.current?.focus();
  }, [params]);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    next.delete("focus");
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  // debounce search typing
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const id = setTimeout(() => update("q", q.trim() || null), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
      <div className="field grow">
        <label htmlFor="cat-q">{t.catalog.search}</label>
        <div className="input-icon">
          <IconSearch />
          <input ref={inputRef} id="cat-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.catalog.searchPlaceholder} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cat-price">{t.catalog.maxPrice}</label>
        <select id="cat-price" className="select" value={params.get("maxPrice") ?? ""} onChange={(e) => update("maxPrice", e.target.value || null)}>
          <option value="">{t.catalog.any}</option>
          {[5000, 7000, 10000].map((c) => (
            <option key={c} value={c}>
              {formatPrice(c, locale)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="cat-min">{t.catalog.maxMinutes}</label>
        <select id="cat-min" className="select" value={params.get("maxMinutes") ?? ""} onChange={(e) => update("maxMinutes", e.target.value || null)}>
          <option value="">{t.catalog.any}</option>
          {[45, 60, 90].map((m) => (
            <option key={m} value={m}>
              {m} {t.common.min}
            </option>
          ))}
        </select>
      </div>
      <label className="check" style={{ alignSelf: "end" }}>
        <input type="checkbox" checked={params.get("bookable") === "1"} onChange={(e) => update("bookable", e.target.checked ? "1" : null)} />
        <span>{t.catalog.onlyBookable}</span>
      </label>
    </form>
  );
}
