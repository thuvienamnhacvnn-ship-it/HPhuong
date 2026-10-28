"use client";

import { useEffect, useRef } from "react";

/**
 * Phone headline "Zeit für Sie." in the middle of the screen. It is real text (for readers and
 * search), drawn over by a petal animation: petals drift in and settle into the letters, the crisp
 * text holds for 5 s, then it comes apart into petals that blow away — and the cycle repeats.
 * Reduced motion: the text just stays.
 */
const T_IN = 2.6;
const T_HOLD = 5;
const T_OUT = 2.8;
const T_GAP = 0.5;
const CYCLE = T_IN + T_HOLD + T_OUT + T_GAP;
const PAD_TOP = 150;
const PAD_BOTTOM = 230;
const PALETTE = ["#ecd3a2", "#ecd3a2", "#ffe3a8", "#f7c9d4", "#f7c9d4", "#e9a3b5"];

type Petal = {
  tx: number; ty: number; sx: number; sy: number;
  size: number; rot0: number; tilt: number; spin: number;
  sway: number; freq: number; phase: number;
  dIn: number; dOut: number; wx: number; wy: number; color: string;
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const smooth = (p: number) => p * p * (3 - 2 * p);

export function PetalTitle({ title1, title2, className = "" }: { title1: string; title2: string; className?: string }) {
  const root = useRef<HTMLParagraphElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let petals: Petal[] = [];
    let W = 0;
    let dpr = 1;
    let t0 = 0;
    let stopped = false;

    const build = () => {
      const rect = el.getBoundingClientRect();
      W = rect.width;
      const H = rect.height + PAD_TOP + PAD_BOTTOM;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      // sample the lettering from an off-screen copy drawn with the same fonts and positions
      const off = document.createElement("canvas");
      off.width = cv.width;
      off.height = cv.height;
      const o = off.getContext("2d", { willReadFrequently: true });
      if (!o) return;
      o.scale(dpr, dpr);
      o.textAlign = "left";
      o.textBaseline = "middle";
      o.fillStyle = "#000";
      el.querySelectorAll<HTMLElement>(".petal-title__text > span, .petal-title__text > em").forEach((node) => {
        const cs = getComputedStyle(node);
        o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const r = document.createRange();
        r.selectNodeContents(node);
        const b = r.getBoundingClientRect();
        o.fillText(node.textContent ?? "", b.left - rect.left, PAD_TOP + (b.top - rect.top) + b.height / 2);
      });
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const step = 2.3;
      const next: Petal[] = [];
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          const a = data[(Math.round(y * dpr) * off.width + Math.round(x * dpr)) * 4 + 3];
          if (a < 110) continue;
          const px = x + (Math.random() - 0.5) * step;
          const py = y + (Math.random() - 0.5) * step;
          next.push({
            tx: px, ty: py,
            sx: px + 30 + Math.random() * 190, sy: py - 110 - Math.random() * 120,
            size: 2.6 + Math.random() * 2.6,
            rot0: Math.random() * Math.PI * 2, tilt: (Math.random() - 0.5) * 1.2, spin: (Math.random() - 0.5) * 7,
            sway: 8 + Math.random() * 26, freq: 1.2 + Math.random() * 1.6, phase: Math.random() * 6.28,
            dIn: Math.random() * 0.42 * T_IN,
            dOut: (px / W) * 0.5 * T_OUT + Math.random() * 0.14 * T_OUT,
            wx: 60 + Math.random() * 170, wy: 20 + Math.random() * 190,
            color: PALETTE[(Math.random() * PALETTE.length) | 0],
          });
        }
      }
      petals = next;
    };

    const drawPetal = (x: number, y: number, s: number, rot: number, alpha: number, color: string) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.95, -s * 0.15, 0, s);
      ctx.quadraticCurveTo(-s * 0.95, -s * 0.15, 0, -s);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgb(48 26 18 / 35%)";
      ctx.stroke();
      ctx.restore();
    };

    const frame = (now: number) => {
      if (stopped) return;
      if (!t0) t0 = now;
      const t = ((now - t0) / 1000) % CYCLE;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, cv.height / dpr);

      let textAlpha = 0;
      if (t < T_IN) textAlpha = smooth(clamp((t - T_IN * 0.72) / (T_IN * 0.28)));
      else if (t < T_IN + T_HOLD) textAlpha = 1;
      else if (t < T_IN + T_HOLD + 0.35) textAlpha = 1 - smooth((t - T_IN - T_HOLD) / 0.35);
      el.style.setProperty("--pt", textAlpha.toFixed(3));

      for (const p of petals) {
        if (t < T_IN) {
          const q = clamp((t - p.dIn) / (T_IN * 0.58));
          if (q <= 0) continue;
          const e = easeOut(q);
          const sw = Math.sin(q * Math.PI * p.freq + p.phase) * p.sway * (1 - e);
          const x = p.sx + (p.tx - p.sx) * e + sw;
          const y = p.sy + (p.ty - p.sy) * e + Math.cos(q * Math.PI * p.freq + p.phase) * p.sway * 0.35 * (1 - e);
          const settle = clamp((t - T_IN * 0.72) / (T_IN * 0.28));
          drawPetal(x, y, p.size * (0.55 + 0.45 * e), p.rot0 * (1 - e) + p.tilt * e, Math.min(1, q * 3.2) * (1 - 0.55 * settle), p.color);
        } else if (t < T_IN + T_HOLD) {
          const k = t - T_IN;
          const tw = Math.sin(k * 1.7 + p.phase) * 0.06;
          drawPetal(p.tx, p.ty, p.size * (1 + tw), p.tilt + tw, 0.45, p.color);
        } else if (t < T_IN + T_HOLD + T_OUT) {
          const k = t - T_IN - T_HOLD;
          const q = clamp((k - p.dOut) / (T_OUT * 0.55));
          const lift = smooth(clamp(k / 0.3));
          const base = 0.45 + 0.55 * lift;
          if (q <= 0) {
            drawPetal(p.tx, p.ty, p.size, p.tilt, base, p.color);
            continue;
          }
          const g = Math.pow(q, 1.6);
          const x = p.tx + p.wx * q + Math.sin(q * Math.PI * p.freq * 1.4 + p.phase) * p.sway * 0.8 * q;
          const y = p.ty + p.wy * g + Math.cos(q * Math.PI * p.freq + p.phase) * p.sway * 0.3 * q;
          drawPetal(x, y, p.size * (1 - 0.3 * q), p.tilt + p.spin * q * 2.2, base * (1 - Math.pow(q, 1.15)), p.color);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      build();
      t0 = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };
    el.style.setProperty("--pt", "0");
    let ro: ResizeObserver | undefined;
    document.fonts.ready.then(() => {
      if (stopped) return;
      start();
      let lastW = el.getBoundingClientRect().width;
      ro = new ResizeObserver(() => {
        const w = el.getBoundingClientRect().width;
        if (Math.abs(w - lastW) > 1) {
          lastW = w;
          start();
        }
      });
      ro.observe(el);
    });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [title1, title2]);

  return (
    <p ref={root} className={`petal-title ${className}`}>
      <span className="petal-title__text">
        <span>{title1}</span> <em>{title2}</em>
      </span>
      <canvas ref={canvas} className="petal-title__cv" aria-hidden />
    </p>
  );
}
