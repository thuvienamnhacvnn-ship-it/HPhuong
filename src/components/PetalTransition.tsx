"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Page transition for the public site: ONE pass. Petals burst out from the clicked link while the
 * route changes at once. A light veil rises and falls over the change so the two pages blend, and
 * the fine lines of an opening flower run outward from the click. Nothing ever hides the page.
 *
 * One canvas, one rAF loop that only runs during a transition. No shadows, no blur.
 * Reduced motion, modified clicks, external links and same-page links are left alone.
 */

const DURATION = 1150; // ms, the whole pass
const FADE_FROM = 380; // ms, when the petals start to fade
const VEIL = 0.5; // strongest opacity of the veil (it never hides the page)
const LINES = [7, 8, 9]; // petals per ring of the line flower
const MAX_PIXELS = 3.2e6; // canvas backing store cap; keeps 4K screens smooth
const PETAL_FILES = ["1-203", "2-177", "3-119", "4-245", "5-238", "6-292", "7-218", "8-309"];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const outQuint = (t: number) => 1 - Math.pow(1 - t, 5);

/** Outline of a flower: two rings of pointed petals around the origin. */
function flowerLines(ctx: CanvasRenderingContext2D, ox: number, oy: number, len: number, n: number, rot: number) {
  ctx.beginPath();
  for (let ring = 0; ring < 2; ring++) {
    const l = len * (ring ? 0.82 : 1);
    const c = l * Math.tan(Math.PI / n) * 1.7;
    for (let i = 0; i < n; i++) {
      const a = rot + ((i + ring * 0.5) / n) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const at = (x: number, y: number): [number, number] => [ox + x * cos - y * sin, oy + x * sin + y * cos];
      ctx.moveTo(ox, oy);
      ctx.bezierCurveTo(...at(l * 0.18, -c), ...at(l * 0.72, -c * 0.82), ...at(l, 0));
      ctx.bezierCurveTo(...at(l * 0.72, c * 0.82), ...at(l * 0.18, c), ox, oy);
    }
  }
}

type Loose = {
  img: number;
  ang: number; // direction from the origin to where it is heading
  dist: number;
  delay: number;
  burst: number; // duration of its flight
  size: number; // drawn width
  depth: number; // 0 far … 1 near
  rot: number;
  spin: number; // rad/s
  flip: number;
  flipSpeed: number; // rad/s, the tumble
  sway: number; // px, sideways
  swaySpeed: number;
  fall: number; // px/s
};

let images: HTMLImageElement[] | null = null;
function loadPetals() {
  if (images) return images;
  images = PETAL_FILES.map((f) => {
    const im = new Image();
    im.decoding = "async";
    im.src = `/media/home-petal-${f}.webp`;
    return im;
  });
  return images;
}

function internalTarget(a: HTMLAnchorElement, e: MouseEvent): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  if (a.target && a.target !== "_self") return null;
  if (a.hasAttribute("download") || a.dataset.noTransition !== undefined) return null;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (!/^\/(de|en)(\/|$)/.test(url.pathname)) return null; // admin and files keep a plain load
  if (url.pathname === window.location.pathname) return null; // same page: filters, anchors
  return url.pathname + url.search + url.hash;
}

