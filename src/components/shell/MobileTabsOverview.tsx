"use client";

import { useState } from "react";
import { useBrowserShell } from "@/lib/browser-shell";
import { useBrowserHistory } from "@/lib/browser-history";
import { useAyeba } from "@/lib/store";

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** Vue d'ensemble des onglets façon Safari : grille, privé, historique, récemment fermés. */
export function MobileTabsOverview({ onClose }: { onClose: () => void }) {
  const {
    tabs,
    activeId,
    privateMode,
    setPrivateMode,
    recentlyClosed,
    restoreClosedTab,
    activateTab,
    closeTab,
    closeAllTabs,
    openHomeTab,
    openWebTab,
  } = useBrowserShell();
  const { resetHome, setPrivateMode: setSearchPrivate } = useAyeba();
  const { entries, removeEntry, clearAll } = useBrowserHistory();
  const [view, setView] = useState<"tabs" | "history" | "closed">("tabs");
  const [historyQuery, setHistoryQuery] = useState("");

  const q = historyQuery.trim().toLowerCase();
  const filteredHistory = q
    ? entries.filter((e) => e.title.toLowerCase().includes(q) || e.url.toLowerCase().includes(q))
    : entries;

  function togglePrivate() {
    const next = !privateMode;
    setPrivateMode(next);
    setSearchPrivate(next);
  }

  return (
    <div className="ayeba-tabsoverview" role="dialog" aria-label="Onglets">
      <header className="ayeba-tabsoverview-head">
        <button
          type="button"
          className={`ayeba-tabsoverview-private${privateMode ? " on" : ""}`}
          onClick={togglePrivate}
        >
          {privateMode ? "🕶 Privé" : "Privé"}
        </button>
        <span className="ayeba-tabsoverview-count">
          {view === "history"
            ? "Historique"
            : view === "closed"
              ? "Récemment fermés"
              : `${tabs.length} onglet${tabs.length > 1 ? "s" : ""}`}
        </span>
        <button type="button" className="ayeba-tabsoverview-done" onClick={onClose}>
          OK
        </button>
      </header>

      {view === "tabs" ? (
        <div className="ayeba-tabsoverview-grid">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            const label =
              tab.kind === "home"
                ? "Accueil Ayeba"
                : hostOf(tab.kind === "web" ? tab.url : undefined) || tab.title;
            return (
              <div
                key={tab.id}
                className={`ayeba-tabscard${isActive ? " active" : ""}${tab.private ? " private" : ""}`}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => {
                  activateTab(tab.id);
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    activateTab(tab.id);
                    onClose();
                  }
                }}
              >
                <div className="ayeba-tabscard-head">
                  <span className="ayeba-tabscard-fav" aria-hidden>
                    {tab.private ? "🕶" : tab.kind === "home" ? "A" : label.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="ayeba-tabscard-meta">
                    <span className="ayeba-tabscard-title">{tab.title}</span>
                    <span className="ayeba-tabscard-host">{label}</span>
                  </div>
                  <button
                    type="button"
                    className="ayeba-tabscard-close"
                    aria-label={`Fermer ${tab.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="ayeba-tabscard-thumb" aria-hidden>
                  <span>{tab.private ? "🕶" : tab.kind === "home" ? "⌂" : "🌐"}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "history" ? (
        <div className="ayeba-tabsoverview-list">
          {entries.length === 0 ? (
            <p className="ayeba-tabsoverview-empty">Aucun historique de navigation.</p>
          ) : (
            <>
              <input
                className="ayeba-tabsoverview-search"
                type="search"
                placeholder="Rechercher dans l'historique"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
              />
              {filteredHistory.map((e) => (
                <div key={`${e.url}-${e.ts}`} className="ayeba-tabsoverview-row">
                  <button
                    type="button"
                    className="ayeba-tabsoverview-row-main"
                    onClick={() => {
                      openWebTab(e.url, e.title);
                      onClose();
                    }}
                  >
                    <span className="ayeba-tabscard-title">{e.title}</span>
                    <span className="ayeba-tabscard-host">
                      {hostOf(e.url)} · {fmtTime(e.ts)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ayeba-tabscard-close"
                    aria-label="Supprimer"
                    onClick={() => removeEntry(e.url)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {filteredHistory.length === 0 ? (
                <p className="ayeba-tabsoverview-empty">Aucun résultat.</p>
              ) : null}
              <button type="button" className="ayeba-tabsoverview-clear" onClick={clearAll}>
                Effacer tout l’historique
              </button>
            </>
          )}
        </div>
      ) : null}

      {view === "closed" ? (
        <div className="ayeba-tabsoverview-list">
          {recentlyClosed.length === 0 ? (
            <p className="ayeba-tabsoverview-empty">Aucun onglet récemment fermé.</p>
          ) : (
            recentlyClosed.map((c, i) => (
              <div key={i} className="ayeba-tabsoverview-row">
                <button
                  type="button"
                  className="ayeba-tabsoverview-row-main"
                  onClick={() => {
                    restoreClosedTab(i);
                    onClose();
                  }}
                >
                  <span className="ayeba-tabscard-title">{c.title}</span>
                  <span className="ayeba-tabscard-host">{c.url ? hostOf(c.url) : "Onglet d’accueil"}</span>
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}

      <footer className="ayeba-tabsoverview-foot">
        <button
          type="button"
          className="ayeba-tabsoverview-footbtn"
          onClick={() => setView(view === "history" ? "tabs" : "history")}
        >
          🕘 Historique
        </button>
        <button
          type="button"
          className="ayeba-tabsoverview-footbtn"
          onClick={() => setView(view === "closed" ? "tabs" : "closed")}
        >
          ↺ Récents
        </button>
        <button
          type="button"
          className="ayeba-tabsoverview-new"
          aria-label="Nouvel onglet"
          onClick={() => {
            resetHome();
            openHomeTab();
            onClose();
          }}
        >
          +
        </button>
        <button
          type="button"
          className="ayeba-tabsoverview-closeall"
          onClick={() => {
            closeAllTabs();
            onClose();
          }}
          disabled={tabs.length <= 1}
        >
          Tout fermer
        </button>
      </footer>
    </div>
  );
}
