"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useBrowserShell } from "@/lib/browser-shell";
import { useBrowserFavs } from "@/lib/browser-favs";
import { normalizeOmniInput } from "@/lib/search-engine-prefs";
import { MobileTabsOverview } from "./MobileTabsOverview";

type Props = {
  onSearch: (query: string) => void;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Chrome mobile façon Safari : pill omnibox + barre d'actions [← → ⤴ ★ ⿻]. */
export function MobileBrowserChrome({ onSearch }: Props) {
  const {
    tabs,
    activeTab,
    openWebTab,
    navigateWebTab,
    webGoBack,
    webGoForward,
    webGoTo,
  } = useBrowserShell();
  const { favs, isFav, toggleFav, removeFav } = useBrowserFavs();

  const [omniOpen, setOmniOpen] = useState(false);
  const [omni, setOmni] = useState("");
  const [tabsOpen, setTabsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<"back" | "forward" | null>(null);
  const [favsOpen, setFavsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const lpTimer = useRef<number | null>(null);

  useEffect(() => {
    document.body.classList.add("ayeba-mobile-chrome");
    return () => document.body.classList.remove("ayeba-mobile-chrome");
  }, []);

  const isWeb = activeTab.kind === "web";
  const url = isWeb ? activeTab.url : "";
  const title = isWeb ? activeTab.title : "";
  const canGoBack = isWeb && activeTab.historyIndex > 0;
  const canGoForward = isWeb && activeTab.historyIndex < activeTab.history.length - 1;
  const starred = isWeb && isFav(url);

  function onOmniSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = omni.trim();
    setOmniOpen(false);
    if (!raw) return;
    if (raw.startsWith("/")) {
      window.location.href = raw;
      return;
    }
    const looksLikeAddr = /^https?:\/\//i.test(raw) || (!raw.includes(" ") && raw.includes("."));
    if (!looksLikeAddr) {
      onSearch(raw);
      return;
    }
    const target = normalizeOmniInput(raw);
    if (isWeb) navigateWebTab(target);
    else openWebTab(target);
  }

  async function onShare() {
    if (!url) return;
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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function onCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  /** Appui long sur ← / → : affiche l'historique de l'onglet (comme Safari). */
  function onPressStart(which: "back" | "forward") {
    if (!isWeb) return;
    lpTimer.current = window.setTimeout(() => setHistoryOpen(which), 480);
  }
  function onPressEnd(action: () => void) {
    if (lpTimer.current !== null) {
      window.clearTimeout(lpTimer.current);
      lpTimer.current = null;
      action();
    }
  }

  const historyEntries =
    isWeb && historyOpen
      ? historyOpen === "back"
        ? activeTab.history.slice(0, activeTab.historyIndex).map((u, i) => ({ u, i })).reverse()
        : activeTab.history.slice(activeTab.historyIndex + 1).map((u, k) => ({ u, i: activeTab.historyIndex + 1 + k }))
      : [];

  return (
    <>
      {omniOpen ? (
        <div className="ayeba-mobile-omni-sheet" role="dialog" aria-label="Adresse">
          <div className="ayeba-mobile-omni-panel">
            <form onSubmit={onOmniSubmit}>
              <input
                value={omni}
                onChange={(e) => setOmni(e.target.value)}
                placeholder="Rechercher ou saisir une adresse"
                autoFocus
                spellCheck={false}
                inputMode="url"
                enterKeyHint="go"
              />
              <button type="submit">Aller</button>
              <button type="button" className="ayeba-ghost" onClick={() => setOmniOpen(false)}>
                Fermer
              </button>
            </form>
            {isWeb ? (
              <div className="ayeba-mobile-omni-actions">
                <button type="button" onClick={onCopy}>{copied ? "Copié ✓" : "Copier l'adresse"}</button>
                <button type="button" onClick={() => void onShare()}>Partager</button>
                <button type="button" onClick={() => toggleFav(url, title)}>
                  {starred ? "★ Retirer des favoris" : "☆ Ajouter aux favoris"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tabsOpen ? <MobileTabsOverview onClose={() => setTabsOpen(false)} /> : null}

      {historyOpen && historyEntries.length ? (
        <div className="ayeba-mobile-history-pop" role="menu">
          {historyEntries.map(({ u, i }) => (
            <button
              key={`${u}-${i}`}
              type="button"
              role="menuitem"
              onClick={() => {
                webGoTo(i);
                setHistoryOpen(null);
              }}
            >
              {hostOf(u)}
            </button>
          ))}
        </div>
      ) : null}
      {historyOpen ? (
        <div className="ayeba-mobile-pop-scrim" onClick={() => setHistoryOpen(null)} aria-hidden />
      ) : null}

      {favsOpen ? (
        <div className="ayeba-mobile-omni-sheet" role="dialog" aria-label="Favoris">
          <div className="ayeba-mobile-omni-panel">
            <div className="ayeba-mobile-favs-head">
              <strong>Favoris</strong>
              <button type="button" className="ayeba-ghost" onClick={() => setFavsOpen(false)}>
                Fermer
              </button>
            </div>
            {favs.length === 0 ? (
              <p className="ayeba-mobile-favs-empty">Aucun favori — ouvre une page puis touche ★.</p>
            ) : (
              <ul className="ayeba-mobile-favs-list">
                {favs.map((f) => (
                  <li key={f.url}>
                    <button
                      type="button"
                      onClick={() => {
                        setFavsOpen(false);
                        if (isWeb) navigateWebTab(f.url);
                        else openWebTab(f.url);
                      }}
                    >
                      <span className="ayeba-mobile-favs-title">{f.title}</span>
                      <span className="ayeba-mobile-favs-host">{hostOf(f.url)}</span>
                    </button>
                    <button
                      type="button"
                      className="ayeba-mobile-favs-del"
                      aria-label={`Retirer ${f.title}`}
                      onClick={() => removeFav(f.url)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <div className="ayeba-mobile-browser" data-web={isWeb || undefined}>
        <button
          type="button"
          className="ayeba-mobile-omni-pill"
          onClick={() => {
            setOmni(isWeb ? url : "");
            setOmniOpen(true);
          }}
          aria-label="Adresse ou recherche"
        >
          <span className="ayeba-mobile-omni-lock" aria-hidden>
            {isWeb ? "🔒" : "🔍"}
          </span>
          <span className="ayeba-mobile-omni-text">
            {isWeb ? hostOf(url) : "Rechercher ou saisir une adresse"}
          </span>
        </button>

        <nav className="ayeba-mobile-browser-bar" aria-label="Navigation">
          <button
            type="button"
            disabled={!canGoBack}
            onPointerDown={() => onPressStart("back")}
            onPointerUp={() => onPressEnd(webGoBack)}
            onPointerLeave={() => {
              if (lpTimer.current !== null) {
                window.clearTimeout(lpTimer.current);
                lpTimer.current = null;
              }
            }}
            aria-label="Précédent (appui long : historique)"
          >
            ←
          </button>
          <button
            type="button"
            disabled={!canGoForward}
            onPointerDown={() => onPressStart("forward")}
            onPointerUp={() => onPressEnd(webGoForward)}
            onPointerLeave={() => {
              if (lpTimer.current !== null) {
                window.clearTimeout(lpTimer.current);
                lpTimer.current = null;
              }
            }}
            aria-label="Suivant (appui long : historique)"
          >
            →
          </button>
          <button type="button" disabled={!isWeb} onClick={() => void onShare()} aria-label="Partager">
            ⤴
          </button>
          <button
            type="button"
            onClick={() => (isWeb ? toggleFav(url, title) : setFavsOpen(true))}
            onContextMenu={(e) => {
              e.preventDefault();
              setFavsOpen(true);
            }}
            aria-label={starred ? "Favori actif (appui long : liste)" : "Favoris"}
            className={starred ? "is-starred" : undefined}
          >
            {starred ? "★" : "☆"}
          </button>
          <button
            type="button"
            className="ayeba-mobile-tabs-btn"
            onClick={() => setTabsOpen(true)}
            aria-label={`Onglets (${tabs.length})`}
          >
            ⿻<span className="ayeba-mobile-tabs-count">{tabs.length}</span>
          </button>
        </nav>
      </div>
    </>
  );
}
