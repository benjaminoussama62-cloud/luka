"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CursorGradient } from "@/components/effects/CursorGradient";
import { GradientStage } from "@/components/effects/GradientStage";
import { LoginModal, ProfileMenu } from "@/components/auth/AuthUI";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { BrowserShellProvider, useBrowserShell } from "@/lib/browser-shell";
import { useI18n } from "@/lib/i18n";
import { isMobileApp, externalLinkProps } from "@/lib/mobile-app";
import { useAyeba } from "@/lib/store";
import type { MapPlace, MediaResult, SearchTab, ShopItem } from "@/lib/types";
import { AlgorithmSliders } from "./AlgorithmSliders";
import { CodeExecutor } from "./CodeExecutor";
import { CommunityIndex } from "./CommunityIndex";
import { DeepResearchPanel } from "./DeepResearchPanel";
import { FilterBubbleAlert } from "./FilterBubbleAlert";
import { HomeSearchPanel } from "./HomeSearchPanel";
import { HomeSplashGate } from "./HomeSplashGate";
import { InteractiveMapPanel } from "./InteractiveMapPanel";
import { NativeMediaGrid } from "./NativeMediaGrid";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { NativeShoppingPanel } from "./NativeShoppingPanel";
import { InstantAnswerCard, AyebiSerpRail } from "./InstantAnswerCard";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { MarketTicker } from "./MarketTicker";
import { PodcastPlayer } from "./PodcastPlayer";
import { RelatedSearches } from "./RelatedSearches";
import { ResultCard } from "./ResultCard";
import { AppTabBar } from "@/components/shell/AppTabBar";
import { InAppBrowser } from "@/components/shell/InAppBrowser";
import { SearchBar } from "./SearchBar";
import { ToolsMenu } from "./ToolsMenu";
import { TrustMeters } from "./TrustBadges";

const TAB_KEYS: SearchTab[] = ["web", "images", "videos", "news", "maps", "shopping", "community"];

function Stage({ home = false }: { home?: boolean }) {
  return (
    <>
      <GradientStage />
      {home ? <CursorGradient /> : null}
      <div className={`ayeba-vignette ${home ? "ayeba-vignette-soft" : "ayeba-vignette-serp"}`} aria-hidden />
    </>
  );
}

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as typeof lang)}
      className="ayeba-lang h-10 px-3 outline-none"
      aria-label="Langue"
    >
      <option value="fr">FR</option>
      <option value="ln">LN</option>
      <option value="sw">SW</option>
      <option value="en">EN</option>
    </select>
  );
}

function KnowledgeCard() {
  const { response } = useAyeba();
  const { t } = useI18n();
  const k = response?.knowledge;
  if (!k) return null;
  const top = response?.results[0];
  const ayebiLink = k.facts.find((f) => f.label === "Ayebi" || f.label === "Lire sur Ayebi")?.value;
  const isAyebi = k.sources.includes("ayebi");
  return (
    <aside className="ayeba-panel animate-rise overflow-hidden">
      {k.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={k.image} alt="" className="h-48 w-full object-cover" />
      ) : (
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--red)] via-[#8a8a96] to-transparent" />
      )}
      <div className="p-5">
        <p className="ayeba-kicker ayeba-kicker-accent">{isAyebi ? "Ayebi · encyclopédie RDC" : t("context")}</p>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-[24px] font-medium tracking-[-0.03em] text-[var(--ink)]">{k.title}</h3>
        <p className="mt-1 text-sm text-[var(--faint)]">{k.subtitle}</p>
        <p className="mt-4 text-[14px] leading-[1.75] text-[var(--muted)]">{k.summary}</p>
        {k.facts.filter((f) => !["Ayebi", "Lire sur Ayebi"].includes(f.label)).length ? (
          <dl className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
            {k.facts
              .filter((f) => !["Ayebi", "Lire sur Ayebi"].includes(f.label))
              .map((f) => (
                <div key={f.label} className="flex justify-between gap-3 text-xs">
                  <dt className="text-[var(--faint)]">{f.label}</dt>
                  <dd className="text-right text-[var(--muted)]">{f.value}</dd>
                </div>
              ))}
          </dl>
        ) : null}
        {ayebiLink ? (
          <a href={ayebiLink} className="ayeba-pill mt-5 inline-block px-4 py-2 text-xs">
            Lire sur Ayebi
          </a>
        ) : null}
        {top && !isAyebi ? <TrustMeters trust={top.trust} /> : null}
      </div>
    </aside>
  );
}

