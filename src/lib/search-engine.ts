import type {
  AlgorithmSliders,
  CommunityPost,
  KnowledgePanel,
  MediaResult,
  SearchResponse,
  SearchResult,
} from "./types";

function trust(
  credibility: number,
  clickbaitRisk: number,
  independentVerification: number,
  humanAuthoredLikelihood: number,
) {
  return { credibility, clickbaitRisk, independentVerification, humanAuthoredLikelihood };
}

const none = { detected: false as const, category: "none" as const };

/** Index démo mondial — Ayeba indexe le web entier ; le boost RDC est un signal de ranking, pas un filtre. */
const WEB_INDEX: SearchResult[] = [
  // ——— Global tech / knowledge ———
  {
    id: "g1",
    title: "Wikipedia — Artificial intelligence",
    url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
    domain: "en.wikipedia.org",
    snippet:
      "Artificial intelligence (AI) is the capability of computational systems to perform tasks typically associated with human intelligence…",
    publishedAt: "2026-07-01",
    lang: "en",
    sourceType: "wiki",
    region: "global",
    keywords: ["ai", "intelligence", "artificielle", "machine learning", "llm"],
    trust: trust(96, 3, 94, 99),
    conflict: none,
  },
  {
    id: "g2",
    title: "MDN Web Docs — JavaScript Guide",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    domain: "developer.mozilla.org",
    snippet:
      "The JavaScript Guide shows you how to use JavaScript and gives an overview of the language. If you need exhaustive information, see the JS reference.",
    publishedAt: "2026-05-20",
    lang: "en",
    sourceType: "tech",
    region: "global",
    keywords: ["javascript", "js", "code", "web", "programmation", "developer"],
    trust: trust(98, 1, 97, 99),
    conflict: none,
  },
  {
    id: "g3",
    title: "Nature — Climate change 2026 special collection",
    url: "https://www.nature.com/collections/climate-2026",
    domain: "nature.com",
    snippet:
      "Peer-reviewed research on warming trajectories, adaptation finance and biodiversity loss across continents.",
    publishedAt: "2026-06-11",
    lang: "en",
    sourceType: "academic",
    region: "global",
    keywords: ["climat", "climate", "environnement", "réchauffement", "science"],
    trust: trust(97, 2, 96, 99),
    conflict: none,
  },
  {
    id: "g4",
    title: "IMF — World Economic Outlook July 2026",
    url: "https://www.imf.org/en/Publications/WEO",
    domain: "imf.org",
    snippet:
      "Global growth projections, inflation paths and financial stability risks for advanced and emerging economies.",
    publishedAt: "2026-07-18",
    lang: "en",
    sourceType: "gov",
    region: "global",
    keywords: ["économie", "economy", "imf", "croissance", "inflation", "finance"],
    trust: trust(95, 4, 93, 98),
    conflict: none,
  },
  {
    id: "g5",
    title: "Reuters — World news live",
    url: "https://www.reuters.com/",
    domain: "reuters.com",
    snippet:
      "Breaking international news, markets, politics and technology coverage from Reuters journalists worldwide.",
    publishedAt: "2026-07-30",
    lang: "en",
    sourceType: "news",
    region: "global",
    keywords: ["news", "actualité", "monde", "world", "politique", "markets"],
    trust: trust(90, 12, 88, 94),
    conflict: none,
  },
  {
    id: "g6",
    title: "Le Monde — International & France",
    url: "https://www.lemonde.fr/",
    domain: "lemonde.fr",
    snippet:
      "Journalisme d'investigation, analyses et actualités internationales en français.",
    publishedAt: "2026-07-30",
    lang: "fr",
    sourceType: "news",
    region: "europe",
    keywords: ["actualité", "france", "monde", "politique", "économie"],
    trust: trust(88, 15, 84, 93),
    conflict: none,
  },
  {
    id: "g7",
    title: "WHO — Malaria fact sheet",
    url: "https://www.who.int/news-room/fact-sheets/detail/malaria",
    domain: "who.int",
    snippet:
      "Symptoms, prevention, treatment guidelines and global burden of malaria. Official WHO recommendations.",
    publishedAt: "2026-04-02",
    lang: "en",
    sourceType: "gov",
    region: "global",
    keywords: ["malaria", "paludisme", "santé", "health", "traitement", "oms", "who"],
    trust: trust(97, 2, 96, 99),
    conflict: none,
  },
  {
    id: "g8",
    title: "arXiv — Large language models survey 2026",
    url: "https://arxiv.org/abs/2026.example.llm",
    domain: "arxiv.org",
    snippet:
      "Comprehensive survey of transformer architectures, alignment techniques and evaluation benchmarks.",
    publishedAt: "2026-03-14",
    lang: "en",
    sourceType: "academic",
    region: "global",
    keywords: ["llm", "ai", "transformer", "research", "paper", "science"],
    trust: trust(92, 5, 90, 98),
    conflict: none,
  },
  {
    id: "g9",
    title: "Stack Overflow — How do I reverse a string in JavaScript?",
    url: "https://stackoverflow.com/questions/958908",
    domain: "stackoverflow.com",
    snippet:
      "Community-voted answers with executable snippets for common programming problems.",
    publishedAt: "2025-11-02",
    lang: "en",
    sourceType: "tech",
    region: "global",
    keywords: ["javascript", "code", "programmation", "stack", "string"],
    trust: trust(84, 8, 80, 95),
    conflict: none,
  },
  {
    id: "g10",
    title: "NASA — James Webb Space Telescope latest images",
    url: "https://www.nasa.gov/mission/webb/",
    domain: "nasa.gov",
    snippet:
      "Infrared discoveries, exoplanet atmospheres and deep-field imagery from JWST.",
    publishedAt: "2026-07-08",
    lang: "en",
    sourceType: "gov",
    region: "americas",
    keywords: ["espace", "space", "nasa", "astronomie", "webb", "planète"],
    trust: trust(96, 3, 95, 99),
    conflict: none,
  },
  {
    id: "g11",
    title: "BBC Sport — Football scores & transfer news",
    url: "https://www.bbc.com/sport/football",
    domain: "bbc.com",
    snippet:
      "Live scores, Premier League, Champions League and African football coverage.",
    publishedAt: "2026-07-30",
    lang: "en",
    sourceType: "news",
    region: "global",
    keywords: ["football", "sport", "soccer", "match", "transfert"],
    trust: trust(87, 14, 82, 92),
    conflict: none,
  },
  {
    id: "g12",
    title: "OpenAI — ChatGPT product overview",
    url: "https://openai.com/chatgpt",
    domain: "openai.com",
    snippet:
      "Product documentation, API capabilities and safety policies for ChatGPT and related models.",
    publishedAt: "2026-07-15",
    lang: "en",
    sourceType: "tech",
    region: "americas",
    keywords: ["chatgpt", "openai", "ai", "llm", "gpt"],
    trust: trust(78, 10, 55, 85),
    conflict: {
      detected: true,
      category: "finance",
      owner: "OpenAI LP / Microsoft partnership",
      detail: "Source commerciale — intérêts produit à prendre en compte.",
    },
  },
  {
    id: "g13",
    title: "PubMed — Antimalarial resistance in Central Africa",
    url: "https://pubmed.ncbi.nlm.nih.gov/example-malaria",
    domain: "pubmed.ncbi.nlm.nih.gov",
    snippet:
      "Indexed biomedical literature on Plasmodium falciparum resistance patterns.",
    publishedAt: "2025-12-01",
    lang: "en",
    sourceType: "academic",
    region: "global",
    keywords: ["malaria", "médecine", "pubmed", "traitement", "résistance", "santé"],
    trust: trust(95, 2, 94, 99),
    conflict: none,
  },
  {
    id: "g14",
    title: "Coursera — Machine Learning specialization",
    url: "https://www.coursera.org/specializations/machine-learning-introduction",
    domain: "coursera.org",
    snippet:
      "Online courses covering supervised learning, neural nets and practical ML projects.",
    publishedAt: "2026-01-10",
    lang: "en",
    sourceType: "web",
    region: "global",
    keywords: ["machine learning", "cours", "ai", "formation", "python"],
    trust: trust(80, 20, 70, 88),
    conflict: none,
  },
  {
    id: "g15",
    title: "World Bank — Sub-Saharan Africa economic update",
    url: "https://www.worldbank.org/en/region/afr",
    domain: "worldbank.org",
    snippet:
      "Macroeconomic outlook, debt sustainability and investment trends across Sub-Saharan Africa.",
    publishedAt: "2026-05-28",
    lang: "en",
    sourceType: "gov",
    region: "africa",
    keywords: ["afrique", "économie", "banque mondiale", "investissement", "croissance"],
    trust: trust(93, 6, 90, 97),
    conflict: none,
  },

  // ——— RDC / Congo (boost signal, never exclusive) ———
  {
    id: "c1",
    title: "Banque Centrale du Congo — Indicateurs économiques 2026",
    url: "https://www.bcc.cd/indicateurs-2026",
    domain: "bcc.cd",
    snippet:
      "Taux directeur, réserves de change et inflation en RDC. Données officielles mises à jour mensuellement.",
    publishedAt: "2026-07-12",
    lang: "fr",
    sourceType: "gov",
    region: "rdc",
    congoRelevant: true,
    keywords: ["rdc", "congo", "économie", "bcc", "inflation", "kinshasa", "finance"],
    trust: trust(94, 5, 88, 97),
    conflict: none,
  },
  {
    id: "c2",
    title: "Radio Okapi — Actualités nationales en continu",
    url: "https://www.radiookapi.net/",
    domain: "radiookapi.net",
    snippet:
      "Journal indépendant couvrant Kinshasa, les provinces et la diplomatie régionale.",
    publishedAt: "2026-07-30",
    lang: "fr",
    sourceType: "news",
    region: "rdc",
    congoRelevant: true,
    keywords: ["rdc", "congo", "actualité", "kinshasa", "politique", "news"],
    trust: trust(86, 18, 79, 91),
    conflict: none,
  },
  {
    id: "c3",
    title: "Université de Kinshasa — Publications scientifiques UNIKIN",
    url: "https://www.unikin.ac.cd/recherche",
    domain: "unikin.ac.cd",
    snippet:
      "Articles peer-reviewed en médecine tropicale, mines, droit et sciences sociales.",
    publishedAt: "2026-06-02",
    lang: "fr",
    sourceType: "academic",
    region: "rdc",
    congoRelevant: true,
    keywords: ["unikin", "rdc", "recherche", "science", "médecine", "université"],
    trust: trust(91, 4, 93, 98),
    conflict: none,
  },
  {
    id: "c4",
    title: "Ministère des Mines — Code minier et cadastre",
    url: "https://mines.gouv.cd/cadastre",
    domain: "mines.gouv.cd",
    snippet:
      "Textes officiels, permis d'exploitation et carte interactive des titres miniers en RDC.",
    publishedAt: "2026-03-08",
    lang: "fr",
    sourceType: "gov",
    region: "rdc",
    congoRelevant: true,
    keywords: ["mines", "cobalt", "cuivre", "katanga", "rdc", "cadastre"],
    trust: trust(90, 3, 85, 96),
    conflict: none,
  },
  {
    id: "c5",
    title: "Lingala Lexicon — Dictionnaire collaboratif ouvert",
    url: "https://lingala.cd/lexicon",
    domain: "lingala.cd",
    snippet:
      "Plus de 42 000 entrées lingala–français, contributions communautaires vérifiées.",
    publishedAt: "2026-04-20",
    lang: "ln",
    sourceType: "web",
    region: "rdc",
    congoRelevant: true,
    keywords: ["lingala", "langue", "dictionnaire", "rdc", "congo"],
    trust: trust(83, 6, 71, 95),
    conflict: none,
  },
  {
    id: "c6",
    title: "USGS — Cobalt statistics and cobalt mine production",
    url: "https://www.usgs.gov/centers/national-minerals-information-center/cobalt-statistics-and-information",
    domain: "usgs.gov",
    snippet:
      "Global cobalt supply, with DRC remaining the dominant producer. Official mineral commodity summaries.",
    publishedAt: "2026-02-01",
    lang: "en",
    sourceType: "gov",
    region: "global",
    congoRelevant: true,
    keywords: ["cobalt", "mines", "rdc", "katanga", "minerals", "battery"],
    trust: trust(94, 4, 92, 98),
    conflict: none,
  },

  // ——— Quality / risk examples ———
  {
    id: "s1",
    title: "10 Astuces Incroyables Pour Devenir Riche (IA spam)",
    url: "https://seo-spam.example/astuces-richesse",
    domain: "seo-spam.example",
    snippet:
      "Contenu généré automatiquement pour maximiser le trafic SEO à grande échelle.",
    publishedAt: "2026-07-28",
    lang: "fr",
    sourceType: "blog",
    region: "global",
    suspectedAiSpam: true,
    keywords: ["richesse", "astuces", "argent", "seo"],
    trust: trust(22, 92, 8, 12),
    conflict: none,
  },
  {
    id: "s2",
    title: "Guide santé : traitements recommandés par PharmaGlobal",
    url: "https://www.pharmaglobal.example/guide",
    domain: "pharmaglobal.example",
    snippet:
      "Comparatif de médicaments antipaludiques. Conseils thérapeutiques sponsorisés.",
    publishedAt: "2026-05-18",
    lang: "fr",
    sourceType: "blog",
    region: "global",
    keywords: ["malaria", "paludisme", "traitement", "médicament", "santé"],
    trust: trust(48, 35, 22, 70),
    conflict: {
      detected: true,
      category: "pharma",
      owner: "PharmaGlobal Holdings SA",
      funder: "Laboratoire MediNova",
      detail:
        "Site détenu à 78 % par un groupe commercialisant 4 des 6 molécules citées.",
    },
  },
  {
    id: "s3",
    title: "Investir dans le cobalt — Analyse Banque Atlas (sponsorisé)",
    url: "https://atlas-finance.example/cobalt",
    domain: "atlas-finance.example",
    snippet:
      "Perspectives 2026-2030 sur la chaîne du cobalt. Recommandations d'allocation.",
    publishedAt: "2026-07-01",
    lang: "fr",
    sourceType: "web",
    region: "global",
    congoRelevant: true,
    isSponsored: true,
    keywords: ["cobalt", "investir", "finance", "katanga", "rdc"],
    trust: trust(61, 28, 40, 75),
    conflict: {
      detected: true,
      category: "finance",
      owner: "Atlas Banque Privée",
      funder: "Fonds extractif Horizon",
      detail: "Positions longues sur des mineurs opérant au Katanga.",
    },
  },
  {
    id: "s4",
    title: "Actualité choc : ce que les élites vous cachent",
    url: "https://clickfarm.example/elites",
    domain: "clickfarm.example",
    snippet: "Révélations explosives !! Contenu putaclic généré pour le temps de lecture.",
    publishedAt: "2026-07-29",
    lang: "fr",
    sourceType: "blog",
    region: "global",
    suspectedAiSpam: true,
    keywords: ["politique", "élites", "révélation", "actualité"],
    trust: trust(15, 98, 3, 18),
    conflict: none,
  },
];

