import { MEDIA, isMediaId } from "@/lib/media-config";

type Props = {
  id: string | null | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  imgClassName?: string;
  /** Art direction: a separate crop for small screens (≤ 900px), not the desktop image shrunk. */
  mobile?: { id: string; sizes: string };
};

const srcset = (id: string, ext: string) => {
  const m = MEDIA[id as keyof typeof MEDIA];
  return m.widths.map((w) => `/media/${id}-${w}.${ext} ${w}w`).join(", ");
};

/**
 * <picture> with AVIF/WebP srcsets from the build pipeline, explicit
 * width/height against layout shift, lazy unless `priority`.
 */
export function Img({ id, alt, sizes = "100vw", className, priority, style, imgStyle, imgClassName, mobile }: Props) {
  if (!isMediaId(id)) return null;
  const m = MEDIA[id];
  const fallback = `/media/${id}-${m.widths[Math.min(1, m.widths.length - 1)]}.webp`;
  const mq = "(max-width: 900px)";
  return (
    <picture className={className ? `pic ${className}` : "pic"} style={style}>
      {mobile && isMediaId(mobile.id) && (
        <>
          <source media={mq} type="image/avif" srcSet={srcset(mobile.id, "avif")} sizes={mobile.sizes} />
          <source media={mq} type="image/webp" srcSet={srcset(mobile.id, "webp")} sizes={mobile.sizes} />
        </>
      )}
      <source type="image/avif" srcSet={srcset(id, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(id, "webp")} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={m.width}
        height={m.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        style={imgStyle}
        className={imgClassName}
      />
    </picture>
  );
}
