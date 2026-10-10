/**
 * Corpus de référence pour le benchmark de qualité de recherche.
 * Docs + jugements de pertinence gradués (ordre = idéal).
 * Les ids préfixés « bench- » isolent le corpus d'un index réel existant :
 * seuls les docs jugés comptent dans les métriques (convention TREC).
 */

export type BenchDoc = {
  id: string;
  url: string;
  domain: string;
  title: string;
  body: string;
  sourceType: string;
  credibility: number;
  localRelevant: boolean;
};

export type BenchQuery = {
  q: string;
  category: string;
  /** doc_ids par ordre de pertinence idéale (grade décroissant). */
  relevant: string[];
};

const W = "https://fr.wikipedia.org/wiki/";

export const BENCH_DOCS: BenchDoc[] = [
  // ── RDC / Kinshasa ─────────────────────────────────────────────
  {
    id: "bench-kinshasa-wiki",
    url: W + "Kinshasa",
    domain: "fr.wikipedia.org",
    title: "Kinshasa — Wikipédia",
    body: "Kinshasa est la capitale et la plus grande ville de la République démocratique du Congo. La ville compte plus de 15 millions d'habitants et se divise en 24 communes dont Gombe, Lemba, Ngaliema et Kintambo.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: true,
  },
  {
    id: "bench-rdc-wiki",
    url: W + "République_démocratique_du_Congo",
    domain: "fr.wikipedia.org",
    title: "République démocratique du Congo — Wikipédia",
    body: "La République démocratique du Congo (RDC) est un pays d'Afrique centrale. Sa capitale est Kinshasa. Le pays est dirigé par un président élu. Sa monnaie est le franc congolais.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: true,
  },
  {
    id: "bench-tshisekedi-wiki",
    url: W + "Félix_Tshisekedi",
    domain: "fr.wikipedia.org",
    title: "Félix Tshisekedi — Wikipédia",
    body: "Félix Antoine Tshisekedi Tshilombo est un homme d'État congolais, président de la République démocratique du Congo depuis janvier 2019. Il est le fils d'Étienne Tshisekedi, fondateur de l'UDPS.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: true,
  },
  {
    id: "bench-udps",
    url: "https://www.udps.cd/",
    domain: "udps.cd",
    title: "UDPS — Union pour la Démocratie et le Progrès Social",
    body: "Site officiel de l'UDPS, parti politique de la République démocratique du Congo fondé en 1982 par Étienne Tshisekedi. Le parti est au pouvoir avec le président Félix Tshisekedi.",
    sourceType: "gov",
    credibility: 0.88,
    localRelevant: true,
  },
  {
    id: "bench-bcdc",
    url: "https://www.bcdc.cd/",
    domain: "bcdc.cd",
    title: "BCDC — Banque Commerciale du Congo",
    body: "La Banque Commerciale du Congo (BCDC) est une des plus anciennes banques de la RDC. Son siège social se trouve à Kinshasa, dans la commune de la Gombe, boulevard du 30 Juin.",
    sourceType: "web",
    credibility: 0.85,
    localRelevant: true,
  },
  {
    id: "bench-gouv-rdc",
    url: "https://www.gouv.cd/",
    domain: "gouv.cd",
    title: "Portail officiel du Gouvernement de la RDC",
    body: "Le portail officiel du gouvernement de la République démocratique du Congo : présidence, primature, ministères, services publics et actualités gouvernementales à Kinshasa.",
    sourceType: "gov",
    credibility: 0.9,
    localRelevant: true,
  },
  {
    id: "bench-franc-congolais",
    url: W + "Franc_congolais",
    domain: "fr.wikipedia.org",
    title: "Franc congolais — Wikipédia",
    body: "Le franc congolais (code ISO CDF) est la monnaie officielle de la République démocratique du Congo depuis 1997. Il est émis par la Banque centrale du Congo à Kinshasa.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: true,
  },
  {
    id: "bench-unikin",
    url: "https://www.unikin.ac.cd/",
    domain: "unikin.ac.cd",
    title: "Université de Kinshasa — UNIKIN",
    body: "L'Université de Kinshasa (UNIKIN) est la principale université publique de la République démocratique du Congo. Située dans la commune de Lemba à Kinshasa, elle regroupe des facultés de médecine, droit, sciences.",
    sourceType: "academic",
    credibility: 0.85,
    localRelevant: true,
  },
  {
    id: "bench-sante-gouv",
    url: "https://sante.gouv.cd/",
    domain: "sante.gouv.cd",
    title: "Ministère de la Santé publique — RDC",
    body: "Ministère de la Santé publique, de l'Hygiène et de la Prévention de la République démocratique du Congo. Programmes de vaccination, hôpitaux publics et politique sanitaire nationale.",
    sourceType: "gov",
    credibility: 0.88,
    localRelevant: true,
  },
  {
    id: "bench-goma-wiki",
    url: W + "Goma",
    domain: "fr.wikipedia.org",
    title: "Goma — Wikipédia",
    body: "Goma est une ville de l'est de la République démocratique du Congo, chef-lieu de la province du Nord-Kivu, au bord du lac Kivu et au pied du volcan Nyiragongo.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: true,
  },
  {
    id: "bench-leopoldville",
    url: W + "Léopoldville",
    domain: "fr.wikipedia.org",
    title: "Léopoldville — Wikipédia",
    body: "Léopoldville est l'ancien nom de la ville de Kinshasa, capitale de la République démocratique du Congo. Le nom fut donné en l'honneur du roi Léopold II de Belgique et changé en 1966.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: true,
  },
  {
    id: "bench-actualite-tshisekedi",
    url: "https://actualite.cd/2025/06/rdc-tshisekedi-gouvernement",
    domain: "actualite.cd",
    title: "RDC : Félix Tshisekedi annonce un remaniement du gouvernement",
    body: "Le président de la République démocratique du Congo Félix Tshisekedi a annoncé un remaniement ministériel à Kinshasa. L'actualité politique congolaise en direct.",
    sourceType: "news",
    credibility: 0.82,
    localRelevant: true,
  },
  {
    id: "bench-radiookapi",
    url: "https://www.radiookapi.net/rdc-politique",
    domain: "radiookapi.net",
    title: "Politique RDC — Radio Okapi",
    body: "Toute l'actualité politique de la République démocratique du Congo : élections, parlement, gouvernement, provinces. Radio Okapi, média de la MONUSCO en RDC.",
    sourceType: "news",
    credibility: 0.85,
    localRelevant: true,
  },
  {
    id: "bench-jeuneafrique-rdc",
    url: "https://www.jeuneafrique.com/pays/rdc/",
    domain: "jeuneafrique.com",
    title: "RDC : toute l'actualité congolaise — Jeune Afrique",
    body: "Actualités de la République démocratique du Congo : politique à Kinshasa, économie, sécurité dans l'est du pays, diplomatie. Analyses et reportages Jeune Afrique.",
    sourceType: "news",
    credibility: 0.86,
    localRelevant: false,
  },
  {
    id: "bench-kinshasa-spam",
    url: "https://top10-shocking.example.com/kinshasa-secrets",
    domain: "top10-shocking.example.com",
    title: "Kinshasa : 10 secrets shocking, you won't believe the miracle!",
    body: "Click here to discover the shocking truth about Kinshasa. This miracle cure will change your life. You won't believe number 7! Click here now for the secret.",
    sourceType: "web",
    credibility: 0.05,
    localRelevant: false,
  },
  {
    id: "bench-kinshasa-blog",
    url: "https://monblog-voyage.example.fr/kinshasa",
    domain: "monblog-voyage.example.fr",
    title: "Mon voyage à Kinshasa — blog perso",
    body: "Récit de mon voyage à Kinshasa : le marché central, la commune de la Gombe, les restaurants au bord du fleuve Congo. Billets d'avion et conseils pratiques.",
    sourceType: "web",
    credibility: 0.35,
    localRelevant: false,
  },

  // ── Monde / entités ────────────────────────────────────────────
  {
    id: "bench-japon-wiki",
    url: W + "Japon",
    domain: "fr.wikipedia.org",
    title: "Japon — Wikipédia",
    body: "Le Japon est un pays insulaire d'Asie de l'Est. Sa capitale est Tokyo. Le Japon comprend quatre îles principales : Honshu, Hokkaido, Kyushu et Shikoku. Sa monnaie est le yen.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
  {
    id: "bench-mali-pays",
    url: W + "Mali",
    domain: "fr.wikipedia.org",
    title: "Mali — Wikipédia",
    body: "Le Mali est un pays d'Afrique de l'Ouest. Sa capitale est Bamako. Le Mali est divisé en régions : Kayes, Koulikoro, Sikasso, Ségou, Mopti, Tombouctou, Gao et Kidal.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
  {
    id: "bench-mali-musee",
    url: "https://musee-mali.example.pe/",
    domain: "musee-mali.example.pe",
    title: "MALI — Musée d'Art de Lima",
    body: "Le Museo de Arte de Lima (MALI) est le principal musée d'art du Pérou. Collections d'art précolombien, colonial et contemporain au Palais de l'Exposition de Lima.",
    sourceType: "web",
    credibility: 0.6,
    localRelevant: false,
  },
  {
    id: "bench-java-ile",
    url: W + "Java_(île)",
    domain: "fr.wikipedia.org",
    title: "Java (île) — Wikipédia",
    body: "Java est une île d'Indonésie, la plus peuplée du monde. Jakarta, la capitale indonésienne, se trouve sur Java. L'île compte de nombreux volcans actifs.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
  {
    id: "bench-java-langage",
    url: "https://docs.oracle.com/javase/tutorial/",
    domain: "docs.oracle.com",
    title: "The Java Tutorials — Oracle Documentation",
    body: "The Java Tutorials are practical guides for programmers who want to use the Java programming language to create applications. Hundreds of complete working examples.",
    sourceType: "web",
    credibility: 0.9,
    localRelevant: false,
  },
  {
    id: "bench-poutine-wiki",
    url: W + "Vladimir_Poutine",
    domain: "fr.wikipedia.org",
    title: "Vladimir Poutine — Wikipédia",
    body: "Vladimir Vladimirovitch Poutine, né le 7 octobre 1952 à Leningrad, est un homme d'État russe, président de la fédération de Russie. Ancien officier du KGB.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
  {
    id: "bench-france-wiki",
    url: W + "France",
    domain: "fr.wikipedia.org",
    title: "France — Wikipédia",
    body: "La France est un pays d'Europe occidentale. Sa capitale est Paris. Avec environ 68 millions d'habitants, c'est le deuxième pays le plus peuplé de l'Union européenne.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
  {
    id: "bench-chaussure-wiki",
    url: W + "Chaussure",
    domain: "fr.wikipedia.org",
    title: "Chaussure — Wikipédia",
    body: "Une chaussure est un vêtement destiné à couvrir le pied, les protégeant du froid, de l'humidité et des aspérités du sol. Les chaussures existent depuis la préhistoire.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
  {
    id: "bench-chaussure-securite",
    url: W + "Chaussure_de_sécurité",
    domain: "fr.wikipedia.org",
    title: "Chaussure de sécurité — Wikipédia",
    body: "Une chaussure de sécurité est une chaussure de protection individuelle destinée aux milieux professionnels dangereux : coque de protection, semelle anti-perforation, norme EN ISO 20345.",
    sourceType: "wiki",
    credibility: 0.9,
    localRelevant: false,
  },
  {
    id: "bench-lemonde",
    url: "https://www.lemonde.fr/afrique/",
    domain: "lemonde.fr",
    title: "Afrique — Le Monde",
    body: "Toute l'actualité du continent africain : politique, économie, société. Reportages et analyses du Monde sur l'Afrique centrale, de l'Ouest et l'Afrique francophone.",
    sourceType: "news",
    credibility: 0.9,
    localRelevant: false,
  },
  {
    id: "bench-bbc-afrique",
    url: "https://www.bbc.com/afrique",
    domain: "bbc.com",
    title: "BBC Afrique — Actualités en français",
    body: "BBC Afrique : les actualités de l'Afrique et du monde en français. RDC, Sahel, politique, économie, sport et culture africaine.",
    sourceType: "news",
    credibility: 0.9,
    localRelevant: false,
  },
  {
    id: "bench-insee-pop",
    url: "https://www.insee.fr/fr/statistiques/population",
    domain: "insee.fr",
    title: "Population de la France — Insee",
    body: "L'Insee publie les estimations de population de la France : 68,5 millions d'habitants. Données démographiques officielles par région, département et commune.",
    sourceType: "gov",
    credibility: 0.95,
    localRelevant: false,
  },

  // ── Navigationnel ──────────────────────────────────────────────
  {
    id: "bench-youtube",
    url: "https://www.youtube.com/",
    domain: "youtube.com",
    title: "YouTube",
    body: "YouTube : regardez, partagez et découvrez des vidéos. La plateforme vidéo la plus visitée au monde : musique, tutoriels, actualités, divertissement.",
    sourceType: "web",
    credibility: 0.95,
    localRelevant: false,
  },
  {
    id: "bench-github",
    url: "https://github.com/",
    domain: "github.com",
    title: "GitHub: Let's build from here",
    body: "GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage Git repositories.",
    sourceType: "web",
    credibility: 0.95,
    localRelevant: false,
  },
  {
    id: "bench-facebook",
    url: "https://www.facebook.com/",
    domain: "facebook.com",
    title: "Facebook — log in or sign up",
    body: "Connect with friends and the world around you on Facebook. Create a Page for a celebrity, brand or business. Log into Facebook to start sharing.",
    sourceType: "web",
    credibility: 0.95,
    localRelevant: false,
  },
  {
    id: "bench-github-blog",
    url: "https://blog-dev.example.fr/apprendre-github",
    domain: "blog-dev.example.fr",
    title: "Apprendre Git et GitHub — tutoriel débutant",
    body: "Tutoriel pour apprendre GitHub : créer un repository, faire des commits, ouvrir une pull request. Guide débutant du versioning avec Git.",
    sourceType: "web",
    credibility: 0.4,
    localRelevant: false,
  },

  // ── Bruit / hors-sujet ─────────────────────────────────────────
  {
    id: "bench-recette-manioc",
    url: "https://cuisine-afrique.example.fr/pondu",
    domain: "cuisine-afrique.example.fr",
    title: "Recette du pondu — feuilles de manioc",
    body: "Le pondu est un plat congolais à base de feuilles de manioc pilées, servi avec du poisson fumé et du fufu. Recette traditionnelle de la cuisine de Kinshasa.",
    sourceType: "web",
    credibility: 0.5,
    localRelevant: false,
  },
  {
    id: "bench-mercure-planete",
    url: W + "Mercure_(planète)",
    domain: "fr.wikipedia.org",
    title: "Mercure (planète) — Wikipédia",
    body: "Mercure est la planète la plus proche du Soleil dans le système solaire. Sa surface est criblée de cratères et ses températures varient de -180 à 430 degrés.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
  {
    id: "bench-mercure-dieu",
    url: W + "Mercure_(mythologie)",
    domain: "fr.wikipedia.org",
    title: "Mercure (mythologie) — Wikipédia",
    body: "Mercure est le dieu du commerce et des voyageurs dans la mythologie romaine. Messager des dieux, il porte des sandales ailées et le caducée.",
    sourceType: "wiki",
    credibility: 0.92,
    localRelevant: false,
  },
];

export const BENCH_QUERIES: BenchQuery[] = [
  // Navigationnel — le site officiel doit dominer
  { q: "youtube", category: "navigational", relevant: ["bench-youtube"] },
  { q: "github", category: "navigational", relevant: ["bench-github"] },
  { q: "facebook connexion", category: "navigational", relevant: ["bench-facebook"] },
  { q: "udps", category: "navigational", relevant: ["bench-udps"] },
  { q: "bcdc banque", category: "navigational", relevant: ["bench-bcdc"] },

  // Entité RDC — wiki officiel + sources locales d'abord
  { q: "kinshasa", category: "entity-rdc", relevant: ["bench-kinshasa-wiki", "bench-gouv-rdc", "bench-unikin"] },
  { q: "kinshasa population", category: "entity-rdc", relevant: ["bench-kinshasa-wiki"] },
  { q: "président de la rdc", category: "entity-rdc", relevant: ["bench-tshisekedi-wiki", "bench-gouv-rdc", "bench-rdc-wiki"] },
  { q: "félix tshisekedi", category: "entity-rdc", relevant: ["bench-tshisekedi-wiki", "bench-actualite-tshisekedi"] },
  { q: "monnaie rdc", category: "entity-rdc", relevant: ["bench-franc-congolais", "bench-rdc-wiki"] },
  { q: "université kinshasa", category: "entity-rdc", relevant: ["bench-unikin", "bench-kinshasa-wiki"] },
  { q: "ancien nom de kinshasa", category: "entity-rdc", relevant: ["bench-leopoldville", "bench-kinshasa-wiki"] },
  { q: "santé rdc", category: "entity-rdc", relevant: ["bench-sante-gouv"] },

  // Factual monde
  { q: "capitale du japon", category: "factual", relevant: ["bench-japon-wiki"] },
  { q: "poutine", category: "factual", relevant: ["bench-poutine-wiki"] },
  { q: "population france", category: "factual", relevant: ["bench-france-wiki", "bench-insee-pop"] },
  { q: "chaussure", category: "factual", relevant: ["bench-chaussure-wiki", "bench-chaussure-securite"] },

  // Désambiguïsation — le bon sens doit dominer
  { q: "mali", category: "ambiguous", relevant: ["bench-mali-pays"] },
  { q: "musée mali", category: "ambiguous", relevant: ["bench-mali-musee"] },
  { q: "java langage", category: "ambiguous", relevant: ["bench-java-langage"] },
  { q: "ile de java", category: "ambiguous", relevant: ["bench-java-ile"] },
  { q: "mercure dieu romain", category: "ambiguous", relevant: ["bench-mercure-dieu"] },

  // Actualité — les sources news doivent sortir
  { q: "actualité rdc politique", category: "news", relevant: ["bench-actualite-tshisekedi", "bench-radiookapi", "bench-jeuneafrique-rdc"] },
  { q: "actualité afrique", category: "news", relevant: ["bench-lemonde", "bench-bbc-afrique", "bench-jeuneafrique-rdc"] },

  // Rappel — mot tronqué / longue requête (teste le fallback OR)
  { q: "kinsha capitale congo", category: "recall", relevant: ["bench-kinshasa-wiki", "bench-rdc-wiki"] },
  { q: "quel est le nom de la banque commerciale du congo", category: "recall", relevant: ["bench-bcdc"] },
];
