"use client";

import { useEffect, useState } from "react";

export function InAppBrowser({ url, title }: { url: string; title: string }) {
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    setBusy(true);
    const t = window.setTimeout(() => setBusy(false), 1200);
    return () => window.clearTimeout(t);
  }, [url, nonce]);

  return (
    <div className="ayeba-inapp-browser">
      <div className="ayeba-inapp-toolbar">
        <div className="ayeba-inapp-chip" title={title}>
          <span className="ayeba-inapp-chip-dot" aria-hidden />
          <span className="ayeba-inapp-chip-title">{title}</span>
        </div>
        <button
          type="button"
          className="ayeba-inapp-reload"
          onClick={() => setNonce((n) => n + 1)}
          aria-label="Recharger"
        >
          Recharger
        </button>
      </div>
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
    </div>
  );
}
