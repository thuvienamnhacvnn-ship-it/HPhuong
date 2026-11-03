import { Img } from "./Img";

/**
 * The lettering under the monogram: "BEAUTY COSMETIC" in the same copper bevel as the old HPHUONG artwork,
 * the leaf ornament, and "HOÀNG" on the arch. One picture per theme (the arched line is brown on cream,
 * pale rose on graphite); CSS shows the one that matches.
 */
export function BrandWord({ className = "", sizes, name = "Beauty Cosmetic Hoàng" }: { id?: string; className?: string; sizes: string; name?: string; descriptor?: string }) {
  return (
    <div className={`brand-word ${className}`}>
      <Img id="logo-lockup" alt={name} priority sizes={sizes} className="brand-word__img brand-word__img--light" />
      <Img id="logo-lockup-dark" alt="" priority sizes={sizes} className="brand-word__img brand-word__img--dark" />
    </div>
  );
}
