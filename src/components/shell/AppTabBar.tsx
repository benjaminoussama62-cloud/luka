"use client";

import { useBrowserShell } from "@/lib/browser-shell";
import { useAyeba } from "@/lib/store";

export function AppTabBar() {
  const { tabs, activeId, activateTab, closeTab, openHomeTab } = useBrowserShell();
  const { resetHome } = useAyeba();

  return (
    <div className="ayeba-tabbar" role="tablist" aria-label="Onglets Ayeba">
      <div className="ayeba-tabbar-scroll">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              className={`ayeba-app-tab ${active ? "active" : ""}`}
              onClick={() => activateTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activateTab(tab.id);
                }
              }}
              tabIndex={0}
            >
              <span className="ayeba-app-tab-title">{tab.title}</span>
              {tabs.length > 1 ? (
                <button
                  type="button"
                  className="ayeba-app-tab-close"
                  aria-label={`Fermer ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="ayeba-tabbar-new"
        aria-label="Nouvel onglet"
        title="Nouvel onglet"
        onClick={() => {
          resetHome();
          openHomeTab();
        }}
      >
        +
      </button>
    </div>
  );
}