const COMMUNITY: CommunityPost[] = [
  {
    id: "cm1",
    platform: "reddit",
    title: "r/MachineLearning — New open-weight model beats GPT-class on math",
    excerpt: "Thread technique avec benches reproduits par la communauté.",
    author: "u/ml_bench",
    url: "https://reddit.com/r/MachineLearning/example",
    trustScore: 81,
    engagement: 4200,
    postedAt: "2026-07-29",
  },
  {
    id: "cm2",
    platform: "reddit",
    title: "r/Congo — Ouvrir une startup à Kinshasa : retours terrain",
    excerpt: "RCCM, fiscalité, fibre — 340 commentaires d'entrepreneurs locaux.",
    author: "u/kinois_dev",
    url: "https://reddit.com/r/Congo/example",
    trustScore: 78,
    engagement: 1240,
    postedAt: "2026-07-25",
  },
  {
    id: "cm3",
    platform: "discord",
    title: "#web-dev — Next.js 16 migration tips",
    excerpt: "Snippets partagés par 40 ingénieurs, liens docs MDN.",
    author: "Alex#9912",
    url: "https://discord.com/channels/example-web",
    trustScore: 73,
    engagement: 210,
    postedAt: "2026-07-28",
  },
  {
    id: "cm4",
    platform: "youtube",
    title: "Veritasium — How large language models actually work",
    excerpt: "Vulgarisation scientifique à fort engagement, sources citées.",
    author: "Veritasium",
    url: "https://youtube.com/watch?v=example-llm",
    trustScore: 85,
    engagement: 2100000,
    postedAt: "2026-06-12",
  },
  {
    id: "cm5",
    platform: "x",
    title: "Thread — Coupures d'électricité Kinshasa juillet 2026",
    excerpt: "Cartographie collaborative croisée SNEL + témoignages.",
    author: "@KinWatch",
    url: "https://x.com/KinWatch/status/example",
    trustScore: 69,
    engagement: 3200,
    postedAt: "2026-07-27",
  },
  {
    id: "cm6",
    platform: "forum",
    title: "Hacker News — Distributed search index design",
    excerpt: "Discussion d'architectes sur sharding, ranking et crawl politeness.",
    author: "hn_user",
    url: "https://news.ycombinator.com/item?id=example",
    trustScore: 88,
    engagement: 960,
    postedAt: "2026-07-22",
  },
  {
    id: "cm7",
    platform: "tiktok",
    title: "Tuto lingala : salutations du quotidien",
    excerpt: "Série pédagogique courte, validée par professeurs de langues.",
    author: "@LingalaFacile",
    url: "https://tiktok.com/@LingalaFacile/example",
    trustScore: 66,
    engagement: 89000,
    postedAt: "2026-07-15",
  },
];

