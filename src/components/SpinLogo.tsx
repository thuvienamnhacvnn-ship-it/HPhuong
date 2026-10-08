"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The turning 3D monogram — large on the home banner, small in the header of every other page:
 * a looping VP9 video with an alpha channel (public/brand/hp-logo-*.webm — 8 s, one full turn).
 *
 * It sits on top of the still frame the server renders and only shows once it is really playing,
 * so nothing flashes. It never starts where it cannot work: Safari and every iOS browser draw
 * WebM alpha as a black box, and reduced motion keeps the still. It pauses off screen and while
 * the tab is hidden.
 */
export function SpinLogo({ className = "home__logo3d-video" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const ua = navigator.userAgent;
    const webkitOnly = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) || /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(ua);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (webkitOnly || reduce.matches || !video.canPlayType('video/webm; codecs="vp9"')) return;

    let visible = true;
    const sync = () => {
      if (visible && !document.hidden && !reduce.matches) void video.play().catch(() => {});
      else video.pause();
    };
    const onPlaying = () => setOn(true);
    const onReduce = () => {
      if (reduce.matches) setOn(false);
      sync();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });

    // The small file is enough until the logo is drawn larger than its 720 px.
    const drawn = video.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2);
    video.src = drawn > 760 ? "/brand/hp-logo-1080.webm" : "/brand/hp-logo-720.webm";
    video.addEventListener("playing", onPlaying);
    document.addEventListener("visibilitychange", sync);
    reduce.addEventListener("change", onReduce);
    io.observe(video);
    return () => {
      video.removeEventListener("playing", onPlaying);
      document.removeEventListener("visibilitychange", sync);
      reduce.removeEventListener("change", onReduce);
      io.disconnect();
      video.pause();
    };
  }, []);

  return <video ref={ref} className={on ? `${className} is-on` : className} muted loop playsInline preload="none" aria-hidden tabIndex={-1} />;
}