function WikipediaCard() {
  const { response } = useAyeba();
  const k = response?.wikipediaKnowledge;
  if (!k) return null;
  const wikiUrl = k.facts.find((f) => f.label === "Lien")?.value;
  return (
    <aside className="ayeba-panel animate-rise mt-4 overflow-hidden">
      {k.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={k.image} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="h-1.5 w-full bg-gradient-to-r from-[#3366cc] via-[#8a8a96] to-transparent" />
      )}
      <div className="p-5">
        <p className="ayeba-kicker mb-1">Wikipédia · encyclopédie mondiale</p>
        <p className="text-[11px] text-[var(--faint)]">Source distincte d’Ayebi — complémentaire, pas identique.</p>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-[20px] font-medium text-[var(--ink)]">{k.title}</h3>
        <p className="mt-1 text-sm text-[var(--faint)]">{k.subtitle}</p>
        <p className="mt-3 text-[14px] leading-[1.7] text-[var(--muted)]">{k.summary.slice(0, 320)}…</p>
        {wikiUrl ? (
          <a href={wikiUrl} {...externalLinkProps()} className="ayeba-pill mt-4 inline-block px-4 py-2 text-xs">
            Lire sur Wikipédia
          </a>
        ) : null}
      </div>
    </aside>
  );
}

function FeaturedSnippetCard() {
  const { response } = useAyeba();
  const sn = response?.featuredSnippet;
  if (!sn) return null;
  const isCalc = sn.url === "#calc";
  const inner = (
    <>
      <p className="ayeba-kicker ayeba-kicker-accent mb-3">{isCalc ? "Calculatrice" : "Réponse courte"}</p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-[24px] font-medium text-[var(--ink)]">{sn.title}</h2>
      <p className="mt-3 font-[family-name:var(--font-mono)] text-[28px] text-white">{sn.text}</p>
    </>
  );
  if (isCalc) {
    return <div className="ayeba-snippet mb-8 block animate-rise p-5 sm:p-7">{inner}</div>;
  }
  return (
    <a
      href={sn.url}
      className="ayeba-snippet mb-8 block w-full animate-rise p-5 text-left sm:p-7"
    >
      {inner}
    </a>
  );
}

