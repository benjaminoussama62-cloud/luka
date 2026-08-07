"use client";

import { useEffect, useRef } from "react";

/** Dégradé cyan/orange qui suit le curseur — accueil uniquement */
export function CursorGradient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let x = 0.5;
    let y = 0.45;
    let tx = 0.5;
    let ty = 0.45;
    let raf = 0;

    function onMove(e: MouseEvent | TouchEvent) {
      const pt = "touches" in e ? e.touches[0] : e;
      if (!pt) return;
      tx = pt.clientX / window.innerWidth;
      ty = pt.clientY / window.innerHeight;
    }

    function tick() {
      if (!el) return;
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      el.style.setProperty("--cx", String(x));
      el.style.setProperty("--cy", String(y));
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="ayeba-cursor-glow" aria-hidden>
      <div className="ayeba-cursor-glow-halo" />
      <div className="ayeba-cursor-glow-core" />
    </div>
  );
}
