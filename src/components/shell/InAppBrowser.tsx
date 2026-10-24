"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isMobileApp } from "@/lib/mobile-app";
import {
  addNativeListener,
  nativeBrowser,
  nativeBrowserAvailable,
  type NativeNav,
  type NativeRect,
} from "@/lib/native-browser";

type SslIssue = { url: string; primaryError: number; certificate: string };
type Threat = { url: string; threatType: number };

type Props = {
  url: string;
  title: string;
  tabId?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  onNavigate?: (url: string) => void;
  onSearch?: (query: string) => void;
  onHome?: () => void;
  onNativeNav?: (nav: NativeNav) => void;
  onNewTab?: (url: string) => void;
  /** Capture JPEG de la page (vignette onglet façon Safari). */
  onSnapshot?: (dataUrl: string) => void;
};

export function InAppBrowser({
  url,
  title,
  tabId,
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
  onReload,
  onNativeNav,
  onNewTab,
  onSnapshot,
}: Props) {
  const [nonce, setNonce] = useState(0);
  const [frameUrl, setFrameUrl] = useState(url);
  const navUrl = useRef(url);
  const [busy, setBusy] = useState(true);
  const [progress, setProgress] = useState(0);
  const [sslIssue, setSslIssue] = useState<SslIssue | null>(null);
  const [threat, setThreat] = useState<Threat | null>(null);
  const [findInset, setFindInset] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prevTabRef = useRef<string | null>(null);
  const native = typeof window !== "undefined" && nativeBrowserAvailable();
  const mobile = typeof window !== "undefined" && isMobileApp();

  /* ---------------- Mode natif : vraie WebView Android ---------------- */

  const applyNativeFrame = useCallback(() => {
    const el = wrapRef.current;
    const nb = nativeBrowser();
    if (!el || !nb) return;
    const r = el.getBoundingClientRect();
    const rect: NativeRect = {
      x: r.left,
      y: r.top + 2 + findInset, // 2px progression + find-bar eventuelle
      width: r.width,
      height: r.height - 2 - findInset,
    };
    void nb.setFrame(rect);
  }, [findInset]);

  // Ouverture + restauration d'etat par onglet.
  useEffect(() => {
    if (!native || !tabId) return;
    const nb = nativeBrowser();
    if (!nb) return;
    const prev = prevTabRef.current;
    const el = wrapRef.current;
    const r = el?.getBoundingClientRect();
    void (async () => {
      if (prev && prev !== tabId) await nb.saveTab({ id: prev });
      await nb.open({
        url,
        tabId,
        x: r?.left ?? 0,
        y: (r?.top ?? 0) + 2,
        width: r?.width ?? window.innerWidth,
        height: (r?.height ?? window.innerHeight) - 2,
      });
      if (prev !== tabId) await nb.restoreTab({ id: tabId, url });
      prevTabRef.current = tabId;
      applyNativeFrame();
    })();
    return () => {
      void nb.saveTab({ id: tabId });
      void nb.setHidden({ hidden: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native, tabId]);

  // Navigation pilotee par le shell (url prop change -> loadUrl natif).
  useEffect(() => {
    if (!native) return;
    void nativeBrowser()?.loadUrl({ url });
  }, [native, url]);

  // Recadre la WebView quand la fenetre change / barre de recherche.
  useEffect(() => {
    if (!native) return;
    applyNativeFrame();
    window.addEventListener("resize", applyNativeFrame);
    const onFindBar = (e: Event) =>
      setFindInset((e as CustomEvent<{ open?: boolean }>).detail?.open ? 48 : 0);
    window.addEventListener("ayeba:findbar", onFindBar);
    return () => {
      window.removeEventListener("resize", applyNativeFrame);
      window.removeEventListener("ayeba:findbar", onFindBar);
    };
  }, [native, applyNativeFrame]);

  // Evenements natifs -> shell + UI.
  useEffect(() => {
    if (!native) return;
    const cleanups = [
      addNativeListener<NativeNav>("nav", (d) => {
        setBusy(d.loading);
        if (d.loading) setSslIssue(null);
        onNativeNav?.(d);
        // Page chargée -> capture la vignette de l'onglet (façon Safari).
        if (!d.loading) {
          window.setTimeout(() => {
            void nativeBrowser()
              ?.capture()
              .then((r) => {
                if (r?.data) onSnapshot?.(r.data);
              })
              .catch(() => {});
          }, 700);
        }
      }),
      addNativeListener<{ value: number }>("progress", (d) => setProgress(d.value)),
      addNativeListener<{ dy: number; y: number }>("scroll", (d) => {
        window.dispatchEvent(new CustomEvent("ayeba:browser-scroll", { detail: d }));
      }),
      addNativeListener<{ url: string }>("newTab", (d) => onNewTab?.(d.url)),
      addNativeListener<SslIssue>("sslError", (d) => setSslIssue(d)),
      addNativeListener<Threat>("safeBrowsingHit", (d) => setThreat(d)),
      addNativeListener<{ filename?: string; error?: string }>("download", (d) => {
        window.dispatchEvent(
          new CustomEvent("ayeba:toast", {
            detail: d.error ? `Échec du téléchargement` : `Téléchargé : ${d.filename}`,
          }),
        );
      }),
    ];
    return () => cleanups.forEach((c) => c?.());
  }, [native, onNativeNav, onNewTab, onSnapshot]);

  // Les avertissements HTML passent par-dessus : on masque la WebView native.
  useEffect(() => {
    if (!native) return;
    void nativeBrowser()?.setHidden({ hidden: !!(sslIssue || threat) });
  }, [native, sslIssue, threat]);

  /* ---------------- Fallback iframe (web classique) ---------------- */

  // Navigation demandee par le shell (omnibox, favoris...) -> remount.
  // La navigation INTERNE de l'iframe met a jour navUrl sans reload.
  useEffect(() => {
    if (url !== navUrl.current) {
      navUrl.current = url;
      setFrameUrl(url);
      setNonce((n) => n + 1);
    }
  }, [url]);

  useEffect(() => {
    if (native) return;
    const t1 = window.setTimeout(() => setBusy(true), 0);
    const t2 = window.setTimeout(() => setBusy(false), 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [nonce, native]);

  function reload() {
    if (native) {
      void nativeBrowser()?.reload();
      onReload?.();
      return;
    }
    setNonce((n) => n + 1);
    onReload?.();
  }

  function iframeKey() {
    return `${tabId ?? "tab"}:${nonce}`;
  }

  const sslText =
    sslIssue &&
    ({
      0: "Le certificat n'est pas encore valide.",
      1: "Le certificat a expiré.",
      2: "Le certificat ne correspond pas à ce site (usurpation possible).",
      3: "Le certificat provient d'une autorité non reconnue.",
      4: "La date du certificat est invalide.",
      5: "Erreur de certificat inconnue.",
    }[sslIssue.primaryError] ?? "Erreur de certificat.");

  return (
    <div className={`ayeba-inapp-browser${mobile ? " is-mobile" : ""}`}>
      {!mobile ? (
        <div className="ayeba-inapp-toolbar">
          <button
            type="button"
            className="ayeba-inapp-reload"
            onClick={onBack}
            disabled={!canGoBack}
            aria-label="Précédent"
          >
            ←
          </button>
          <button
            type="button"
            className="ayeba-inapp-reload"
            onClick={onForward}
            disabled={!canGoForward}
            aria-label="Suivant"
          >
            →
          </button>
          <div className="ayeba-inapp-chip" title={title}>
            <span className="ayeba-inapp-chip-dot" aria-hidden />
            <span className="ayeba-inapp-chip-title">{title}</span>
          </div>
          <button type="button" className="ayeba-inapp-reload" onClick={reload} aria-label="Recharger">
            Recharger
          </button>
        </div>
      ) : null}
      <div className="ayeba-inapp-frame-wrap" ref={wrapRef}>
        {busy && !native ? <div className="ayeba-inapp-loading" aria-hidden /> : null}
        {native ? (
          <>
            <div
              className="ayeba-native-progress"
              style={{ width: `${progress}%`, opacity: busy ? 1 : 0 }}
              aria-hidden
            />
            {sslIssue ? (
              <div className="ayeba-native-warning" role="alert">
                <div className="ayeba-native-warning-icon">⚠</div>
                <h2>Connexion non sécurisée</h2>
                <p>{sslText}</p>
                <p className="ayeba-native-warning-host">{hostOfUrl(sslIssue.url)}</p>
                <div className="ayeba-native-warning-actions">
                  <button
                    type="button"
                    onClick={() => {
                      void nativeBrowser()?.sslProceed({ proceed: false });
                      setSslIssue(null);
                      onBack?.();
                    }}
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    className="ayeba-ghost"
                    onClick={() => {
                      void nativeBrowser()?.sslProceed({ proceed: true });
                      setSslIssue(null);
                    }}
                  >
                    Continuer quand même
                  </button>
                </div>
              </div>
            ) : null}
            {threat ? (
              <div className="ayeba-native-warning is-danger" role="alert">
                <div className="ayeba-native-warning-icon">🛡</div>
                <h2>Site dangereux bloqué</h2>
                <p>
                  Google Safe Browsing signale cette page comme potentiellement frauduleuse ou
                  malveillante.
                </p>
                <p className="ayeba-native-warning-host">{hostOfUrl(threat.url)}</p>
                <div className="ayeba-native-warning-actions">
                  <button type="button" onClick={() => { setThreat(null); onBack?.(); }}>
                    Retour en sécurité
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <iframe
            key={iframeKey()}
            title={title}
            src={frameUrl}
            className="ayeba-inapp-frame"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="origin-when-cross-origin"
            onLoad={(e) => {
              setBusy(false);
              // Same-origin uniquement : synchronise l'URL/titre de l'onglet
              // avec la navigation interne de l'iframe (pages Ayeba).
              try {
                const loc = e.currentTarget.contentWindow?.location;
                const doc = e.currentTarget.contentDocument;
                if (loc && loc.href && loc.href !== "about:blank" && loc.href !== navUrl.current) {
                  navUrl.current = loc.href;
                  onNativeNav?.({
                    url: loc.href,
                    title: doc?.title || undefined,
                    loading: false,
                  });
                }
              } catch {
                /* cross-origin : opaque par design */
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function hostOfUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
