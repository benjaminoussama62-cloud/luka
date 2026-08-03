"use client";

import { useEffect, useRef } from "react";
import { DRC_PATH, DRC_VIEWBOX } from "./drc-path";

/** Silhouette RDC animée — dégradé vivant, style Gargantua */
export function DrcGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let x = 0.5;
    let y = 0.45;
    let tx = 0.5;
    let ty = 0.45;
    let raf = 0;

    function onMove(e: MouseEvent) {
      tx = e.clientX / window.innerWidth;
      ty = e.clientY / window.innerHeight;
    }

    function tick() {
      if (!el) return;
      x += (tx - x) * 0.04;
      y += (ty - y) * 0.04;
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
    <div ref={ref} className="ayeba-drc-glow" aria-hidden>
      <div className="ayeba-drc-orbit">
        <svg
          viewBox={DRC_VIEWBOX}
          className="ayeba-drc-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ayeba-drc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="ayeba-drc-stop-a">
                <animate
                  attributeName="stop-color"
                  values="#e85d04;#007fff;#fcd116;#00d4aa;#e85d04"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="45%" className="ayeba-drc-stop-b">
                <animate
                  attributeName="stop-color"
                  values="#ff6b1a;#005bbb;#ffe566;#00b894;#ff6b1a"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" className="ayeba-drc-stop-c">
                <animate
                  attributeName="stop-color"
                  values="#007fff;#fcd116;#e85d04;#007fff;#007fff"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>
            <radialGradient id="ayeba-drc-radial" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="rgba(255,140,40,0.55)" />
              <stop offset="55%" stopColor="rgba(232,93,4,0.18)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id="ayeba-drc-blur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={DRC_PATH}
            fill="url(#ayeba-drc-grad)"
            filter="url(#ayeba-drc-blur)"
            className="ayeba-drc-shape"
          />
          <path d={DRC_PATH} fill="url(#ayeba-drc-radial)" className="ayeba-drc-inner" />
        </svg>
      </div>
      <div className="ayeba-drc-halo" />
    </div>
  );
}
