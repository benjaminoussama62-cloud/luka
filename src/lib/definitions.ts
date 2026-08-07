/** Définitions courantes FR / Lingala / acronymes RDC */
export const DEFINITIONS: { term: string; aliases: string[]; def: string; lang?: string }[] = [
  { term: "RDC", aliases: ["rdc", "congo kinshasa", "république démocratique du congo"], def: "État d'Afrique centrale, capitale Kinshasa, ~100 millions d'habitants, second pays le plus vaste d'Afrique." },
  { term: "CDF", aliases: ["cdf", "franc congolais", "fc"], def: "Franc congolais, monnaie officielle de la RDC émise par la Banque Centrale du Congo." },
  { term: "BCC", aliases: ["bcc", "banque centrale"], def: "Banque Centrale du Congo — institution monétaire régulant le franc congolais et le système bancaire." },
  { term: "FECOFA", aliases: ["fecofa"], def: "Fédération congolaise de football — organisme régissant le football et les Léopards." },
  { term: "SNEL", aliases: ["snel"], def: "Société nationale d'électricité — producteur et distributeur d'énergie en RDC." },
  { term: "UDPS", aliases: ["udps"], def: "Union pour la démocratie et le progrès social — parti fondé par Étienne Tshisekedi." },
  { term: "Lingala", aliases: ["lingala", "langue lingala"], def: "Langue nationale parlée surtout à Kinshasa et le long du fleuve Congo ; langue des chansons congolaises." },
  { term: "Swahili", aliases: ["swahili", "kiswahili"], def: "Langue véhiculaire de l'Est congolais (Kivu, Katanga oriental)." },
  { term: "Ndombolo", aliases: ["ndombolo"], def: "Genre musical et danse congolaise né à Kinshasa dans les années 1990, rythme syncopé." },
  { term: "Sape", aliases: ["sape", "sapeur"], def: "Société des ambianceurs et des personnes élégantes — mouvement mode congolais célébrant l'habillement chic." },
  { term: "CAN", aliases: ["can", "coupe d'afrique"], def: "Coupe d'Afrique des nations — compétition continentale de football ; la RDC a gagné en 1968 et 1974." },
  { term: "Coltan", aliases: ["coltan"], def: "Minerai contenant tantal et niobium, utilisé en électronique ; extrait en RDC surtout à l'Est." },
  { term: "Cobalt", aliases: ["cobalt"], def: "Métal essentiel aux batteries ; la RDC détient la majorité des réserves mondiales." },
  { term: "Mobile money", aliases: ["mobile money", "m-pesa", "mpesa"], def: "Paiement et transfert d'argent via téléphone mobile (Vodacom, Airtel, Orange en RDC)." },
  { term: "Kinois", aliases: ["kinois", "kinoise"], def: "Habitant ou habitante de Kinshasa, capitale de la RDC." },
  { term: "Katanga", aliases: ["katanga"], def: "Ancienne province riche en cuivre et cobalt ; aujourd'hui Haut-Katanga, Lualaba et Tanganyika." },
  { term: "Malamu", aliases: ["malamu", "malamu lingala"], def: "Lingala : bien, OK, en forme. Usage courant à Kinshasa." },
  { term: "Mbote", aliases: ["mbote"], def: "Lingala : bonjour / salut. Formule de salutation très répandue." },
  { term: "Motema", aliases: ["motema"], def: "Lingala : cœur. Employé dans de nombreuses chansons et expressions." },
  { term: "Bolingo", aliases: ["bolingo"], def: "Lingala : amour. Terme central de la culture musicale congolaise." },
];

export function lookupDefinition(query: string): { term: string; def: string } | null {
  const q = query.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const stripped = q.replace(/^(qu['']est[- ]ce que|c['']est quoi|définition|definition|signification|meaning of)\s+/i, "").trim();
  for (const d of DEFINITIONS) {
    if (d.term.toLowerCase() === stripped || d.aliases.some((a) => a === stripped || stripped.includes(a))) {
      return { term: d.term, def: d.def };
    }
  }
  for (const d of DEFINITIONS) {
    if (q.includes(d.term.toLowerCase()) || d.aliases.some((a) => q.includes(a))) {
      return { term: d.term, def: d.def };
    }
  }
  return null;
}
