"use client";

import { SearchBar } from "./SearchBar";
import { MarketTicker } from "./MarketTicker";
import { HomeShortcuts } from "./HomeShortcuts";

/** Accueil — recherche + raccourcis type Yandex + marchés */
export function HomeSearchPanel() {
  return (
    <div className="ayeba-home-search-stack w-full">
      <SearchBar large />
      <HomeShortcuts />
      <MarketTicker belowSearch compact />
    </div>
  );
}
