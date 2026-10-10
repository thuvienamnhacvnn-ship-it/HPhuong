import { Img } from "./Img";

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

/* Home banner: loose petals from the studio's petal sheet (scripts/home-decor.ts). Each sits where
   the mockup has one; the two soft-focus petals (1, 2) go where the mockup draws them blurred.
   x = left: a % of the banner, or "copy+N" = N banner units right of the copy column's left edge
   (so it can never slide under the text when the frame gets wide or narrow). y = top in % of the
   banner, s = width in banner units, r = rotation. m = also shown on phones: [left %, top %, width px]. */
/* Motion (motion.css / Motion.tsx):
   drift = this petal floats. Only three do, each on its own path:
           [keyframes a|b|c, dx px, dy px, extra rotation deg, period s, start delay s, lowest opacity].
           The periods share no common factor, so the petals never fall in step.
   depth = pointer-parallax amplitude in px: 3 = the far soft-focus petals, 10 = the big foreground
           petals at the banner edge. Petals beside the copy column have neither — they stay put. */
type Drift = ["a" | "b" | "c", number, number, number, number, number, number];
const HOME_PETALS: { img: number; x: number | `copy+${number}`; y: number; s: number; r?: number; m?: [number, number, number]; drift?: Drift; depth?: number }[] = [
  { img: 1, x: 1.2, y: 3.6, s: 8, m: [76, 5.2, 50], drift: ["a", 6, -10, 4, 17, 2.2, 0.86], depth: 3 },
  { img: 2, x: 36.6, y: 4, s: 6.4, depth: 3 },
  { img: 3, x: "copy+42.4", y: 23.4, s: 1.9 },
  { img: 3, x: 0.1, y: 32.4, s: 1.8, r: -14 },
  { img: 4, x: "copy+45", y: 55.2, s: 3.4 },
  { img: 5, x: -1, y: 62.5, s: 9.8, r: 24, depth: 10 },
  { img: 6, x: "copy+41.6", y: 67, s: 7.6, r: -22 },
  { img: 7, x: 0.5, y: 88, s: 5.4, r: 18, depth: 10 },
  { img: 4, x: 59.9, y: 11.4, s: 5.6, r: -10, drift: ["b", -9, 7, -5, 23, 3.9, 0.9] },
  { img: 8, x: 94.4, y: 82, s: 7.4, r: 14, m: [90, 27.6, 32], drift: ["c", 12, -14, 6, 29, 5.3, 0.88], depth: 10 },
];

export function HomePetals() {
  return (
    <div className="petals petals--home" aria-hidden data-mo="fade" style={{ ["--i" as string]: 6 }}>
      {HOME_PETALS.map((p, i) => (
        <Img
          key={i}
          id={`home-petal-${p.img}`}
          alt=""
          sizes="8vw"
          className={p.m ? "petals__one petals__one--m" : "petals__one"}
          style={{
            ["--x" as string]: typeof p.x === "number" ? `${p.x}%` : `calc(5.3cqw + ${p.x.slice(5)} * var(--u))`,
            ["--y" as string]: `${p.y}%`,
            ["--s" as string]: p.s,
            ["--r" as string]: `${p.r ?? 0}deg`,
            ...(p.m ? { ["--mx" as string]: `${p.m[0]}%`, ["--my" as string]: `${p.m[1]}%`, ["--ms" as string]: `${p.m[2]}px` } : {}),
            ...(p.drift
              ? {
                  ["--dx" as string]: `${p.drift[1]}px`,
                  ["--dy" as string]: `${p.drift[2]}px`,
                  ["--dr" as string]: `${p.drift[3]}deg`,
                  ["--dur" as string]: `${p.drift[4]}s`,
                  ["--dl" as string]: `${p.drift[5]}s`,
                  ["--do" as string]: p.drift[6],
                }
              : {}),
          }}
          data={{ "data-mo-drift": p.drift?.[0], "data-mo-depth": p.depth }}
        />
      ))}
    </div>
  );
}

