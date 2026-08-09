"use client";

import { useEffect, useState } from "react";

export function InAppBrowser({ url, title }: { url: string; title: string }) {
  const [nonce, setNonce] = useState(0);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    setHint(false);
    const t = window.setTimeout(() => setHint(true), 5000);
    return () => window.clearTimeout(t);
  }, [url, nonce]);

  return (
    <div className="ayeba-inapp-browser">
      <div className="ayeba-inapp-toolbar">
        <span className="ayeba-inapp-title">{title}</span>
        <input className="ayeba-inapp-url" value={url} readOnly aria-label="Adresse" />
        <button type="button" className="ayeba-inapp-reload" onClick={() => setNonce((n) => n + 1)}>
          Recharger
        </button>
      </div>
      <div className="ayeba-inapp-frame-wrap">
        {hint ? (
          <div className="ayeba-inapp-hint" role="status">
            Si la page reste vide, le site interdit l’intégration — l’onglet reste dans Ayeba.
          </div>
        ) : null}
        <iframe
          key={`${url}:${nonce}`}
          title={title}
          src={url}
          className="ayeba-inapp-frame"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        />
      </div>
    </div>
  );
}
