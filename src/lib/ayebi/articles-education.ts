import type { AyebiArticle } from "./types";

export const EDUCATION_ARTICLES: AyebiArticle[] = [
  {
    slug: "unikin-full",
    title: "Université de Kinshasa (UNIKIN)",
    subtitle: "Fondée 1954 · Lemba · première université du pays",
    category: "institution",
    summary: "L'Université de Kinshasa (UNIKIN) est la plus grande et la plus ancienne université publique de la RDC. Fondée en 1954 sous le nom de Lovanium, elle forme juristes, médecins, ingénieurs, économistes et scientifiques depuis plus de 70 ans.",
    body: [],
    sections: [
      {
        heading: "Histoire",
        paragraphs: [
          "L'Université Lovanium est fondée en 1954 par l'Université catholique de Louvain (Belgique) sur le plateau de Lemba, à Kinshasa. C'est la première université d'Afrique subsaharienne francophone.",
          "En 1971, Mobutu nationalise et rebaptise l'université UNIKIN dans le cadre de la politique d'authenticité. Elle intègre l'Université nationale du Zaïre (UNAZA) avec UNILU et UNIKIS.",
          "Après la dissolution de l'UNAZA en 1981, UNIKIN retrouve son autonomie. Elle reste le symbole de l'excellence académique congolaise malgré les crises successives.",
        ],
      },
      {
        heading: "Facultés et formation",
        paragraphs: [
          "UNIKIN compte une vingtaine de facultés : Droit, Médecine, Sciences, Polytechnique, Économie, Lettres, Sciences sociales, Pharmacie, Psychologie, Agronomie, Sciences de l'information et de la communication.",
          "Elle accueille plus de 30 000 étudiants. Ses diplômés occupent les postes clés dans l'administration, la justice, la santé et les entreprises congolaises.",
          "Le campus de Lemba s'étend sur plusieurs dizaines d'hectares avec bibliothèques, laboratoires, hôpital universitaire et résidences étudiantes.",
        ],
      },
      {
        heading: "Recherche et défis",
        paragraphs: [
          "UNIKIN publie des revues académiques et mène des recherches sur les maladies tropicales, les ressources naturelles et les sciences sociales congolaises.",
          "Les défis sont nombreux : surpopulation estudiantine, manque de financement, fuite des cerveaux, infrastructure vieillissante. Des réformes sont en cours pour moderniser les programmes.",
        ],
      },
    ],
    timeline: [
      { date: "1954", event: "Fondation de Lovanium" },
      { date: "1971", event: "Nationalisation · UNIKIN" },
      { date: "1981", event: "Autonomie retrouvée" },
      { date: "2000s", event: "Réformes LMD" },
    ],
    facts: [
      { label: "Fondation", value: "1954" },
      { label: "Campus", value: "Lemba · Kinshasa" },
      { label: "Étudiants", value: ">30 000" },
      { label: "Facultés", value: "~20" },
      { label: "Statut", value: "Université publique" },
    ],
    tags: ["unikin", "université", "kinshasa", "lovanium", "éducation", "lemba"],
    relatedSlugs: ["unilu", "unikis", "kinshasa", "education-rdc"],
    quality: "bon article",
  },
  {
    slug: "unilu-full",
    title: "Université de Lubumbashi (UNILU)",
    subtitle: "Katanga · mines · droit · médecine",
    category: "institution",
    summary: "L'Université de Lubumbashi (UNILU) est la deuxième grande université publique de la RDC. Fondée en 1955, elle est le pôle académique du Katanga, formant ingénieurs des mines, juristes, médecins et économistes pour le sud-est du pays.",
    body: [],
    sections: [
      {
        heading: "Histoire et identité",
        paragraphs: [
          "Fondée en 1955 à Élisabethville (Lubumbashi), l'université est d'abord une extension de Lovanium. Elle devient autonome et prend le nom d'Université officielle du Congo, puis UNILU après 1981.",
          "Sa proximité avec les mines du Katanga lui confère une vocation particulière en géologie, mines et métallurgie. La Faculté Polytechnique est l'une des plus réputées du pays.",
        ],
      },
      {
        heading: "Facultés et recherche",
        paragraphs: [
          "UNILU comprend les facultés de Droit, Médecine, Sciences, Polytechnique, Lettres, Sciences sociales, Économie et Agronomie.",
          "Ses chercheurs travaillent sur la géologie du Katanga, les maladies tropicales, le droit minier et les sciences de l'environnement. Des partenariats avec des universités belges, françaises et canadiennes enrichissent la recherche.",
        ],
      },
    ],
    timeline: [
      { date: "1955", event: "Fondation à Élisabethville" },
      { date: "1971", event: "Intégration UNAZA" },
      { date: "1981", event: "UNILU autonome" },
    ],
    facts: [
      { label: "Fondation", value: "1955" },
      { label: "Ville", value: "Lubumbashi" },
      { label: "Spécialité", value: "Mines, droit, médecine" },
      { label: "Statut", value: "Université publique" },
    ],
    tags: ["unilu", "université", "lubumbashi", "katanga", "mines", "éducation"],
    relatedSlugs: ["unikin-full", "lubumbashi", "gecamines-full"],
    quality: "standard",
  },
  {
    slug: "unikis",
    title: "Université de Kisangani (UNIKIS)",
    subtitle: "Tshopo · forêt · sciences naturelles",
    category: "institution",
    summary: "L'Université de Kisangani (UNIKIS) est la troisième grande université publique de la RDC. Située au cœur de la forêt équatoriale, elle est reconnue pour ses recherches en sciences naturelles, biodiversité et développement durable.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "Fondée en 1963, UNIKIS est implantée à Kisangani, carrefour fluvial de l'Est intérieur. Elle forme des cadres pour les provinces de la Tshopo, du Maniema et de l'Ituri.",
          "La Faculté des Sciences et la Faculté de Gestion des Ressources naturelles et de l'Environnement sont ses fleurons, en lien avec la forêt équatoriale environnante.",
        ],
      },
    ],
    timeline: [
      { date: "1963", event: "Fondation" },
      { date: "1981", event: "Autonomie post-UNAZA" },
    ],
    facts: [
      { label: "Fondation", value: "1963" },
      { label: "Ville", value: "Kisangani" },
      { label: "Spécialité", value: "Sciences naturelles, forêt" },
    ],
    tags: ["unikis", "université", "kisangani", "forêt", "éducation"],
    relatedSlugs: ["unikin-full", "kisangani", "foret-congo"],
    quality: "standard",
  },
  {
    slug: "ucb-bukavu",
    title: "Université Catholique de Bukavu (UCB)",
    subtitle: "Sud-Kivu · Bukavu · catholique",
    category: "institution",
    summary: "L'Université Catholique de Bukavu (UCB) est l'une des principales universités privées de la RDC. Fondée par le diocèse de Bukavu, elle forme des cadres pour le Kivu et l'Est du pays dans un contexte de post-conflit.",
    body: [],
    sections: [
      {
        heading: "Mission et facultés",
        paragraphs: [
          "L'UCB propose des formations en Droit, Médecine, Sciences économiques, Agronomie et Sciences de l'information. Elle accueille des étudiants du Sud-Kivu, du Nord-Kivu et du Maniema.",
          "L'université est engagée dans la reconstruction post-conflit : recherche sur la paix, les droits humains et le développement local du Kivu.",
        ],
      },
    ],
    timeline: [
      { date: "1989", event: "Fondation par le diocèse de Bukavu" },
      { date: "2000s", event: "Expansion facultés" },
    ],
    facts: [
      { label: "Ville", value: "Bukavu" },
      { label: "Type", value: "Université catholique privée" },
      { label: "Province", value: "Sud-Kivu" },
    ],
    tags: ["ucb", "université", "bukavu", "catholique", "kivu", "éducation"],
    relatedSlugs: ["bukavu", "kivu-region", "denis-mukwege"],
    quality: "standard",
  },
  {
    slug: "ulpgl-goma",
    title: "Université Libre des Pays des Grands Lacs (ULPGL)",
    subtitle: "Goma · Nord-Kivu · privée",
    category: "institution",
    summary: "L'ULPGL est une université privée basée à Goma, capitale du Nord-Kivu. Elle forme des cadres dans un contexte de reconstruction et de développement de l'Est congolais, avec des facultés de droit, médecine, sciences et gestion.",
    body: [],
    sections: [
      {
        heading: "Contexte et mission",
        paragraphs: [
          "Fondée dans les années 1990, l'ULPGL répond au besoin d'enseignement supérieur dans une région marquée par les conflits. Elle accueille des étudiants de Goma, Rutshuru, Beni et des zones environnantes.",
          "L'université collabore avec des ONG et institutions internationales sur des projets de recherche liés à la paix, la santé et le développement.",
        ],
      },
    ],
    timeline: [
      { date: "1990s", event: "Fondation à Goma" },
    ],
    facts: [
      { label: "Ville", value: "Goma" },
      { label: "Province", value: "Nord-Kivu" },
      { label: "Type", value: "Université privée" },
    ],
    tags: ["ulpgl", "université", "goma", "nord-kivu", "éducation"],
    relatedSlugs: ["goma", "kivu-region"],
    quality: "standard",
  },
  {
    slug: "education-rdc",
    title: "Système éducatif de la RDC",
    subtitle: "École primaire · secondaire · supérieur",
    category: "institution",
    summary: "Le système éducatif congolais couvre l'enseignement primaire (6 ans), secondaire (6 ans) et supérieur. Géré conjointement par l'État et les Églises (catholique, protestante, kimbanguiste), il scolarise des millions d'élèves malgré des défis majeurs de financement et de qualité.",
    body: [],
    sections: [
      {
        heading: "Structure du système",
        paragraphs: [
          "L'enseignement primaire dure 6 ans (6–12 ans). Le secondaire est divisé en deux cycles de 3 ans : le premier cycle général, le second cycle avec options (scientifique, littéraire, technique, pédagogique, commerciale).",
          "L'enseignement supérieur comprend universités, instituts supérieurs techniques (IST), instituts supérieurs pédagogiques (ISP) et instituts supérieurs de commerce (ISC).",
          "La gratuité de l'enseignement primaire, instaurée en 2019 par le président Tshisekedi, a provoqué une explosion des inscriptions : plus de 4 millions d'élèves supplémentaires en un an.",
        ],
      },
      {
        heading: "Rôle des Églises",
        paragraphs: [
          "Les Églises catholique, protestante et kimbanguiste gèrent environ 70% des écoles primaires et secondaires. Ce partenariat État-Église est hérité de la colonisation et reste structurant.",
          "Les écoles conventionnées (gérées par les Églises avec financement partiel de l'État) coexistent avec les écoles officielles (État) et les écoles privées laïques.",
        ],
      },
      {
        heading: "Défis",
        paragraphs: [
          "Les défis sont immenses : manque d'enseignants qualifiés, salaires insuffisants, classes surchargées, manque de manuels scolaires et d'infrastructures. Dans les zones de conflit (Est), des écoles sont détruites ou occupées.",
          "Le taux d'alphabétisation est d'environ 77% (hommes) et 60% (femmes). Des programmes d'alphabétisation des adultes sont menés par l'État et les ONG.",
        ],
      },
    ],
    timeline: [
      { date: "1954", event: "Fondation Lovanium (UNIKIN)" },
      { date: "1960", event: "Indépendance · héritage système colonial" },
      { date: "2019", event: "Gratuité enseignement primaire" },
      { date: "2020s", event: "Réformes LMD universités" },
    ],
    facts: [
      { label: "Primaire", value: "6 ans (gratuit depuis 2019)" },
      { label: "Secondaire", value: "6 ans" },
      { label: "Universités publiques", value: "UNIKIN, UNILU, UNIKIS…" },
      { label: "Gestion écoles", value: "État + Églises (70%)" },
      { label: "Alphabétisation", value: "~77% hommes · ~60% femmes" },
    ],
    tags: ["éducation", "école", "université", "rdc", "gratuité", "enseignement"],
    relatedSlugs: ["unikin-full", "unilu-full", "christianisme-rdc"],
    quality: "bon article",
  },
  {
    slug: "isp-kinshasa",
    title: "Institut Supérieur Pédagogique de Kinshasa",
    subtitle: "ISP · formation des enseignants",
    category: "institution",
    summary: "L'Institut Supérieur Pédagogique (ISP) de Kinshasa forme les enseignants du secondaire pour la RDC. Avec plusieurs campus à Kinshasa et en province, il est le principal pourvoyeur de professeurs qualifiés pour le système éducatif congolais.",
    body: [],
    sections: [
      {
        heading: "Mission",
        paragraphs: [
          "L'ISP forme des licenciés en pédagogie appliquée dans toutes les disciplines : mathématiques, physique, chimie, biologie, français, histoire, géographie, anglais.",
          "Les diplômés de l'ISP enseignent dans les écoles secondaires publiques et privées de tout le pays. La formation dure 3 à 4 ans après le diplôme d'État.",
        ],
      },
      {
        heading: "Réseau national",
        paragraphs: [
          "Il existe des ISP dans toutes les grandes villes : Kinshasa, Lubumbashi, Goma, Bukavu, Kisangani, Kananga, Mbuji-Mayi. Ce réseau assure la formation des enseignants dans toutes les provinces.",
        ],
      },
    ],
    timeline: [
      { date: "1961", event: "Création des ISP post-indépendance" },
      { date: "2000s", event: "Réforme des programmes" },
    ],
    facts: [
      { label: "Type", value: "Institut supérieur pédagogique" },
      { label: "Durée", value: "3–4 ans" },
      { label: "Débouchés", value: "Enseignement secondaire" },
      { label: "Réseau", value: "National · toutes provinces" },
    ],
    tags: ["isp", "pédagogie", "enseignants", "éducation", "kinshasa"],
    relatedSlugs: ["education-rdc", "unikin-full"],
    quality: "standard",
  },
  {
    slug: "universite-protestante-congo",
    title: "Université Protestante au Congo (UPC)",
    subtitle: "Kinshasa · protestante · théologie",
    category: "institution",
    summary: "L'Université Protestante au Congo (UPC) est une université privée confessionnelle de Kinshasa. Fondée par l'Église du Christ au Congo (ECC), elle propose des formations en théologie, droit, sciences économiques et gestion.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "L'UPC est l'université de référence du protestantisme congolais. Elle forme des pasteurs, théologiens, juristes et gestionnaires pour les Églises et les organisations de la société civile.",
          "Son campus est situé à Kinshasa. Elle entretient des partenariats avec des universités protestantes d'Europe et d'Amérique du Nord.",
        ],
      },
    ],
    timeline: [
      { date: "1959", event: "Fondation par l'ECC" },
    ],
    facts: [
      { label: "Type", value: "Université protestante privée" },
      { label: "Ville", value: "Kinshasa" },
      { label: "Fondateur", value: "Église du Christ au Congo" },
    ],
    tags: ["upc", "université", "protestante", "kinshasa", "théologie", "éducation"],
    relatedSlugs: ["christianisme-rdc", "unikin-full"],
    quality: "standard",
  },
  {
    slug: "universite-kongo",
    title: "Université Kongo (UK)",
    subtitle: "Kongo Central · Mbanza-Ngungu",
    category: "institution",
    summary: "L'Université Kongo est une université privée catholique située à Mbanza-Ngungu dans le Kongo Central. Elle forme des cadres pour la province et les régions voisines, avec des facultés de médecine, droit et agronomie.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "Fondée par le diocèse de Kisantu, l'Université Kongo est implantée dans le Kongo Central, région historique et agricole. Elle répond aux besoins de formation supérieure d'une province longtemps dépendante de Kinshasa.",
          "Ses facultés de médecine et d'agronomie sont particulièrement adaptées aux réalités locales : santé rurale et développement agricole.",
        ],
      },
    ],
    timeline: [
      { date: "1990s", event: "Fondation" },
    ],
    facts: [
      { label: "Ville", value: "Mbanza-Ngungu" },
      { label: "Province", value: "Kongo Central" },
      { label: "Type", value: "Université catholique privée" },
    ],
    tags: ["université kongo", "kongo central", "mbanza-ngungu", "éducation"],
    relatedSlugs: ["education-rdc", "christianisme-rdc"],
    quality: "standard",
  },
  {
    slug: "ecole-nationale-droit-administration",
    title: "École Nationale de Droit et d'Administration (ENDA)",
    subtitle: "Formation cadres · administration publique",
    category: "institution",
    summary: "L'École Nationale de Droit et d'Administration (ENDA) forme les cadres de l'administration publique congolaise. Elle prépare aux concours de la fonction publique et offre des formations continues aux fonctionnaires en exercice.",
    body: [],
    sections: [
      {
        heading: "Mission",
        paragraphs: [
          "L'ENDA est l'équivalent congolais de l'ENA française. Elle forme des administrateurs, juristes et gestionnaires publics pour les ministères, provinces et institutions de la RDC.",
          "Les formations couvrent le droit administratif, les finances publiques, la gestion des ressources humaines et les politiques publiques.",
        ],
      },
    ],
    timeline: [
      { date: "1960s", event: "Création post-indépendance" },
    ],
    facts: [
      { label: "Type", value: "École d'administration" },
      { label: "Ville", value: "Kinshasa" },
      { label: "Débouchés", value: "Fonction publique" },
    ],
    tags: ["enda", "administration", "droit", "fonction publique", "kinshasa"],
    relatedSlugs: ["education-rdc", "assemblee-nationale"],
    quality: "standard",
  },
];