const IMAGES: MediaResult[] = [
  {
    id: "i1",
    title: "Congo River at sunrise",
    url: "https://example.com/img/congo-river",
    thumb: "🌊",
    source: "Unsplash / National Geographic",
    type: "image",
  },
  {
    id: "i2",
    title: "JWST deep field",
    url: "https://nasa.gov/webb",
    thumb: "🌌",
    source: "NASA",
    type: "image",
  },
  {
    id: "i3",
    title: "Kinshasa skyline",
    url: "https://example.com/img/kinshasa",
    thumb: "🏙️",
    source: "Getty",
    type: "image",
  },
  {
    id: "i4",
    title: "Cobalt ore sample",
    url: "https://usgs.gov/cobalt",
    thumb: "🪨",
    source: "USGS",
    type: "image",
  },
  {
    id: "i5",
    title: "Neural network diagram",
    url: "https://example.com/img/nn",
    thumb: "🧠",
    source: "arXiv",
    type: "image",
  },
  {
    id: "i6",
    title: "Football stadium night",
    url: "https://example.com/img/football",
    thumb: "⚽",
    source: "BBC Sport",
    type: "image",
  },
];

const VIDEOS: MediaResult[] = [
  {
    id: "v1",
    title: "How LLMs work — explained",
    url: "https://youtube.com/watch?v=example-llm",
    thumb: "▶️",
    source: "YouTube",
    type: "video",
    duration: "18:42",
  },
  {
    id: "v2",
    title: "Reportage — marchés de Lubumbashi",
    url: "https://youtube.com/watch?v=example-lushi",
    thumb: "▶️",
    source: "YouTube",
    type: "video",
    duration: "12:05",
  },
  {
    id: "v3",
    title: "IMF WEO briefing July 2026",
    url: "https://youtube.com/watch?v=example-imf",
    thumb: "▶️",
    source: "IMF",
    type: "video",
    duration: "32:10",
  },
  {
    id: "v4",
    title: "JavaScript event loop deep dive",
    url: "https://youtube.com/watch?v=example-js",
    thumb: "▶️",
    source: "YouTube",
    type: "video",
    duration: "24:33",
  },
];