export function PetalTransition() {
  const ref = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const warm = window.setTimeout(loadPetals, 1200);

    const burst = (ox: number, oy: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      cancelAnimationFrame(raf);
      const W = window.innerWidth;
      const H = window.innerHeight;
      const small = W < 700;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (W * H)));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.setAttribute("data-on", "");

      const css = getComputedStyle(canvas);
      const petalTone = css.getPropertyValue("--ptx-petal").trim() || "#e9aeb0";
      const veilTone = css.getPropertyValue("--ptx-c").trim() || "#fdf2ec";
      const lineTone = css.getPropertyValue("--ptx-line").trim() || "#9a6334";
      const base = Math.random() * Math.PI * 2;
      const dark = document.documentElement.dataset.theme === "dark";
      const far = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));

      const imgs = loadPetals();
      const count = small ? 26 : 48;
      const loose: Loose[] = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random();
        // Each one heads for a point on screen, so the burst fills the view wherever the click was.
        const tx = W * (-0.04 + 1.08 * Math.random());
        const ty = H * (-0.04 + 1.08 * Math.random());
        loose.push({
          img: i % PETAL_FILES.length,
          ang: Math.atan2(ty - oy, tx - ox),
          dist: Math.hypot(tx - ox, ty - oy),
          delay: Math.random() * 140,
          burst: 800 + Math.random() * 500,
          size: (small ? 20 : 26) + depth * depth * (small ? 54 : 96),
          depth,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 1.6,
          flip: Math.random() * Math.PI * 2,
          flipSpeed: 0.9 + Math.random() * 1.7,
          sway: 5 + Math.random() * 13,
          swaySpeed: 0.7 + Math.random() * 1.1,
          fall: 6 + Math.random() * 14,
        });
      }
      loose.sort((a, b) => a.depth - b.depth);

      let start = 0;
      const frame = (now: number) => {
        if (!start) start = now;
        const t = now - start;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        if (t >= DURATION) {
          canvas.removeAttribute("data-on");
          return;
        }
        const rp = clamp01((t - FADE_FROM) / (DURATION - FADE_FROM));
        const fade = 1 - Math.pow(rp, 1.5);

        // veil: up in the first quarter second, gently down again
        const veil = VEIL * Math.min(clamp01(t / 240), 1 - clamp01((t - 420) / (DURATION - 520)));
        if (veil > 0.005) {
          ctx.globalAlpha = veil;
          ctx.fillStyle = veilTone;
          ctx.fillRect(0, 0, W, H);
        }
        // the flower's lines open from the click and thin out as they reach the edges
        ctx.strokeStyle = lineTone;
        ctx.lineWidth = 1;
        LINES.forEach((n, k) => {
          const p = clamp01((t - k * 90) / (DURATION - 260));
          if (p <= 0 || p >= 1) return;
          const e = outCubic(p);
          flowerLines(ctx, ox, oy, (far / 0.6) * e, n, base + (k % 2 ? -0.4 : 0.5) * e);
          ctx.globalAlpha = (dark ? 0.5 : 0.4) * Math.min(clamp01(p * 6), 1 - p);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        for (const p of loose) {
          const lt = t - p.delay;
          if (lt <= 0) continue;
          const s = lt / 1000;
          const out = p.dist * outQuint(clamp01(lt / p.burst)) + far * 0.25 * rp * rp * (0.5 + p.depth);
          const side = Math.sin(s * p.swaySpeed + p.flip) * p.sway;
          const x = ox + Math.cos(p.ang) * out - Math.sin(p.ang) * side;
          const y = oy + Math.sin(p.ang) * out + Math.cos(p.ang) * side + p.fall * s;
          const w = p.size * (0.5 + 0.5 * outCubic(clamp01(lt / 420)));
          if (x < -w || x > W + w || y < -w || y > H + w) continue;
          let tumble = Math.cos(p.flip + s * p.flipSpeed);
          if (Math.abs(tumble) < 0.22) tumble = tumble < 0 ? -0.22 : 0.22;
          ctx.save();
          ctx.globalAlpha = clamp01(lt / 120) * fade * (0.55 + 0.45 * p.depth) * (dark ? 0.82 : 1);
          ctx.translate(x, y);
          ctx.rotate(p.rot + p.spin * s);
          ctx.scale(1, tumble);
          const im = imgs[p.img];
          if (im.complete && im.naturalWidth) {
            const h = (w * im.naturalHeight) / im.naturalWidth;
            ctx.drawImage(im, -w / 2, -h / 2, w, h);
          } else {
            ctx.fillStyle = petalTone;
            ctx.beginPath();
            ctx.moveTo(-w / 2, 0);
            ctx.bezierCurveTo(-w / 6, -w / 2.6, w / 3, -w / 3.2, w / 2, 0);
            ctx.bezierCurveTo(w / 3, w / 3.2, -w / 6, w / 2.6, -w / 2, 0);
            ctx.fill();
          }
          ctx.restore();
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    // The link itself is left to next/link: the page changes at once, the petals only accompany it.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || reduce.matches || !internalTarget(a, e)) return;
      // Keyboard activation has no pointer position: open from the link itself.
      let x = e.clientX;
      let y = e.clientY;
      if (!e.detail || (x === 0 && y === 0)) {
        const r = a.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      burst(x, y);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      cancelAnimationFrame(raf);
      window.clearTimeout(warm);
      canvas.removeAttribute("data-on");
    };
  }, [router]);

  return <canvas ref={ref} className="petal-tx" aria-hidden />;
}