function LocalPack({ places }: { places: MapPlace[] }) {
  const { setTab } = useAyeba();
  if (!places.length) return null;
  const center = places[0];
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lon - 0.06}%2C${center.lat - 0.04}%2C${center.lon + 0.06}%2C${center.lat + 0.04}&layer=mapnik&marker=${center.lat}%2C${center.lon}`;
  return (
    <section className="ayeba-panel mb-8 overflow-hidden animate-rise">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
        <p className="text-sm text-[var(--muted)]">{places.length} lieux · OpenStreetMap</p>
        <button type="button" onClick={() => setTab("maps")} className="ayeba-ghost px-3 py-1.5 text-xs">Maps</button>
      </div>
      <iframe title="Pack local" src={embed} className="h-[220px] w-full border-0" loading="lazy" />
    </section>
  );
}

function ImageRail({ items }: { items: MediaResult[] }) {
  const { setTab } = useAyeba();
  const pics = items.filter((m) => m.thumb.startsWith("http")).slice(0, 8);
  if (!pics.length) return null;
  return (
    <section className="mb-8 animate-rise">
      <div className="mb-3 flex justify-between">
        <p className="ayeba-kicker">Images</p>
        <button type="button" onClick={() => setTab("images")} className="text-xs text-[var(--link)]">Tout voir</button>
      </div>
      <div className="ayeba-image-rail">
        {pics.map((m) => (
          <a
            key={m.id}
            href={m.url}
            {...externalLinkProps()}
            className="ayeba-panel overflow-hidden text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.thumb} alt="" className="h-28 w-full object-cover" />
          </a>
        ))}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-rise">
      <div className="ayeba-skeleton h-36 w-full rounded-3xl" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 border-b border-[var(--line)] pb-6">
          <div className="ayeba-skeleton h-4 w-40" />
          <div className="ayeba-skeleton h-7 w-[85%]" />
          <div className="ayeba-skeleton h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function MediaGrid({ items }: { items: MediaResult[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((m) => (
        <a key={m.id} href={m.url} {...externalLinkProps()} className="ayeba-panel overflow-hidden">
          {m.thumb.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.thumb} alt="" className="h-48 w-full object-cover" />
          ) : null}
          <div className="p-3"><p className="text-sm text-white">{m.title}</p></div>
        </a>
      ))}
    </div>
  );
}

function MapsPanel({ places }: { places: MapPlace[] }) {
  if (!places.length) return <div className="ayeba-panel p-8 text-center text-[var(--muted)]">Aucun lieu précis</div>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {places.map((p) => (
        <li key={p.id}>
          <a href={p.url} {...externalLinkProps()} className="ayeba-panel block p-4">
            <span className="font-medium text-white">{p.name}</span>
            <span className="mt-1 block text-sm text-[var(--muted)]">{p.address}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ShoppingGrid({ items }: { items: ShopItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((s) => (
        <a key={s.id} href={s.url} {...externalLinkProps()} className="ayeba-panel p-5">
          <p className="font-medium text-white">{s.title}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{s.price} · {s.store}</p>
        </a>
      ))}
    </div>
  );
}

function SerpMeta() {
  const { response, searching, searchError, search } = useAyeba();
  const { t } = useI18n();
  if (searching && !response) {
    return <p className="ayeba-serp-meta">Ayeba agrège les sources…</p>;
  }
  if (!response) {
    if (!searchError) return null;
    return (
      <div className="ayeba-panel mb-6 p-5">
        <p className="ayeba-kicker ayeba-kicker-accent mb-2">Recherche</p>
        <p className="text-sm text-[var(--muted)]">{searchError}</p>
        <button
          type="button"
          className="ayeba-ghost mt-3 px-3 py-1.5 text-xs"
          onClick={() => search()}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="ayeba-serp-meta">
      <p>
        <span className="text-[var(--ink)]">« {response.query} »</span>
        <span className="mx-2 text-[var(--faint)]">·</span>
        {response.approxResults.toLocaleString("fr-FR")} {t("results")}
        <span className="mx-2 text-[var(--faint)]">·</span>
        <span className="text-[var(--faint)]">ML rank · index FTS</span>
      </p>
      {searchError ? (
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Mise à jour partielle — {searchError}{" "}
          <button type="button" className="text-[var(--link)] hover:underline" onClick={() => search()}>
            réessayer
          </button>
        </p>
      ) : null}
      {response.correctedQuery ? (
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Vouliez-vous dire{" "}
          <button type="button" className="text-[var(--link)] hover:underline" onClick={() => search(response.correctedQuery)}>
            {response.correctedQuery}
          </button>{" "}
          ?
        </p>
      ) : null}
    </div>
  );
}

function PeopleAlsoAskBlock() {
  const { response } = useAyeba();
  const items = response?.peopleAlsoAsk ?? [];
  if (!items.length) return null;
  return (
    <section className="ayeba-panel mb-8 p-5 sm:p-6">
      <p className="ayeba-kicker mb-4">Questions associées</p>
      <ul className="divide-y divide-[var(--line)]">
        {items.map((item) => (
          <li key={item.q} className="py-3 first:pt-0 last:pb-0">
            <p className="text-[15px] font-medium text-[var(--ink)]">{item.q}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">{item.a}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Onglet vertical vide → piste de retour, jamais une impasse blanche. */
function EmptyVertical({ label }: { label: string }) {
  const { setTab, response } = useAyeba();
  return (
    <div className="ayeba-panel p-8 text-center">
      <p className="ayeba-kicker ayeba-kicker-accent mb-3">Aucun {label} indexé</p>
      <p className="text-[15px] text-[var(--muted)]">
        Rien dans cette rubrique pour « {response?.query} » — les résultats web
        restent la meilleure piste.
      </p>
      <button
        type="button"
        className="ayeba-cta mt-4 px-4 py-2 text-sm"
        onClick={() => setTab("web")}
      >
        Voir les résultats web
      </button>
    </div>
  );
}

function EmptyResults() {
  const { response, search } = useAyeba();
  if (!response || response.results.length > 0) return null;
  // Calcul / réponse instantanée = résultat direct — ne pas afficher le vide.
  if (
    response.instantAnswer ||
    response.instantAnswers?.length ||
    response.featuredSnippet ||
    response.knowledge
  ) {
    return null;
  }
  return (
    <div className="ayeba-panel p-8 text-center">
      <p className="ayeba-kicker ayeba-kicker-accent mb-3">Aucun résultat direct</p>
      <p className="text-[15px] text-[var(--muted)]">
        Rien de pertinent pour « {response.query} » dans nos sources.
      </p>
      <button
        type="button"
        className="ayeba-ghost mt-4 px-4 py-2 text-sm"
        onClick={() => window.open(`https://duckduckgo.com/?q=${encodeURIComponent(response.query)}`, "_blank")}
      >
        Ouvrir sur DuckDuckGo
      </button>
      {response.correctedQuery ? (
        <button type="button" className="ayeba-cta ml-2 mt-4 px-4 py-2 text-sm" onClick={() => search(response.correctedQuery)}>
          Essayer « {response.correctedQuery} »
        </button>
      ) : null}
    </div>
  );
}

