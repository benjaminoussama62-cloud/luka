/** Corpus + suggestions + dictionnaire Ayeba (index maison léger). */

export const POPULAR_QUERIES = [
  "Patrice Lumumba",
  "Kinshasa",
  "Banque Centrale du Congo",
  "cobalt République démocratique du Congo",
  "code minier RDC",
  "paludisme Afrique centrale",
  "fibre optique Kinshasa",
  "Radio Okapi",
  "Université de Kinshasa",
  "Lubumbashi",
  "Goma",
  "intelligence artificielle",
  "économie mondiale 2026",
  "JavaScript",
  "climat Congo Basin",
  "franc congolais",
  "SNEL électricité",
  "élections RDC",
  "parc national Virunga",
  "Lingala dictionnaire",
];

export const SPELL_DICT = [
  ...POPULAR_QUERIES.map((q) => q.toLowerCase()),
  "kinshasa",
  "lubumbashi",
  "congo",
  "rdc",
  "lumumba",
  "kabila",
  "tshisekedi",
  "cobalt",
  "coltan",
  "paludisme",
  "malaria",
  "wikipedia",
  "actualité",
  "economie",
  "économie",
  "javascript",
  "python",
  "kinshasa",
  "goma",
  "bukavu",
  "matadi",
  "kisangani",
  "jemsa",
  "tala",
  "sombateka",
  "omega",
  "ayeba",
  "devalpha",
];

export type IndexedDoc = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  keywords: string[];
  congoRelevant?: boolean;
  sourceType: "web" | "gov" | "news" | "wiki" | "tech" | "academic";
  credibility: number;
  sitelinks?: { title: string; url: string }[];
};

/** Index maison prioritaire RDC + autorités */
export const AYEBA_INDEX: IndexedDoc[] = [
  {
    id: "idx-bcc",
    title: "Banque Centrale du Congo",
    url: "https://www.bcc.cd/",
    domain: "bcc.cd",
    snippet:
      "Institution monétaire de la RDC : politique monétaire, taux, réserves et publications officielles.",
    keywords: ["bcc", "banque", "centrale", "franc", "économie", "rdc"],
    congoRelevant: true,
    sourceType: "gov",
    credibility: 95,
    sitelinks: [
      { title: "Publications", url: "https://www.bcc.cd/" },
      { title: "Statistiques", url: "https://www.bcc.cd/" },
    ],
  },
  {
    id: "idx-okapi",
    title: "Radio Okapi — actualités RDC",
    url: "https://www.radiookapi.net/",
    domain: "radiookapi.net",
    snippet:
      "Médias indépendant couvrant Kinshasa, les provinces et la région des Grands Lacs.",
    keywords: ["actualité", "news", "kinshasa", "rdc", "okapi"],
    congoRelevant: true,
    sourceType: "news",
    credibility: 88,
    sitelinks: [
      { title: "Politique", url: "https://www.radiookapi.net/" },
      { title: "Société", url: "https://www.radiookapi.net/" },
    ],
  },
  {
    id: "idx-unikin",
    title: "Université de Kinshasa (UNIKIN)",
    url: "https://www.unikin.ac.cd/",
    domain: "unikin.ac.cd",
    snippet:
      "Enseignement supérieur et recherche : facultés, thèses et publications scientifiques.",
    keywords: ["unikin", "université", "recherche", "kinshasa"],
    congoRelevant: true,
    sourceType: "academic",
    credibility: 91,
  },
  {
    id: "idx-mines",
    title: "Ministère des Mines — RDC",
    url: "https://mines.gouv.cd/",
    domain: "mines.gouv.cd",
    snippet:
      "Cadastre minier, code minier et informations officielles sur le secteur extractif.",
    keywords: ["mines", "cobalt", "cuivre", "cadastre", "code minier"],
    congoRelevant: true,
    sourceType: "gov",
    credibility: 90,
    sitelinks: [
      { title: "Cadastre", url: "https://mines.gouv.cd/" },
      { title: "Code minier", url: "https://mines.gouv.cd/" },
    ],
  },
  {
    id: "idx-lumumba",
    title: "Patrice Lumumba — biographie",
    url: "https://fr.wikipedia.org/wiki/Patrice_Lumumba",
    domain: "fr.wikipedia.org",
    snippet:
      "Premier Premier ministre du Congo indépendant ; figure majeure de la décolonisation africaine.",
    keywords: ["lumumba", "histoire", "indépendance", "congo"],
    congoRelevant: true,
    sourceType: "wiki",
    credibility: 94,
  },
  {
    id: "idx-kin",
    title: "Kinshasa",
    url: "https://fr.wikipedia.org/wiki/Kinshasa",
    domain: "fr.wikipedia.org",
    snippet:
      "Capitale de la RDC, une des plus grandes métropoles d'Afrique francophone.",
    keywords: ["kinshasa", "capitale", "ville"],
    congoRelevant: true,
    sourceType: "wiki",
    credibility: 93,
    sitelinks: [
      { title: "Géographie", url: "https://fr.wikipedia.org/wiki/Kinshasa" },
      { title: "Histoire", url: "https://fr.wikipedia.org/wiki/Kinshasa" },
    ],
  },
  {
    id: "idx-virunga",
    title: "Parc national des Virunga",
    url: "https://fr.wikipedia.org/wiki/Parc_national_des_Virunga",
    domain: "fr.wikipedia.org",
    snippet:
      "Plus ancien parc national d'Afrique, patrimoine UNESCO, gorilles de montagne.",
    keywords: ["virunga", "parc", "nature", "goma"],
    congoRelevant: true,
    sourceType: "wiki",
    credibility: 92,
  },
  {
    id: "idx-snel",
    title: "SNEL — Société Nationale d'Électricité",
    url: "https://www.snel.cd/",
    domain: "snel.cd",
    snippet:
      "Production, transport et distribution d'électricité en République démocratique du Congo.",
    keywords: ["snel", "électricité", "énergie", "kinshasa", "rdc"],
    congoRelevant: true,
    sourceType: "gov",
    credibility: 86,
    sitelinks: [
      { title: "Services", url: "https://www.snel.cd/" },
      { title: "Actualités", url: "https://www.snel.cd/" },
    ],
  },
  {
    id: "idx-goma",
    title: "Goma",
    url: "https://fr.wikipedia.org/wiki/Goma",
    domain: "fr.wikipedia.org",
    snippet:
      "Chef-lieu du Nord-Kivu, au bord du lac Kivu, proche des Virunga.",
    keywords: ["goma", "nord-kivu", "kivu", "ville"],
    congoRelevant: true,
    sourceType: "wiki",
    credibility: 91,
  },
  {
    id: "idx-cobalt",
    title: "Cobalt — République démocratique du Congo",
    url: "https://fr.wikipedia.org/wiki/Cobalt",
    domain: "fr.wikipedia.org",
    snippet:
      "La RDC produit une part majeure du cobalt mondial, métal critique pour les batteries.",
    keywords: ["cobalt", "mines", "batterie", "katanga", "cuivre"],
    congoRelevant: true,
    sourceType: "wiki",
    credibility: 93,
  },
  {
    id: "idx-who",
    title: "OMS — paludisme",
    url: "https://www.who.int/fr/news-room/fact-sheets/detail/malaria",
    domain: "who.int",
    snippet:
      "Fiche OMS sur le paludisme : transmission, prévention, fardeau en Afrique centrale.",
    keywords: ["paludisme", "malaria", "santé", "oms", "afrique"],
    congoRelevant: true,
    sourceType: "academic",
    credibility: 97,
  },
  {
    id: "idx-mdn",
    title: "MDN — JavaScript",
    url: "https://developer.mozilla.org/fr/docs/Web/JavaScript",
    domain: "developer.mozilla.org",
    snippet:
      "Documentation de référence JavaScript pour le web moderne.",
    keywords: ["javascript", "js", "code", "web", "programmation"],
    sourceType: "tech",
    credibility: 98,
    sitelinks: [
      { title: "Guide", url: "https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide" },
      { title: "Référence", url: "https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference" },
    ],
  },
];

