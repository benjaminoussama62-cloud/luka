"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useBrowserShell } from "@/lib/browser-shell";
import { useBrowserFavs } from "@/lib/browser-favs";
import { normalizeOmniInput } from "@/lib/search-engine-prefs";
import {
  addNativeListener,
  nativeBrowser,
  nativeBrowserAvailable,
} from "@/lib/native-browser";
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
  const [suggests, setSuggests] = useState<string[]>([]);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<"back" | "forward" | null>(null);
  const [favsOpen, setFavsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findInfo, setFindInfo] = useState<{ active: number; matches: number } | null>(null);
  const [desktopMode, setDesktopMode] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [toast, setToast] = useState("");
  const lpTimer = useRef<number | null>(null);
  const scrollAccum = useRef(0);
  const native = typeof window !== "undefined" && nativeBrowserAvailable();

  useEffect(() => {
    document.body.classList.add("ayeba-mobile-chrome");
    return () => document.body.classList.remove("ayeba-mobile-chrome");
  }, []);

  // WebView native masquee quand un overlay HTML couvre la page
  // (sheet omnibox, grille d'onglets, favoris, menus).
  const overlayOpen = omniOpen || tabsOpen || favsOpen || pageMenuOpen || historyOpen !== null;
  useEffect(() => {
    if (!native) return;
    void nativeBrowser()?.setHidden({ hidden: overlayOpen });
  }, [native, overlayOpen]);

  // Barres immersives : scroll vers le bas -> chrome cache, vers le haut -> visible.
  useEffect(() => {
    const onScroll = (e: Event) => {
      const { dy, y } = (e as CustomEvent<{ dy: number; y: number }>).detail;
      scrollAccum.current = y <= 8 ? 0 : scrollAccum.current + dy;
      if (y <= 8) setChromeHidden(false);
      else if (scrollAccum.current > 40) {
        setChromeHidden(true);
        scrollAccum.current = 0;
      } else if (scrollAccum.current < -40) {
        setChromeHidden(false);
        scrollAccum.current = 0;
      }
    };
    window.addEventListener("ayeba:browser-scroll", onScroll);
    return () => window.removeEventListener("ayeba:browser-scroll", onScroll);
  }, []);

  // Toasts (telechargements natifs...).
  useEffect(() => {
    const onToast = (e: Event) => {
      setToast((e as CustomEvent<string>).detail);
      window.setTimeout(() => setToast(""), 2600);
    };
    window.addEventListener("ayeba:toast", onToast);
    return () => window.removeEventListener("ayeba:toast", onToast);
  }, []);

  // Find in page natif : compteur de resultats + decalage du frame.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ayeba:findbar", { detail: { open: findOpen } }));
    if (!findOpen) void nativeBrowser()?.clearFind();
  }, [findOpen]);

  function closeFind() {
    setFindInfo(null);
    setFindQuery("");
    setFindOpen(false);
  }

  useEffect(() => {
    if (!native) return;
    return addNativeListener<{ active: number; matches: number }>("findResult", (d) =>
      setFindInfo({ active: d.active + 1, matches: d.matches }),
    ) ?? undefined;
  }, [native]);

  useEffect(() => {
    if (!findOpen || !native) return;
    const q = findQuery.trim();
    const t = window.setTimeout(() => {
      void nativeBrowser()?.find({ query: q, forward: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [findQuery, findOpen, native]);

  // Suggestions omnibox : moteur + vocabulaire index, comme la barre Safari.
  useEffect(() => {
    if (!omniOpen) return;
    const q = omni.trim();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: string[] };
        setSuggests((data.suggestions ?? []).filter((s) => s.toLowerCase() !== q.toLowerCase()).slice(0, 6));
      } catch {
        /* ignore */
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [omni, omniOpen]);

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
            {suggests.length ? (
              <ul className="ayeba-mobile-omni-suggests">
                {suggests.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => {
                        setOmni(s);
                        setOmniOpen(false);
                        const looksLikeAddr = /^https?:\/\//i.test(s) || (!s.includes(" ") && s.includes("."));
                        if (looksLikeAddr) {
                          const target = normalizeOmniInput(s);
                          if (isWeb) navigateWebTab(target);
                          else openWebTab(target);
                        } else {
                          onSearch(s);
                        }
                      }}
                    >
                      <span aria-hidden>🔍</span> {s}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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

      {pageMenuOpen ? (
        <>
          <div className="ayeba-mobile-pop-scrim" onClick={() => setPageMenuOpen(false)} aria-hidden />
          <div className="ayeba-mobile-pagemenu" role="menu">
            <div className="ayeba-mobile-pagemenu-host">{hostOf(url)}</div>
            <button
              type="button"
              role="menuitem"
              disabled={!native}
              onClick={() => {
                setPageMenuOpen(false);
                setFindOpen(true);
              }}
            >
              🔎 Rechercher dans la page{native ? "" : " (app requise)"}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!native}
              onClick={() => {
                const next = !desktopMode;
                setDesktopMode(next);
                void nativeBrowser()?.setDesktop({ enabled: next });
              }}
            >
              {desktopMode ? "📱 Version mobile" : "🖥 Demander la version bureau"}
              {native ? "" : " (app requise)"}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPageMenuOpen(false);
                if (native) void nativeBrowser()?.reload();
                else navigateWebTab(url);
              }}
            >
              ↻ Recharger la page
            </button>
            <div className="ayeba-mobile-pagemenu-note">🔒 Connexion HTTPS sécurisée</div>
          </div>
        </>
      ) : null}

      {findOpen ? (
        <div className="ayeba-mobile-findbar">
          <input
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Rechercher dans la page"
            autoFocus
            enterKeyHint="search"
          />
          <span className="ayeba-mobile-findbar-count" aria-live="polite">
            {findInfo && findQuery.trim() ? `${findInfo.active}/${findInfo.matches}` : ""}
          </span>
          <button
            type="button"
            aria-label="Précédent"
            onClick={() => void nativeBrowser()?.find({ query: "", forward: false })}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Suivant"
            onClick={() => void nativeBrowser()?.find({ query: "", forward: true })}
          >
            ↓
          </button>
          <button type="button" className="ayeba-mobile-findbar-done" onClick={closeFind}>
            OK
          </button>
        </div>
      ) : null}

      {toast ? <div className="ayeba-mobile-toast" role="status">{toast}</div> : null}

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

      <div
        className={`ayeba-mobile-browser${chromeHidden ? " is-hidden" : ""}`}
        data-web={isWeb || undefined}
      >
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
            {activeTab.private ? "🕶" : isWeb ? "🔒" : "🔍"}
          </span>
          <span className="ayeba-mobile-omni-text">
            {isWeb ? hostOf(url) : activeTab.private ? "Navigation privée" : "Rechercher ou saisir une adresse"}
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
          <button
            type="button"
            disabled={!isWeb}
            onClick={() => setPageMenuOpen(true)}
            aria-label="Options de la page"
            className="ayeba-mobile-pagemenu-btn"
          >
            aA
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