const CONGO_HINTS = [
  "rdc",
  "congo",
  "kinshasa",
  "lubumbashi",
  "katanga",
  "goma",
  "lingala",
  "kikongo",
  "tshiluba",
  "bcc",
  "unikin",
  "cobalt",
  "coltan",
];

const SENSITIVE_KEYWORDS = [
  "élection",
  "election",
  "politique",
  "président",
  "president",
  "parti",
  "opposition",
  "gouvernement",
  "constitution",
];

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function textMatchScore(r: SearchResult, tokens: string[]): number {
  if (tokens.length === 0) return 8;
  const hay = `${r.title} ${r.snippet} ${r.domain} ${r.keywords.join(" ")}`.toLowerCase();
  let hits = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hits += 1;
    if (r.title.toLowerCase().includes(t)) hits += 1.5;
    if (r.keywords.some((k) => k.includes(t) || t.includes(k))) hits += 1.2;
  }
  return hits;
}

function scoreResult(
  r: SearchResult,
  tokens: string[],
  queryTouchesCongo: boolean,
  sliders: AlgorithmSliders,
  opts: { zeroAi: boolean; zeroAds: boolean; privateMode: boolean },
): number | null {
  if (opts.zeroAi && r.suspectedAiSpam) return null;
  if ((opts.zeroAds || opts.privateMode) && r.isSponsored) return null;

  const relevance = textMatchScore(r, tokens);
  // Keep mid-relevance global docs discoverable even without perfect token overlap
  let score = 40 + relevance * 18 + r.trust.credibility * 0.35;

  // Authority / recency
  if (r.sourceType === "academic" || r.sourceType === "gov" || r.sourceType === "wiki") {
    score += sliders.authority * 0.22;
  }
  if (r.sourceType === "news" || r.sourceType === "blog") {
    score += (100 - sliders.authority) * 0.12;
  }
  if (r.sourceType === "academic") score += sliders.audience * 0.28;
  if (r.sourceType === "news" || r.sourceType === "blog" || r.sourceType === "web") {
    score += (100 - sliders.audience) * 0.12;
  }

  // RDC boost — never a hard filter. locality 0 = max boost, 100 = neutral global.
  const boostStrength = (100 - sliders.locality) / 100;
  if (r.congoRelevant || r.region === "rdc") {
    const contextual = queryTouchesCongo ? 42 : 14;
    score += contextual * boostStrength;
  } else if (r.region === "africa") {
    score += 8 * boostStrength;
  }

  score -= r.trust.clickbaitRisk * 0.25;
  score += r.trust.humanAuthoredLikelihood * 0.04;

  return score;
}