export function suggestQueries(input: string, history: string[] = []): string[] {
  const q = input.trim().toLowerCase();
  if (!q) {
    return [...new Set([...history, ...POPULAR_QUERIES])].slice(0, 8);
  }
  const pool = [...history, ...POPULAR_QUERIES, ...AYEBA_INDEX.map((d) => d.title)];
  const scored = pool
    .map((item) => {
      const t = item.toLowerCase();
      let s = 0;
      if (t.startsWith(q)) s += 50;
      if (t.includes(q)) s += 20;
      q.split(/\s+/).forEach((w) => {
        if (w.length > 1 && t.includes(w)) s += 8;
      });
      return { item, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  return [...new Set(scored.map((x) => x.item))].slice(0, 8);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function didYouMean(query: string): string | undefined {
  const raw = query.trim();
  if (!raw) return undefined;
  // Ne pas « corriger » acronymes / sigles tapés volontairement
  if (/^[A-Z0-9-]{2,8}$/.test(raw)) return undefined;

  const tokens = raw.toLowerCase().split(/\s+/);
  if (!tokens.length) return undefined;
  let changed = false;
  const fixed = tokens.map((tok) => {
    if (tok.length < 4) return tok;
    if (SPELL_DICT.includes(tok)) return tok;
    let best = tok;
    let bestDist = Infinity;
    for (const w of SPELL_DICT) {
      if (Math.abs(w.length - tok.length) > 2) continue;
      const d = levenshtein(tok, w);
      if (d < bestDist && d <= 1) {
        bestDist = d;
        best = w;
      }
    }
    if (best !== tok) changed = true;
    return best;
  });
  if (!changed) return undefined;
  return fixed.join(" ");
}

export function searchLocalIndex(query: string): IndexedDoc[] {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length && q.length < 2) return [];

  return AYEBA_INDEX.map((doc) => {
    const hay = `${doc.title} ${doc.snippet} ${doc.keywords.join(" ")} ${doc.domain}`.toLowerCase();
    let score = 0;
    if (q.length >= 2 && (hay.includes(q) || doc.domain.includes(q))) score += 40;
    for (const t of tokens) {
      if (doc.title.toLowerCase().includes(t)) score += 20;
      else if (hay.includes(t)) score += 10;
    }
    return { doc, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.doc);
}
