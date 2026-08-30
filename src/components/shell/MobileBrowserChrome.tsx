"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { normalizeOmniInput } from "@/lib/search-engine-prefs";

type Props = {
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onHome: () => void;
};

export function MobileBrowserChrome({
  url,
  title,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onReload,
  onNavigate,
  onHome,
}: Props) {
  const [omniOpen, setOmniOpen] = useState(false);
  const [omni, setOmni] = useState(url);

  function onOmniSubmit(e: FormEvent) {
    e.preventDefault();
    const target = normalizeOmniInput(omni);
    setOmniOpen(false);
    if (target.startsWith("http")) onNavigate(target);
    else window.location.href = target;
  }

  async function onShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {omniOpen ? (
        <div className="ayeba-mobile-omni-sheet" role="dialog" aria-label="Adresse">
          <form onSubmit={onOmniSubmit}>
            <input
              value={omni}
              onChange={(e) => setOmni(e.target.value)}
              placeholder="Rechercher ou saisir une adresse"
              autoFocus
              spellCheck={false}
            />
            <button type="submit">Aller</button>
            <button type="button" onClick={() => setOmniOpen(false)}>
              Fermer
            </button>
          </form>
        </div>
      ) : null}

      <nav className="ayeba-mobile-browser-bar" aria-label="Navigation">
        <button type="button" disabled={!canGoBack} onClick={onBack} aria-label="Précédent">
          ←
        </button>
        <button type="button" disabled={!canGoForward} onClick={onForward} aria-label="Suivant">
          →
        </button>
        <button
          type="button"
          className="ayeba-mobile-omni-chip"
          onClick={() => {
            setOmni(url);
            setOmniOpen(true);
          }}
        >
          {title || "Page"}
        </button>
        <button type="button" onClick={onReload} aria-label="Actualiser">
          ↻
        </button>
        <Link href="/ayebi" className="ayeba-mobile-ayebi-btn" title="Ayebi — encyclopédie RDC">
          Ayebi
        </Link>
        <button type="button" onClick={onShare} aria-label="Partager">
          ⤴
        </button>
        <button type="button" onClick={onHome} aria-label="Accueil Ayeba">
          ⌂
        </button>
      </nav>
    </>
  );
}
