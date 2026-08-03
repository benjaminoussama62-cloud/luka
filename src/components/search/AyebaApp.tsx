"use client";

import { useEffect, useState } from "react";
import { MissionClock } from "@/components/effects/MissionClock";
import { DrcGlow } from "@/components/effects/DrcGlow";
import { LoginModal, ProfileMenu } from "@/components/auth/AuthUI";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { useI18n } from "@/lib/i18n";
import { useAyeba } from "@/lib/store";
import type { MapPlace, MediaResult, SearchTab, ShopItem } from "@/lib/types";
import { AlgorithmSliders } from "./AlgorithmSliders";
import { CodeExecutor } from "./CodeExecutor";
import { CommunityIndex } from "./CommunityIndex";
import { DeepResearchPanel } from "./DeepResearchPanel";
import { FilterBubbleAlert } from "./FilterBubbleAlert";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { PodcastPlayer } from "./PodcastPlayer";
import { ResultCard } from "./ResultCard";
import { SearchBar } from "./SearchBar";
import { ToolsMenu } from "./ToolsMenu";
import { TrustMeters } from "./TrustBadges";

const TAB_KEYS: SearchTab[] = [
  "web",
  "images",
  "videos",
  "news",
  "maps",
  "shopping",
  "community",
];

const EXPLORE = [
  { cat: "Histoire", q: "Patrice Lumumba" },
  { cat: "Économie", q: "Banque Centrale du Congo" },
  { cat: "Ressources", q: "cobalt mines congo" },
  { cat: "Santé", q: "paludisme prévention" },
  { cat: "Institutions", q: "code minier" },
  { cat: "Tech", q: "fibre optique Kinshasa" },
  { cat: "Nature", q: "parc national Virunga" },
  { cat: "Monde", q: "économie mondiale 2026" },
];

function Stage() {
  return (
    <>
      <DrcGlow />
      <div className="ayeba-vignette" aria-hidden />
    </>
  );
}

