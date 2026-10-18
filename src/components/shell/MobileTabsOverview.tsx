"use client";

import { useBrowserShell } from "@/lib/browser-shell";
import { useAyeba } from "@/lib/store";

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Vue d'ensemble des onglets façon Safari : grille de cartes, fermer, tout fermer, nouveau. */
export function MobileTabsOverview({ onClose }: { onClose: () => void }) {
  const { tabs, activeId, activateTab, closeTab, closeAllTabs, openHomeTab } = useBrowserShell();
  const { resetHome } = useAyeba();

  return (
    <div className="ayeba-tabsoverview" role="dialog" aria-label="Onglets">
      <header className="ayeba-tabsoverview-head">
        <span className="ayeba-tabsoverview-count">
          {tabs.length} onglet{tabs.length > 1 ? "s" : ""}
        </span>
        <button type="button" className="ayeba-tabsoverview-done" onClick={onClose}>
          OK
        </button>
      </header>

      <div className="ayeba-tabsoverview-grid">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const label = tab.kind === "home" ? "Accueil Ayeba" : hostOf(tab.kind === "web" ? tab.url : undefined) || tab.title;
          return (
            <div
              key={tab.id}
              className={`ayeba-tabscard${isActive ? " active" : ""}`}
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
                  {tab.kind === "home" ? "A" : label.slice(0, 1).toUpperCase()}
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
                <span>{tab.kind === "home" ? "⌂" : "🌐"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="ayeba-tabsoverview-foot">
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
      </footer>
    </div>
  );
}
