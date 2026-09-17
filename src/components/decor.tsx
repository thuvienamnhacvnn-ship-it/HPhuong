import { IconStar } from "./icons";
import { Img } from "./Img";

export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`ornament ${className}`} aria-hidden>
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
 * Shared SVG defs: the lily-petal clip path (objectBoundingBox, so it scales
 * with any frame). Rendered once in the shell.
 */
export function PetalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable={false}>
      <defs>
        <clipPath id="petal-clip" clipPathUnits="objectBoundingBox">
          <path d={PETAL_PATH} />
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
        <path d={PETAL_PATH} fill="none" stroke="#B58A55" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <path d={PETAL_PATH} fill="none" stroke="#E6CFA6" strokeWidth="1" vectorEffect="non-scaling-stroke" transform="translate(0.012 -0.012)" opacity="0.8" />
      </svg>
    </div>
  );
}
