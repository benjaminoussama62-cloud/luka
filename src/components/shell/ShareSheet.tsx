"use client";

import { useEffect, useState } from "react";
import { IconBook, IconBookFilled, IconCopy, IconShare } from "./icons";

type Props = {
  url: string;
  title: string;
  starred: boolean;
  inReadingList: boolean;
  onToggleFav: () => void;
  onToggleReading: () => void;
  onClose: () => void;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Feuille de partage AYEBA — remplace le share système générique. */
export function ShareSheet({
  url,
  title,
  starred,
  inReadingList,
  onToggleFav,
  onToggleReading,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(onClose, 700);
    } catch {
      /* ignore */
    }
  }

  async function systemShare() {
    try {
      await navigator.share({ title, url });
      onClose();
    } catch {
      /* annulé */
    }
  }

  return (
    <>
      <div className="ayeba-share-scrim" onClick={onClose} aria-hidden />
      <div className="ayeba-share-sheet" role="dialog" aria-label="Partager">
        <div className="ayeba-share-head">
          <div className="ayeba-share-meta">
            <div className="ayeba-share-title">{title || hostOf(url)}</div>
            <div className="ayeba-share-host">{hostOf(url)}</div>
          </div>
          <button type="button" className="ayeba-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="ayeba-share-actions">
          {canShare ? (
            <button type="button" className="ayeba-share-action" onClick={() => void systemShare()}>
              <span className="ayeba-share-icon"><IconShare size={19} /></span>
              Partager…
            </button>
          ) : null}
          <button type="button" className="ayeba-share-action" onClick={() => void copy()}>
            <span className="ayeba-share-icon"><IconCopy size={19} /></span>
            {copied ? "Copié ✓" : "Copier le lien"}
          </button>
          <button
            type="button"
            className="ayeba-share-action"
            onClick={() => {
              onToggleFav();
              onClose();
            }}
          >
            <span className="ayeba-share-icon">
              {starred ? <IconBookFilled size={19} /> : <IconBook size={19} />}
            </span>
            {starred ? "Retirer des favoris" : "Ajouter aux favoris"}
          </button>
          <button
            type="button"
            className="ayeba-share-action"
            onClick={() => {
              onToggleReading();
              onClose();
            }}
          >
            <span className="ayeba-share-icon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
                <path d="M9 7h7M9 11h5" />
              </svg>
            </span>
            {inReadingList ? "Retirer de la liste de lecture" : "Liste de lecture"}
          </button>
        </div>
      </div>
    </>
  );
}
