"use client";

import { useState } from "react";
import { useBrowserShell } from "@/lib/browser-shell";
import { useBrowserHistory } from "@/lib/browser-history";
import { useAyeba } from "@/lib/store";
import {
  IconClock,
  IconClose,
  IconHome,
  IconPlus,
  IconRestore,
  IconShield,
} from "./icons";

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconUrl(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/favicon.ico`;
  } catch {
    return "";
  }
}

/** Favicon réel du site avec repli sur l'initiale (comme Safari). */
function TabFavicon({
  url,
  fallback,
  className,
}: {
  url?: string;
  fallback: string;
  className: string;
}) {
  const [err, setErr] = useState(false);
  const src = faviconUrl(url);
  if (!src || err) {
    return <span className={className}>{fallback}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`${className} is-img`}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/**
 * Vue d'ensemble des onglets — disposition Safari iOS :
 * grille de cartes = captures réelles des pages, pas d'en-tête en haut,
 * toute la commande dans la barre du bas (Privée | N onglets | OK, +, liste).
 */
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

  const inListView = view !== "tabs";

  return (
    <div className="ayeba-tabsoverview" role="dialog" aria-label="Onglets">
      {view === "tabs" ? (
        <div className="ayeba-tabsoverview-grid">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            const label =
              tab.kind === "home"
                ? "Accueil Ayeba"
                : hostOf(tab.kind === "web" ? tab.url : undefined) || tab.title;
            const tabUrl = tab.kind === "web" ? tab.url : undefined;
            const fallbackLetter = tab.private
              ? ""
              : tab.kind === "home"
                ? "A"
                : (label.slice(0, 1) || "A").toUpperCase();
            const hasShot = tab.kind === "web" && !!tab.snapshot;
            return (
              <div key={tab.id} className="ayeba-tabscard-wrap">
                <div
                  className={`ayeba-tabscard${isActive ? " active" : ""}${tab.private ? " private" : ""}${hasShot ? " has-shot" : ""}`}
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
                    {tab.private ? (
                      <span className="ayeba-tabscard-fav" aria-hidden>
                        <IconShield size={11} />
                      </span>
                    ) : (
                      <TabFavicon
                        url={tabUrl}
                        fallback={fallbackLetter}
                        className="ayeba-tabscard-fav"
                      />
                    )}
                    <span className="ayeba-tabscard-title">{tab.title}</span>
                    <button
                      type="button"
                      className="ayeba-tabscard-close"
                      aria-label={`Fermer ${tab.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <IconClose size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                  {hasShot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tab.snapshot} alt="" className="ayeba-tabscard-shot" />
                  ) : (
                    <div className="ayeba-tabscard-thumb" aria-hidden>
                      <div className="ayeba-tabscard-thumb-inner">
                        {tab.private ? (
                          <IconShield size={34} strokeWidth={1.3} />
                        ) : tab.kind === "home" ? (
                          <IconHome size={34} strokeWidth={1.3} />
                        ) : (
                          <>
                            <TabFavicon
                              url={tabUrl}
                              fallback={fallbackLetter}
                              className="ayeba-tabscard-thumb-favicon"
                            />
                            <span className="ayeba-tabscard-thumb-host">{hostOf(tab.url)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="ayeba-tabscard-label" aria-hidden>
                  {tab.private ? (
                    <IconShield size={12} />
                  ) : (
                    <TabFavicon
                      url={tabUrl}
                      fallback={fallbackLetter}
                      className="ayeba-tabscard-label-favicon"
                    />
                  )}
                  <span>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {inListView ? (
        <div className="ayeba-tabsoverview-listwrap">
          <div className="ayeba-tabsoverview-listhead">
            <button type="button" className="ayeba-ghost" onClick={() => setView("tabs")}>
              ← Onglets
            </button>
            <strong>{view === "history" ? "Historique" : "Récemment fermés"}</strong>
            <span />
          </div>
          <div className="ayeba-tabsoverview-list">
            {view === "history" ? (
              entries.length === 0 ? (
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
                        <IconClose size={13} strokeWidth={2.2} />
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
              )
            ) : recentlyClosed.length === 0 ? (
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
        </div>
      ) : null}

      {/* Barre basse façon Safari : Privée | N onglets | OK sur une ligne,
          puis rangée d'actions (+, liste, tout fermer). */}
      <footer className="ayeba-tabsoverview-foot">
        <div className="ayeba-tabsoverview-mid">
          <button
            type="button"
            className={`ayeba-tabsoverview-private${privateMode ? " on" : ""}`}
            onClick={togglePrivate}
          >
            <IconShield size={14} /> Privée
          </button>
          <span className="ayeba-tabsoverview-count" aria-live="polite">
            {view === "history"
              ? "Historique"
              : view === "closed"
                ? "Récemment fermés"
                : `${tabs.length} onglet${tabs.length > 1 ? "s" : ""}`}
          </span>
          <button type="button" className="ayeba-tabsoverview-done" onClick={onClose}>
            OK
          </button>
        </div>
        <div className="ayeba-tabsoverview-actions">
          <button
            type="button"
            className="ayeba-tabsoverview-footbtn"
            onClick={() => setView(view === "history" ? "tabs" : "history")}
            aria-label="Historique"
          >
            <IconClock size={18} />
          </button>
          <button
            type="button"
            className="ayeba-tabsoverview-footbtn"
            onClick={() => setView(view === "closed" ? "tabs" : "closed")}
            aria-label="Récemment fermés"
          >
            <IconRestore size={18} />
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
            <IconPlus size={22} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="ayeba-tabsoverview-closeall"
            disabled={tabs.length <= 1}
            onClick={() => {
              closeAllTabs();
              onClose();
            }}
          >
            Tout fermer
          </button>
        </div>
      </footer>
    </div>
  );
}
