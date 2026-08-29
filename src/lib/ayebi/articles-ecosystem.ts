import type { AyebiArticle } from "./types";

/** Fiches Ayebi — apps de l’accueil Ayeba (style encyclopédie, contenu vérifié sur les sites). */
export const ECOSYSTEM_ARTICLES: AyebiArticle[] = [
  {
    slug: "jemsa",
    title: "Jemsa",
    subtitle: "Réseau social & plateforme éducative · RDC",
    category: "institution",
    summary:
      "Jemsa est un réseau social et une plateforme éducative congolaise. Elle met en relation étudiants, universités, écoles, tuteurs, auteurs et entreprises autour du savoir, de l’emploi et de la culture de la RDC.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "Jemsa (jemsa.net) se présente comme « le réseau du savoir en RDC ». La plateforme permet de créer un profil, de partager des connaissances, de trouver un tuteur ou un associé, de découvrir des livres et des auteurs, de rejoindre une université ou de postuler à un emploi — à Kinshasa et dans les provinces.",
          "L’inscription est gratuite et ne requiert pas de carte bancaire. Les établissements peuvent également s’inscrire pour gérer programmes et communautés étudiantes.",
        ],
      },
      {
        heading: "Publics et usages",
        paragraphs: [
          "Étudiants et apprenants accèdent à des ressources, des mentors et un réseau professionnel naissant.",
          "Institutions éducatives (universités, écoles, centres de formation) utilisent Jemsa pour leur visibilité et la gestion de leurs communautés.",
          "Professionnels et entreprises y recrutent, partagent leur expertise et développent leur réseau.",
        ],
      },
      {
        heading: "Contenus RDC",
        paragraphs: [
          "Jemsa propose des rubriques éducatives ouvertes sur la République démocratique du Congo : culture et traditions, histoire, géographie, arts et musique congolaise, cuisine, langues nationales (lingala, swahili…), carte interactive du pays.",
          "Ces contenus positionnent Jemsa comme hub éducatif et culturel en plus du volet social.",
        ],
      },
    ],
    timeline: [
      { date: "2020s", event: "Lancement de la plateforme jemsa.net" },
      { date: "2024", event: "Extension contenus éducatifs RDC (culture, histoire, langues)" },
    ],
    facts: [
      { label: "Site", value: "jemsa.net" },
      { label: "Type", value: "Réseau social · éducation" },
      { label: "Pays", value: "République démocratique du Congo" },
      { label: "Langues", value: "Français, contenus lingala / swahili" },
      { label: "Inscription", value: "Gratuite" },
      { label: "Éditeur", value: "DevAlpha" },
    ],
    tags: ["jemsa", "éducation", "réseau social", "rdc", "congo", "kinshasa", "université"],
    relatedSlugs: ["kinshasa", "unikin", "devalpha", "tala"],
  },
  {
    slug: "tala",
    title: "TALA",
    subtitle: "Streaming vidéo congolais · to-tala.com",
    category: "culture",
    summary:
      "TALA est une plateforme de streaming vidéo orientée vers le public congolais. Films, séries, musique, sport, éducation, actualités, culture, comédie et formats courts y sont proposés sur to-tala.com.",
    body: [],
    sections: [
      {
        heading: "Offre de contenus",
        paragraphs: [
          "TALA organise son catalogue par catégories : films, séries, divertissement, musique, sport, éducation, actualités, culture, comédie et shorts. L’interface propose un fil personnalisé après connexion.",
          "La plateforme vise un public francophone congolais et diasporique, avec une navigation pensée pour mobile et desktop.",
        ],
      },
      {
        heading: "Accès",
        paragraphs: [
          "Les visiteurs peuvent parcourir le catalogue sur to-tala.com. L’inscription et la connexion permettent d’accéder au fil et aux fonctionnalités utilisateur (historique, profil).",
          "TALA se positionne comme alternative locale aux grandes plateformes internationales de streaming, avec une ligne éditoriale congolaise.",
        ],
      },
    ],
    timeline: [{ date: "2020s", event: "Mise en ligne de to-tala.com" }],
    facts: [
      { label: "Site", value: "to-tala.com" },
      { label: "Type", value: "Streaming vidéo" },
      { label: "Public", value: "RDC · diaspora congolaise" },
      { label: "Formats", value: "Films, séries, shorts, live" },
      { label: "Éditeur", value: "DevAlpha" },
    ],
    tags: ["tala", "streaming", "vidéo", "films", "séries", "congo", "rdc", "to-tala"],
    relatedSlugs: ["cinema-congolais", "rumba-congolaise", "jemsa", "omega"],
  },
  {
    slug: "sombateka",
    title: "SombaTeka",
    subtitle: "Marketplace premium · RDC",
    category: "économie",
    summary:
      "SombaTeka Online est une marketplace premium en République démocratique du Congo. La plateforme sombatekaonline.com permet l’achat et la vente en ligne de produits et services.",
    body: [],
    sections: [
      {
        heading: "Modèle",
        paragraphs: [
          "SombaTeka se définit comme une marketplace « premium » pour la RDC : mise en relation vendeurs et acheteurs via une vitrine en ligne, avec une expérience orientée confiance et qualité perçue.",
          "La plateforme s’inscrit dans l’essor du e-commerce congolais, aux côtés d’acteurs comme Jumia.cd et des marchés locaux digitalisés.",
        ],
      },
      {
        heading: "Usage",
        paragraphs: [
          "Les utilisateurs consultent le catalogue sur sombatekaonline.com, passent commande et interagissent avec les vendeurs selon les modalités du site.",
          "SombaTeka complète l’écosystème DevAlpha côté commerce, tandis que Jemsa couvre l’éducation et TALA l’audiovisuel.",
        ],
      },
    ],
    timeline: [{ date: "2020s", event: "Lancement SombaTeka Online" }],
    facts: [
      { label: "Site", value: "sombatekaonline.com" },
      { label: "Type", value: "Marketplace · e-commerce" },
      { label: "Pays", value: "République démocratique du Congo" },
      { label: "Devise", value: "Franc congolais (CDF)" },
      { label: "Éditeur", value: "DevAlpha" },
    ],
    tags: ["sombateka", "marketplace", "e-commerce", "achat", "vente", "rdc", "kinshasa"],
    relatedSlugs: ["marche-central-kinshasa", "devalpha", "jemsa"],
  },
  {
    slug: "omega",
    title: "OMEGA",
    subtitle: "Maison de romans · omega-web.org",
    category: "culture",
    summary:
      "OMEGA est une maison de romans. Le catalogue et l’offre Premium sont accessibles sur omega-web.org ; la lecture des ouvrages se fait dans l’application dédiée.",
    body: [],
    sections: [
      {
        heading: "Activité",
        paragraphs: [
          "OMEGA édite et diffuse des romans via son site omega-web.org. Les visiteurs y consultent le catalogue, découvrent les titres disponibles et peuvent souscrire à une formule Premium.",
          "La lecture intégrale des ouvrages est proposée dans l’application Omega, distincte du site vitrine.",
        ],
      },
      {
        heading: "Positionnement",
        paragraphs: [
          "OMEGA se place dans l’édition numérique et la lecture mobile, avec une identité visuelle centrée sur le symbole Ω.",
          "La plateforme vise les lecteurs francophones recherchant des romans accessibles en ligne, avec un modèle catalogue + abonnement.",
        ],
      },
    ],
    timeline: [{ date: "2020s", event: "Ouverture du catalogue omega-web.org" }],
    facts: [
      { label: "Site", value: "omega-web.org" },
      { label: "Type", value: "Édition · romans · lecture numérique" },
      { label: "Offre", value: "Catalogue · Premium · application" },
      { label: "Langue", value: "Français" },
      { label: "Éditeur", value: "DevAlpha" },
    ],
    tags: ["omega", "romans", "livres", "lecture", "édition", "premium", "omega-web"],
    relatedSlugs: ["tala", "jemsa", "devalpha"],
  },
  {
    slug: "devalpha",
    title: "DevAlpha",
    subtitle: "Agence digitale · devalpha1.com",
    category: "institution",
    summary:
      "DevAlpha est une agence de solutions numériques basée en RDC. Elle conçoit et déploie des applications web, mobiles, cloud et IA pour entreprises et institutions, et édite Jemsa, TALA, SombaTeka et OMEGA.",
    body: [],
    sections: [
      {
        heading: "Services",
        paragraphs: [
          "DevAlpha propose le développement web (React, Node.js, TypeScript, GraphQL), le mobile (React Native, Flutter, Swift, Kotlin), le cloud (AWS, Azure, Docker, Kubernetes) et la cybersécurité (audit, tests d’intrusion, conformité).",
          "L’agence accompagne des clients publics et privés sur la transformation digitale, de la conception au déploiement en production.",
        ],
      },
      {
        heading: "Produits édités",
        paragraphs: [
          "DevAlpha développe et maintient plusieurs plateformes grand public : Jemsa (éducation et réseau social), TALA (streaming), SombaTeka (marketplace) et OMEGA (romans numériques), ainsi que le moteur de recherche Ayeba.",
          "Ces produits partagent une infrastructure technique commune et une stratégie orientée marché congolais et africain.",
        ],
      },
    ],
    timeline: [
      { date: "2010s", event: "Création de DevAlpha" },
      { date: "2020s", event: "Lancement Jemsa, TALA, SombaTeka, OMEGA, Ayeba" },
    ],
    facts: [
      { label: "Site", value: "devalpha1.com" },
      { label: "Type", value: "Agence · éditeur logiciel" },
      { label: "Siège", value: "République démocratique du Congo" },
      { label: "Stack", value: "React · Node.js · TypeScript · cloud" },
      { label: "Produits", value: "Jemsa · TALA · SombaTeka · OMEGA · Ayeba" },
    ],
    tags: ["devalpha", "agence", "développement", "web", "mobile", "ia", "rdc"],
    relatedSlugs: ["jemsa", "tala", "sombateka", "omega", "ayeba"],
  },
  {
    slug: "ayeba",
    title: "Ayeba",
    subtitle: "Moteur de recherche · ayeba.app",
    category: "institution",
    summary:
      "Ayeba est un moteur de recherche généraliste avec priorité à la République démocratique du Congo. Il propose recherche web, images, actualités, cartes, shopping, Ayebi (encyclopédie) et Ayeba Studio pour les éditeurs.",
    body: [],
    sections: [
      {
        heading: "Recherche",
        paragraphs: [
          "Ayeba indexe le web mondial tout en boostant les sources locales (.cd, médias congolais, institutions). L’interface propose des onglets Web, Images, Vidéos, News, Maps, Shopping et Communauté.",
          "Le moteur intègre Ayebi pour les réponses encyclopédiques, des données marchés (devises, matières premières) et une expérience multilingue (français prioritaire).",
        ],
      },
      {
        heading: "Compte et écosystème",
        paragraphs: [
          "Un compte Ayeba permet la connexion à Jemsa, TALA, SombaTeka, OMEGA et des applications tierces via OAuth / OpenID.",
          "Ayeba Studio (Radar, Trace, Yield…) offre aux éditeurs des outils d’indexation, de requêtes et de performance — Radar est le premier module disponible.",
        ],
      },
    ],
    timeline: [
      { date: "2020s", event: "Lancement du moteur ayeba.app" },
      { date: "2026", event: "OAuth IdP · Studio · Ayebi enrichi" },
    ],
    facts: [
      { label: "Site", value: "ayeba.app" },
      { label: "Type", value: "Moteur de recherche" },
      { label: "Priorité", value: "RDC · couverture mondiale" },
      { label: "Encyclopédie", value: "Ayebi (/ayebi)" },
      { label: "Éditeur", value: "DevAlpha" },
    ],
    tags: ["ayeba", "recherche", "moteur", "rdc", "congo", "ayebi", "studio"],
    relatedSlugs: ["devalpha", "jemsa", "kinshasa"],
  },
];
