"use client";

import { useEffect, useRef } from "react";

/**
 * Slide show inside the home banner's arch. The pictures are rendered by the server, stacked in
 * `.arch__photo`; this only moves the `is-on` class from one to the next. The change itself is CSS
 * (styles/decor.css): a slow cross-fade while the incoming picture settles from a slight zoom.
 * It rests while the tab is hidden or the banner is off screen, and never starts for reduced motion.
 */
const HOLD = 6500; // ms each picture stays

export function ArchSlides() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = ref.current?.parentElement;
    if (!box) return;
    const pics = [...box.querySelectorAll<HTMLElement>(":scope > .pic")];
    if (pics.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let i = 0;
    let visible = true;
    pics[0].classList.add("is-on");
    box.setAttribute("data-run", "");

    const next = () => {
      if (document.hidden || !visible) return;
      const to = (i + 1) % pics.length;
      // Only change to a picture that has arrived; otherwise wait one more round.
      const img = pics[to].querySelector("img");
      if (img && !(img.complete && img.naturalWidth > 0)) return;
      pics[i].classList.remove("is-on");
      pics[to].classList.add("is-on");
      i = to;
    };
    const timer = window.setInterval(next, HOLD);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(box);
    return () => {
      window.clearInterval(timer);
      io.disconnect();
      box.removeAttribute("data-run");
      pics.forEach((p) => p.classList.remove("is-on"));
    };
  }, []);

  return <span ref={ref} hidden />;
}
