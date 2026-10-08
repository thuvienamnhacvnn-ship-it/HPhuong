"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Page transition for the public site: a flower opens from the clicked link — three layers of
 * pointed petals unfurling one after another — while loose petals scatter across the screen.
 * The route changes underneath, then a flower-shaped window opens from the same point and the
 * loose petals drift off.
 *
 * One canvas, one rAF loop that only runs during a transition. No shadows, no blur.
 * Reduced motion, modified clicks, external links and same-page links are left alone.
 */

// Timing (ms). Change the feel here.
const COVER = 620; // one layer of the flower opening from the point to past the far corner
const COVER_GAP = 110; // delay between the three layers
const HOLD_MIN = 120; // the page stays covered at least this long
const REVEAL = 720; // the window opening
const REVEAL_GAP = 90; // the two tinted rings run this far ahead of the window
const WAIT_MAX = 8000; // give up waiting for the new route and open anyway

const REACH = 0.6; // a double ring of petals has no gaps out to this share of its petal length
const MAX_PIXELS = 3.2e6; // canvas backing store cap; keeps 4K screens smooth
const PETAL_FILES = ["1-203", "2-177", "3-119", "4-245", "5-238", "6-292", "7-218", "8-309"];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const outQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const inOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Ctx = CanvasRenderingContext2D;

type Loose = {
  img: number;
  ang: number; // direction from the origin to where it settles
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
  slide: number; // px/s
};

type Look = { shade: string; lift: string; line: string; lineAlpha: number };

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

/** One pointed petal along +x, from the origin to its tip at `len`. Adds a subpath only. */
function petal(ctx: Ctx, len: number, n: number) {
  const c = len * Math.tan(Math.PI / n) * 1.7;
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.18, -c, len * 0.72, -c * 0.82, len, 0);
  ctx.bezierCurveTo(len * 0.72, c * 0.82, len * 0.18, c, 0, 0);
}

/** Angle of petal `i` in ring `ring` (the second ring sits in the gaps of the first). */
const petalAngle = (i: number, ring: number, n: number, rot: number) => rot + ((i + ring * 0.5) / n) * Math.PI * 2;

/**
 * A flower drawn petal by petal so each one overlaps its neighbour: flat tone, a base-to-tip
 * tint for depth, and a hairline edge. `unfurl` (0…1) opens the petals one after another
 * around the circle; pass 1 for a fully open flower.
 */
