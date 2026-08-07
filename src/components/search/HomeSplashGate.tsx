"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { SplashHero } from "./SplashHero";

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
      <nav className="ayeba-home-nav">
        <Link href="/ayebi" className="ayeba-home-nav-link">
          Ayebi
        </Link>
        <span className="text-[var(--faint)]">·</span>
        <Link href="/marches" className="ayeba-home-nav-link">
          Marchés
        </Link>
      </nav>
    </div>
  );
}
