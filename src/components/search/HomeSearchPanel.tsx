"use client";

import { SearchBar } from "./SearchBar";
import { MarketTicker } from "./MarketTicker";

/** Accueil épuré — design AYEBA, recherche au centre, marchés discrets en dessous */
export function HomeSearchPanel() {
  return (
    <div className="ayeba-home-search-stack w-full">
      <SearchBar large />
      <MarketTicker belowSearch compact />
    </div>
  );
}
