/**
 * Petals falling in the wind, on every public page (mounted in the locale layout; admin has its
 * own layout and stays calm). Decoration only: a fixed layer that takes no pointer events, sits
 * under the header, the dock and every dialog, and is switched off for reduced motion.
 *
 * Pure CSS (styles/petal-fall.css): each petal is three nested boxes — one falls and drifts
 * downwind, one swings in the gusts, the image itself turns and tumbles — so only transforms and
 * opacity animate and no script runs per frame. The numbers below are fixed, not random, so server
 * and client render the same thing.
 */

// x = start (vw, may be off the left edge: the wind carries them in) · s = size (px) · d = fall (s)
// dl = start offset (s, negative = already on its way) · w = drift downwind (vw) · a = swing (px)
// sd = swing period (s) · rd = turn period (s) · o = opacity · img = petal picture
const PETALS = [
  { x: 6, s: 30, d: 19, dl: -2, w: 26, a: 46, sd: 4.6, rd: 9, o: 0.9, img: "1-102" },
  { x: 71, s: 22, d: 23, dl: -11, w: 20, a: 34, sd: 5.4, rd: 12, o: 0.7, img: "3-60" },
  { x: 38, s: 40, d: 16, dl: -7, w: 34, a: 62, sd: 3.9, rd: 8, o: 0.95, img: "4-123" },
  { x: -8, s: 26, d: 21, dl: -15, w: 38, a: 40, sd: 5.1, rd: 11, o: 0.8, img: "7-109" },
  { x: 54, s: 18, d: 26, dl: -4, w: 18, a: 28, sd: 6.2, rd: 14, o: 0.6, img: "2-89" },
  { x: 22, s: 34, d: 18, dl: -12.5, w: 30, a: 54, sd: 4.2, rd: 7.5, o: 0.9, img: "6-146" },
  // from here on: desktop only
  { x: 86, s: 28, d: 20, dl: -9, w: 16, a: 44, sd: 4.9, rd: 10, o: 0.85, img: "8-155" },
  { x: -14, s: 46, d: 15, dl: -5.5, w: 44, a: 70, sd: 3.6, rd: 7, o: 0.95, img: "5-238" },
  { x: 46, s: 20, d: 25, dl: -18, w: 22, a: 30, sd: 5.8, rd: 13, o: 0.65, img: "1-102" },
  { x: 63, s: 32, d: 17.5, dl: -14, w: 28, a: 50, sd: 4.4, rd: 8.5, o: 0.9, img: "7-109" },
  { x: 14, s: 24, d: 22, dl: -20, w: 32, a: 38, sd: 5.3, rd: 11.5, o: 0.75, img: "3-60" },
  { x: 31, s: 16, d: 27, dl: -1, w: 24, a: 26, sd: 6.5, rd: 15, o: 0.55, img: "2-89" },
];

export function PetalFall() {
  return (
    <div className="petal-fall" aria-hidden>
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal-fall__p"
          style={{
            ["--x" as string]: `${p.x}vw`,
            ["--s" as string]: `${p.s}px`,
            ["--d" as string]: `${p.d}s`,
            ["--dl" as string]: `${p.dl}s`,
            ["--w" as string]: `${p.w}vw`,
            ["--a" as string]: `${p.a}px`,
            ["--sd" as string]: `${p.sd}s`,
            ["--rd" as string]: `${p.rd}s`,
            ["--o" as string]: p.o,
            ["--r" as string]: `${(i * 67) % 360}deg`,
          }}
        >
          <span className="petal-fall__sway">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny decorative sprite from the media pipeline */}
            <img src={`/media/home-petal-${p.img}.webp`} alt="" loading="lazy" decoding="async" />
          </span>
        </span>
      ))}
    </div>
  );
}
