import type { AyebiArticle } from "./types";

export const MODERNISATION_ARTICLES: AyebiArticle[] = [
  {
    slug: "telecoms-rdc",
    title: "Télécommunications en RDC",
    subtitle: "Vodacom · Airtel · Orange · mobile money",
    category: "économie",
    summary:
      "Le secteur des télécommunications est l'un des plus dynamiques de la RDC. Avec plus de 50 millions d'abonnés mobiles, les opérateurs Vodacom, Airtel et Orange dominent un marché en forte croissance, porteur de mobile money et d'accès à internet.",
    body: [],
    sections: [
      {
        heading: "Opérateurs et couverture",
        paragraphs: [
          "Vodacom Congo, filiale du groupe sud-africain Vodacom, est le premier opérateur par le nombre d'abonnés. Airtel Congo (groupe indien Bharti Airtel) et Orange RDC complètent le trio dominant. Africell opère également dans certaines zones.",
          "La couverture réseau progresse mais reste inégale : les grandes villes (Kinshasa, Lubumbashi, Goma) ont accès à la 4G, tandis que de nombreuses zones rurales n'ont que la 2G ou aucune couverture.",
          "L'ARPTC (Autorité de régulation des postes et télécommunications du Congo) régule le secteur, attribue les licences et fixe les obligations de couverture.",
        ],
      },
      {
        heading: "Mobile money",
        paragraphs: [
          "Le mobile money est une révolution financière en RDC. M-Pesa (Vodacom), Airtel Money et Orange Money permettent transferts d'argent, paiements de factures, retraits et dépôts via téléphone.",
          "Des millions de Congolais non bancarisés accèdent ainsi aux services financiers. Le mobile money est utilisé pour payer l'électricité (SNEL), l'eau (REGIDESO), les frais scolaires et les achats au marché.",
          "Le volume de transactions mobile money en RDC dépasse plusieurs milliards de dollars par an, faisant du pays l'un des marchés les plus actifs d'Afrique subsaharienne.",
        ],
      },
      {
        heading: "Internet et numérique",
        paragraphs: [
          "Le taux de pénétration d'internet reste faible (~20%) mais croît rapidement. Les smartphones d'entrée de gamme (Tecno, Itel, Samsung) démocratisent l'accès.",
          "YouTube, WhatsApp et Facebook sont les plateformes les plus utilisées. Une scène de créateurs de contenu en lingala émerge avec des millions de vues.",
          "La fibre optique se déploie progressivement dans les grandes villes. Des câbles sous-marins (WACS, SAT-3) relient la RDC au réseau mondial via Matadi.",
        ],
      },
      {
        heading: "Défis et perspectives",
        paragraphs: [
          "Les coûts de connexion restent élevés par rapport aux revenus. La qualité du réseau est variable. La cybersécurité et la protection des données sont des enjeux émergents.",
          "Le gouvernement a lancé des initiatives de digitalisation des services publics : e-gouvernement, identité numérique et paiements électroniques des impôts.",
        ],
      },
    ],
    timeline: [
      { date: "1999", event: "Premières licences mobiles GSM" },
      { date: "2012", event: "Lancement M-Pesa Congo" },
      { date: "2016", event: "Déploiement 4G à Kinshasa" },
      { date: "2020s", event: "Boom mobile money et internet" },
    ],
    facts: [
      { label: "Abonnés mobiles", value: ">50 millions" },
      { label: "Opérateurs", value: "Vodacom, Airtel, Orange, Africell" },
      { label: "Mobile money", value: "M-Pesa, Airtel Money, Orange Money" },
      { label: "Régulateur", value: "ARPTC" },
      { label: "Pénétration internet", value: "~20%" },
    ],
    tags: ["télécoms", "mobile", "vodacom", "airtel", "orange", "mpesa", "internet", "rdc"],
    relatedSlugs: ["mobile-money-rdc", "arsp", "kinshasa", "devalpha"],
    quality: "bon article",
  },
  {
    slug: "startup-ecosystem-rdc",
    title: "Écosystème startup en RDC",
    subtitle: "Tech · fintech · Kinshasa · innovation",
    category: "économie",
    summary:
      "L'écosystème des startups congolaises est en pleine émergence. Kinshasa concentre la majorité des initiatives tech : fintech, agritech, edtech et e-commerce. Des incubateurs, accélérateurs et investisseurs commencent à structurer cet écosystème.",
    body: [],
    sections: [
      {
        heading: "Acteurs et initiatives",
        paragraphs: [
          "Des startups comme Konga (e-commerce), Bboxx (énergie solaire), Cevital et des dizaines d'autres tentent de résoudre des problèmes locaux avec des solutions numériques.",
          "Des espaces de coworking et incubateurs émergent à Kinshasa : CTIC Congo, Impact Hub Kinshasa et des initiatives universitaires. Ces espaces offrent formation, mentorat et mise en réseau.",
          "DevAlpha est l'une des agences tech les plus actives, développant des produits comme Ayeba, Jemsa, TALA et SombaTeka pour le marché congolais.",
        ],
      },
      {
        heading: "Fintech et paiements",
        paragraphs: [
          "La fintech est le secteur le plus actif. Des startups développent des solutions de paiement, de crédit mobile et d'épargne pour les populations non bancarisées.",
          "L'intégration avec les APIs des opérateurs mobiles (Vodacom, Airtel) permet de créer des services financiers accessibles sans compte bancaire traditionnel.",
        ],
      },
      {
        heading: "Défis",
        paragraphs: [
          "Les principaux obstacles sont : accès limité au financement, infrastructure électrique défaillante, coût élevé d'internet, cadre réglementaire incertain et marché fragmenté.",
          "La diaspora congolaise joue un rôle croissant : des entrepreneurs formés à l'étranger reviennent avec capital, réseau et expertise pour lancer des startups.",
        ],
      },
    ],
    timeline: [
      { date: "2010s", event: "Premières startups tech à Kinshasa" },
      { date: "2015", event: "Ouverture premiers incubateurs" },
      { date: "2020", event: "Accélération post-COVID · digital" },
      { date: "2024", event: "Écosystème en structuration" },
    ],
    facts: [
      { label: "Hub principal", value: "Kinshasa" },
      { label: "Secteurs", value: "Fintech, edtech, agritech, e-commerce" },
      { label: "Incubateurs", value: "CTIC Congo, Impact Hub" },
      { label: "Acteur notable", value: "DevAlpha" },
    ],
    tags: ["startup", "tech", "fintech", "innovation", "kinshasa", "numérique", "rdc"],
    relatedSlugs: ["telecoms-rdc", "mobile-money-rdc", "devalpha", "jemsa"],
    quality: "standard",
  },
  {
    slug: "barrage-inga",
    title: "Barrage d'Inga",
    subtitle: "Hydroélectricité · fleuve Congo · Inga III",
    category: "économie",
    summary:
      "Le site d'Inga sur le fleuve Congo possède le plus grand potentiel hydroélectrique du monde. Inga I (1972) et Inga II (1982) produisent déjà de l'électricité. Le projet Grand Inga (Inga III) pourrait alimenter toute l'Afrique, mais reste bloqué par des défis financiers et politiques.",
    body: [],
    sections: [
      {
        heading: "Potentiel et installations existantes",
        paragraphs: [
          "Le site d'Inga est situé à 225 km en aval de Kinshasa, dans le Kongo Central. Le fleuve Congo y chute de 96 mètres sur 15 km, créant un potentiel hydroélectrique estimé à 100 000 MW — le plus grand au monde.",
          "Inga I (351 MW, 1972) et Inga II (1 424 MW, 1982) sont gérés par la SNEL. Leur production réelle est bien inférieure à leur capacité nominale en raison du manque d'entretien.",
        ],
      },
      {
        heading: "Projet Grand Inga",
        paragraphs: [
          "Le projet Grand Inga (Inga III) prévoit une capacité de 11 000 MW dans une première phase, extensible à 40 000 MW. Il alimenterait la RDC, l'Afrique du Sud, l'Afrique de l'Est et l'Afrique du Nord.",
          "Des négociations avec des consortiums internationaux (espagnol, chinois) ont avancé puis reculé. Le financement (estimé à 14 milliards de dollars pour la première phase) et les questions de gouvernance restent des obstacles majeurs.",
        ],
      },
      {
        heading: "Enjeux et critiques",
        paragraphs: [
          "Des ONG critiquent le projet : déplacements de populations, impact environnemental et risque que l'électricité profite surtout aux mines et à l'export plutôt qu'aux ménages congolais.",
          "Seulement 19% des Congolais ont accès à l'électricité. Des solutions décentralisées (solaire, mini-réseaux) complètent les grands projets pour l'électrification rurale.",
        ],
      },
    ],
    timeline: [
      { date: "1972", event: "Mise en service Inga I" },
      { date: "1982", event: "Mise en service Inga II" },
      { date: "2013", event: "Accord de développement Grand Inga" },
      { date: "2020s", event: "Négociations en cours · financement incertain" },
    ],
    facts: [
      { label: "Localisation", value: "Kongo Central · 225 km de Kinshasa" },
      { label: "Inga I", value: "351 MW (1972)" },
      { label: "Inga II", value: "1 424 MW (1982)" },
      { label: "Potentiel Grand Inga", value: "~40 000 MW" },
      { label: "Gestionnaire", value: "SNEL" },
    ],
    tags: ["inga", "barrage", "hydroélectricité", "énergie", "fleuve congo", "snel"],
    relatedSlugs: ["snel", "fleuve-congo", "infrastructure-innga", "kongo-central"],
    quality: "bon article",
  },
  {
    slug: "rawbank",
    title: "Rawbank",
    subtitle: "Première banque privée · RDC · Kinshasa",
    category: "économie",
    summary:
      "Rawbank est la première banque commerciale privée de la RDC par le total des actifs. Fondée en 2002, elle offre des services bancaires aux entreprises et aux particuliers, avec un réseau d'agences dans tout le pays et des services digitaux en croissance.",
    body: [],
    sections: [
      {
        heading: "Histoire et développement",
        paragraphs: [
          "Rawbank est fondée en 2002 par la famille Rawji, d'origine indienne établie au Congo depuis plusieurs générations. Elle se développe rapidement pour devenir la première banque privée du pays.",
          "La banque obtient plusieurs certifications internationales et noue des partenariats avec des institutions financières mondiales (IFC, FMO, Proparco).",
        ],
      },
      {
        heading: "Services et innovation",
        paragraphs: [
          "Rawbank propose des services aux entreprises (financement du commerce, crédit investissement) et aux particuliers (comptes, cartes, crédits). Son application mobile Rawbank App permet la gestion des comptes en ligne.",
          "La banque est pionnière dans la digitalisation bancaire en RDC : internet banking, mobile banking et partenariats avec les opérateurs de mobile money.",
        ],
      },
      {
        heading: "Rôle économique",
        paragraphs: [
          "Rawbank finance des projets dans les secteurs minier, agricole, immobilier et commercial. Elle joue un rôle clé dans le financement des PME congolaises.",
          "Le secteur bancaire congolais reste peu développé : moins de 10% de la population a un compte bancaire. Les banques comme Rawbank, Equity BCDC et TMB travaillent à l'inclusion financière.",
        ],
      },
    ],
    timeline: [
      { date: "2002", event: "Fondation de Rawbank" },
      { date: "2010s", event: "Expansion réseau national" },
      { date: "2015", event: "Partenariats IFC et institutions internationales" },
      { date: "2020s", event: "Digitalisation et mobile banking" },
    ],
    facts: [
      { label: "Fondation", value: "2002" },
      { label: "Fondateurs", value: "Famille Rawji" },
      { label: "Siège", value: "Kinshasa" },
      { label: "Rang", value: "1ère banque privée RDC" },
      { label: "Partenaires", value: "IFC, FMO, Proparco" },
    ],
    tags: ["rawbank", "banque", "finance", "kinshasa", "économie", "rdc"],
    relatedSlugs: ["banque-centrale-congo", "mobile-money-rdc", "franc-congolais"],
    quality: "standard",
  },
  {
    slug: "vodacom-congo",
    title: "Vodacom Congo",
    subtitle: "Premier opérateur mobile · M-Pesa",
    category: "économie",
    summary:
      "Vodacom Congo est le premier opérateur de téléphonie mobile de la RDC par le nombre d'abonnés. Filiale du groupe Vodacom (Afrique du Sud), il opère depuis 1999 et a lancé M-Pesa, le service de mobile money le plus utilisé du pays.",
    body: [],
    sections: [
      {
        heading: "Présence et réseau",
        paragraphs: [
          "Vodacom Congo couvre les principales villes et axes routiers du pays. Son réseau 4G est disponible à Kinshasa, Lubumbashi, Goma et d'autres grandes villes.",
          "L'entreprise emploie des milliers de personnes directement et indirectement (revendeurs, agents M-Pesa).",
        ],
      },
      {
        heading: "M-Pesa",
        paragraphs: [
          "M-Pesa, lancé en 2012, est le service de mobile money de Vodacom Congo. Il permet transferts d'argent, paiements de factures, retraits et dépôts via un réseau d'agents.",
          "M-Pesa est utilisé par des millions de Congolais pour payer l'électricité, les frais scolaires, les achats et envoyer de l'argent en province.",
        ],
      },
    ],
    timeline: [
      { date: "1999", event: "Lancement de Vodacom Congo" },
      { date: "2012", event: "Lancement M-Pesa" },
      { date: "2016", event: "Déploiement 4G" },
      { date: "2020s", event: "Expansion services digitaux" },
    ],
    facts: [
      { label: "Groupe", value: "Vodacom (Afrique du Sud)" },
      { label: "Lancement", value: "1999" },
      { label: "Mobile money", value: "M-Pesa" },
      { label: "Réseau", value: "2G, 3G, 4G" },
    ],
    tags: ["vodacom", "mobile", "mpesa", "télécoms", "rdc", "kinshasa"],
    relatedSlugs: ["telecoms-rdc", "mobile-money-rdc", "airtel-congo"],
    quality: "standard",
  },
  {
    slug: "airtel-congo",
    title: "Airtel Congo",
    subtitle: "Opérateur mobile · Airtel Money",
    category: "économie",
    summary:
      "Airtel Congo est le deuxième opérateur mobile de la RDC. Filiale du groupe indien Bharti Airtel, il propose des services voix, data et Airtel Money (mobile money) dans tout le pays.",
    body: [],
    sections: [
      {
        heading: "Présence",
        paragraphs: [
          "Airtel Congo opère depuis le début des années 2000. Son réseau couvre les grandes villes et de nombreuses zones rurales.",
          "Airtel Money est le deuxième service de mobile money du pays, utilisé pour transferts, paiements et épargne.",
        ],
      },
      {
        heading: "Concurrence et innovation",
        paragraphs: [
          "La concurrence entre Vodacom, Airtel et Orange a fait baisser les prix et améliorer la qualité des services.",
          "Airtel investit dans la 4G et les services data pour répondre à la demande croissante d'internet mobile.",
        ],
      },
    ],
    timeline: [
      { date: "2000s", event: "Lancement Airtel Congo" },
      { date: "2010s", event: "Lancement Airtel Money" },
      { date: "2020s", event: "Expansion 4G" },
    ],
    facts: [
      { label: "Groupe", value: "Bharti Airtel (Inde)" },
      { label: "Mobile money", value: "Airtel Money" },
      { label: "Rang", value: "2e opérateur RDC" },
    ],
    tags: ["airtel", "mobile", "télécoms", "rdc", "airtel money"],
    relatedSlugs: ["telecoms-rdc", "vodacom-congo", "mobile-money-rdc"],
    quality: "standard",
  },
  {
    slug: "energie-solaire-rdc",
    title: "Énergie solaire en RDC",
    subtitle: "Électrification rurale · off-grid · solaire",
    category: "économie",
    summary:
      "Face au déficit électrique chronique (moins de 20% de la population raccordée), l'énergie solaire se développe rapidement en RDC. Des entreprises comme Bboxx, Nuru et des initiatives gouvernementales déploient des kits solaires et mini-réseaux dans les zones rurales.",
    body: [],
    sections: [
      {
        heading: "Contexte énergétique",
        paragraphs: [
          "La RDC possède le plus grand potentiel hydroélectrique d'Afrique mais seulement 19% de sa population a accès à l'électricité. Les coupures sont fréquentes même dans les grandes villes.",
          "Le solaire off-grid (hors réseau) est une solution rapide et décentralisée pour les zones rurales et périurbaines non desservies par la SNEL.",
        ],
      },
      {
        heading: "Acteurs et solutions",
        paragraphs: [
          "Bboxx, entreprise britannique, déploie des kits solaires pay-as-you-go dans plusieurs provinces. Nuru opère à Goma avec un mini-réseau solaire alimentant des milliers de foyers.",
          "Des entrepreneurs locaux distribuent des lampes solaires et petits kits dans les marchés. Le prix des panneaux solaires a chuté de 90% en dix ans, rendant la technologie accessible.",
        ],
      },
      {
        heading: "Perspectives",
        paragraphs: [
          "Le gouvernement a fixé un objectif d'électrification universelle à l'horizon 2030. Des financements de la Banque mondiale, de l'UE et de bailleurs bilatéraux soutiennent des projets d'électrification rurale.",
          "La combinaison solaire + mobile money (paiement des kits via M-Pesa) crée un modèle économique viable pour l'électrification des zones reculées.",
        ],
      },
    ],
    timeline: [
      { date: "2010s", event: "Premiers déploiements solaires off-grid" },
      { date: "2015", event: "Bboxx et Nuru s'installent en RDC" },
      { date: "2020s", event: "Accélération · financement international" },
    ],
    facts: [
      { label: "Accès électricité", value: "~19% population" },
      { label: "Acteurs", value: "Bboxx, Nuru, entrepreneurs locaux" },
      { label: "Modèle", value: "Pay-as-you-go · mobile money" },
      { label: "Objectif", value: "Électrification universelle 2030" },
    ],
    tags: ["solaire", "énergie", "électrification", "off-grid", "rdc", "bboxx", "nuru"],
    relatedSlugs: ["barrage-inga", "snel", "mobile-money-rdc"],
    quality: "standard",
  },
  {
    slug: "route-nationale-1",
    title: "Route nationale 1 (RN1)",
    subtitle: "Kinshasa–Matadi · axe vital",
    category: "lieu",
    summary:
      "La Route nationale 1 relie Kinshasa à Matadi (port principal) sur 365 km. C'est l'axe routier le plus stratégique du pays : il assure l'approvisionnement de la capitale en produits importés et l'export des marchandises vers l'Atlantique.",
    body: [],
    sections: [
      {
        heading: "Importance stratégique",
        paragraphs: [
          "La RN1 est la seule route asphaltée reliant Kinshasa au port de Matadi. Tous les conteneurs importés (produits alimentaires, carburant, matériaux) transitent par cet axe.",
          "La route traverse le Kongo Central, région de collines et de forêts. Elle est régulièrement endommagée par les pluies et les surcharges des camions.",
        ],
      },
      {
        heading: "Réhabilitation et défis",
        paragraphs: [
          "Des projets de réhabilitation financés par la Banque mondiale, la Chine et l'UE ont amélioré certains tronçons. Mais l'entretien reste insuffisant.",
          "Les embouteillages à l'entrée de Kinshasa (Kinsuka, Maluku) et les péages informels ralentissent le trafic et augmentent les coûts logistiques.",
        ],
      },
    ],
    timeline: [
      { date: "Époque coloniale", event: "Construction de la route" },
      { date: "2000s", event: "Dégradation avancée" },
      { date: "2010s", event: "Réhabilitation partielle" },
    ],
    facts: [
      { label: "Longueur", value: "365 km" },
      { label: "Trajet", value: "Kinshasa — Matadi" },
      { label: "Province", value: "Kinshasa, Kongo Central" },
      { label: "Importance", value: "Axe d'approvisionnement principal" },
    ],
    tags: ["route", "rn1", "kinshasa", "matadi", "infrastructure", "transport"],
    relatedSlugs: ["matadi", "kinshasa", "commerce-transfrontalier"],
    quality: "standard",
  },
];
