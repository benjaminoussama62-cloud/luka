"use client";

import { useEffect, useRef } from "react";

/** Lueur orange type Gargantua — suit la souris */
export function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let x = 0.5;
    let y = 0.4;
    let tx = 0.5;
    let ty = 0.4;
    let raf = 0;

    function onMove(e: MouseEvent) {
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    }

    function tick() {
      if (!el) return;
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.setProperty("--mx", String(x));
      el.style.setProperty("--my", String(y));
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="ayeba-mouse-glow" aria-hidden>
      <div className="ayeba-mouse-core" />
      <div className="ayeba-mouse-halo" />
    </div>
  );
}
