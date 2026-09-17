"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { formatPrice } from "@/lib/money";
import { IconArrow } from "./icons";

export function VoucherQuickPick({ locale, amounts, target = "gutschein" }: { locale: Locale; amounts: number[]; target?: "gutschein" | "checkout" }) {
  const t = getDict(locale);
  const router = useRouter();
  const [amount, setAmount] = useState(amounts[1] ?? amounts[0]);
  return (
    <>
      <div className="amounts" role="group" aria-label={t.voucher.chooseAmount}>
        {amounts.map((a) => (
          <button key={a} type="button" className="amount" aria-pressed={a === amount} onClick={() => setAmount(a)}>
            {formatPrice(a, locale)}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn--block" onClick={() => router.push(`/${locale}/${target}?amount=${amount}`)}>
        {target === "checkout" ? t.voucher.continue : t.offers.voucherCta} <IconArrow />
      </button>
    </>
  );
}
