"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Slide show inside the home banner's arch. The pictures are rendered by the server, stacked in
 * `.arch__photo`; this moves the `is-on` class from one to the next. The change itself is CSS
 * (styles/decor.css): a slow cross-fade while the incoming picture settles from a slight zoom.
 * Below the picture: previous / pause-play / next. It rests while the tab is hidden or the banner is
 * off screen, and for reduced motion it does not start by itself (the buttons still work).
 */
const HOLD = 6500; // ms each picture stays

export type SlideLabels = { prev: string; next: string; pause: string; play: string };

export function ArchSlides({ labels }: { labels: SlideLabels }) {
  const ref = useRef<HTMLDivElement>(null);
  const pics = useRef<HTMLElement[]>([]);
  const index = useRef(0);
  const visible = useRef(true);
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);

  const show = useCallback((to: number) => {
    const list = pics.current;
    if (list.length < 2) return;
    const target = (to + list.length) % list.length;
    list[index.current]?.classList.remove("is-on");
    list[target].classList.add("is-on");
    index.current = target;
  }, []);

  // Collect the pictures once and mark the box as running.
  useEffect(() => {
    const box = ref.current?.parentElement;
    if (!box) return;
    const list = [...box.querySelectorAll<HTMLElement>(":scope > .pic")];
    if (list.length < 2) return;
    pics.current = list;
    index.current = 0;
    list[0].classList.add("is-on");
    box.setAttribute("data-run", "");
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
    });
    io.observe(box);
    // Reduced motion: no automatic change.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    setReady(true);
    return () => {
      io.disconnect();
      box.removeAttribute("data-run");
      list.forEach((p) => p.classList.remove("is-on"));
      setReady(false);
    };
  }, []);

  // The timer restarts whenever the play state changes or someone clicks (see `go`).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!ready || !playing) return;
    const timer = window.setInterval(() => {
      if (document.hidden || !visible.current) return;
      const to = (index.current + 1) % pics.current.length;
      // Only change to a picture that has arrived; otherwise wait one more round.
      const img = pics.current[to].querySelector("img");
      if (img && !(img.complete && img.naturalWidth > 0)) return;
      show(to);
    }, HOLD);
    return () => window.clearInterval(timer);
  }, [ready, playing, tick, show]);

  const go = (delta: number) => {
    show(index.current + delta);
    setTick((n) => n + 1); // a click gives the new picture its full time again
  };

  return (
    <div className="slide-ctl" ref={ref} role="group" aria-label={labels.play}>
      <button type="button" className="slide-ctl__btn" onClick={() => go(-1)} aria-label={labels.prev}>
        <svg viewBox="0 0 24 24" aria-hidden focusable={false}><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
      </button>
      <button
        type="button"
        className="slide-ctl__btn slide-ctl__btn--main"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? labels.pause : labels.play}
        aria-pressed={!playing}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden focusable={false}><path d="M9 6.5v11M15 6.5v11" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden focusable={false}><path d="M9 6.2v11.6L18 12z" /></svg>
        )}
      </button>
      <button type="button" className="slide-ctl__btn" onClick={() => go(1)} aria-label={labels.next}>
        <svg viewBox="0 0 24 24" aria-hidden focusable={false}><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>
      </button>
    </div>
  );
}
