import { Img } from "./Img";

/**
 * The lettering under the monogram: the shop's name as live text — "BEAUTY COSMETIC" in rose gold on
 * top (with the leaf ornament cut from the studio's artwork, logo-name) and "HOÀNG" set on the arch
 * below. The box keeps the proportions of the old one-piece lettering (1119 × 413).
 */
export function BrandWord({ id, className = "", sizes, name = "Beauty Cosmetic", descriptor = "Hoàng" }: { id: string; className?: string; sizes: string; name?: string; descriptor?: string }) {
  return (
    <div className={`brand-word ${className}`}>
      <div className="brand-word__name">
        <span className="brand-word__text">{name.toUpperCase()}</span>
        <div className="brand-word__orn" aria-hidden>
          <Img id="logo-name" alt="" priority sizes={sizes} className="brand-word__orn-img" />
        </div>
      </div>
      <svg className="brand-word__arc" viewBox="0 0 1119 215" aria-hidden focusable="false">
        <path id={id} d="M 20 40 Q 559.5 372 1099 40" fill="none" />
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {descriptor.toUpperCase()}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
