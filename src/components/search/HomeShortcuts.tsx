"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { isMobileApp } from "@/lib/mobile-app";
import { useBrowserShell } from "@/lib/browser-shell";

export type HomeShortcut = {
  id: string;
  name: string;
  href: string;
  logo: string;
  tint: string;
  custom?: boolean;
};

const STORAGE_KEY = "ayeba.shortcuts.custom.v1";

export const HOME_SHORTCUTS: HomeShortcut[] = [
  {
    id: "jemsa",
    name: "Jemsa",
    href: process.env.NEXT_PUBLIC_SHORTCUT_JEMSA || "https://jemsa.net",
    logo: "/brand/shortcuts/jemsa.svg",
    tint: "#3b82f6",
  },
  {
    id: "sombateka",
    name: "Sombateka",
    href: process.env.NEXT_PUBLIC_SHORTCUT_SOMBATEKA || "https://sombatekaonline.com",
    logo: "/brand/shortcuts/sombateka.png",
    tint: "#14b8a6",
  },
  {
    id: "devalpha1",
    name: "DevAlpha",
    href: process.env.NEXT_PUBLIC_SHORTCUT_DEVALPHA1 || "https://devalpha1.com",
    logo: "/brand/shortcuts/devalpha1.svg",
    tint: "#f43f5e",
  },
  {
    id: "tala",
    name: "Tala",
    href: process.env.NEXT_PUBLIC_SHORTCUT_TALA || "https://to-tala.com",
    logo: "/brand/shortcuts/tala.svg",
    tint: "#eab308",
  },
  {
    id: "omega",
    name: "Omega",
    href: process.env.NEXT_PUBLIC_SHORTCUT_OMEGA || "https://omega-web.org",
    logo: "/brand/shortcuts/omega.png",
    tint: "#1c1917",
  },
];

const TINTS = ["#3b82f6", "#14b8a6", "#f43f5e", "#eab308", "#a78bfa", "#22d3ee"];

function faviconFor(href: string) {
  try {
    const host = new URL(href).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "/brand/ayeba-mark.svg";
  }
}

function normalizeUrl(input: string) {
  const t = input.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function loadCustom(): HomeShortcut[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HomeShortcut[];
    return Array.isArray(parsed) ? parsed.filter((s) => s?.id && s?.name && s?.href) : [];
  } catch {
    return [];
  }
}

function openShortcut(href: string, openWebTab?: (url: string, title?: string) => void) {
  const inApp = typeof window !== "undefined" && (isMobileApp() || openWebTab);
  if (inApp && openWebTab) {
    openWebTab(href);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function HomeShortcuts() {
  const [custom, setCustom] = useState<HomeShortcut[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const { openWebTab } = useBrowserShell();
  const useInApp = typeof window !== "undefined" && isMobileApp();

  useEffect(() => {
    setCustom(loadCustom());
  }, []);

  function persist(next: HomeShortcut[]) {
    setCustom(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    const href = normalizeUrl(address);
    const label = name.trim();
    if (!label || !href) {
      setError("Nom et adresse requis.");
      return;
    }
    try {
      void new URL(href);
    } catch {
      setError("Adresse invalide.");
      return;
    }
    if (custom.length >= 12) {
      setError("Maximum 12 sites ajoutés.");
      return;
    }
    const tint = TINTS[custom.length % TINTS.length];
    const item: HomeShortcut = {
      id: `custom_${Date.now()}`,
      name: label.slice(0, 18),
      href,
      logo: faviconFor(href),
      tint,
      custom: true,
    };
    persist([...custom, item]);
    setName("");
    setAddress("");
    setAdding(false);
  }

  function removeCustom(id: string) {
    persist(custom.filter((s) => s.id !== id));
  }

  const all = [...HOME_SHORTCUTS, ...custom];

  return (
    <>
      <nav className="ayeba-shortcuts" aria-label="Accès rapides">
        {all.map((s, i) => (
          <div key={s.id} className="ayeba-shortcut-slot">
            <button
              type="button"
              className="ayeba-shortcut-tile"
              style={
                {
                  "--sc-tint": s.tint,
                  "--sc-delay": `${i * 40}ms`,
                } as CSSProperties
              }
              title={s.name}
              onClick={() => openShortcut(s.href, useInApp ? openWebTab : undefined)}
            >
              <span className="ayeba-shortcut-logo-wrap" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="ayeba-shortcut-logo"
                  src={s.logo}
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback) return;
                    img.dataset.fallback = "1";
                    img.src = faviconFor(s.href);
                  }}
                />
              </span>
              <span className="ayeba-shortcut-label">{s.name}</span>
            </button>
            {s.custom ? (
              <button
                type="button"
                className="ayeba-shortcut-remove"
                aria-label={`Retirer ${s.name}`}
                onClick={() => removeCustom(s.id)}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}

        <div className="ayeba-shortcut-slot">
          <button
            type="button"
            className="ayeba-shortcut-tile ayeba-shortcut-add"
            onClick={() => setAdding(true)}
            title="Ajouter un site"
          >
            <span className="ayeba-shortcut-add-mark" aria-hidden>
              +
            </span>
            <span className="ayeba-shortcut-label">Ajouter</span>
          </button>
        </div>
      </nav>

      {adding ? (
        <div className="ayeba-shortcut-modal" role="dialog" aria-modal aria-label="Ajouter un site">
          <form className="ayeba-shortcut-dialog" onSubmit={onAdd}>
            <p className="ayeba-kicker ayeba-kicker-accent">Raccourci</p>
            <h3>Ajouter un site</h3>
            <p className="ayeba-shortcut-dialog-lead">
              Nom + adresse — le site s’ouvre dans votre navigateur.
            </p>
            <label>
              Nom
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. YouTube"
                autoFocus
                maxLength={18}
              />
            </label>
            <label>
              Adresse
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
            </label>
            {error ? <p className="ayeba-shortcut-error">{error}</p> : null}
            <div className="ayeba-shortcut-dialog-actions">
              <button type="button" className="ayeba-ghost px-4 py-2" onClick={() => setAdding(false)}>
                Annuler
              </button>
              <button type="submit" className="ayeba-cta px-5 py-2">
                Ajouter
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
