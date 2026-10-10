"use client";

import { useEffect, useRef } from "react";

/**
 * Phones: the row of group buttons on the treatments page moves by itself and lights its buttons
 * up one after another, to show there is more to the side. It stops as soon as the visitor
 * scrolls down the page (and starts again back at the top), and rests while a finger is on the row.
 * Off for reduced motion and on wide screens, where all buttons are visible anyway.
 */
const SPEED = 28; // px per second
const LIGHT = 1500; // ms per button

export function AutoTabs() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const row = ref.current?.parentElement;
    if (!row) return;
    const phone = window.matchMedia("(max-width: 900px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chips = [...row.querySelectorAll<HTMLElement>(".chip")];
    let raf = 0;
    let last = 0;
    let dir = 1;
    let pos = 0;
    let lit = -1;
    let lightTimer = 0;
    let touching = false;
    let resumeTimer = 0;
    // The page may open a little way down (it snaps to its first frame): "scrolled down" is measured
    // from the highest position seen, not from 0.
    let top = window.scrollY;
    const down = () => {
      top = Math.min(top, window.scrollY);
      return window.scrollY > top + 40;
    };

    const clearLight = () => chips.forEach((c) => c.classList.remove("is-lit"));
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      window.clearInterval(lightTimer);
      lightTimer = 0;
      clearLight();
    };
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const max = row.scrollWidth - row.clientWidth;
      if (max > 4) {
        pos += dir * SPEED * dt;
        if (pos >= max) {
          pos = max;
          dir = -1;
        } else if (pos <= 0) {
          pos = 0;
          dir = 1;
        }
        row.scrollLeft = pos;
      }
      raf = requestAnimationFrame(step);
    };
    const light = () => {
      clearLight();
      lit = (lit + 1) % chips.length;
      chips[lit]?.classList.add("is-lit");
    };
    const start = () => {
      if (raf || touching || !phone.matches || reduce.matches || down() || document.hidden) return;
      pos = row.scrollLeft;
      last = performance.now();
      raf = requestAnimationFrame(step);
      light();
      lightTimer = window.setInterval(light, LIGHT);
    };
    const sync = () => (down() || document.hidden || !phone.matches || reduce.matches ? stop() : start());
    const onDown = () => {
      touching = true;
      window.clearTimeout(resumeTimer);
      stop();
    };
    const onUp = () => {
      resumeTimer = window.setTimeout(() => {
        touching = false;
        sync();
      }, 3500);
    };

    // start once the opening snap has settled
    const boot = window.setTimeout(() => {
      top = window.scrollY;
      sync();
    }, 700);
    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("visibilitychange", sync);
    phone.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    row.addEventListener("pointerdown", onDown, { passive: true });
    row.addEventListener("pointerup", onUp, { passive: true });
    row.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      stop();
      window.clearTimeout(boot);
      window.clearTimeout(resumeTimer);
      window.removeEventListener("scroll", sync);
      document.removeEventListener("visibilitychange", sync);
      phone.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
      row.removeEventListener("pointerdown", onDown);
      row.removeEventListener("pointerup", onUp);
      row.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return <span ref={ref} hidden />;
}
