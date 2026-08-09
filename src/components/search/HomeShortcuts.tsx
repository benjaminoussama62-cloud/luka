"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useBrowserShell } from "@/lib/browser-shell";

export type HomeShortcut = {
  id: string;
  name: string;
  href: string;
  logo: string;
  tint: string;
  glow: string;
  custom?: boolean;
};

const STORAGE_KEY = "ayeba.shortcuts.custom.v1";

export const HOME_SHORTCUTS: HomeShortcut[] = [
  {
    id: "jemsa",
    name: "JEMSA",
    href: process.env.NEXT_PUBLIC_SHORTCUT_JEMSA || "https://jemsa.net",
    logo: "/brand/shortcuts/jemsa.svg",
    tint: "#2563eb",
    glow: "rgba(37, 99, 235, 0.45)",
  },
  {
    id: "sombateka",
    name: "SOMBATEKAONLE",
    href: process.env.NEXT_PUBLIC_SHORTCUT_SOMBATEKA || "https://sombatekaonline.com",
    logo: "/brand/shortcuts/sombateka.png",
    tint: "#0f766e",
    glow: "rgba(15, 118, 110, 0.45)",
  },
  {
    id: "devalpha1",
    name: "DEVALPHA1",
    href: process.env.NEXT_PUBLIC_SHORTCUT_DEVALPHA1 || "https://devalpha1.com",
    logo: "/brand/shortcuts/devalpha1.svg",
    tint: "#dc2626",
    glow: "rgba(220, 38, 38, 0.4)",
  },
  {
    id: "tala",
    name: "TALA",
    href: process.env.NEXT_PUBLIC_SHORTCUT_TALA || "https://to-tala.com",
    logo: "/brand/shortcuts/tala.svg",
    tint: "#ca8a04",
    glow: "rgba(234, 179, 8, 0.4)",
  },
];

const TINTS = ["#2563eb", "#059669", "#dc2626", "#ca8a04", "#7c3aed", "#0891b2"];

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

export function HomeShortcuts() {
  const { openWebTab } = useBrowserShell();
  const [custom, setCustom] = useState<HomeShortcut[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

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
      name: label.slice(0, 24),
      href,
      logo: faviconFor(href),
      tint,
      glow: `${tint}73`,
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
                  "--sc-glow": s.glow,
                  "--sc-delay": `${i * 45}ms`,
                } as CSSProperties
              }
              title={s.name}
              onClick={() => openWebTab(s.href, s.name)}
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
      </nav>

      {adding ? (
        <div className="ayeba-shortcut-modal" role="dialog" aria-modal aria-label="Ajouter un site">
          <form className="ayeba-shortcut-dialog" onSubmit={onAdd}>
            <h3>Ajouter un site</h3>
            <label>
              Nom
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. YouTube"
                autoFocus
                maxLength={24}
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
              <button type="button" className="ayeba-ghost" onClick={() => setAdding(false)}>
                Annuler
              </button>
              <button type="submit" className="ayeba-cta">
                Ajouter
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