function relatedQueries(query: string, queryTouchesCongo: boolean): string[] {
  const base = [
    `${query} wikipedia`,
    `${query} actualité`,
    `${query} PDF`,
    `${query} explication simple`,
    `${query} études scientifiques`,
  ];
  if (queryTouchesCongo) {
    return [
      `${query} RDC`,
      `${query} Kinshasa`,
      `${query} données officielles`,
      ...base.slice(0, 2),
    ];
  }
  return [
    ...base,
    `${query} Afrique`,
    `impact ${query} en RDC`,
  ];
}

function knowledgeFor(query: string, tokens: string[]): KnowledgePanel | undefined {
  const q = query.toLowerCase();
  if (tokens.some((t) => ["ai", "intelligence", "llm", "chatgpt"].includes(t)) || q.includes("intelligence")) {
    return {
      title: "Intelligence artificielle",
      subtitle: "Technologie · domaine scientifique",
      summary:
        "Champ interdisciplinaire visant à créer des systèmes capables d'apprendre, raisonner et agir. Ayeba classe à la fois les sources mondiales (Nature, arXiv, MDN) et les applications locales pertinentes.",
      facts: [
        { label: "Domaine", value: "Informatique / sciences cognitives" },
        { label: "Sous-domaines", value: "ML, NLP, vision, agents" },
        { label: "Sources top", value: "Wikipedia, arXiv, Nature" },
      ],
      sources: ["en.wikipedia.org", "arxiv.org", "nature.com"],
    };
  }
  if (tokens.some((t) => ["cobalt", "katanga", "mines"].includes(t))) {
    return {
      title: "Cobalt",
      subtitle: "Ressource stratégique · RDC 1er producteur mondial",
      summary:
        "Métal critique pour batteries lithium-ion. La RDC concentre la majorité de la production mondiale ; Ayeba croise USGS, cadastre minier congolais et analyses marché.",
      facts: [
        { label: "N° atomique", value: "27" },
        { label: "Leader production", value: "RDC" },
        { label: "Usages", value: "Batteries, alliages, chimie" },
      ],
      sources: ["usgs.gov", "mines.gouv.cd", "worldbank.org"],
    };
  }
  if (tokens.some((t) => ["rdc", "congo", "kinshasa"].includes(t))) {
    return {
      title: "République démocratique du Congo",
      subtitle: "État d'Afrique centrale",
      summary:
        "Plus grand pays d'Afrique subsaharienne francophone. Ayeba priorise les sources .cd et institutionnelles tout en indexant le web mondial.",
      facts: [
        { label: "Capitale", value: "Kinshasa" },
        { label: "Langues", value: "FR, Lingala, Swahili, Kikongo, Tshiluba" },
        { label: "Monnaie", value: "Franc congolais (CDF)" },
      ],
      sources: ["bcc.cd", "radiookapi.net", "worldbank.org"],
    };
  }
  return undefined;
}