function drawFlower(ctx: Ctx, ox: number, oy: number, len: number, n: number, rot: number, tone: string, look: Look, unfurl: number) {
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < n; i++) {
      const open = unfurl >= 1 ? 1 : outCubic(clamp01(unfurl * 1.35 - ((i + ring * 0.5) / n) * 0.35));
      const l = len * (ring ? 0.82 : 1) * open;
      if (l < 2) continue;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(petalAngle(i, ring, n, rot));
      ctx.beginPath();
      petal(ctx, l, n);
      ctx.fillStyle = tone;
      ctx.fill();
      const g = ctx.createLinearGradient(0, 0, l, 0);
      g.addColorStop(0, look.shade);
      g.addColorStop(0.42, "rgba(255,255,255,0)");
      g.addColorStop(1, look.lift);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalAlpha = look.lineAlpha;
      ctx.strokeStyle = look.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** The same flower as one path (union of its petals), for cutting the window. */
function flowerPath(ctx: Ctx, ox: number, oy: number, len: number, n: number, rot: number) {
  ctx.beginPath();
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(petalAngle(i, ring, n, rot));
      petal(ctx, len * (ring ? 0.82 : 1), n);
      ctx.restore();
    }
  }
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
  const pathname = usePathname();
  const router = useRouter();
  const arrived = useRef<(() => void) | null>(null);

  // The new route has committed: let the running transition open.
  useEffect(() => {
    arrived.current?.();
  }, [pathname]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let busy = false;
    let raf = 0;
    const warm = window.setTimeout(loadPetals, 1200);

    const run = (href: string, ox: number, oy: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        router.push(href);
        return;
      }
      busy = true;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const small = W < 700;
      const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (W * H)));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.setAttribute("data-on", "");

      const css = getComputedStyle(canvas);
      const tone = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
      const tones = [tone("--ptx-a", "#f1c5ba"), tone("--ptx-b", "#f8e0d6"), tone("--ptx-c", "#fdf2ec")];
      const petalTone = tone("--ptx-petal", "#e9aeb0");
      const dark = document.documentElement.dataset.theme === "dark";
      const look: Look = {
        shade: tone("--ptx-shade", "rgba(168,93,109,0.12)"),
        lift: tone("--ptx-lift", "rgba(255,255,255,0.5)"),
        line: tone("--ptx-line", "#9a6334"),
        lineAlpha: dark ? 0.3 : 0.2,
      };

      // Far corner from the origin; the gap-free part of the flower must pass it.
      const far = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy));
      const full = far / REACH;
      const counts = [7, 8, 9];
      const turn = [0.5, -0.38, 0.28];
      const base = Math.random() * Math.PI * 2;

      const imgs = loadPetals();
      const count = small ? 30 : 58;
      const loose: Loose[] = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random();
        // Each one settles somewhere on screen, so the whole view fills evenly wherever the click was.
        const tx = W * (-0.04 + 1.08 * Math.random());
        const ty = H * (-0.04 + 1.08 * Math.random());
        loose.push({
          img: i % PETAL_FILES.length,
          ang: Math.atan2(ty - oy, tx - ox),
          dist: Math.hypot(tx - ox, ty - oy),
          delay: Math.random() * 240,
          burst: 850 + Math.random() * 650,
          size: (small ? 20 : 26) + depth * depth * (small ? 54 : 96),
          depth,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 1.5,
          flip: Math.random() * Math.PI * 2,
          flipSpeed: 0.9 + Math.random() * 1.7,
          sway: 5 + Math.random() * 13,
          swaySpeed: 0.7 + Math.random() * 1.1,
          fall: 6 + Math.random() * 14,
          slide: (Math.random() - 0.5) * 12,
        });
      }
      loose.sort((a, b) => a.depth - b.depth);

      const coverEnd = COVER + COVER_GAP * 2;
      const revealEnd = REVEAL + REVEAL_GAP * 2;
      let start = 0;
      let revealAt = 0; // 0 = still covered
      let ready = false;
      let pushed = false;
      let covered: HTMLCanvasElement | null = null; // the fully open flower, painted once

      const finishWait = () => {
        ready = true;
      };
      arrived.current = finishWait;
      const giveUp = window.setTimeout(finishWait, WAIT_MAX);

      const drawLoose = (t: number, rp: number) => {
        const fade = 1 - Math.pow(rp, 1.4);
        if (fade <= 0) return;
        for (const p of loose) {
          const lt = t - p.delay;
          if (lt <= 0) continue;
          const s = lt / 1000;
          const out = p.dist * outQuint(clamp01(lt / p.burst)) + far * 0.4 * rp * rp * (0.5 + p.depth);
          const side = Math.sin(s * p.swaySpeed + p.flip) * p.sway;
          const x = ox + Math.cos(p.ang) * out - Math.sin(p.ang) * side + p.slide * s;
          const y = oy + Math.sin(p.ang) * out + Math.cos(p.ang) * side + p.fall * s;
          const w = p.size * (0.5 + 0.5 * outCubic(clamp01(lt / 460)));
          if (x < -w || x > W + w || y < -w || y > H + w) continue;
          let tumble = Math.cos(p.flip + s * p.flipSpeed);
          if (Math.abs(tumble) < 0.22) tumble = tumble < 0 ? -0.22 : 0.22;
          ctx.save();
          ctx.globalAlpha = clamp01(lt / 140) * fade * (0.55 + 0.45 * p.depth) * (dark ? 0.82 : 1);
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
      };

      const paintCovered = () => {
        const c = document.createElement("canvas");
        c.width = canvas.width;
        c.height = canvas.height;
        const cc = c.getContext("2d");
        if (!cc) return null;
        cc.setTransform(dpr, 0, 0, dpr, 0, 0);
        cc.fillStyle = tones[2];
        cc.fillRect(0, 0, W, H);
        for (let k = 0; k < 3; k++) drawFlower(cc, ox, oy, full, counts[k], base + turn[k], tones[k], look, 1);
        return c;
      };

      const frame = (now: number) => {
        if (!start) start = now;
        const t = now - start;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";

        if (!revealAt) {
          if (t < coverEnd) {
            // The flower opens: three layers, each a little later and a little lighter.
            for (let k = 0; k < 3; k++) {
              const p = clamp01((t - k * COVER_GAP) / COVER);
              if (p <= 0) continue;
              drawFlower(ctx, ox, oy, full * outCubic(p), counts[k], base + turn[k] * outCubic(p), tones[k], look, p);
            }
          } else {
            covered ??= paintCovered();
            if (covered) ctx.drawImage(covered, 0, 0, W, H);
          }
          drawLoose(t, 0);

          if (!pushed && t >= coverEnd * 0.6) {
            pushed = true;
            router.push(href);
          }
          if (t >= coverEnd + HOLD_MIN && ready) revealAt = now;
        } else {
          // A flower-shaped window opens from the same point; two tinted rings of petals lead it.
          const rt = now - revealAt;
          covered ??= paintCovered();
          if (covered) ctx.drawImage(covered, 0, 0, W, H);
          const ring = (k: number, n: number, dir: number) => {
            const p = clamp01((rt - k * REVEAL_GAP) / REVEAL);
            return { len: full * 1.04 * inOutCubic(p), rot: base + 0.9 + dir * 0.45 * p, n, p };
          };
          const r1 = ring(0, 9, 1);
          const r2 = ring(1, 8, -1);
          const r3 = ring(2, 7, 1);
          if (r1.p > 0) drawFlower(ctx, ox, oy, r1.len, r1.n, r1.rot, tones[1], look, 1);
          if (r2.p > 0) drawFlower(ctx, ox, oy, r2.len, r2.n, r2.rot, tones[0], look, 1);
          if (r3.p > 0 && r3.len > 2) {
            // Hairline on the window's edge: stroke first, then the cut removes its inner half
            // and every line that would otherwise cross the new page.
            flowerPath(ctx, ox, oy, r3.len, r3.n, r3.rot);
            ctx.globalAlpha = 0.6 * (1 - r3.p);
            ctx.strokeStyle = look.line;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "#000";
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
          }
          drawLoose(t, clamp01(rt / revealEnd));

          if (rt >= revealEnd) {
            window.clearTimeout(giveUp);
            arrived.current = null;
            canvas.removeAttribute("data-on");
            ctx.clearRect(0, 0, W, H);
            busy = false;
            return;
          }
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (busy) {
        e.preventDefault();
        return;
      }
      if (reduce.matches) return;
      const href = internalTarget(a, e);
      if (!href) return;
      e.preventDefault(); // next/link sees defaultPrevented and stands down; we push the route ourselves
      // Keyboard activation has no pointer position: open from the link itself.
      let x = e.clientX;
      let y = e.clientY;
      if (!e.detail || (x === 0 && y === 0)) {
        const r = a.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      router.prefetch(href);
      run(href, x, y);
    };

    // Capture phase: runs before React's delegated click reaches next/link.
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