/* Home banner waves (viewBox = mockup px). Three ribbons, back to front: two powder-rose ones
   that fade into the strip colour, then the strip's own edge. Every ribbon is an opaque shape
   with a fine light line on its crest — no blur, no translucent layer. */
const W1 =
  "M0,60 C41.7,59.7 175,60.7 250,58 C325,55.3 383.3,48.7 450,44 C516.7,39.3 583.3,29.8 650,30 C716.7,30.2 783.3,38.3 850,45 C916.7,51.7 983.3,64.5 1050,70 C1116.7,75.5 1146.3,76.7 1250,78 C1353.7,79.3 1601.7,78 1672,78";
const W2 =
  "M0,42 C25,43.7 100,48.7 150,52 C200,55.3 250,59 300,62 C350,65 396.7,68.3 450,70 C503.3,71.7 561.7,73.7 620,72 C678.3,70.3 736.7,62.8 800,60 C863.3,57.2 933.3,53 1000,55 C1066.7,57 1145,71.2 1200,72 C1255,72.8 1288.3,65 1330,60 C1371.7,55 1411.7,44.5 1450,42 C1488.3,39.5 1523,42.3 1560,45 C1597,47.7 1653.3,55.8 1672,58";
const W3 =
  "M0,62 C41.7,63.3 166.7,67.3 250,70 C333.3,72.7 425,83 500,82 C575,81 625,60 700,57 C775,54 866.7,62.2 950,66 C1033.3,69.8 1116.7,81.3 1200,79 C1283.3,76.7 1371.3,54.5 1450,52 C1528.7,49.5 1635,62 1672,64";
const WAVE_CLOSE = " L1672,86 L0,86 Z";

export function HomeWave({ uid = "home-wave" }: { uid?: string } = {}) {
  return (
    <div className="home-wave" aria-hidden>
      <svg viewBox="0 0 1672 84" preserveAspectRatio="none" focusable={false}>
        <defs>
          <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop className="home-wave__stop-a" offset="0.72" />
            <stop className="home-wave__stop-strip" offset="1" />
          </linearGradient>
          <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="0" y2="1">
            <stop className="home-wave__stop-b" offset="0.45" />
            <stop className="home-wave__stop-strip" offset="1" />
          </linearGradient>
        </defs>
        <path d={W1 + WAVE_CLOSE} fill={`url(#${uid}-a)`} />
        <path className="home-wave__line" d={W1} />
        <path d={W2 + WAVE_CLOSE} fill={`url(#${uid}-b)`} />
        <path className="home-wave__line" d={W2} />
        <path className="home-wave__fill" d={W3 + WAVE_CLOSE} />
        <path className="home-wave__line" d={W3} />
      </svg>
    </div>
  );
}

/* Foot of the category strip: two crossing lines; where the first runs above the second the
   lens between them is powder rose, as in the mockup. */
const FA =
  "M0,22 C41.7,19.7 150,7.7 250,8 C350,8.3 491.7,20.7 600,24 C708.3,27.3 800,30.7 900,28 C1000,25.3 1100,9 1200,8 C1300,7 1421.3,21 1500,22 C1578.7,23 1643.3,15.3 1672,14";
const FB =
  "M0,10 C41.7,12.7 150,25.7 250,26 C350,26.3 491.7,14.7 600,12 C708.3,9.3 800,7.7 900,10 C1000,12.3 1100,25.7 1200,26 C1300,26.3 1421.3,12.3 1500,12 C1578.7,11.7 1643.3,22 1672,24";
const FOOT_CLOSE = " L1672,42 L0,42 Z";

export function HomeFoot() {
  return (
    <div className="home-foot" aria-hidden>
      <svg viewBox="0 0 1672 40" preserveAspectRatio="none" focusable={false}>
        <path className="home-foot__rose" d={FA + FOOT_CLOSE} />
        <path className="home-wave__line" d={FA} />
        <path className="home-foot__base" d={FB + FOOT_CLOSE} />
        <path className="home-wave__line" d={FB} />
      </svg>
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
