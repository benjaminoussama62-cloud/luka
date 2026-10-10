import { didYouMean, searchLocalIndex } from "../ayeba-index";
import { searchSisterApps, scoreBrandDoc } from "../sister-search";
import { searchAyebiArticles, scoreArticle } from "../ayebi/index";
import { searchAyebiArticlesLive } from "../ayebi/server";
import { searchCrawlIndex } from "../crawler";
import { panelFromQuery } from "../knowledge-graph/graph";
import { resolveInstantAnswers } from "../instant-answers";
import { answerQuestion } from "../question-answer";
import { understandQuery } from "../query-understanding";
import { cacheGet, cacheSet } from "../cache/redis";
import { searchIndex } from "../search-index/fts";
import { rankHits } from "../search-index/ranking";
import { searchImagesNative } from "../verticals/images";
import { searchMapsNative } from "../verticals/maps";
import { searchVideosNative } from "../verticals/videos";
import { searchProducts } from "../verticals/shopping";
import { searchCommunity } from "../verticals/community";
import { getDbMode } from "../storage/database";
import { searchAyebiAsync, searchIndexAsync } from "../storage/turso-async";
import {
  ayebiPanelMinScore,
  FIRST_PARTY_HOST,
  isCongoHint,
  isRetrievedHitAdmissible,
  isStrongAyebiMatch,
  isStrongBrandQuery,
  navigationalSiteForQuery,
  relevanceAgainstSubjects,
  relevanceScore,
  retrievalSubjects,
} from "../search-relevance";
import {
  geoSubjectsInQuery,
  knownCapitalAnswer,
  normalizeSmsFrench,
  parseSearchIntent,
  upstreamQuery,
} from "../query-intent";
import { matchKinshasaCommune } from "../kinshasa-communes";
import type {
  CommunityPost,
  FeaturedSnippet,
  KnowledgePanel,
  MapPlace,
  MediaResult,
  SearchResponse,
} from "../types";
import {
  isRelevantToQuery,
  SEARCH_WALL_MS,
  settled,
  timed,
  UPSTREAM_FAST_MS,
  UPSTREAM_MS,
  type FetchOpts,
  type RawHit,
} from "./shared";
import {
  fetchBing,
  fetchBrave,
  fetchDuckDuckGo,
  fetchDuckDuckGoHtml,
  fetchMojeek,
  fetchNewsRss,
  fetchWikipediaMulti,
  fetchWikiSummary,
} from "./upstream";
import { evalMath, tryMathSnippet } from "./math";
import { diversifyResults, rankAndFilter, relatedFrom, toResult } from "./ranking";
import {
  ayebiKnowledgePanel,
  ayebiRichSnippet,
  buildQuestions,
  buildSynthesis,
  officialSiteForAyebi,
} from "./builders";

// Re-exports — surface publique historique du module (tests, scripts).
export { cleanSnippet, isJunkHit } from "./shared";
export { evalMath } from "./math";
export { domainAuthority } from "./authority";
export { diversifyResults } from "./ranking";

/** Full SERP memory cache (always on — never block on Turso/SQLite for this). */
const serpMemory = new Map<string, { at: number; body: SearchResponse }>();
const SERP_TTL_MS = 90_000;

export async function liveSearch(query: string, opts: FetchOpts): Promise<SearchResponse> {
  const startedAt = Date.now();
  const rawQuery = query.trim() || "actualité mondiale";
  // Suggestion « vouliez-vous dire » : d'abord le correcteur local, sinon la forme
  // SMS normalisée (« dans kel commune c trouve… » → « dans quelle commune se trouve… »).
  const smsFixed = normalizeSmsFrench(rawQuery);
  // La suggestion n'est affichée que si la normalisation a réellement corrigé
  // un MOT — pas juste reformaté la ponctuation (« chaussure c'est quoi »
  // ne doit pas suggérer « chaussure se'est quoi »).
  const suggested =
    didYouMean(rawQuery) ??
    (smsFixed && smsFixed !== rawQuery.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[?.!]+/g, " ").replace(/\s+/g, " ").trim()
      ? smsFixed
      : undefined);
  const q = rawQuery;
  const serpKey = `fullserp:${q.toLowerCase()}:${opts.sliders.locality}:${opts.sliders.authority}:${opts.zeroAi ? 1 : 0}`;
  const cached = serpMemory.get(serpKey);
  if (cached && Date.now() - cached.at < SERP_TTL_MS) {
    if (opts.timings) opts.timings.cache = Date.now() - startedAt;
    return { ...cached.body, query: rawQuery };
  }

  const built = await liveSearchCore(rawQuery, suggested, q, opts);
  if (opts.timings) opts.timings.total = Date.now() - startedAt;
  // A degraded SERP must never poison the cache for the next full search.
  if (opts.skipUpstream) return built;
  serpMemory.set(serpKey, { at: Date.now(), body: built });
  if (serpMemory.size > 800) {
    const oldest = [...serpMemory.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 200);
    for (const [k] of oldest) serpMemory.delete(k);
  }
  return built;
}

