"use client";

import { useEffect, useState } from "react";

/** Horloge HUD style mission elapsed */
export function MissionClock() {
  const [t, setT] = useState("00:00:00");

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      setT(`${h}:${m}:${sec}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hud-readout text-right">
      <p className="hud-label">SESSION</p>
      <p className="hud-value tabular-nums">{t}</p>
    </div>
  );
}
