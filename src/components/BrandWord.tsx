/** The name under the turning monogram: HOÀNG + ornament + curved BEAUTY-COSMETIC (the owner's artwork). */
export function BrandWord({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed brand artwork from /public/brand
    <img
      className={`brand-word ${className}`}
      src="/brand/logo-lettering-998.webp"
      srcSet="/brand/logo-lettering-500.webp 500w, /brand/logo-lettering-998.webp 998w"
      sizes="(max-width: 900px) 60vw, 400px"
      width={998}
      height={380}
      alt="Beauty Cosmetic Hoàng"
    />
  );
}

/** The complete logo (monogram + lettering) for places without the turning 3D video. */
export function BrandFull({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fixed brand artwork from /public/brand
    <img
      className={`brand-full ${className}`}
      src="/brand/logo-full-720.webp"
      srcSet="/brand/logo-full-360.webp 360w, /brand/logo-full-720.webp 720w, /brand/logo-full-1247.webp 1247w"
      sizes="160px"
      width={1247}
      height={1261}
      alt="Beauty Cosmetic Hoàng"
    />
  );
}