function Modals() {
  const { deepResearchOpen } = useAyeba();
  return (
    <>
      <LoginModal />
      {deepResearchOpen ? <DeepResearchPanel /> : null}
      <InteractiveCanvas />
      <CodeExecutor />
      <PodcastPlayer />
    </>
  );
}

export function AyebaApp() {
  return (
    <BrowserShellProvider>
      <AyebaAppBody />
    </BrowserShellProvider>
  );
}

function AyebaAppBody() {
  const { hasSearched, response, searching, searchError, search, tab, setTab, splitScreen, resetHome, setDeepResearchOpen } = useAyeba();
  const { t } = useI18n();
  const { tabs, activeTab, activateTab, openHomeTab, openWebTab, navigateWebTab, webGoBack, webGoForward } = useBrowserShell();
  const inApp = typeof window !== "undefined" && isMobileApp();
  const showTabBar = inApp || tabs.length > 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.key !== "t" && e.key !== "T")) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      resetHome();
      openHomeTab();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetHome, openHomeTab]);

  // Dans l'app, tout lien externe s'ouvre dans un onglet navigateur Ayeba —
  // jamais une navigation du WebView entier qui ferait perdre l'application.
  useEffect(() => {
    if (!inApp) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!/^https?:\/\//i.test(href)) return;
      try {
        if (new URL(href).origin === window.location.origin) return;
      } catch {
        return;
      }
      e.preventDefault();
      openWebTab(href, anchor.textContent?.trim().slice(0, 80) || undefined);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [inApp, openWebTab]);

  const goHomeTab = () => {
    const homeTab = tabs.find((tb) => tb.kind === "home");
    if (homeTab) activateTab(homeTab.id);
    else openHomeTab();
  };

  const onOmniSearch = (q: string) => {
    goHomeTab();
    search(q);
  };

  if (activeTab.kind === "web") {
    return (
      <div className="flex min-h-dvh flex-col">
        {showTabBar ? <AppTabBar /> : null}
        <InAppBrowser
          url={activeTab.url}
          title={activeTab.title}
          canGoBack={activeTab.historyIndex > 0}
          canGoForward={activeTab.historyIndex < activeTab.history.length - 1}
          onBack={webGoBack}
          onForward={webGoForward}
          onNavigate={navigateWebTab}
          onSearch={onOmniSearch}
          onHome={goHomeTab}
        />
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <>
        <Stage home />
        <div className="relative z-10 flex min-h-dvh flex-col">
          {showTabBar ? <AppTabBar /> : null}
          <AnnouncementBanner />
          <main className="ayeba-home-shell mx-auto flex w-full flex-1 flex-col px-3 pb-10 sm:max-w-xl sm:px-4 sm:pb-12">
            <HomeSplashGate
              header={
                <>
                  <LangSwitch />
                  <ProfileMenu />
                </>
              }
              search={<HomeSearchPanel />}
            />
          </main>
        </div>
        <Modals />
      </>
    );
  }

  return (
    <>
      <Stage />
      <div className="relative z-10 min-h-dvh pb-12">
        {showTabBar ? <AppTabBar /> : null}
        <header className="ayeba-chrome-header ayeba-serp-header">
          <div className="ayeba-serp-header-inner">
            <button type="button" onClick={resetHome} className="ayeba-serp-brand shrink-0" aria-label="Accueil">
              <AyebaWordmark size="sm" />
            </button>
            <div className="ayeba-serp-search min-w-0 flex-1">
              <SearchBar />
            </div>
            <div className="ayeba-serp-actions flex shrink-0 items-center gap-1.5 sm:gap-2">
              {typeof window !== "undefined" && isMobileApp() ? (
                <>
                  <Link href="/ayebi" className="ayeba-ghost px-2 py-1.5 text-xs">
                    Ayebi
                  </Link>
                </>
              ) : null}
              <div className="ayeba-serp-lang">
                <LangSwitch />
              </div>
              <ToolsMenu />
              <ProfileMenu />
            </div>
          </div>
          <MarketTicker compact belowSearch />
          <div className="ayeba-serp-tabs-wrap">
            <div className="ayeba-tabs">
              {TAB_KEYS.map((id) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={`ayeba-tab ${tab === id ? "active" : ""}`}>
                  {t(id)}
                </button>
              ))}
            </div>
          </div>
          {searching ? <div className="progress-shimmer w-full" /> : null}
        </header>

        <AnnouncementBanner />

        <div className={`ayeba-serp-body ${response?.knowledge || response?.wikipediaKnowledge ? "ayeba-serp-body-with-aside" : ""}`}>
          <div className="ayeba-serp-main">
            <SerpMeta />
            {searching && !response ? (
              <div className="ayeba-panel mb-8 p-6">
                <p className="ayeba-kicker ayeba-kicker-accent mb-4">Agrégation en cours</p>
                <LoadingSkeleton />
              </div>
            ) : null}
            <FilterBubbleAlert />
            {tab === "web" && response ? (
              <>
                <InstantAnswerCard />
                <FeaturedSnippetCard />
                <EmptyResults />
                {response.results
                  .filter((r) => r.url !== response.featuredSnippet?.url)
                  .map((r) => (
                    <ResultCard key={r.id} result={r} />
                  ))}
                <AyebiSerpRail />
                <PeopleAlsoAskBlock />
                {response.maps.length > 0 ? <LocalPack places={response.maps} /> : null}
                {response.images.some((m) => m.thumb.startsWith("http")) ? <ImageRail items={response.images} /> : null}
                {splitScreen && response.aiSummary ? (
                  <section className="ayeba-panel mb-8 p-6">
                    <p className="ayeba-kicker ayeba-kicker-accent">{t("reading")}</p>
                    <p className="mt-4 text-[15px] leading-[1.8] text-[var(--muted)]">{response.aiSummary}</p>
                  </section>
                ) : null}
                <RelatedSearches />
              </>
            ) : null}
            {tab === "community" && response ? (
              response.community.length ? <CommunityIndex posts={response.community} /> : <EmptyVertical label="discussion" />
            ) : null}
            {tab === "images" && response ? (
              response.images.length ? <NativeMediaGrid items={response.images} kind="image" /> : <EmptyVertical label="image" />
            ) : null}
            {tab === "videos" && response ? (
              response.videos.length ? <NativeMediaGrid items={response.videos} kind="video" /> : <EmptyVertical label="vidéo" />
            ) : null}
            {tab === "news" && response ? (
              response.news.length
                ? response.news.map((r) => <ResultCard key={r.id} result={r} dense />)
                : <EmptyVertical label="actualité" />
            ) : null}
            {tab === "maps" && response ? (
              response.maps.length ? <InteractiveMapPanel places={response.maps} /> : <EmptyVertical label="lieu" />
            ) : null}
            {tab === "shopping" && response ? (
              response.shopping.length ? <NativeShoppingPanel items={response.shopping} /> : <EmptyVertical label="produit" />
            ) : null}
            {response && tab === "web" && !isMobileApp() ? (
              <button type="button" onClick={() => setDeepResearchOpen(true)} className="ayeba-ghost mt-6 px-4 py-2 text-xs">
                Recherche profonde
              </button>
            ) : null}
          </div>
          {response?.knowledge || response?.wikipediaKnowledge ? (
            <aside className="ayeba-serp-aside">
              {tab === "web" && response?.knowledge ? <KnowledgeCard /> : null}
              {tab === "web" && response?.wikipediaKnowledge ? <WikipediaCard /> : null}
              <AlgorithmSliders />
            </aside>
          ) : null}
        </div>
      </div>
      <Modals />
    </>
  );
}
