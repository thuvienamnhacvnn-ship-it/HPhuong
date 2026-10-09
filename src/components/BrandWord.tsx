import { Img } from "./Img";

/**
 * The lettering under the monogram: "HPHUONG" with its leaf ornament from the studio's artwork
 * (logo-name, cut from logo-full) and the descriptor set as live text on the same arch the
 * artwork used — so the name can change without redrawing the logo.
 * The box keeps the proportions of the old one-piece lettering (1119 × 413).
 */
export function BrandWord({ id, className = "", sizes, descriptor = "Beauty & Spa" }: { id: string; className?: string; sizes: string; descriptor?: string }) {
  return (
    <div className={`brand-word ${className}`}>
      <Img id="logo-name" alt="" priority sizes={sizes} className="brand-word__name" />
      <svg className="brand-word__arc" viewBox="0 0 1119 215" aria-hidden focusable="false">
        <path id={id} d="M 150 34 Q 559.5 296 969 34" fill="none" />
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {descriptor.toUpperCase()}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
