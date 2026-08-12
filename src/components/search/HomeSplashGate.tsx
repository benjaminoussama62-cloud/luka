"use client";

import { type ReactNode } from "react";
import { SplashHero } from "./SplashHero";
import { SiteFooter } from "./SiteFooter";

export function HomeSplashGate({
  header,
  search,
}: {
  header: ReactNode;
  search: ReactNode;
}) {
  return (
    <div className="ayeba-home ayeba-home-ready">
      <header className="ayeba-home-header ayeba-home-header-visible">{header}</header>
      <SplashHero />
      <div className="ayeba-home-search ayeba-home-search-visible">{search}</div>
      {/* Une seule nav footer — pas de double liste Studio/Télécharger */}
      <SiteFooter />
    </div>
  );
}