function HudOverlay({ indexCount }: { indexCount?: number }) {
  return (
    <>
      <div className="hud-corner hud-tl hidden md:block">
        <p className="hud-label">System</p>
        <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] text-[var(--orange)] sm:text-[11px] sm:tracking-[0.2em]">
          AYEBA // SEARCH
        </p>
        <p className="mt-1.5 hud-value hidden sm:block sm:mt-2">NULL GEODESIC INDEX</p>
        <p className="hud-value hidden sm:block">LOCAL PRIORITY // SILENT</p>
      </div>
      <div className="hud-corner hud-tr">
        <MissionClock />
      </div>
      <div className="hud-corner hud-bl">
        <p className="hud-label">Telemetry</p>
        <p className="mt-1 hud-value">CRAWL .CD {indexCount ?? "—"} DOCS</p>
        <p className="hud-value hidden sm:block">LLM SYNTH // AUTO</p>
        <p className="hud-value hidden md:block">SOURCES LIVE</p>
      </div>
      <div className="hud-corner hud-br hidden sm:block">
        <p className="hud-label">Viewport</p>
        <p className="mt-1 hud-value">DRAG · SCROLL · SEARCH</p>
        <p className="hud-value">HUD // ACTIVE</p>
      </div>
    </>
  );
}

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as typeof lang)}
      className="ayeba-ghost h-10 rounded-full bg-transparent px-3 text-xs text-[var(--muted)] outline-none"
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
  return (
    <aside className="ayeba-panel animate-rise overflow-hidden">
      {k.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={k.image} alt="" className="h-48 w-full object-cover" />
      ) : (
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--red)] via-[#8a8a96] to-transparent" />
      )}
      <div className="p-5">
        <p className="ayeba-kicker ayeba-kicker-accent">
          {t("context")}
        </p>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-[24px] font-medium tracking-[-0.03em] text-[var(--ink)]">
          {k.title}
        </h3>
        <p className="mt-1 text-sm text-[var(--faint)]">{k.subtitle}</p>
        <p className="mt-4 text-[14px] leading-[1.75] text-[var(--muted)]">{k.summary}</p>
        {k.facts.length > 0 && (
          <dl className="mt-5 space-y-2.5 border-t border-[var(--line)] pt-4">
            {k.facts
              .filter((f) => f.label !== "Lien")
              .map((f) => (
                <div key={f.label} className="flex justify-between gap-3 text-xs">
                  <dt className="text-[var(--faint)]">{f.label}</dt>
                  <dd className="truncate text-right text-[var(--muted)]">{f.value}</dd>
                </div>
              ))}
          </dl>
        )}
        {top ? <TrustMeters trust={top.trust} /> : null}
        {k.facts.find((f) => f.label === "Lien") ? (
          <a
            href={k.facts.find((f) => f.label === "Lien")!.value}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex ayeba-cta px-4 py-2 text-xs"
          >
            Ouvrir la source
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
  return (
    <a
      href={sn.url}
      target="_blank"
      rel="noreferrer"
      className="ayeba-snippet mb-8 block animate-rise p-5 sm:p-7"
    >
      <p className="ayeba-kicker ayeba-kicker-accent mb-3">
        Réponse courte
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-[24px] font-medium tracking-[-0.03em] text-[var(--ink)] sm:text-[26px]">
        {sn.title}
      </h2>
      <p className="mt-3 text-[15px] leading-[1.75] text-[var(--muted)] sm:text-[16px]">{sn.text}</p>
      <p className="mt-5 text-xs text-[var(--faint)]">{sn.domain}</p>
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
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--red)]">
            Pack local
          </p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{places.length} lieux · OpenStreetMap</p>
        </div>
        <button type="button" onClick={() => setTab("maps")} className="ayeba-ghost px-3 py-1.5 text-xs">
          Maps
        </button>
      </div>
      <div className="ayeba-local-pack p-3">
        <iframe title="Pack local" src={embed} className="h-[220px] w-full rounded-xl border-0" loading="lazy" />
        <ul className="space-y-2">
          {places.slice(0, 4).map((p, i) => (
            <li key={p.id}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--red)]/15 text-xs font-bold text-[var(--red)]">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{p.name}</span>
                  <span className="block truncate text-xs text-[var(--faint)]">{p.address}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ImageRail({ items }: { items: MediaResult[] }) {
  const { setTab } = useAyeba();
  const pics = items.filter((m) => m.thumb.startsWith("http")).slice(0, 8);
  if (!pics.length) return null;
  return (
    <section className="mb-8 animate-rise">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--faint)]">
          Images
        </p>
        <button type="button" onClick={() => setTab("images")} className="text-xs text-[var(--blue-link)]">
          Tout voir
        </button>
      </div>
      <div className="ayeba-image-rail">
        {pics.map((m) => (
          <a
            key={m.id}
            href={m.url}
            target="_blank"
            rel="noreferrer"
            className="ayeba-panel overflow-hidden transition hover:-translate-y-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.thumb} alt="" className="h-28 w-full object-cover" />
            <p className="line-clamp-2 p-2 text-[11px] text-[var(--muted)]">{m.title}</p>
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
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-3 border-b border-[var(--line)] pb-6">
          <div className="ayeba-skeleton h-4 w-40" />
          <div className="ayeba-skeleton h-7 w-[85%]" />
          <div className="ayeba-skeleton h-4 w-full" />
          <div className="ayeba-skeleton h-4 w-[70%]" />
        </div>
      ))}
    </div>
  );
}

