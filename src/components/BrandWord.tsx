"use client";

import { useId } from "react";

/** Shared live lettering, also rendered by scripts/brand-share.tsx for the share card. */
export function BrandWord({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg className={`brand-word ${className}`} viewBox="0 0 600 220" role="img" aria-label="Beauty Cosmetic Hoàng">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0b2" />
          <stop offset="0.32" stopColor="#d9b653" />
          <stop offset="0.5" stopColor="#a87925" />
          <stop offset="0.56" stopColor="#f8df8c" />
          <stop offset="1" stopColor="#bd8d32" />
        </linearGradient>
        <path id={`${id}-arc`} d="M 75,145 Q 300,245 525,145" />
      </defs>
      <text className="brand-word__hoang" x="300" y="117" textAnchor="middle" fill={`url(#${id}-gold)`}>HOÀNG</text>
      <text className="brand-word__descriptor" fill={`url(#${id}-gold)`}>
        <textPath href={`#${id}-arc`} startOffset="50%" textAnchor="middle">Beauty - Cosmetic</textPath>
      </text>
    </svg>
  );
}