async function liveSearchCore(
  rawQuery: string,
  suggested: string | undefined,
  q: string,
  opts: FetchOpts,
): Promise<SearchResponse> {
  // Local index first — never wait on crawl. Users switch engines for speed + relevance.
  const offline = Boolean(opts.skipUpstream);
  const wall = Date.now() + (offline ? 400 : SEARCH_WALL_MS);
  const msLeft = () => Math.max(200, wall - Date.now());
  const turso = getDbMode() === "turso";
  // Compréhension sémantique AVANT tout — l'équivalent de l'étape « intent »
  // de Google : le modèle corrige la requête, isole l'entité, classe
  // l'attribut en clé canonique, borne le type d'entité — dans n'importe
  // quelle langue. Les règles synchrones restent le filet quand le modèle
  // est absent (pas de clé, timeout) — jamais l'inverse.
  const understanding = offline ? null : await understandQuery(rawQuery);
  const ruleIntent = parseSearchIntent(rawQuery);
  let intent = ruleIntent;
  // Comptage mondial / calcul déjà résolus par règles → ne pas laisser le
  // LLM remplacer « continents » par « Europe » ou √9 par √2.
  const lockRuleIntent =
    ruleIntent.kind === "math" ||
    (ruleIntent.kind === "question" && ruleIntent.attrKey === "world_count");
  if (understanding && !lockRuleIntent) {
    if (understanding.intent === "calc" && understanding.expr && evalMath(understanding.expr)) {
      intent = { kind: "math", expr: understanding.expr, display: understanding.corrected };
    } else if (
      (understanding.intent === "question" ||
        understanding.intent === "definition" ||
        understanding.intent === "location" ||
        // Phrase longue / mots-clés factuels sans « ? » : le modèle a isolé
        // entité + attribut → même pipeline question (compréhension, pas regex).
        (understanding.intent === "general" &&
          Boolean(understanding.entity) &&
          Boolean(understanding.attrKey))) &&
      understanding.entity
    ) {
      intent = {
        kind: "question",
        qtype:
          understanding.intent === "definition"
            ? "what"
            : understanding.intent === "location"
              ? "where"
              : understanding.qtype,
        subject: understanding.entity,
        wikiQuery: understanding.entity,
        attr: understanding.attribute || undefined,
        attrEn: understanding.attributeEn || undefined,
        entityEn: understanding.entityEn || undefined,
        attrKey: understanding.attrKey || undefined,
        entityType: understanding.entityType || undefined,
        lang: understanding.lang || undefined,
      };
    } else if (ruleIntent.kind === "question" && understanding.entity) {
      // Règles ont reconnu une question — le modèle enrichit : sujet
      // canonique + clé d'attribut + type d'entité.
      intent = {
        ...ruleIntent,
        subject: understanding.entity,
        wikiQuery: understanding.entity,
        attrEn: understanding.attributeEn || undefined,
        entityEn: understanding.entityEn || undefined,
        attrKey: understanding.attrKey || undefined,
        entityType: understanding.entityType || undefined,
        lang: understanding.lang || undefined,
      };
    }
    // Suggestion « vouliez-vous dire » : la correction du modèle prime sur
    // Levenshtein — il comprend le sens, pas juste la distance entre mots.
    const strip = (s: string) => s.toLowerCase().replace(/[?.!…\s]+$/g, "").trim();
    if (understanding.corrected && strip(understanding.corrected) !== strip(rawQuery)) {
      suggested = understanding.corrected;
    }
  }
  // Service / commerce local : ne jamais réduire à la ville seule
  // (« maison de retraite à Kinshasa » ≠ panneau Kinshasa + 0 résultat).
  const localServiceQuery =
    /\b(maison\s+de\s+retraite|ehpad|h[oô]pital|clinique|pharmacie|restaurant|h[oô]tel|supermarch|[ée]cole\b|universit|banque|garage|coiffeur|salon\s+de)\b/i.test(
      q,
    );
  if (localServiceQuery && intent.kind === "question") {
    intent = { kind: "general" };
  }
  const kinCommune = matchKinshasaCommune(q);
  const baseUpstream = upstreamQuery(understanding?.corrected ?? q, intent);
  // Sujet canonique de la compréhension — sert au wiki / médias / ranking
  // pour TOUTE requête (courte ou longue phrase), pas seulement les « ? ».
  let entityQ =
    kinCommune?.title ||
    understanding?.entity?.trim() ||
    (intent.kind === "question" ? intent.wikiQuery || intent.subject : "") ||
    "";
  const entityEn =
    understanding?.entityEn?.trim() ||
    (intent.kind === "question" ? intent.entityEn?.trim() || "" : "") ||
    "";
  if (kinCommune && intent.kind === "question") {
    intent = {
      ...intent,
      subject: kinCommune.title,
      wikiQuery: kinCommune.wikiQuery,
      entityType: "place",
      attr: intent.attr ?? "commune",
      attrKey: intent.attrKey || "location",
    };
  } else if (kinCommune && intent.kind === "general") {
    // « lemba est un commune ou q » mal classé → question locale RDC.
    intent = {
      kind: "question",
      qtype: "which",
      subject: kinCommune.title,
      wikiQuery: kinCommune.wikiQuery,
      attr: "commune",
      attrKey: "location",
      entityType: "place",
    };
    entityQ = kinCommune.title;
  }
  const subjects = retrievalSubjects({
    query: q,
    entity: entityQ,
    entityEn,
    corrected: understanding?.corrected,
    wikiQuery: intent.kind === "question" ? intent.wikiQuery : entityQ,
  });
  // WEB = requête complète toujours. Remplacer par l'entité seule
  // (« Kinshasa ») vidait les SERP locales / commerciales.
  const webQ = baseUpstream;
  // Entité d'abord, puis variantes — order fixe le ranking wiki merge.
  const wikiQueries = [
    ...new Set(
      [
        kinCommune?.wikiQuery,
        entityQ,
        entityEn,
        webQ,
        baseUpstream,
      ].filter((s): s is string => Boolean(s && s.length >= 1)),
    ),
  ];
  const administrativeQuestion =
    /\b(quartier|quartiers|commune|communes|district|districts|subdivision|subdivisions)\b/i.test(q);
  const qIntent = intent.kind === "question" ? intent : undefined;
  // Médias : sujet pour questions factuelles ; requête complète sinon
  // (« man city releguer », « maison de retraite kinshasa »).
  const mediaQ =
    qIntent && !localServiceQuery
      ? qIntent.subject
      : localServiceQuery
        ? webQ
        : understanding?.intent === "definition" && entityQ
          ? entityQ
          : webQ;
  // Factual = on peut produire une réponse locale fiable (capitale connue, géo/admin
  // Kinshasa documentées, calcul). Un mot comme « commune » seul ne qualifie PAS —
  // sinon tout résultat web serait jeté (bug « aucun résultat direct »).
  const factualIntent =
    intent.kind === "capital" ||
    intent.kind === "city" ||
    intent.kind === "geography" ||
    intent.kind === "math" ||
    (administrativeQuestion && /\bkinshasa\b/i.test(q));
  const capitalFact = knownCapitalAnswer(intent);

  // Apps sœurs + index maison — sync, immédiat.
  // Cherche aussi sur l'entité comprise (phrase longue → sujet).
  const sisterQuery = entityQ || webQ || q;
  const sisterHits = [
    ...searchSisterApps(q),
    ...(sisterQuery !== q ? searchSisterApps(sisterQuery) : []),
  ].filter((h, i, arr) => arr.findIndex((x) => x.url === h.url) === i);
  const houseHits = searchLocalIndex(q);
  const brandStrong = isStrongBrandQuery(q) || (entityQ ? isStrongBrandQuery(entityQ) : false);
  // Marque sœur = boost en tête, JAMAIS coupure du web. Couper Bing/DDG/FTS
  // pour « somba teka » produisait une SERP à 2 liens vs des pages chez Google.
  const sisterBrandHit = brandStrong && sisterHits.length > 0;
  const skipWebForMath = intent.kind === "math";
  const navSite = intent.kind === "navigational" ? intent.site : navigationalSiteForQuery(q);
  const navHit: RawHit[] = navSite
    ? [
        {
          title: navSite.title,
          url: navSite.url,
          snippet: navSite.snippet,
          source: "navigational",
        },
      ]
    : [];
  const curatedFactHits: RawHit[] = [
    ...(kinCommune
      ? [
          {
            title: `${kinCommune.title} — commune de Kinshasa`,
            url: kinCommune.wikiUrl,
            snippet: kinCommune.snippet,
            source: "verified-fact",
          },
        ]
      : []),
    ...(intent.kind === "geography"
      ? [
          {
            title: "Kinshasa — géographie et dimensions",
            url: "https://fr.wikipedia.org/wiki/Kinshasa#G%C3%A9ographie",
            snippet:
              "La ville-province de Kinshasa couvre 9 965 km². La zone urbanisée représente environ 860 km²; les distances varient selon les points mesurés.",
            source: "verified-fact",
          },
        ]
      : administrativeQuestion && /\bkinshasa\b/i.test(q)
        ? [
            {
              title: "Kinshasa — subdivisions administratives",
              url: "https://fr.wikipedia.org/wiki/Kinshasa#Subdivisions",
              snippet:
                "Kinshasa est divisée en quatre districts et vingt-quatre communes. Le total des quartiers dépend du découpage administratif de référence et ne doit pas être affirmé sans source officielle consolidée.",
              source: "verified-fact",
            },
          ]
        : []),
  ];

  const cacheKey = `serpfts:${q}:${opts.sliders.locality}:${opts.sliders.authority}`;
  let rankedFts: Awaited<ReturnType<typeof rankHits>> = [];
  if (!offline) {
    await timed(opts.timings, "fts", async () => {
      try {
        if (!turso) {
          rankedFts = (await cacheGet<Awaited<ReturnType<typeof rankHits>>>(cacheKey)) ?? [];
        }
        if (!rankedFts.length) {
          const hits = turso
            ? await Promise.race([
                searchIndexAsync(q, 40),
                new Promise<Awaited<ReturnType<typeof searchIndexAsync>>>((r) =>
                  setTimeout(() => r([]), Math.min(500, msLeft())),
                ),
              ])
            : searchIndex(q, 40);
          rankedFts = rankHits(hits, q, {
            localityBoost: opts.sliders.locality,
            authorityBoost: opts.sliders.authority,
          });
          if (!turso) void cacheSet(cacheKey, rankedFts, 180).catch(() => {});
        }
      } catch {
        rankedFts = [];
      }
    });
  }

  let ayebiPanel: KnowledgePanel | undefined;
  let ayebiHits: Awaited<ReturnType<typeof searchAyebiArticlesLive>> = [];
  let crawlHits: Awaited<ReturnType<typeof searchCrawlIndex>> = [];

  const ayebiSync = factualIntent ? [] : searchAyebiArticles(q, 8);
  if (ayebiSync.length && !navSite) {
    const topScore = scoreArticle(ayebiSync[0], q);
    const minRel = ayebiPanelMinScore(q);
    ayebiHits = ayebiSync.filter((a) => {
      const s = scoreArticle(a, q);
      return s >= minRel * 0.65 && isStrongAyebiMatch(s, a, q);
    });
    if (ayebiHits[0] && isStrongAyebiMatch(topScore, ayebiHits[0], q)) {
      ayebiPanel = ayebiKnowledgePanel(ayebiHits[0]);
    }
  }

  if (offline) {
    crawlHits = [];
  } else if (turso) {
    try {
      const asyncAyebi = await Promise.race([
        searchAyebiAsync(q, 5),
        new Promise<Awaited<ReturnType<typeof searchAyebiAsync>>>((r) =>
          setTimeout(() => r([]), Math.min(600, msLeft())),
        ),
      ]);
      const seenSlugs = new Set(ayebiHits.map((a) => a.slug));
      for (const a of asyncAyebi) {
        if (seenSlugs.has(a.slug)) continue;
        const stub = {
          slug: a.slug,
          title: a.title,
          subtitle: "",
          category: "lieu" as const,
          summary: a.summary,
          body: [],
          facts: [],
          tags: a.tags,
        };
        const s = scoreArticle(stub, q);
        if (!isStrongAyebiMatch(s, stub, q)) continue;
        seenSlugs.add(a.slug);
        ayebiHits.push(stub);
      }
    } catch {
      /* keep sync hits */
    }
    crawlHits = [];
  } else {
    const [liveHits, crawl] = await Promise.all([
      searchAyebiArticlesLive(q, 5),
      Promise.resolve().then(() => {
        try {
          return searchCrawlIndex(q);
        } catch {
          return [] as Awaited<ReturnType<typeof searchCrawlIndex>>;
        }
      }),
    ]);
    const seenSlugs = new Set(ayebiHits.map((a) => a.slug));
    for (const a of liveHits) {
      if (seenSlugs.has(a.slug)) continue;
      if (!isStrongAyebiMatch(scoreArticle(a, q), a, q)) continue;
      seenSlugs.add(a.slug);
      ayebiHits.push(a);
    }
    crawlHits = crawl;
    if (!ayebiPanel && ayebiHits[0] && !navSite) {
      ayebiPanel = ayebiKnowledgePanel(ayebiHits[0]);
    }
  }

  // Un panneau n'est recevable que si son sujet (titre) est visé par la
  // requête — pour TOUTES les requêtes, pas seulement les questions. Un
  // article qui partage des mots-clés avec la requête (« premier ministre »
  // dans la bio de Matata Ponyo, « forêt » pour « amazone ») n'est PAS le
  // sujet — Google n'affiche jamais une entité voisine comme panneau.
  const nqPanel = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  // Expansion d'alias : « rdc » ≈ « république démocratique du congo » —
  // sinon un panneau légitime titré « République… » serait rejeté.
  const hayPanel = `${nqPanel} ${geoSubjectsInQuery(q)
    .map((s) => s.replace(/-/g, " "))
    .join(" ")}`;
  const titleMatchesQuery = (title: string) =>
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 2 && !/^(le|la|les|des|du|de|et|en|au|aux|sur|par|pour|avec|sans|dans|the|of|and|for)$/.test(t))
      .every((t) => hayPanel.includes(t));
  if (ayebiPanel && !titleMatchesQuery(ayebiPanel.title)) ayebiPanel = undefined;
  // Service local : pas de panneau encyclopédie ville (« Kinshasa ») qui
  // remplace les résultats commerces / établissements.
  if (localServiceQuery) ayebiPanel = undefined;

  const ftsDocs = rankedFts.map((h) => ({
    id: h.docId,
    title: h.title,
    url: h.url,
    snippet: h.snippet,
    domain: h.domain,
    keywords: [] as string[],
    congoRelevant: h.localRelevant,
    sourceType: (h.sourceType as "web" | "gov" | "news" | "wiki" | "academic" | "tech") ?? "web",
    credibility: Math.round(h.credibility * 100),
    rankScore: h.score,
  }));

  const localCount =
    sisterHits.length + houseHits.length + ftsDocs.length + ayebiHits.length + crawlHits.length;
  void localCount;
  // Toujours interroger le web — priorité RDC = boost au classement, pas couper Internet.
  const upstreamMs = Math.min(UPSTREAM_MS, msLeft());

  const [
    wikiFr,
    wikiEn,
    ddg,
    ddgHtml,
    bing,
    brave,
    mojeek,
    news,
    knowledge,
    nativeImages,
    nativeVideos,
    nativeMaps,
    communityPosts,
    instantAnswers,
    questionAnswer,
  ] = await timed(opts.timings, "upstream", () =>
    Promise.all([
      offline || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchWikipediaMulti(wikiQueries, "fr"), [], upstreamMs),
      offline || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchWikipediaMulti(wikiQueries, "en"), [], upstreamMs),
      offline || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchDuckDuckGo(webQ), [], upstreamMs),
      offline || skipWebForMath || msLeft() < 900
        ? Promise.resolve([] as RawHit[])
        : settled(fetchDuckDuckGoHtml(webQ), [], upstreamMs),
      offline || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchBing(webQ), [], upstreamMs),
      offline || skipWebForMath
        ? Promise.resolve([] as RawHit[])
        : settled(fetchBrave(webQ), [], upstreamMs),
      offline || skipWebForMath || msLeft() < 700
        ? Promise.resolve([] as RawHit[])
        : settled(fetchMojeek(webQ), [], upstreamMs),
      offline
        ? Promise.resolve([] as RawHit[])
        : settled(fetchNewsRss(webQ), [], upstreamMs),
      offline || navSite || factualIntent
        ? Promise.resolve(undefined)
        : settled(
            fetchWikiSummary(wikiQueries),
            undefined,
            Math.min(UPSTREAM_FAST_MS, msLeft()),
          ),
      offline
        ? Promise.resolve([] as MediaResult[])
        : settled(searchImagesNative(mediaQ), [], Math.min(2400, msLeft())),
      offline
        ? Promise.resolve([] as MediaResult[])
        : settled(searchVideosNative(mediaQ), [], Math.min(2600, msLeft())),
      offline
        ? Promise.resolve([] as MapPlace[])
        : settled(
            searchMapsNative(isCongoHint(q) ? `${mediaQ} République démocratique du Congo` : mediaQ),
            [],
            Math.min(UPSTREAM_FAST_MS, msLeft()),
          ),
      offline
        ? Promise.resolve([] as CommunityPost[])
        : settled(searchCommunity(webQ), [], Math.min(2000, msLeft())),
      settled(resolveInstantAnswers(q), [], offline ? 150 : upstreamMs),
      // Réponse de question — Knowledge Graph : entité Wikidata + revendication
      // structurée (« président » → valeur réelle) + extrait Wikipedia en contexte.
      offline || !qIntent
        ? Promise.resolve(undefined)
        : settled(
            answerQuestion(qIntent),
            undefined,
            // La réponse directe EST le produit pour une question — vrai budget,
            // sinon elle timeout toujours (wiki+entité+claims ≈ 2-3s en série).
            Math.min(3100, msLeft()),
          ),
    ]),
  );



  // Réponse directe à la question — en tête des réponses instantanées.
  if (questionAnswer && qIntent) {
    instantAnswers.unshift(questionAnswer.instant);
  }
  // Calcul : résultat réel en tête, comme le calculateur de Google.
  if (intent.kind === "math") {
    const mathResult = evalMath(intent.expr);
    if (mathResult) {
      instantAnswers.unshift({
        kind: "calc",
        title: intent.display,
        lines: [{ label: "Résultat", value: mathResult }],
        footnote: "Calcul local — évaluation directe, aucune donnée simulée",
      });
    }
  }

  const localDocs = [
    ...ayebiHits.map((a, i) => {
      const rel = scoreArticle(a, q);
      return {
        id: `ayebi-${a.slug}`,
        title: `${a.title} — Ayebi`,
        url: `/ayebi/${a.slug}`,
        snippet: ayebiRichSnippet(a),
        domain: "ayebi",
        keywords: a.tags,
        congoRelevant: isCongoHint(q) || a.category === "lieu",
        sourceType: "local" as const,
        credibility: 99,
        rankScore: Math.min(420, 180 + rel * 2) - i * 8,
        sitelinks: [
          { title: "Lire la fiche", url: `/ayebi/${a.slug}` },
          ...(officialSiteForAyebi(a.slug)
            ? [{ title: "Site officiel", url: officialSiteForAyebi(a.slug)! }]
            : []),
        ],
      };
    }),
    ...sisterHits.map((d) => ({
      ...d,
      rankScore: Math.min(560, scoreBrandDoc(d, q) + 80),
    })),
    ...houseHits.map((d, i) => ({
      ...d,
      rankScore: Math.max(0, relevanceScore(`${d.title} ${d.snippet}`, q) + 40 - i * 3),
    })),
    ...ftsDocs,
    ...crawlHits.map((c) => ({
      id: c.id,
      title: c.title,
      url: c.url,
      snippet: c.snippet,
      domain: c.domain,
      keywords: c.keywords,
      congoRelevant: c.localRelevant,
      sourceType: c.sourceType,
      credibility: c.credibility,
      rankScore: relevanceScore(`${c.title} ${c.snippet}`, q) + 20,
    })),
  ];
  const localAsRaw = localDocs.map((d) => ({
    title: d.title,
    url: d.url,
    snippet: d.snippet,
    source: "ayeba-index",
  }));

  // Web d’abord dans le pool, puis index local — le ranking décide (RDC = boost, pas filtre).
  const raw = [
    ...navHit,
    ...curatedFactHits,
    ...brave,
    ...bing,
    ...ddgHtml,
    ...mojeek,
    ...ddg,
    ...wikiFr,
    ...wikiEn,
    ...news,
    ...localAsRaw,
  ];
  const seen = new Set<string>();
  const seenTitles = new Set<string>();
  const unique = raw.filter((h) => {
    const key = h.url.split("#")[0];
    if (!key || seen.has(key)) return false;
    seen.add(key);
    if (h.source === "ayeba-index" && !isRelevantToQuery(h, q)) return false;
    // Dédup quasi-identique : même titre normalisé = même page (mirrors,
    // reprints Google News) — Google ne liste jamais deux fois le même article.
    const titleKey = h.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s—\s.*$/u, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    if (titleKey.length >= 12) {
      if (seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
    }
    return true;
  });

  let results = rankAndFilter(
    unique.map((h, i) => {
      const base = toResult(h, i, q);
      const local = localDocs.find((d) => d.url === h.url);
      if (local) {
        const isSister = sisterHits.some((s) => s.url === h.url);
        const firstParty =
          isSister || FIRST_PARTY_HOST.test(`${local.domain ?? ""} ${h.url}`);
        // First-party : boost dès que le hit matche requête ou entité comprise.
        const contentRel = relevanceAgainstSubjects(
          `${local.title} ${local.snippet ?? ""}`,
          q,
          subjects,
        );
        const sisterBoost = firstParty
          ? brandStrong
            ? 320
            : contentRel >= 12
              ? 220
              : 80
          : 0;
        return {
          ...base,
          trust: {
            ...base.trust,
            credibility: local.credibility,
            humanAuthoredLikelihood: 96,
          },
          sourceType: local.sourceType,
          congoRelevant: local.congoRelevant,
          sitelinks: "sitelinks" in local ? local.sitelinks : undefined,
          rankScore:
            (base.rankScore ?? 0) +
            sisterBoost +
            ("rankScore" in local ? Number(local.rankScore ?? 0) : 0),
        };
      }
      if (h.source === "navigational") {
        return { ...base, rankScore: (base.rankScore ?? 0) + 500 };
      }
      return base;
    }),
    q,
    opts,
    subjects,
  )
    .filter(
      (r) =>
        isRetrievedHitAdmissible(r, q, subjects) ||
        (factualIntent && /fr\.wikipedia\.org\/wiki\/Kinshasa(?:#|$)/.test(r.url)) ||
        (!factualIntent && (r.sourceType === "news" || r.url.includes("duckduckgo.com"))),
    )
    .filter((r) => !factualIntent || r.domain.includes("wikipedia.org"))
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));

  const bestAyebi = results.find((r) => r.domain === "ayebi" || r.url.startsWith("/ayebi/"));
  const bestWiki = results.find((r) => r.domain.includes("wikipedia.org"));
  if (bestAyebi || bestWiki) {
    const rest = results.filter((r) => r !== bestAyebi && r !== bestWiki);
    results = [...(bestAyebi ? [bestAyebi] : []), ...(bestWiki ? [bestWiki] : []), ...rest];
  }

  // Host crowding : jamais 6 liens du même domaine (Google plafonne à ~2-3).
  results = diversifyResults(results, 2);

  if (results.length < 3 && !factualIntent && !ayebiPanel && ayebiHits.length === 0 && sisterHits.length === 0) {
    results = rankAndFilter(
      [
        ...results,
        toResult(
          {
            title: `${q} — Recherche ouverte`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
            snippet: `Explorer davantage de résultats web pour « ${q} ».`,
            source: "fallback",
          },
          999,
          q,
        ),
      ],
      q,
      opts,
      subjects,
    );
  }

  if (offline && results.length < 2) {
    // Degraded mode still owes the user somewhere to go, never a blank or single-link SERP.
    const seenUrls = new Set(results.map((r) => r.url));
    const repli = [
      {
        title: `${q} — Wikipédia`,
        url: `https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`,
        snippet: `Article encyclopédique sur « ${q} ».`,
        source: "fallback",
      },
      {
        title: `${q} — Recherche web`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        snippet: `Résultats web complets pour « ${q} ».`,
        source: "fallback",
      },
    ];
    results = [
      ...results,
      ...repli
        .filter((h) => !seenUrls.has(h.url))
        .map((h, i) => toResult(h, results.length + i + 1, q)),
    ];
  }

  // Sitelinks synthétiques pour domaines majeurs
  results = results.map((r) => {
    if (r.sitelinks?.length) return r;
    if (r.sourceType === "wiki" || r.domain.includes("wikipedia")) {
      return {
        ...r,
        sitelinks: [
          { title: "Sommaire", url: r.url },
          { title: "Discussion", url: r.url.replace("/wiki/", "/wiki/Talk:") },
          { title: "Historique", url: `${r.url}?action=history` },
        ],
      };
    }
    if (r.domain.includes("bcc.cd") || r.domain.endsWith(".cd") || r.sourceType === "gov") {
      return {
        ...r,
        sitelinks: [
          { title: "Accueil", url: `https://${r.domain}/` },
          { title: "Contact", url: `https://${r.domain}/` },
        ],
      };
    }
    return r;
  });

  const newsResults = rankAndFilter(
    news.map((h, i) => toResult(h, 1000 + i, q)).map((r) => ({ ...r, sourceType: "news" as const })),
    q,
    opts,
    subjects,
  );

  // Images réelles uniquement — jamais de favicons déguisés en images.
  // La photo de l'entité (Wikipédia) passe en tête quand la question a une réponse.
  const entityImage = questionAnswer?.panel.image;
  const images: MediaResult[] = [
    ...(entityImage
      ? [
          {
            id: "entity-img",
            title: questionAnswer!.panel.title,
            url: questionAnswer!.snippet.url,
            thumb: entityImage,
            source: "Wikipédia",
            type: "image" as const,
          },
        ]
      : []),
    ...nativeImages,
  ];

  // Vidéos : uniquement des résultats réels (Dailymotion/Piped/index).
  // Jamais de carte générique — un lien « recherche YouTube » déguisé en vidéo
  // est de la fausse donnée.
  const videos: MediaResult[] = [...nativeVideos];

  const maps = nativeMaps;
  // Shopping = produits RÉELS indexés par le crawler uniquement — jamais de
  // carte « négociable CDF ★ 4.3 » fabriquée depuis le texte de la requête.
  const shopping = searchProducts(q, 20);

  const panel =
    (!navSite && !factualIntent ? ayebiPanel : undefined) ??
    (sisterBrandHit || navSite || factualIntent || qIntent
      ? undefined
      : (() => {
          const kg = panelFromQuery(q);
          if (
            kg &&
            titleMatchesQuery(kg.entity.label) &&
            relevanceAgainstSubjects(`${kg.entity.label} ${kg.entity.summary}`, q, subjects) >= 45
          ) {
            return {
              title: kg.entity.label,
              subtitle: kg.entity.kind,
              summary: kg.entity.summary,
              facts: [
                ...(kg.entity.ayebiSlug
                  ? [{ label: "Ayebi", value: `/ayebi/${kg.entity.ayebiSlug}` }]
                  : []),
                ...kg.related.slice(0, 4).map((r) => ({
                  label: r.relation === "in_category" ? "Catégorie" : "Lié",
                  value: r.ayebiSlug ? `/ayebi/${r.ayebiSlug}` : r.label,
                })),
              ],
              sources: ["ayebi-graph"],
              image: undefined,
            } satisfies KnowledgePanel;
          }
          return undefined;
        })()) ??
    (knowledge &&
    !factualIntent &&
    relevanceAgainstSubjects(`${knowledge.title} ${knowledge.summary}`, q, subjects) >= 35
      ? knowledge
      : undefined);

  let knowledgePanel = panel;
  let wikipediaKnowledge: KnowledgePanel | undefined;
  if (
    ayebiPanel &&
    knowledge &&
    !factualIntent &&
    relevanceAgainstSubjects(`${knowledge.title} ${knowledge.summary}`, q, subjects) >= 35
  ) {
    // Ayebi et Wikipedia restent deux encyclopédies distinctes — pas un seul panneau mixte.
    knowledgePanel = ayebiPanel;
    wikipediaKnowledge = knowledge;
  } else if (
    !ayebiPanel &&
    knowledge &&
    !factualIntent &&
    knowledge.sources.some((s) => s.includes("wikipedia"))
  ) {
    knowledgePanel = undefined;
    wikipediaKnowledge = knowledge;
  }

  // Question → le panneau PRINCIPAL est l'entité résolue (Wikidata/Wikipedia)
  // — comme le Knowledge Panel de Google (« Saddam Hussein » pour la question
  // « qui est sadam hussein »). Le graphe Ayebi peut dériver vers un sujet
  // voisin et ne doit jamais le détrôner ; il passe en panneau secondaire.
  if (questionAnswer) {
    if (knowledgePanel && knowledgePanel.title !== questionAnswer.panel.title) {
      wikipediaKnowledge ??= knowledgePanel;
    }
    knowledgePanel = questionAnswer.panel;
  }

  const topWeb = results.find(
    (r) =>
      r.domain !== "ayebi" &&
      !r.url.startsWith("/ayebi/") &&
      isRetrievedHitAdmissible(r, q, subjects) &&
      relevanceAgainstSubjects(`${r.title} ${r.snippet}`, q, subjects) >= 28,
  );

  const questionSnippet: FeaturedSnippet | undefined =
    qIntent && questionAnswer ? questionAnswer.snippet : undefined;

  const featuredSnippet: FeaturedSnippet | undefined =
    questionSnippet ??
    tryMathSnippet(q) ??
    (intent.kind === "math" && instantAnswers[0]?.kind === "calc"
      ? {
          title: instantAnswers[0].title,
          text: instantAnswers[0].lines.map((l) => l.value).join(" · "),
          url: "#calc",
          domain: "ayeba",
        }
      : undefined) ??
    (capitalFact
      ? {
          title: `${capitalFact.capital} — capitale ${capitalFact.country}`,
          text: capitalFact.summary,
          url: capitalFact.wiki,
          domain: "wikipedia.org",
        }
      : undefined) ??
    (intent.kind === "geography" && instantAnswers[0]
      ? {
          title: instantAnswers[0].title,
          text: instantAnswers[0].lines.map((line) => `${line.label} : ${line.value}`).join(" · "),
          url: "https://fr.wikipedia.org/wiki/Kinshasa#G%C3%A9ographie",
          domain: "wikipedia.org",
        }
      : undefined) ??
    (intent.kind === "city" && topWeb
      ? {
          title: topWeb.title,
          text: topWeb.snippet,
          url: topWeb.url,
          domain: topWeb.domain,
        }
      : undefined) ??
    (navSite
      ? {
          title: navSite.title,
          text: navSite.snippet,
          url: navSite.url,
          domain: navSite.domain,
        }
      : knowledgePanel &&
          relevanceAgainstSubjects(
            `${knowledgePanel.title} ${knowledgePanel.summary}`,
            q,
            subjects,
          ) >= ayebiPanelMinScore(q)
        ? {
            title: knowledgePanel.title,
            text: knowledgePanel.summary.slice(0, 420),
            url:
              knowledgePanel.facts.find((f) => f.label === "Lire sur Ayebi")?.value ??
              knowledgePanel.facts.find((f) => f.label === "Ayebi")?.value ??
              topWeb?.url ??
              results[0]?.url ??
              "#",
            domain: knowledgePanel.facts.some((f) => f.label === "Lire sur Ayebi") ? "ayebi" : topWeb?.domain ?? "ayeba",
          }
        : topWeb
          ? {
              title: topWeb.title,
              text: topWeb.snippet,
              url: topWeb.url,
              domain: topWeb.domain,
            }
          : results[0] && isRetrievedHitAdmissible(results[0], q, subjects)
            ? {
                title: results[0].title,
                text: results[0].snippet,
                url: results[0].url,
                domain: results[0].domain,
              }
            : undefined);

  const topAyebi = ayebiHits[0];
  const factualAnswer = factualIntent ? instantAnswers[0] : undefined;
  const aiSummary = factualAnswer
    ? factualAnswer.lines.map((line) => `${line.label} : ${line.value}`).join(" · ")
    : buildSynthesis(q, knowledgePanel, results, newsResults);
  const peopleAlsoAsk = buildQuestions(
    q,
    knowledgePanel,
    results,
    newsResults,
    isCongoHint(q),
    topAyebi,
  );

  const isSensitiveTopic =
    /\b(élection|election|politique|président|parti|opposition)\b/i.test(q);

  return {
    query: rawQuery,
    correctedQuery:
      suggested && suggested.toLowerCase() !== rawQuery.toLowerCase() ? suggested : undefined,
    // Compteur honnête : nombre réel de sources distinctes, pas une projection gonflée.
    approxResults: unique.length,
    results,
    images,
    videos,
    news: newsResults.length ? newsResults : results.filter((r) => r.sourceType === "news"),
    maps,
    shopping,
    // Communauté = fils RÉELS (Reddit, HN) — jamais de carte template
    // « …sur JEMSA » générée depuis le texte de la requête.
    community: communityPosts,
    related: relatedFrom(q, results),
    peopleAlsoAsk,
    knowledge: knowledgePanel,
    wikipediaKnowledge,
    featuredSnippet,
    instantAnswer: instantAnswers[0],
    instantAnswers: instantAnswers.length ? instantAnswers : undefined,
    aiSummary,
    isSensitiveTopic,
    canvas: [
      {
        id: "t1",
        title: `Comparatif — ${q}`,
        headers: ["Source", "Domaine", "Crédibilité", "Boost RDC"],
        rows: results.slice(0, 6).map((r) => [
          r.title.slice(0, 42),
          r.domain,
          String(r.trust.credibility),
          r.congoRelevant ? "Oui" : "Non",
        ]),
      },
    ],
  };
}