function MediaGrid({ items }: { items: MediaResult[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((m, i) => (
        <a
          key={m.id}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="ayeba-panel overflow-hidden transition hover:-translate-y-1 hover:border-white/25 animate-rise"
          style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}
        >
          <div className="relative grid h-48 place-items-center overflow-hidden bg-black/50">
            {m.thumb.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.thumb}
                alt=""
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
            ) : (
              <span className="text-sm text-[var(--faint)]">{m.source}</span>
            )}
            {m.type === "video" ? (
              <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                {m.duration || "▶"}
              </span>
            ) : null}
          </div>
          <div className="p-3.5">
            <p className="line-clamp-2 text-sm font-medium text-white">{m.title}</p>
            <p className="mt-1 text-[11px] text-[var(--faint)]">{m.source}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

function MapsPanel({ places }: { places: MapPlace[] }) {
  const center = places[0];
  const embed = center
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${center.lon - 0.1}%2C${center.lat - 0.06}%2C${center.lon + 0.1}%2C${center.lat + 0.06}&layer=mapnik&marker=${center.lat}%2C${center.lon}`
    : null;

  if (!places.length) {
    return (
      <div className="ayeba-panel p-8 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl text-white">Aucun lieu précis</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Ajoute une ville — Kinshasa, Lubumbashi, Goma…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      {embed ? (
        <div className="ayeba-panel overflow-hidden ring-1 ring-white/10">
          <iframe
            title="Carte Ayeba"
            src={embed}
            className="h-[360px] w-full border-0 sm:h-[480px]"
            loading="lazy"
          />
        </div>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {places.map((p) => (
          <li key={p.id}>
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="ayeba-panel flex h-full items-start gap-4 p-4 transition hover:-translate-y-0.5 hover:border-white/25"
            >
              <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--red)]/25 to-white/5 text-[var(--red)]">
                ⌖
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-white">{p.name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-[var(--muted)]">{p.address}</span>
                <span className="mt-2 block font-[family-name:var(--font-mono)] text-[10px] text-[var(--faint)]">
                  {p.category} · {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShoppingGrid({ items }: { items: ShopItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((s, i) => (
        <a
          key={s.id}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="ayeba-panel group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:border-white/25 animate-rise"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--red)]/10 blur-2xl transition group-hover:bg-[var(--red)]/20" />
          <div className="relative mb-5 flex items-center justify-between">
            {s.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.thumb} alt="" width={32} height={32} className="rounded-xl" />
            ) : (
              <span className="text-xs text-[var(--faint)]">{s.store}</span>
            )}
            {s.rating ? (
              <span className="rounded-full bg-[rgba(61,214,140,0.12)] px-2 py-0.5 text-xs text-[var(--good)]">
                ★ {s.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          <p className="relative line-clamp-2 font-medium leading-snug text-white group-hover:text-[var(--red)]">
            {s.title}
          </p>
          <p className="relative mt-4 text-sm text-[var(--muted)]">
            {s.price} · {s.currency}
          </p>
          <p className="relative mt-1 text-xs uppercase tracking-wider text-[var(--faint)]">{s.store}</p>
        </a>
      ))}
    </div>
  );
}

function HistoryStrip() {
  const { search, privateMode, hasSearched } = useAyeba();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (privateMode) {
      setHistory([]);
      return;
    }
    try {
      setHistory(JSON.parse(sessionStorage.getItem("ayeba-history") || "[]") as string[]);
    } catch {
      setHistory([]);
    }
  }, [privateMode, hasSearched]);

  if (!history.length) return null;

  return (
    <div className="mt-6">
      <p className="ayeba-kicker mb-3">Récent</p>
      <div className="flex flex-wrap gap-2">
        {history.slice(0, 8).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => search(h)}
            className="ayeba-ghost max-w-[220px] truncate px-3.5 py-1.5 text-xs text-[var(--muted)]"
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeDock() {
  const s = useAyeba();
  return (
    <div className="ayeba-dock">
      <button type="button" onClick={() => s.setDeepResearchOpen(true)}>
        Deep
      </button>
      <button type="button" onClick={() => s.setCanvasOpen(true)}>
        Canvas
      </button>
      <button type="button" onClick={() => s.setPodcastOpen(true)}>
        Audio
      </button>
      <button type="button" onClick={() => s.setZeroAi(!s.zeroAi)} className={s.zeroAi ? "active" : ""}>
        Zero IA
      </button>
      <button
        type="button"
        onClick={() => s.setPrivateMode(!s.privateMode)}
        className={s.privateMode ? "active" : ""}
      >
        Privé
      </button>
      <button
        type="button"
        onClick={() => void fetch("/api/crawl", { method: "POST" }).then(() => alert("Crawl lancé"))}
      >
        Crawl .cd
      </button>
    </div>
  );
}

function Modals() {
  return (
    <>
      <LoginModal />
      <DeepResearchPanel />
      <InteractiveCanvas />
      <CodeExecutor />
      <PodcastPlayer />
    </>
  );
}

export function AyebaApp() {
  const {
    hasSearched,
    response,
    searching,
    searchError,
    search,
    tab,
    setTab,
    splitScreen,
    resetHome,
    setQuery,
    setDeepResearchOpen,
  } = useAyeba();
  const { t } = useI18n();
  const [crawlCount, setCrawlCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/crawl")
      .then((r) => r.json())
      .then((d: { count?: number }) => setCrawlCount(d.count ?? 0))
      .catch(() => setCrawlCount(null));
  }, [hasSearched]);

  if (!hasSearched) {
    return (
      <>
        <Stage />
        <HudOverlay indexCount={crawlCount ?? undefined} />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <header className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
            <AyebaWordmark size="sm" accentLast />
            <div className="flex items-center gap-1.5 sm:gap-3">
              <LangSwitch />
              <ProfileMenu />
            </div>
          </header>

          <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-20 pt-2 text-center sm:px-6 sm:pb-24 sm:pt-4">
            <p className="ayeba-kicker animate-rise mb-4 sm:mb-6">Index local prioritaire · web live</p>
            <AyebaWordmark size="hero" accentLast className="animate-rise stagger-1 mb-6 block sm:mb-8" />
            <h1 className="sr-only">Ayeba</h1>
            <p className="animate-rise stagger-2 max-w-md px-2 text-[14px] leading-[1.75] text-[var(--muted)] sm:text-[15px]">
              {t("tagline")}
            </p>

            <div className="animate-rise stagger-3 relative z-20 mt-10 w-full max-w-2xl sm:mt-14">
              <SearchBar large />
              <HistoryStrip />
            </div>

            <div className="animate-rise stagger-4 mt-8 w-full max-w-xl text-left sm:mt-12">
              <p className="ayeba-kicker mb-3">Navigation</p>
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                {EXPLORE.slice(0, 6).map((item) => (
                  <button key={item.cat} type="button" onClick={() => search(item.q)} className="ayeba-suggest">
                    <span className="hud-label">{item.cat}</span>
                    <span className="mt-1 block truncate text-sm text-[var(--ink)]">{item.q}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="animate-rise stagger-5 mt-10">
              <HomeDock />
            </div>
          </main>
        </div>
        <Modals />
      </>
    );
  }

  return (
    <>
      <Stage />
      <HudOverlay indexCount={crawlCount ?? undefined} />
      <div className="relative z-10 min-h-dvh pb-10">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(7,7,9,0.85)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
            <button type="button" onClick={resetHome} className="shrink-0" aria-label="Accueil">
              <AyebaWordmark size="sm" accentLast />
            </button>
            <div className="min-w-[200px] max-w-xl flex-1">
              <SearchBar />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <LangSwitch />
              <ToolsMenu />
              <ProfileMenu />
            </div>
          </div>
          <div className="mx-auto max-w-5xl overflow-x-auto px-5 sm:px-8">
            <div className="ayeba-tabs min-w-max">
              {TAB_KEYS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`ayeba-tab ${tab === id ? "active" : ""}`}
                >
                  {t(id)}
                </button>
              ))}
            </div>
          </div>
          {searching ? <div className="progress-shimmer w-full" /> : null}
        </header>

        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
              <div>
                {response?.correctedQuery ? (
                  <p className="mb-2 text-sm text-[var(--muted)]">
                    {t("didYouMean")}{" "}
                    <button
                      type="button"
                      className="font-semibold text-[var(--red)] underline-offset-4 hover:underline"
                      onClick={() => {
                        setQuery(response.correctedQuery!);
                        search(response.correctedQuery!);
                      }}
                    >
                      {response.correctedQuery}
                    </button>
                  </p>
                ) : null}
                <p className="text-[13px] text-[var(--faint)]">
                  {searching && !response
                    ? "Ayeba agrège Wikipédia, presse, index maison, cartes…"
                    : response
                      ? `${response.approxResults.toLocaleString("fr-FR")} ${t("results")} · ${response.results.length} classés`
                      : null}
                  {searchError ? ` · ${searchError}` : ""}
                </p>
              </div>
              {response ? (
                <button
                  type="button"
                  onClick={() => setDeepResearchOpen(true)}
                  className="ayeba-ghost px-4 py-2 text-xs"
                >
                  Lancer recherche profonde
                </button>
              ) : null}
            </div>

            {searching && !response ? <LoadingSkeleton /> : null}

            <FilterBubbleAlert />

            {tab === "web" && response && <FeaturedSnippetCard />}
            {tab === "web" && response && <LocalPack places={response.maps} />}
            {tab === "web" && response && <ImageRail items={response.images} />}

            {tab === "web" && response && splitScreen && (
              <section className="ayeba-panel mb-10 p-6 animate-rise sm:p-7">
                <p className="ayeba-kicker ayeba-kicker-accent">{t("reading")}</p>
                <p className="mt-4 text-[15px] leading-[1.8] text-[var(--ink)] sm:text-[16px]">
                  {response.aiSummary}
                </p>
                {response.peopleAlsoAsk.length > 0 && (
                  <div className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                    {response.peopleAlsoAsk.map((p) => (
                      <details key={p.q} className="group py-3.5 text-sm">
                        <summary className="cursor-pointer list-none font-medium text-[var(--muted)] transition group-open:text-white">
                          <span className="mr-2 text-[var(--red)]">+</span>
                          {p.q}
                        </summary>
                        <p className="mt-2.5 leading-relaxed text-[var(--faint)]">{p.a}</p>
                      </details>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "community" && response && <CommunityIndex posts={response.community} />}
            {tab === "images" && response && <MediaGrid items={response.images} />}
            {tab === "videos" && response && <MediaGrid items={response.videos} />}
            {tab === "news" &&
              response?.news.map((r) => <ResultCard key={r.id} result={r} dense />)}
            {tab === "maps" && response && <MapsPanel places={response.maps} />}
            {tab === "shopping" && response && <ShoppingGrid items={response.shopping} />}
            {tab === "web" && response?.results.map((r) => <ResultCard key={r.id} result={r} />)}

            {tab === "web" && response && (
              <section className="mt-12">
                <h3 className="mb-5 font-[family-name:var(--font-display)] text-xl tracking-tight text-white">
                  {t("continue")}
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {response.related.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => search(r)}
                      className="ayeba-suggest px-4 py-2.5 text-sm text-[var(--muted)]"
                    >
                      {r}
                    </button>
                  ))}
                  {EXPLORE.filter((e) => !response.related.includes(e.q))
                    .slice(0, 3)
                    .map((e) => (
                      <button
                        key={e.q}
                        type="button"
                        onClick={() => search(e.q)}
                        className="ayeba-ghost px-4 py-2.5 text-sm text-[var(--muted)]"
                      >
                        {e.cat}
                      </button>
                    ))}
                </div>
              </section>
            )}
          </div>

          <aside className="hidden space-y-4 lg:block">
            {tab === "web" && <KnowledgeCard />}
            <AlgorithmSliders />
            {response?.opposingViews && response.opposingViews.length > 0 ? (
              <section className="ayeba-panel p-5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--faint)]">
                  Autres angles
                </p>
                <ul className="mt-3 space-y-3">
                  {response.opposingViews.map((o) => (
                    <li key={o.url} className="rounded-xl border border-[var(--line)] p-3">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--red)]">
                        {o.stance}
                      </span>
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-sm text-white hover:text-[var(--red)]"
                      >
                        {o.title}
                      </a>
                      <p className="mt-1 text-xs text-[var(--faint)]">{o.snippet}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="ayeba-panel p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--faint)]">Capacités</p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                <li>Deep Research · rapport sourcé</li>
                <li>Canevas · export table</li>
                <li>Code exécutable</li>
                <li>Podcast audio</li>
                <li>Anti-bulle · conflits d&apos;intérêts</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
      <Modals />
    </>
  );
}
