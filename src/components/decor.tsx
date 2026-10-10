import { IconStar } from "./icons";
import { Img } from "./Img";
import { ArchSlides } from "./ArchSlides";

/** `i` = place in the home entrance sequence (motion.css); other pages leave it out. */
export function Ornament({ className = "", i }: { className?: string; i?: number }) {
  return (
    <div className={`ornament ${className}`} aria-hidden {...(i === undefined ? {} : { "data-mo": "orn", style: { ["--i" as string]: i } })}>
      <IconStar />
    </div>
  );
}

/** Decorative lily in a corner: pointer-events none, empty alt, never behind form text. */
export function Lily({ position = "tr" }: { position?: "tr" | "tr-sm" | "bl" }) {
  return (
    <div className={`decor-lily decor-lily--${position}`} aria-hidden>
      <Img id="decor-lily" alt="" sizes="(max-width: 900px) 200px, 420px" />
    </div>
  );
}

/**
 * Shared SVG defs: the lily-petal and home-arch clip paths (objectBoundingBox,
 * so they scale with any frame). Rendered once in the shell.
 */
export function PetalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable={false}>
      <defs>
        <clipPath id="petal-clip" clipPathUnits="objectBoundingBox">
          <path d={PETAL_PATH} />
        </clipPath>
        <clipPath id="arch-clip" clipPathUnits="objectBoundingBox">
          <path d={ARCH_CLIP} />
        </clipPath>
      </defs>
    </svg>
  );
}

// Tip at the top right, round belly at the bottom left — keeps faces (right-centre of the photos) inside.
export const PETAL_PATH = "M0.985,0.02 C0.62,0.03 0.2,0.2 0.06,0.56 C-0.03,0.8 0.06,0.985 0.34,0.985 C0.72,0.985 0.96,0.62 0.985,0.02 Z";

export function PetalFrame({
  imageId,
  alt,
  priority,
  sizes,
  mobile,
  imgClassName,
}: {
  imageId: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  mobile?: { id: string; sizes: string };
  imgClassName?: string;
}) {
  return (
    <div className="petal">
      <div className="petal__clip">
        <Img id={imageId} alt={alt} priority={priority} sizes={sizes} mobile={mobile} imgClassName={imgClassName} />
      </div>
      <svg className="petal__stroke" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden focusable={false}>
        <path className="petal__line" d={PETAL_PATH} />
        <path className="petal__hi" d={PETAL_PATH} transform="translate(0.012 -0.012)" />
      </svg>
    </div>
  );
}

/* Home banner arch. One big arc bulging up-left; the right and top edges sit on the banner edge.
   Box = the photo's box (703 × 734 in the mockup); everything left of x 0 is the pale band. */
const ARCH_CLIP = "M1,0.042 C0.789,-0.010 0.516,-0.003 0.329,0.113 C0.090,0.258 -0.007,0.586 0,0.843 L0,1 L1,1 Z";
const ARCH_LINE = "M703,31 C554.4,-7.6 363,-2.2 231,83 C63.4,189.6 -5.1,429.9 0,619 L0,734";
const ARCH_INNER =
  "M420,-8 C405.2,-5 362.5,0.8 331,10 C299.5,19.2 264.3,28.8 231,47 C197.7,65.2 160.2,85.7 131,119 C101.8,152.3 75,212.3 56,247 C37,281.7 25.8,302.8 17,327 C8.2,351.2 5.8,377.5 3,392 C0.2,406.5 0.5,410.3 0,414";
const ARCH_OUTER = "M104,0 C96.8,7.3 73.8,26.7 61,44 C48.2,61.3 35.8,84 27,104 C18.2,124 12.2,142.3 8,164 C3.8,185.7 3.3,192.3 2,234 C0.7,275.7 0.3,384 0,414";
const ARCH_FAR = "M-64,0 C-62,18.3 -57.7,68.3 -52,110 C-46.3,151.7 -37.3,208.3 -30,250 C-22.7,291.7 -13,332.7 -8,360 C-3,387.3 -1.3,405 0,414";
/* closes far outside the banner (clipped by .home), so the band can shift a few px without baring an edge */
const ARCH_FILL_TO = " L0,619 L740,619 L740,-40 Z";
/* Travelling highlight on the arc: [dash length in 1/1000 of the arc, opacity]. The four dashes share
   one leading end, so stacked they give a bright head (about 0.95) and a fading tail. */
const ARCH_TRACE: [number, number][] = [
  [190, 0.16],
  [120, 0.24],
  [62, 0.38],
  [20, 0.85],
];

/**
 * The banner photo is its own layer: one <Img> under an SVG clip. The gold arc, the pale band
 * and whatever is passed as children (the treatment card) sit outside the image file, so the
 * photo can be swapped without touching anything else. Focal point: `--hero-pos` (decor.css).
 */
export function ArchFrame({
  imageId,
  alt,
  priority,
  sizes,
  mobile,
  slides,
  children,
}: {
  imageId: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  mobile?: { id: string; sizes: string };
  /** More pictures for the slide show (ArchSlides); `pos` = their focal point. */
  slides?: { id: string; pos?: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="arch">
      <svg className="arch__band" data-mo-depth="3" viewBox="0 0 703 734" preserveAspectRatio="none" aria-hidden focusable={false}>
        <defs>
          <linearGradient id="arch-band" gradientUnits="userSpaceOnUse" x1="20" y1="300" x2="230" y2="40">
            <stop className="arch__stop-a" offset="0.5" />
            <stop className="arch__stop-b" offset="1" />
          </linearGradient>
          <linearGradient id="arch-fade" gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="414">
            <stop className="arch__stop-gold" offset="0" />
            <stop className="arch__stop-gold" offset="1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="arch__far" d={ARCH_FAR + ARCH_FILL_TO} />
        <path d={ARCH_OUTER + ARCH_FILL_TO} fill="url(#arch-band)" />
        <path className="arch__in" d={ARCH_INNER + ARCH_FILL_TO} />
        <path className="arch__hair" d={ARCH_FAR} />
        <path className="arch__hair" d={ARCH_INNER} />
        <path className="arch__outer" d={ARCH_OUTER} stroke="url(#arch-fade)" />
      </svg>
      {/* data-mo-depth: pointer parallax (Motion.tsx). Photo and arc move as ONE layer (same values);
          data-mo-one = only towards the banner's top/right edge, so no edge is ever bared. */}
      <div className="arch__photo" data-mo-depth="8" data-mo-depth-y="4" data-mo-one="">
        <Img id={imageId} alt={alt} priority={priority} sizes={sizes} mobile={mobile} />
        {slides?.map((s) => (
          <Img key={s.id} id={s.id} alt="" sizes={sizes} imgStyle={s.pos ? { objectPosition: s.pos } : undefined} />
        ))}
        {slides && slides.length > 0 && <ArchSlides />}
      </div>
      <svg className="arch__line" data-mo-depth="8" data-mo-depth-y="4" data-mo-one="" viewBox="0 0 703 734" preserveAspectRatio="none" aria-hidden focusable={false}>
        <path className="arch__edge" d={ARCH_LINE} />
        <path className="arch__gold" d={ARCH_LINE} />
        <path className="arch__hi" d={ARCH_LINE} transform="translate(2.2 2.2)" />
        {/* Own strokes on the same path: non-scaling-stroke would ignore pathLength, so these scale with the box. */}
        {ARCH_TRACE.map(([len, o]) => (
          <path key={len} className="arch__trace" d={ARCH_LINE} pathLength={1000} style={{ ["--len" as string]: `${len}px`, ["--o" as string]: o }} />
        ))}
      </svg>
      {children}
    </div>
  );
}
