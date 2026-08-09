"use client";

import type { CSSProperties } from "react";

export type HomeShortcut = {
  id: string;
  name: string;
  /** Ligne courte sous le nom (domaine) */
  hint: string;
  href: string;
  logo: string;
  tint: string;
  glow: string;
};

/**
 * Raccourcis DevAlpha org — logos + domaines réels depuis les projets locaux.
 * URLs surchargeables via NEXT_PUBLIC_SHORTCUT_*.
 */
export const HOME_SHORTCUTS: HomeShortcut[] = [
  {
    id: "jemsa",
    name: "JEMSA",
    hint: "jemsa.net",
    href: process.env.NEXT_PUBLIC_SHORTCUT_JEMSA || "https://jemsa.net",
    logo: "/brand/shortcuts/jemsa.svg",
    tint: "#2563eb",
    glow: "rgba(37, 99, 235, 0.45)",
  },
  {
    id: "sombateka",
    name: "SOMBATEKAONLE",
    hint: "sombatekaonline.com",
    href: process.env.NEXT_PUBLIC_SHORTCUT_SOMBATEKA || "https://sombatekaonline.com",
    logo: "/brand/shortcuts/sombateka.png",
    tint: "#0f766e",
    glow: "rgba(15, 118, 110, 0.45)",
  },
  {
    id: "devalpha1",
    name: "DEVALPHA1",
    hint: "devalpha1.com",
    href: process.env.NEXT_PUBLIC_SHORTCUT_DEVALPHA1 || "https://devalpha1.com",
    logo: "/brand/shortcuts/devalpha1.svg",
    tint: "#dc2626",
    glow: "rgba(220, 38, 38, 0.4)",
  },
  {
    id: "tala",
    name: "TALA",
    hint: "to-tala.com",
    href: process.env.NEXT_PUBLIC_SHORTCUT_TALA || "https://to-tala.com",
    logo: "/brand/shortcuts/tala.svg",
    tint: "#ca8a04",
    glow: "rgba(234, 179, 8, 0.4)",
  },
];

export function HomeShortcuts() {
  return (
    <nav className="ayeba-shortcuts" aria-label="Accès rapides DevAlpha">
      {HOME_SHORTCUTS.map((s, i) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="ayeba-shortcut-tile"
          style={
            {
              "--sc-tint": s.tint,
              "--sc-glow": s.glow,
              "--sc-delay": `${i * 55}ms`,
            } as CSSProperties
          }
          title={`${s.name} — ${s.hint}`}
        >
          <span className="ayeba-shortcut-logo-wrap" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="ayeba-shortcut-logo"
              src={s.logo}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className="ayeba-shortcut-meta">
            <span className="ayeba-shortcut-label">{s.name}</span>
            <span className="ayeba-shortcut-hint">{s.hint}</span>
          </span>
        </a>
      ))}
    </nav>
  );
}
