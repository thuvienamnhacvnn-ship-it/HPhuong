/* Soft decorative layer: petal waves, floating petals, blurred colour blobs.
   Purely decorative — aria-hidden, pointer-events none, no motion with reduced-motion. */

export function SoftWave({ flip = false, className = "" }: { flip?: boolean; className?: string }) {
  return (
    <div className={`soft-wave ${flip ? "soft-wave--flip" : ""} ${className}`} aria-hidden>
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" focusable={false}>
        <path className="soft-wave__fill" d="M0,56 C180,86 360,26 540,40 C720,54 840,88 1020,70 C1200,52 1320,20 1440,34 L1440,90 L0,90 Z" />
        <path className="soft-wave__line" d="M0,50 C180,80 360,20 540,34 C720,48 840,82 1020,64 C1200,46 1320,14 1440,28" fill="none" />
      </svg>
    </div>
  );
}

const PETAL = "M12 1C16 6 17 11 12 23C7 11 8 6 12 1Z";

export function FloatingPetals({ count = 6, className = "" }: { count?: number; className?: string }) {
  const petals = Array.from({ length: count }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    top: (i * 53 + 7) % 100,
    size: 14 + ((i * 7) % 16),
    rotate: (i * 47) % 360,
    delay: (i * 1.7) % 9,
    duration: 11 + ((i * 3) % 8),
  }));
  return (
    <div className={`petals ${className}`} aria-hidden>
      {petals.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          focusable={false}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            ["--r" as string]: `${p.rotate}deg`,
            animationDelay: `-${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          <path d={PETAL} />
        </svg>
      ))}
    </div>
  );
}

/** Thin gold lily line-art, used large and faint behind hero content. */
export function LilyLineArt({ className = "" }: { className?: string }) {
  return (
    <svg className={`lily-line ${className}`} viewBox="0 0 200 200" aria-hidden focusable={false}>
      <g fill="none" strokeWidth="0.8" strokeLinecap="round">
        <path d="M100 190 C98 150 96 120 100 92" />
        <path d="M100 92 C88 70 70 58 52 58 C62 76 78 90 100 92Z" />
        <path d="M100 92 C112 70 130 58 148 58 C138 76 122 90 100 92Z" />
        <path d="M100 92 C92 64 94 34 100 10 C106 34 108 64 100 92Z" />
        <path d="M100 92 C80 86 58 94 40 112 C62 118 84 108 100 92Z" />
        <path d="M100 92 C120 86 142 94 160 112 C138 118 116 108 100 92Z" />
        <path d="M100 150 C84 140 70 142 58 152 C72 160 88 158 100 150Z" />
        <path d="M100 138 C116 126 132 126 144 134 C132 144 116 146 100 138Z" />
        <circle cx="94" cy="66" r="1.4" />
        <circle cx="106" cy="64" r="1.4" />
        <circle cx="100" cy="60" r="1.4" />
      </g>
    </svg>
  );
}