function buildSummary(query: string, results: SearchResult[], approx: number): string {
  const top = results.slice(0, 3);
  if (!top.length) {
    return `Aucun résultat pour « ${query} » avec vos filtres. Assouplissez Zéro IA ou les curseurs.`;
  }
  const regions = new Set(top.map((r) => r.region ?? "global"));
  const congoHits = results.filter((r) => r.congoRelevant).length;
  return (
    `Synthèse Ayeba (index mondial ≈ ${approx.toLocaleString("fr-FR")} docs matchés) pour « ${query} ». ` +
    `Top source : ${top[0].title} (${top[0].domain}, crédibilité ${top[0].trust.credibility}/100). ` +
    `Couverture : ${[...regions].join(", ")}` +
    (congoHits ? ` · ${congoHits} sources boostées RDC/Afrique` : "") +
    `. Les 12 modes avancés (Recherche Profonde, canevas, Zéro IA…) s'ajoutent au classement web classique.`
  );
}

export function runSearch(
  query: string,
  sliders: AlgorithmSliders,
  opts: { zeroAi: boolean; zeroAds: boolean; privateMode: boolean },
): SearchResponse {
  const q = query.trim() || "world news";
  const tokens = tokenize(q);
  const queryTouchesCongo = tokens.some((t) => CONGO_HINTS.some((h) => h.includes(t) || t.includes(h)));

  const scored = WEB_INDEX.map((r) => ({
    r,
    s: scoreResult(r, tokens, queryTouchesCongo, sliders, opts),
  }))
    .filter((x): x is { r: SearchResult; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s)
    .map((x) => ({ ...x.r, rankScore: Math.round(x.s) }));

  // If query is generic, still surface a healthy mix of global authorities
  const results =
    scored.length >= 6
      ? scored
      : [
          ...scored,
          ...WEB_INDEX.filter((r) => !scored.find((s) => s.id === r.id) && !r.suspectedAiSpam)
            .slice(0, 8)
            .map((r) => ({ ...r, rankScore: r.trust.credibility })),
        ];

  const news = results.filter((r) => r.sourceType === "news");
  const isSensitiveTopic = SENSITIVE_KEYWORDS.some((k) => q.toLowerCase().includes(k));
  const needsCode =
    /\b(calcul|math|équation|equation|code|algorithme|fibonacci|prime|racine|javascript)\b/i.test(
      q,
    );
  const needsCanvas =
    /\b(compar|tableau|vs|versus|prix|marché|marche|stat|cobalt|économie|economie)\b/i.test(q) ||
    results.length > 0;

  const approxResults = 12_400_000 + tokens.length * 870_123 + results.length * 11_001;

  return {
    query: q,
    approxResults,
    results,
    images: IMAGES,
    videos: VIDEOS,
    news: news.length ? news : results.filter((r) => r.sourceType === "web").slice(0, 4),
    maps: [
      {
        id: "map-demo-1",
        name: queryTouchesCongo ? "Kinshasa" : q.slice(0, 40),
        category: "lieu",
        lat: -4.3276,
        lon: 15.3136,
        address: queryTouchesCongo
          ? "Kinshasa, République démocratique du Congo"
          : `Résultats carte pour « ${q} »`,
        url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`,
      },
    ],
    shopping: [
      {
        id: "shop-demo-1",
        title: `${q} — Jumia`,
        price: "comparer",
        currency: "CDF",
        store: "Jumia",
        url: `https://www.jumia.cd/catalog/?q=${encodeURIComponent(q)}`,
        rating: 4.1,
      },
      {
        id: "shop-demo-2",
        title: `${q} — Amazon`,
        price: "comparer",
        currency: "USD",
        store: "Amazon",
        url: `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
        rating: 4.3,
      },
    ],
    community: COMMUNITY.sort((a, b) => b.trustScore - a.trustScore),
    related: relatedQueries(q, queryTouchesCongo),
    peopleAlsoAsk: [
      {
        q: `Qu'est-ce que ${q} ?`,
        a: `Vue d'ensemble tirée des sources les mieux classées pour « ${q} », croisant autorités mondiales et signaux RDC si pertinent.`,
      },
      {
        q: `Quelles sont les meilleures sources sur ${q} ?`,
        a: results
          .slice(0, 3)
          .map((r) => r.domain)
          .join(", "),
      },
      {
        q: `Y a-t-il un angle RDC / Afrique sur ${q} ?`,
        a: queryTouchesCongo
          ? "Oui — Ayeba a boosté les sources congolaises et africaines sans masquer le web mondial."
          : "Ayeba peut remonter un angle RDC via le curseur « Priorité RDC » sans exclure les sources internationales.",
      },
    ],
    knowledge: knowledgeFor(q, tokens),
    aiSummary: buildSummary(q, results, approxResults),
    isSensitiveTopic,
    opposingViews: isSensitiveTopic
      ? [
          {
            title: "Tribune — Pourquoi la réforme institutionnelle est urgente",
            url: "https://opinion-a.example/reforme",
            stance: "Position A",
            snippet:
              "Argumentaire en faveur d'une révision constitutionnelle accélérée.",
          },
          {
            title: "Analyse — Les risques d'une révision précipitée",
            url: "https://opinion-b.example/prudence",
            stance: "Position B",
            snippet:
              "Contrepoint soulignant la nécessité de consensus national.",
          },
        ]
      : undefined,
    canvas: needsCanvas
      ? [
          {
            id: "t1",
            title: `Comparatif sources — « ${q} »`,
            headers: ["Source", "Région", "Type", "Crédibilité", "Boost RDC"],
            rows: results.slice(0, 6).map((r) => [
              r.domain,
              r.region ?? "global",
              r.sourceType,
              String(r.trust.credibility),
              r.congoRelevant ? "Oui" : "Non",
            ]),
          },
        ]
      : undefined,
    code: needsCode
      ? {
          language: "javascript",
          code: `// Ayeba Code Engine — exécution locale vérifiée
function fibonacci(n) {
  if (n < 0) throw new Error("n doit être >= 0");
  const out = [];
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    out.push(a);
    [a, b] = [b, a + b];
  }
  return out;
}
const result = fibonacci(12);
console.log("Suite:", result.join(", "));
console.log("Somme:", result.reduce((s, x) => s + x, 0));`,
          output: "Suite: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89\nSomme: 232",
          verified: true,
        }
      : undefined,
    podcast: [
      {
        speaker: "A",
        text: `On parle de « ${q} ». Ayeba cherche d'abord dans l'index mondial — comme un grand moteur — puis applique un boost RDC si c'est pertinent.`,
      },
      {
        speaker: "B",
        text: `Exact. Tu n'es pas enfermé dans le Congo : Wikipedia, Nature, IMF, MDN… tout est là. La priorité RDC, c'est un avantage, pas une cage.`,
      },
      {
        speaker: "A",
        text: `Et au-dessus du web classique, tu as les 12 modes : Recherche Profonde, canevas, Zéro IA, podcast, curseurs…`,
      },
      {
        speaker: "B",
        text: `Tu écoutes la synthèse, puis tu ouvres les liens originaux à droite. Simple.`,
      },
    ],
  };
}

export const DEEP_RESEARCH_STEPS = [
  { id: "s1", label: "Balayer l'index mondial (web, news, académique)" },
  { id: "s2", label: "Remonter et croiser les sources prioritaires RDC / Afrique" },
  { id: "s3", label: "Interroger forums & discussions communautaires de confiance" },
  { id: "s4", label: "Écarter spam IA SEO et titres putaclics" },
  { id: "s5", label: "Détecter conflits d'intérêts (santé / finance)" },
  { id: "s6", label: "Rédiger le rapport structuré et sourcé" },
] as const;
