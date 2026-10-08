"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* The JS half of the motion system (styles/motion.css). No library, no React state:
   - pointer reactions (parallax layers, logo tilt, magnetic buttons) through ONE pointer listener
     and ONE requestAnimationFrame loop that stops as soon as everything has settled;
   - which side the menu underline grows from;
   - holding back the entrance of blocks that start below the fold, pausing loops off screen;
   - the logo's own file as mask for its sheen.
   (Page transitions live elsewhere: PetalTransition.)
   Everything here is an extra: without it the page is complete (entrances are pure CSS). */

const TAU = 0.18; // s — time constant of the pointer smoothing: same speed at 60 / 120 / 144 Hz
const TILT_Y = 2.5; // deg, left/right
const TILT_X = 2; // deg, up/down
const HOVER_TILT = 3; // × the two above while the pointer is on the logo itself (7.5° / 6°)
const MAGNET_REACH = 24; // px around the button
const MAGNET_X = 4; // px
const MAGNET_Y = 3; // px
const DEPTH_Y = 0.6; // vertical parallax = 60% of the horizontal one

type Layer = {
  el: HTMLElement | SVGElement;
  kind: "depth" | "tilt" | "magnet";
  box: Element; // what the pointer is measured against
  ax: number;
  ay: number;
  one: boolean; // one-sided: only towards the top/right (photo frame — its other edges sit on the banner edge)
  x: number;
  y: number;
  tx: number;
  ty: number;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function write(l: Layer) {
  const x = Math.abs(l.x) < 0.01 ? 0 : l.x;
  const y = Math.abs(l.y) < 0.01 ? 0 : l.y;
  const rest = x === 0 && y === 0;
  if (l.kind === "depth") l.el.style.translate = rest ? "" : `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  else if (l.kind === "tilt") l.el.style.transform = rest ? "" : `perspective(900px) rotateX(${(-y * TILT_X).toFixed(3)}deg) rotateY(${(x * TILT_Y).toFixed(3)}deg)`;
  else l.el.style.transform = rest ? "" : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
}

function pointerEffects() {
  let layers: Layer[] = [];
  let home: HTMLElement | null = null;
  let px = 0;
  let py = 0;
  let inside = false; // pointer is in the window
  let fresh = false; // pointer moved since the last frame
  let raf = 0;
  let last = 0;

  const collect = () => {
    for (const l of layers) {
      l.x = l.y = 0;
      write(l);
      l.el.style.willChange = "";
    }
    layers = [];
    home = document.querySelector<HTMLElement>(".home");
    const add = (el: HTMLElement | SVGElement, kind: Layer["kind"], box: Element, ax: number, ay: number, one = false) => layers.push({ el, kind, box, ax, ay, one, x: 0, y: 0, tx: 0, ty: 0 });
    if (home) {
      for (const el of home.querySelectorAll<HTMLElement | SVGElement>("[data-mo-depth]")) {
        const ax = Number(el.dataset.moDepth) || 0;
        const ay = el.dataset.moDepthY ? Number(el.dataset.moDepthY) : ax * DEPTH_Y;
        add(el, "depth", home, ax, ay, el.dataset.moOne !== undefined);
      }
      for (const el of home.querySelectorAll<HTMLElement>("[data-mo-tilt]")) add(el, "tilt", home, 1, 1);
    }
    for (const btn of document.querySelectorAll<HTMLElement>("[data-mo-magnet]")) {
      const inner = btn.querySelector<HTMLElement>(".btn__in");
      if (inner) add(inner, "magnet", btn, MAGNET_X, MAGNET_Y);
    }
  };

  // Read every box first, then write: no layout thrash.
  const aim = () => {
    const hb = home?.getBoundingClientRect();
    const over = !!hb && inside && px >= hb.left && px <= hb.right && py >= hb.top && py <= hb.bottom;
    const nx = hb && over ? clamp(((px - hb.left) / hb.width) * 2 - 1, -1, 1) : 0;
    const ny = hb && over ? clamp(((py - hb.top) / hb.height) * 2 - 1, -1, 1) : 0;
    const rects = layers.map((l) => (l.kind === "magnet" ? l.box.getBoundingClientRect() : l.kind === "tilt" ? l.el.getBoundingClientRect() : null));
    // Magnet: the pull grows evenly from the centre to the edge of the reach (never a jump), and only
    // the button nearest to the pointer answers — two stacked buttons never move together.
    let nearest = -1;
    let best = 1;
    rects.forEach((r, i) => {
      if (!r || !inside || !r.width || layers[i].kind !== "magnet") return;
      const d = Math.max(Math.abs(px - (r.left + r.width / 2)) / (r.width / 2 + MAGNET_REACH), Math.abs(py - (r.top + r.height / 2)) / (r.height / 2 + MAGNET_REACH));
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    layers.forEach((l, i) => {
      if (l.kind === "magnet") {
        const r = rects[i]!;
        const on = i === nearest;
        l.tx = on ? clamp((px - (r.left + r.width / 2)) / (r.width / 2 + MAGNET_REACH), -1, 1) * l.ax : 0;
        l.ty = on ? clamp((py - (r.top + r.height / 2)) / (r.height / 2 + MAGNET_REACH), -1, 1) * l.ay : 0;
      } else if (l.kind === "tilt") {
        // Anywhere on the banner the logo only hints at the pointer; on the logo itself it leans
        // towards it, and --hx places the reflection under the pointer (motion.css).
        const r = rects[i]!;
        const on = inside && r.width > 0 && px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
        l.tx = on ? clamp(((px - r.left) / r.width) * 2 - 1, -1, 1) * HOVER_TILT : nx * l.ax;
        l.ty = on ? clamp(((py - r.top) / r.height) * 2 - 1, -1, 1) * HOVER_TILT : ny * l.ay;
        if (on) l.el.style.setProperty("--hx", ((px - r.left) / r.width).toFixed(3));
      } else if (l.one) {
        l.tx = over ? ((nx + 1) / 2) * l.ax : 0;
        l.ty = over ? (-(1 - ny) / 2) * l.ay : 0;
      } else {
        l.tx = nx * l.ax;
        l.ty = ny * l.ay;
      }
    });
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (fresh) {
      fresh = false;
      aim();
    }
    const e = 1 - Math.exp(-dt / TAU);
    let moving = false;
    for (const l of layers) {
      l.x += (l.tx - l.x) * e;
      l.y += (l.ty - l.y) * e;
      if (Math.abs(l.tx - l.x) < 0.02 && Math.abs(l.ty - l.y) < 0.02) {
        l.x = l.tx;
        l.y = l.ty;
      } else moving = true;
      write(l);
    }
    if (moving) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      for (const l of layers) l.el.style.willChange = "";
    }
  };

  const wake = () => {
    fresh = true;
    if (raf) return;
    for (const l of layers) l.el.style.willChange = l.kind === "depth" ? "translate" : "transform";
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType !== "mouse") return;
    // a page change swaps the banner: pick up the new elements lazily
    if (home ? !home.isConnected : !!document.querySelector(".home")) collect();
    if (!layers.length) return;
    px = ev.clientX;
    py = ev.clientY;
    inside = true;
    wake();
  };
  const onLeave = () => {
    inside = false;
    if (layers.length) wake();
  };
  const onHidden = () => {
    if (document.hidden) onLeave();
  };

  collect();
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onHidden);
  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onHidden);
    if (raf) cancelAnimationFrame(raf);
    for (const l of layers) {
      l.x = l.y = 0;
      write(l);
      l.el.style.willChange = "";
    }
  };
}

/** Menu underline grows from the side the pointer enters and shrinks towards the side it leaves. */
function menuDirection() {
  const nav = document.querySelector<HTMLElement>(".header__nav");
  if (!nav) return () => {};
  const side = (ev: PointerEvent) => {
    const link = (ev.target as Element | null)?.closest?.<HTMLElement>(".header__link");
    if (!link || link !== ev.target) return;
    const r = link.getBoundingClientRect();
    link.style.setProperty("--o", ev.clientX < r.left + r.width / 2 ? "left" : "right");
  };
  // pointerenter / pointerleave do not bubble: listen in the capture phase on the nav
  nav.addEventListener("pointerenter", side, true);
  nav.addEventListener("pointerleave", side, true);
  return () => {
    nav.removeEventListener("pointerenter", side, true);
    nav.removeEventListener("pointerleave", side, true);
  };
}

/** Entrances of blocks below the fold wait for their block; loops pause while their block is off screen. */
function inView() {
  const home = document.querySelector<HTMLElement>(".home");
  if (!home || !("IntersectionObserver" in window)) return () => {};
  const waiting = new Set<Element>();
  const loops = new Set<Element>(home.querySelectorAll(".home__visual, .home__emblem, .petals--home, .home__flora"));
  const io = new IntersectionObserver(
    (entries) => {
      let n = 0;
      for (const en of entries) {
        if (waiting.has(en.target)) {
          if (!en.isIntersecting) continue;
          const el = en.target as HTMLElement;
          waiting.delete(el);
          el.style.setProperty("--i", String(n++)); // blocks arriving together keep a small stagger
          el.classList.remove("mo-wait");
          if (!loops.has(el)) io.unobserve(el);
        }
        if (loops.has(en.target)) en.target.toggleAttribute("data-mo-off", !en.isIntersecting);
      }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  for (const el of home.querySelectorAll<HTMLElement>("[data-mo]")) {
    // only what is below the fold right now; what the visitor already sees is never touched (no flash)
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.classList.add("mo-wait");
      waiting.add(el);
      io.observe(el);
    }
  }
  for (const el of loops) io.observe(el);
  const onHidden = () => document.documentElement.toggleAttribute("data-mo-hidden", document.hidden);
  document.addEventListener("visibilitychange", onHidden);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onHidden);
    document.documentElement.removeAttribute("data-mo-hidden");
    for (const el of waiting) el.classList.remove("mo-wait");
  };
}

/** The sheen on the banner logo is masked by the logo file the browser actually picked. */
function logoMask() {
  const emblem = document.querySelector<HTMLElement>(".home__emblem");
  const img = emblem?.querySelector<HTMLImageElement>("img");
  if (!emblem || !img) return () => {};
  const set = () => {
    if (!img.currentSrc || !img.naturalWidth) return;
    emblem.style.setProperty("--logo-mask", `url("${img.currentSrc}")`);
    emblem.setAttribute("data-mo-sheen", "");
  };
  if (img.complete) set();
  img.addEventListener("load", set);
  return () => img.removeEventListener("load", set);
}

export function MotionRoot() {
  const pathname = usePathname();
  // Pointer + viewport work, set up again for every page and whenever the device's answer changes.
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let off: (() => void)[] = [];
    const setup = () => {
      off.forEach((f) => f());
      off = [];
      if (fine.matches) off.push(menuDirection());
      if (reduce.matches) return;
      off.push(inView(), logoMask());
      if (fine.matches) off.push(pointerEffects());
    };
    setup();
    fine.addEventListener("change", setup);
    reduce.addEventListener("change", setup);
    return () => {
      fine.removeEventListener("change", setup);
      reduce.removeEventListener("change", setup);
      off.forEach((f) => f());
    };
  }, [pathname]);

  return null;
}
