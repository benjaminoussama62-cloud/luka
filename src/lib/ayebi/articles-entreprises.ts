import type { AyebiArticle } from "./types";

export const ENTREPRISES_ARTICLES: AyebiArticle[] = [
  {
    slug: "gecamines-full",
    title: "Gécamines",
    subtitle: "Générale des Carrières et des Mines · État · Katanga",
    category: "économie",
    summary:
      "La Générale des Carrières et des Mines (Gécamines) est la principale entreprise publique minière de la RDC. Héritière de l'Union Minière du Haut-Katanga, elle détient des participations dans les plus grandes mines de cuivre et cobalt du Katanga.",
    body: [],
    sections: [
      {
        heading: "Histoire",
        paragraphs: [
          "L'Union Minière du Haut-Katanga (UMHK) est fondée en 1906 par des intérêts belges et britanniques. Elle exploite le cuivre, le cobalt, l'uranium et le zinc du Katanga pendant toute la période coloniale.",
          "À l'indépendance, l'UMHK est nationalisée en 1967 et rebaptisée Gécamines. Sous Mobutu, elle devient le principal pourvoyeur de devises de l'État zaïrois.",
          "Dans les années 1990, la production s'effondre : pillages, manque d'investissement et mauvaise gestion réduisent la production de cuivre de 500 000 à moins de 30 000 tonnes par an.",
        ],
      },
      {
        heading: "Restructuration et partenariats",
        paragraphs: [
          "Depuis les années 2000, Gécamines signe des joint-ventures avec des multinationales : Glencore (Katanga Mining), CMOC (Tenke Fungurume), Ivanhoe Mines (Kamoa-Kakula).",
          "Ces partenariats apportent des investissements massifs mais soulèvent des questions sur le partage des revenus et la souveraineté minière.",
          "Le gouvernement Tshisekedi a renégocié plusieurs contrats pour augmenter la part de l'État dans les revenus miniers.",
        ],
      },
      {
        heading: "Enjeux actuels",
        paragraphs: [
          "Gécamines reste un symbole de la souveraineté économique congolaise. Ses dirigeants sont nommés par le président et ses décisions ont des implications politiques majeures.",
          "La transparence des contrats miniers, les redevances et le contenu local sont au cœur des débats sur la gestion des ressources naturelles.",
        ],
      },
    ],
    timeline: [
      { date: "1906", event: "Fondation UMHK" },
      { date: "1967", event: "Nationalisation · Gécamines" },
      { date: "1990s", event: "Effondrement production" },
      { date: "2000s", event: "Joint-ventures internationaux" },
      { date: "2020s", event: "Renégociation contrats" },
    ],
    facts: [
      { label: "Siège", value: "Lubumbashi" },
      { label: "Statut", value: "Entreprise publique" },
      { label: "Ressources", value: "Cuivre, cobalt, zinc, uranium" },
      { label: "Partenaires", value: "Glencore, CMOC, Ivanhoe" },
      { label: "Fondation", value: "1906 (UMHK)" },
    ],
    tags: ["gecamines", "mines", "cuivre", "cobalt", "katanga", "état", "lubumbashi"],
    relatedSlugs: ["cobalt-rdc", "cuivre-katanga", "lubumbashi", "katanga-region"],
    quality: "bon article",
  },
  {
    slug: "kamoa-kakula",
    title: "Mine Kamoa-Kakula",
    subtitle: "Plus grande mine de cuivre · Lualaba",
    category: "économie",
    summary:
      "Kamoa-Kakula est la plus grande mine de cuivre à haute teneur du monde, située dans la province du Lualaba. Développée par Ivanhoe Mines (Canada), Zijin Mining (Chine) et Gécamines, elle représente un tournant pour l'économie congolaise.",
    body: [],
    sections: [
      {
        heading: "Découverte et développement",
        paragraphs: [
          "Le gisement est découvert en 2008 par Ivanhoe Mines. Les réserves prouvées sont parmi les plus importantes au monde : plus de 40 millions de tonnes de cuivre à haute teneur.",
          "La production commerciale démarre en 2021. La mine monte rapidement en puissance pour atteindre plusieurs centaines de milliers de tonnes de cuivre par an.",
        ],
      },
      {
        heading: "Impact économique",
        paragraphs: [
          "Kamoa-Kakula génère des milliards de dollars de revenus pour la RDC via redevances, impôts et dividendes de Gécamines. Elle crée des milliers d'emplois directs et indirects.",
          "La mine est alimentée par de l'énergie hydroélectrique locale, réduisant son empreinte carbone. Elle vise la neutralité carbone à terme.",
        ],
      },
      {
        heading: "Enjeux",
        paragraphs: [
          "Les négociations sur le partage des revenus entre Ivanhoe, Zijin et l'État congolais sont complexes. Le contenu local (emploi et approvisionnement congolais) est une priorité du gouvernement.",
          "La mine est un symbole du potentiel minier congolais mais aussi des défis de gouvernance et de souveraineté.",
        ],
      },
    ],
    timeline: [
      { date: "2008", event: "Découverte du gisement" },
      { date: "2021", event: "Début production commerciale" },
      { date: "2023", event: "Montée en puissance" },
    ],
    facts: [
      { label: "Province", value: "Lualaba" },
      { label: "Actionnaires", value: "Ivanhoe Mines, Zijin Mining, Gécamines" },
      { label: "Ressource", value: "Cuivre haute teneur" },
      { label: "Production", value: "Centaines de milliers t/an" },
      { label: "Énergie", value: "Hydroélectrique" },
    ],
    tags: ["kamoa", "kakula", "cuivre", "mines", "lualaba", "ivanhoe", "zijin"],
    relatedSlugs: ["gecamines-full", "cuivre-katanga", "cobalt-rdc", "katanga-region"],
    quality: "bon article",
  },
  {
    slug: "equity-bcdc",
    title: "Equity BCDC",
    subtitle: "Banque · réseau national · inclusion financière",
    category: "économie",
    summary:
      "Equity BCDC est l'une des principales banques commerciales de la RDC, née de la fusion entre Equity Bank Congo et la Banque Commerciale du Congo (BCDC). Elle dispose d'un vaste réseau d'agences et mise sur l'inclusion financière.",
    body: [],
    sections: [
      {
        heading: "Histoire et fusion",
        paragraphs: [
          "La BCDC est l'une des plus anciennes banques du Congo, héritière d'institutions coloniales. Equity Bank Kenya acquiert une participation majoritaire et fusionne les entités pour créer Equity BCDC.",
          "La fusion apporte le modèle d'inclusion financière d'Equity Bank Kenya, reconnu mondialement pour sa capacité à bancariser les populations à faibles revenus.",
        ],
      },
      {
        heading: "Services et réseau",
        paragraphs: [
          "Equity BCDC dispose d'un réseau d'agences dans toutes les grandes villes et de nombreuses zones rurales. Elle propose comptes, crédits, mobile banking et services aux entreprises.",
          "Son application mobile et ses agents bancaires permettent d'atteindre des clients sans accès aux agences traditionnelles.",
        ],
      },
    ],
    timeline: [
      { date: "Époque coloniale", event: "Fondation BCDC" },
      { date: "2015", event: "Entrée Equity Bank Kenya" },
      { date: "2020", event: "Fusion · Equity BCDC" },
    ],
    facts: [
      { label: "Groupe", value: "Equity Group (Kenya)" },
      { label: "Siège", value: "Kinshasa" },
      { label: "Réseau", value: "National · agences et agents" },
      { label: "Focus", value: "Inclusion financière" },
    ],
    tags: ["equity", "bcdc", "banque", "finance", "kinshasa", "inclusion"],
    relatedSlugs: ["rawbank", "banque-centrale-congo", "mobile-money-rdc"],
    quality: "standard",
  },
  {
    slug: "congo-airways",
    title: "Congo Airways",
    subtitle: "Compagnie nationale · aviation · Kinshasa",
    category: "institution",
    summary:
      "Congo Airways est la compagnie aérienne nationale de la RDC, fondée en 2015. Elle opère des vols intérieurs entre les principales villes du pays et quelques destinations régionales, dans un contexte de marché aérien difficile.",
    body: [],
    sections: [
      {
        heading: "Fondation et flotte",
        paragraphs: [
          "Congo Airways est créée en 2015 pour remplacer la défunte Hewa Bora Airways. L'État congolais est actionnaire majoritaire. La compagnie opère avec une flotte d'Airbus A320 et ATR.",
          "Les liaisons intérieures (Kinshasa–Lubumbashi, Kinshasa–Goma, Kinshasa–Kisangani) sont essentielles dans un pays où les routes sont souvent impraticables.",
        ],
      },
      {
        heading: "Défis",
        paragraphs: [
          "Le secteur aérien congolais est marqué par des problèmes de sécurité, de régulation et de rentabilité. Congo Airways fait face à la concurrence de compagnies régionales (Ethiopian, Kenya Airways, Air France).",
          "L'entretien de la flotte, le coût du carburant et la faible demande solvable sont des défis permanents.",
        ],
      },
    ],
    timeline: [
      { date: "2015", event: "Fondation de Congo Airways" },
      { date: "2016", event: "Premiers vols commerciaux" },
      { date: "2020s", event: "Expansion réseau intérieur" },
    ],
    facts: [
      { label: "Fondation", value: "2015" },
      { label: "Hub", value: "Aéroport de N'djili · Kinshasa" },
      { label: "Flotte", value: "Airbus A320, ATR" },
      { label: "Actionnaire", value: "État congolais" },
    ],
    tags: ["congo airways", "aviation", "transport", "kinshasa", "compagnie aérienne"],
    relatedSlugs: ["aeroport-ndjili", "kinshasa", "lubumbashi"],
    quality: "standard",
  },
  {
    slug: "bralima",
    title: "Bralima",
    subtitle: "Brasserie · Primus · Kinshasa",
    category: "économie",
    summary:
      "La Brasserie, Limonaderies et Malteries du Congo (Bralima) est la principale brasserie de la RDC. Filiale du groupe Heineken, elle produit les bières Primus, Turbo King et Skol, ainsi que des boissons non alcoolisées. Primus est la bière nationale par excellence.",
    body: [],
    sections: [
      {
        heading: "Histoire",
        paragraphs: [
          "Bralima est fondée en 1923 à Léopoldville. Elle produit la bière Primus depuis les années 1950. Primus devient rapidement la boisson nationale, présente dans tous les bars et marchés du pays.",
          "Heineken acquiert une participation majoritaire et modernise les installations. Bralima dispose de brasseries à Kinshasa, Lubumbashi, Kisangani et Bukavu.",
        ],
      },
      {
        heading: "Produits et marché",
        paragraphs: [
          "Primus (lager blonde) est la bière la plus vendue. Turbo King (bière forte) et Skol complètent la gamme. Bralima produit aussi des sodas (Coca-Cola sous licence) et de l'eau.",
          "La bière est un marqueur culturel fort en RDC : les bars (« nganda ») sont des espaces sociaux essentiels dans les quartiers populaires.",
        ],
      },
    ],
    timeline: [
      { date: "1923", event: "Fondation à Léopoldville" },
      { date: "1950s", event: "Lancement Primus" },
      { date: "1990s", event: "Acquisition Heineken" },
    ],
    facts: [
      { label: "Groupe", value: "Heineken" },
      { label: "Fondation", value: "1923" },
      { label: "Produit phare", value: "Primus" },
      { label: "Sites", value: "Kinshasa, Lubumbashi, Kisangani, Bukavu" },
    ],
    tags: ["bralima", "primus", "bière", "heineken", "kinshasa", "industrie"],
    relatedSlugs: ["kinshasa", "lubumbashi"],
    quality: "standard",
  },
  {
    slug: "cimenterie-nationale",
    title: "Cimenterie nationale (CINAT)",
    subtitle: "Ciment · construction · Kongo Central",
    category: "économie",
    summary:
      "La Cimenterie nationale (CINAT) est le principal producteur de ciment de la RDC. Située à Lukala (Kongo Central), elle alimente le secteur de la construction en plein essor à Kinshasa et dans les provinces.",
    body: [],
    sections: [
      {
        heading: "Production et marché",
        paragraphs: [
          "CINAT produit plusieurs centaines de milliers de tonnes de ciment par an. La demande est portée par la construction de logements, d'infrastructures et de bâtiments commerciaux.",
          "Le marché du ciment en RDC est aussi alimenté par des importations (ciment chinois, angolais) qui concurrencent la production locale.",
        ],
      },
      {
        heading: "Enjeux",
        paragraphs: [
          "L'énergie électrique est le principal défi : les coupures SNEL perturbent la production. Des générateurs et des solutions solaires sont utilisés en appoint.",
          "Le développement du secteur de la construction à Kinshasa (immeubles, routes, ponts) crée une demande croissante pour le ciment local.",
        ],
      },
    ],
    timeline: [
      { date: "Époque coloniale", event: "Fondation CINAT" },
      { date: "2000s", event: "Modernisation" },
      { date: "2020s", event: "Boom construction · demande croissante" },
    ],
    facts: [
      { label: "Localisation", value: "Lukala · Kongo Central" },
      { label: "Produit", value: "Ciment Portland" },
      { label: "Marché", value: "RDC · construction" },
    ],
    tags: ["cinat", "ciment", "construction", "industrie", "kongo central"],
    relatedSlugs: ["kinshasa", "barrage-inga", "route-nationale-1"],
    quality: "standard",
  },
];
