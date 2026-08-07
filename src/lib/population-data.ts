/** Populations indicatives — sources démographiques agrégées */
export const POPULATION: { name: string; aliases: string[]; pop: number; country?: string }[] = [
  { name: "RDC", aliases: ["rdc", "congo", "république démocratique du congo", "congo kinshasa"], pop: 102_000_000, country: "RDC" },
  { name: "Kinshasa", aliases: ["kinshasa", "kinois"], pop: 17_000_000, country: "RDC" },
  { name: "Lubumbashi", aliases: ["lubumbashi"], pop: 3_000_000, country: "RDC" },
  { name: "Goma", aliases: ["goma"], pop: 1_200_000, country: "RDC" },
  { name: "Bukavu", aliases: ["bukavu"], pop: 1_100_000, country: "RDC" },
  { name: "Kisangani", aliases: ["kisangani"], pop: 1_400_000, country: "RDC" },
  { name: "Mbuji-Mayi", aliases: ["mbuji-mayi", "mbujimayi"], pop: 2_500_000, country: "RDC" },
  { name: "Matadi", aliases: ["matadi"], pop: 600_000, country: "RDC" },
  { name: "France", aliases: ["france"], pop: 68_000_000, country: "France" },
  { name: "Belgique", aliases: ["belgique", "belgium"], pop: 11_700_000, country: "Belgique" },
  { name: "Afrique", aliases: ["afrique", "africa"], pop: 1_450_000_000 },
  { name: "Monde", aliases: ["monde", "world", "population mondiale"], pop: 8_100_000_000 },
];

export function lookupPopulation(query: string): { name: string; pop: number; country?: string } | null {
  const q = query.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!/\b(population|habitants|habitant|combien|nombre d['']habitants|pop)\b/.test(q)) return null;
  for (const p of POPULATION) {
    if (p.aliases.some((a) => q.includes(a)) || q.includes(p.name.toLowerCase())) {
      return { name: p.name, pop: p.pop, country: p.country };
    }
  }
  return null;
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR");
}

export function populationAnswer(query: string) {
  const hit = lookupPopulation(query);
  if (!hit) return null;
  return {
    title: `Population · ${hit.name}`,
    value: `${fmt(hit.pop)} habitants`,
    footnote: "Estimation agrégée · recensements et projections récentes",
  };
}
