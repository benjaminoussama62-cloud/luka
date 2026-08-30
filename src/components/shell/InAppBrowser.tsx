"use client";

import { useEffect, useState } from "react";
import { isMobileApp } from "@/lib/mobile-app";
import { MobileBrowserChrome } from "./MobileBrowserChrome";

type Props = {
  url: string;
  title: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  onNavigate?: (url: string) => void;
  onHome?: () => void;
};

export function InAppBrowser({
  url,
  title,
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
  onReload,
  onNavigate,
  onHome,
}: Props) {
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(true);
  const mobile = typeof window !== "undefined" && isMobileApp();

  useEffect(() => {
    setBusy(true);
    const t = window.setTimeout(() => setBusy(false), 1200);
    return () => window.clearTimeout(t);
  }, [url, nonce]);

  function reload() {
    setNonce((n) => n + 1);
    onReload?.();
  }

  return (
    <div className={`ayeba-inapp-browser${mobile ? " is-mobile" : ""}`}>
      {!mobile ? (
        <div className="ayeba-inapp-toolbar">
          <div className="ayeba-inapp-chip" title={title}>
            <span className="ayeba-inapp-chip-dot" aria-hidden />
            <span className="ayeba-inapp-chip-title">{title}</span>
          </div>
          <button type="button" className="ayeba-inapp-reload" onClick={reload} aria-label="Recharger">
            Recharger
          </button>
        </div>
      ) : null}
      <div className="ayeba-inapp-frame-wrap">
        {busy ? <div className="ayeba-inapp-loading" aria-hidden /> : null}
        <iframe
          key={`${url}:${nonce}`}
          title={title}
          src={url}
          className="ayeba-inapp-frame"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="origin-when-cross-origin"
          onLoad={() => setBusy(false)}
        />
      </div>
      {mobile && onBack && onForward && onHome ? (
        <MobileBrowserChrome
          url={url}
          title={title}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onBack={onBack}
          onForward={onForward}
          onReload={reload}
          onNavigate={onNavigate ?? (() => {})}
          onHome={onHome}
        />
      ) : null}
    </div>
  );
}
