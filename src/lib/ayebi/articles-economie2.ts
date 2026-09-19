import type { AyebiArticle } from "./types";

export const ECONOMIE2_ARTICLES: AyebiArticle[] = [
  {
    slug: "diamant-mbuji-mayi",
    title: "Diamants de Mbuji-Mayi",
    subtitle: "Kasaï · MIBA · artisanat",
    category: "économie",
    summary: "Mbuji-Mayi est la capitale mondiale du diamant industriel. La Minière de Bakwanga (MIBA) exploite les gisements depuis 1961. Des centaines de milliers de creuseurs artisanaux complètent la production industrielle dans le Kasaï.",
    body: [],
    sections: [
      {
        heading: "Géologie et production",
        paragraphs: [
          "Le Kasaï-Oriental abrite l'un des plus grands gisements de diamants au monde, principalement des diamants industriels (bort) utilisés dans l'industrie. Des diamants gemmes sont également extraits.",
          "La MIBA (Minière de Bakwanga) est l'entreprise publique qui exploite les gisements depuis 1961. À son apogée, elle produisait des millions de carats par an.",
        ],
      },
      {
        heading: "Artisanat et économie locale",
        paragraphs: [
          "Des centaines de milliers de creuseurs artisanaux (garimpeiros) travaillent dans les rivières et les mines à ciel ouvert autour de Mbuji-Mayi.",
          "Le commerce du diamant structure l'économie locale : négociants, comptoirs, banques et services gravitent autour de la filière.",
        ],
      },
      {
        heading: "Défis",
        paragraphs: [
          "La MIBA souffre de sous-investissement, de mauvaise gestion et de concurrence artisanale. La fraude et la contrebande de diamants vers les pays voisins sont des problèmes persistants.",
          "Le processus de Kimberley (certification des diamants non-conflictuels) s'applique à la RDC depuis 2003.",
        ],
      },
    ],
    timeline: [
      { date: "1961", event: "Création MIBA" },
      { date: "1990s", event: "Apogée production" },
      { date: "2003", event: "Processus de Kimberley" },
      { date: "2010s", event: "Déclin MIBA · artisanat dominant" },
    ],
    facts: [
      { label: "Ville", value: "Mbuji-Mayi" },
      { label: "Entreprise", value: "MIBA" },
      { label: "Type", value: "Diamants industriels et gemmes" },
      { label: "Certification", value: "Processus de Kimberley" },
    ],
    tags: ["diamant", "mbuji-mayi", "miba", "kasaï", "mines", "économie"],
    relatedSlugs: ["mbuji-mayi", "artisanat-minier", "cobalt-rdc"],
    quality: "bon article",
  },
  {
    slug: "or-rdc",
    title: "Or en RDC",
    subtitle: "Ituri · Kivu · Maniema · artisanat",
    category: "économie",
    summary: "La RDC est l'un des plus grands producteurs d'or d'Afrique. L'or est extrait principalement dans l'Ituri, le Kivu et le Maniema, majoritairement par des artisans. Des mines industrielles comme Kibali (Ituri) produisent des centaines de milliers d'onces par an.",
    body: [],
    sections: [
      {
        heading: "Production et acteurs",
        paragraphs: [
          "La mine de Kibali (Ituri), opérée par Barrick Gold et AngloGold Ashanti, est l'une des plus grandes mines d'or d'Afrique. Elle produit plus d'un million d'onces par an.",
          "L'artisanat aurifère emploie des centaines de milliers de personnes dans l'Ituri, le Nord-Kivu, le Sud-Kivu et le Maniema. Les conditions de travail sont souvent dangereuses.",
        ],
      },
      {
        heading: "Or et conflits",
        paragraphs: [
          "L'or de l'Est congolais finance des groupes armés. Des rapports de l'ONU documentent les liens entre exploitation aurifère et financement des milices.",
          "Des initiatives de traçabilité (ITSCI, Better Gold Initiative) tentent de certifier l'or artisanal comme exempt de financement de conflits.",
        ],
      },
    ],
    timeline: [
      { date: "Précolonial", event: "Exploitation traditionnelle de l'or" },
      { date: "2013", event: "Ouverture mine Kibali" },
      { date: "2020s", event: "Kibali · 1M onces/an" },
    ],
    facts: [
      { label: "Mine principale", value: "Kibali (Ituri)" },
      { label: "Opérateurs", value: "Barrick Gold, AngloGold Ashanti" },
      { label: "Régions", value: "Ituri, Kivu, Maniema" },
      { label: "Production Kibali", value: ">1M onces/an" },
    ],
    tags: ["or", "gold", "kibali", "ituri", "kivu", "mines", "économie"],
    relatedSlugs: ["ituri-province", "kivu-region", "artisanat-minier"],
    quality: "bon article",
  },
  {
    slug: "agriculture-kasai",
    title: "Agriculture du Kasaï",
    subtitle: "Manioc · maïs · grenier du Congo",
    category: "économie",
    summary: "Le Grand Kasaï est le grenier agricole de la RDC. Manioc, maïs, arachides et légumineuses y sont cultivés sur de vastes étendues. La région approvisionne Kinshasa et les grandes villes en produits alimentaires de base.",
    body: [],
    sections: [
      {
        heading: "Productions principales",
        paragraphs: [
          "Le manioc est la culture dominante : tubercules et feuilles (pondu) alimentent des millions de Congolais. Le maïs est la deuxième culture, consommé en farine (fufu) ou en grains.",
          "Les arachides, haricots, soja et légumes complètent la production. Le palmier à huile fournit l'huile de palme, ingrédient de base de la cuisine congolaise.",
        ],
      },
      {
        heading: "Défis et potentiel",
        paragraphs: [
          "Le manque de routes, de stockage et de financement limite la commercialisation. Des pertes post-récolte importantes réduisent les revenus des agriculteurs.",
          "Le potentiel agricole du Kasaï est immense : sols fertiles, pluviométrie abondante et main-d'œuvre disponible. Des investissements dans les infrastructures pourraient transformer la région.",
        ],
      },
    ],
    timeline: [
      { date: "XVIe s.", event: "Introduction manioc et maïs" },
      { date: "1960s", event: "Agriculture vivrière dominante" },
      { date: "2000s", event: "Crise alimentaire · conflits kasaïens" },
    ],
    facts: [
      { label: "Cultures", value: "Manioc, maïs, arachides" },
      { label: "Provinces", value: "Kasaï, Kasaï-Central, Kasaï-Oriental" },
      { label: "Rôle", value: "Grenier de la RDC" },
    ],
    tags: ["agriculture", "kasaï", "manioc", "maïs", "économie", "alimentation"],
    relatedSlugs: ["agriculture-rdc", "mbuji-mayi", "kananga"],
    quality: "standard",
  },
  {
    slug: "cafe-kivu",
    title: "Café du Kivu",
    subtitle: "Arabica · export · qualité mondiale",
    category: "économie",
    summary: "Le café du Kivu est l'un des meilleurs cafés d'Afrique. Cultivé en altitude dans les provinces du Nord-Kivu et du Sud-Kivu, l'arabica kivuien est exporté vers l'Europe, les États-Unis et le Japon. Il représente un potentiel économique majeur pour la région.",
    body: [],
    sections: [
      {
        heading: "Production et qualité",
        paragraphs: [
          "Le café arabica est cultivé entre 1 500 et 2 000 m d'altitude dans les collines du Kivu. Le climat tempéré, les sols volcaniques et les précipitations régulières créent des conditions idéales.",
          "Des coopératives comme SOPACDI, KAWA MABER et d'autres regroupent des milliers de petits producteurs. Leurs cafés obtiennent des notes élevées dans les concours internationaux.",
        ],
      },
      {
        heading: "Filière et défis",
        paragraphs: [
          "L'insécurité dans l'Est perturbe régulièrement la production et l'exportation. Des routes impraticables augmentent les coûts logistiques.",
          "Des initiatives de commerce équitable et de certification biologique permettent aux producteurs d'accéder à des marchés premium.",
        ],
      },
    ],
    timeline: [
      { date: "Époque coloniale", event: "Introduction du café arabica" },
      { date: "1960s", event: "Développement filière export" },
      { date: "2000s", event: "Coopératives et commerce équitable" },
    ],
    facts: [
      { label: "Type", value: "Arabica" },
      { label: "Altitude", value: "1 500–2 000 m" },
      { label: "Provinces", value: "Nord-Kivu, Sud-Kivu" },
      { label: "Marchés", value: "Europe, USA, Japon" },
    ],
    tags: ["café", "kivu", "arabica", "export", "agriculture", "économie"],
    relatedSlugs: ["kivu-region", "bukavu", "goma"],
    quality: "bon article",
  },
  {
    slug: "pêche-rdc",
    title: "Pêche en RDC",
    subtitle: "Fleuve Congo · lacs · kapenta · tilapia",
    category: "économie",
    summary: "La pêche est une activité économique majeure en RDC. Le fleuve Congo, ses affluents et les lacs des Grands Lacs fournissent des millions de tonnes de poisson par an. Le poisson est la principale source de protéines animales pour de nombreux Congolais.",
    body: [],
    sections: [
      {
        heading: "Ressources halieutiques",
        paragraphs: [
          "Le fleuve Congo et ses affluents abritent plus de 700 espèces de poissons, dont beaucoup sont endémiques. Le tilapia, le capitaine (Nile perch), le silure et le poisson-tigre sont les plus pêchés.",
          "Le lac Tanganyika est célèbre pour le kapenta (sardine d'eau douce) et le ndakala, pêchés la nuit à la lumière. Le lac Kivu fournit également du poisson à Goma et Bukavu.",
        ],
      },
      {
        heading: "Pêche artisanale",
        paragraphs: [
          "La pêche est principalement artisanale : pirogues, filets et lignes. Des communautés entières vivent de la pêche le long du fleuve et des lacs.",
          "Le poisson fumé et séché est transporté vers les villes. Kinshasa consomme d'énormes quantités de poisson en provenance du fleuve et des provinces.",
        ],
      },
    ],
    timeline: [
      { date: "Préhistoire", event: "Pêche traditionnelle" },
      { date: "1960s", event: "Développement pêche commerciale" },
      { date: "2000s", event: "Surpêche et dégradation" },
    ],
    facts: [
      { label: "Espèces", value: ">700 dans le fleuve Congo" },
      { label: "Poissons phares", value: "Tilapia, kapenta, capitaine" },
      { label: "Mode", value: "Artisanal dominant" },
      { label: "Lacs", value: "Tanganyika, Kivu, Édouard" },
    ],
    tags: ["pêche", "poisson", "fleuve", "lacs", "économie", "alimentation", "rdc"],
    relatedSlugs: ["fleuve-congo", "lac-tanganyika", "lac-kivu"],
    quality: "standard",
  },
  {
    slug: "immobilier-kinshasa",
    title: "Immobilier à Kinshasa",
    subtitle: "Boom construction · Gombe · logement",
    category: "économie",
    summary: "Le secteur immobilier de Kinshasa connaît un boom depuis les années 2000. La Gombe (centre des affaires) et les communes résidentielles (Ngaliema, Limete, Kintambo) voient émerger des immeubles modernes, des résidences sécurisées et des centres commerciaux.",
    body: [],
    sections: [
      {
        heading: "Marché et acteurs",
        paragraphs: [
          "Le marché immobilier kinois est dominé par des promoteurs privés congolais, libanais, indiens et chinois. Des sociétés comme Immocongo, des promoteurs diasporiques et des investisseurs étrangers construisent appartements, villas et bureaux.",
          "Les prix à la Gombe sont parmi les plus élevés d'Afrique subsaharienne, comparables à Nairobi ou Lagos. Un appartement de standing peut coûter plusieurs milliers de dollars par mois.",
        ],
      },
      {
        heading: "Défis du logement",
        paragraphs: [
          "La majorité des Kinois vivent dans des logements informels (bidonvilles, maisons en matériaux précaires). Le déficit de logements abordables est estimé à plusieurs millions d'unités.",
          "Des projets de logements sociaux sont annoncés régulièrement mais rarement réalisés à grande échelle.",
        ],
      },
    ],
    timeline: [
      { date: "2000s", event: "Début boom immobilier" },
      { date: "2010s", event: "Centres commerciaux · immeubles de bureaux" },
      { date: "2020s", event: "Expansion vers Ngaliema et Limete" },
    ],
    facts: [
      { label: "Hub", value: "Gombe · Kinshasa" },
      { label: "Acteurs", value: "Promoteurs congolais, libanais, chinois" },
      { label: "Déficit logement", value: "Plusieurs millions d'unités" },
    ],
    tags: ["immobilier", "kinshasa", "construction", "logement", "gombe", "économie"],
    relatedSlugs: ["kinshasa", "cimenterie-nationale", "barrage-inga"],
    quality: "standard",
  },
  {
    slug: "port-matadi",
    title: "Port de Matadi",
    subtitle: "Principal port maritime · Kongo Central",
    category: "lieu",
    summary: "Le port de Matadi est le principal port maritime de la RDC. Situé sur le fleuve Congo à 148 km de l'Atlantique, il est le point d'entrée de la majorité des importations du pays et d'exportation des minerais et produits agricoles.",
    body: [],
    sections: [
      {
        heading: "Infrastructure",
        paragraphs: [
          "Le port dispose de quais, entrepôts, grues et terminaux à conteneurs. Il est géré par la SCTP (Société commerciale des transports et des ports).",
          "Sa capacité est limitée par les rapides du fleuve en aval (Livingstone Falls) qui empêchent les grands navires de remonter jusqu'à Kinshasa.",
        ],
      },
      {
        heading: "Rôle économique",
        paragraphs: [
          "Matadi traite des millions de tonnes de marchandises par an : produits alimentaires, carburant, matériaux de construction, véhicules et équipements.",
          "Les exportations comprennent minerais (cuivre, cobalt), bois, café et produits agricoles. Le port est relié à Kinshasa par la route nationale 1 et le chemin de fer Matadi-Kinshasa.",
        ],
      },
    ],
    timeline: [
      { date: "1898", event: "Construction chemin de fer Matadi-Léopoldville" },
      { date: "1960", event: "Port national à l'indépendance" },
      { date: "2000s", event: "Modernisation partielle" },
    ],
    facts: [
      { label: "Ville", value: "Matadi · Kongo Central" },
      { label: "Distance Atlantique", value: "148 km" },
      { label: "Gestionnaire", value: "SCTP" },
      { label: "Liaison", value: "RN1 · chemin de fer" },
    ],
    tags: ["matadi", "port", "commerce", "import", "export", "kongo central"],
    relatedSlugs: ["matadi", "route-nationale-1", "commerce-transfrontalier"],
    quality: "bon article",
  },
  {
    slug: "chemin-de-fer-rdc",
    title: "Chemins de fer en RDC",
    subtitle: "SNCC · réseau · Katanga · Matadi",
    category: "économie",
    summary: "La RDC dispose d'un réseau ferroviaire de plus de 5 000 km, héritage de la colonisation. La Société nationale des chemins de fer du Congo (SNCC) gère les lignes du Katanga et de l'Est, tandis que le chemin de fer Matadi-Kinshasa relie le port à la capitale.",
    body: [],
    sections: [
      {
        heading: "Réseau et lignes",
        paragraphs: [
          "Le réseau ferroviaire congolais comprend plusieurs lignes : Matadi-Kinshasa (366 km), le réseau katangais (Lubumbashi-Kolwezi-Kalemie), et des lignes dans le Kasaï et le Kivu.",
          "Le chemin de fer Matadi-Kinshasa, construit entre 1890 et 1898, est l'une des premières lignes d'Afrique centrale. Il contourne les rapides du fleuve Congo.",
        ],
      },
      {
        heading: "État et défis",
        paragraphs: [
          "Le réseau est en mauvais état : rails usés, locomotives vieillissantes, ponts dégradés. La SNCC est déficitaire et peine à assurer un service régulier.",
          "Des projets de réhabilitation avec financement chinois et européen sont en cours pour certaines lignes stratégiques.",
        ],
      },
    ],
    timeline: [
      { date: "1898", event: "Inauguration Matadi-Léopoldville" },
      { date: "1910s", event: "Extension réseau katangais" },
      { date: "1960", event: "Nationalisation · SNCC" },
      { date: "2000s", event: "Dégradation · projets réhabilitation" },
    ],
    facts: [
      { label: "Réseau", value: ">5 000 km" },
      { label: "Gestionnaire", value: "SNCC" },
      { label: "Ligne historique", value: "Matadi-Kinshasa (366 km)" },
      { label: "État", value: "Dégradé · réhabilitation en cours" },
    ],
    tags: ["chemin de fer", "sncc", "transport", "matadi", "katanga", "infrastructure"],
    relatedSlugs: ["port-matadi", "lubumbashi", "route-nationale-1"],
    quality: "standard",
  },
];
