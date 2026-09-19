import type { AyebiArticle } from "./types";

export const GEOGRAPHY_ARTICLES: AyebiArticle[] = [
  {
    slug: "geographie-rdc",
    title: "Géographie de la RDC",
    subtitle: "Deuxième pays d'Afrique · forêt · fleuves",
    category: "lieu",
    summary:
      "La République démocratique du Congo est le deuxième plus grand pays d'Afrique (2 344 858 km²). Elle couvre une diversité géographique exceptionnelle : bassin du Congo, forêt équatoriale, savanes, volcans, lacs des Grands Lacs et côte atlantique.",
    body: [],
    sections: [
      {
        heading: "Relief et régions naturelles",
        paragraphs: [
          "Le pays se divise en plusieurs grandes zones : la cuvette centrale (bassin du Congo), les plateaux du Kasaï et du Katanga au sud, les hauts plateaux et volcans de l'Est (Kivu, Ituri), et la plaine côtière du Kongo Central.",
          "Le point culminant est le mont Marguerite (5 109 m) dans les Rwenzori, à la frontière avec l'Ouganda. Les Virunga au Nord-Kivu abritent plusieurs volcans actifs dont le Nyiragongo (3 470 m).",
          "La cuvette centrale est une vaste dépression à moins de 500 m d'altitude, couverte de forêt dense et parcourue par le fleuve Congo et ses affluents.",
        ],
      },
      {
        heading: "Hydrographie",
        paragraphs: [
          "Le fleuve Congo (4 700 km) est le deuxième fleuve d'Afrique par la longueur et le premier par le débit. Son bassin versant couvre 3,7 millions de km². Ses principaux affluents sont l'Oubangui, le Kasaï, le Lomami, le Lualaba et la Lukuga.",
          "Les Grands Lacs de l'Est — Tanganyika, Kivu, Édouard, Albert, Moero — forment une frontière naturelle avec les pays voisins et constituent des ressources halieutiques majeures.",
          "Le lac Tanganyika (673 km de long) est le deuxième lac le plus profond du monde (1 470 m) et abrite une biodiversité aquatique unique.",
        ],
      },
      {
        heading: "Climat et végétation",
        paragraphs: [
          "Le climat équatorial domine la cuvette centrale : chaleur constante (25–30°C), pluies abondantes toute l'année. Les régions du sud et de l'est ont un climat tropical avec saisons sèche et humide.",
          "La forêt équatoriale du Congo est la deuxième plus grande forêt tropicale du monde après l'Amazonie. Elle couvre environ 1,5 million de km² et abrite une biodiversité exceptionnelle : okapis, gorilles, bonobos, éléphants de forêt.",
          "Les savanes du Katanga et du Kasaï alternent avec des galeries forestières. Le Haut-Katanga présente un relief de miombo (savane arborée) caractéristique.",
        ],
      },
      {
        heading: "Frontières et voisins",
        paragraphs: [
          "La RDC partage ses frontières avec neuf pays : République du Congo, République centrafricaine, Soudan du Sud, Ouganda, Rwanda, Burundi, Tanzanie, Zambie et Angola. Ces frontières, héritées de la colonisation, traversent des zones ethniques et culturelles homogènes.",
          "La seule façade maritime est un couloir de 37 km sur l'Atlantique, entre l'Angola et l'enclave de Cabinda, avec le port de Banana.",
        ],
      },
    ],
    timeline: [
      { date: "1885", event: "Frontières fixées à la Conférence de Berlin" },
      { date: "1960", event: "Indépendance · frontières maintenues" },
      { date: "1994", event: "Crise des Grands Lacs · déplacements massifs" },
      { date: "2000s", event: "Déforestation et enjeux climatiques" },
    ],
    facts: [
      { label: "Superficie", value: "2 344 858 km²" },
      { label: "Rang Afrique", value: "2e plus grand pays" },
      { label: "Point culminant", value: "Mont Marguerite · 5 109 m" },
      { label: "Fleuve principal", value: "Congo · 4 700 km" },
      { label: "Forêt", value: "~1,5 million km²" },
      { label: "Voisins", value: "9 pays" },
      { label: "Façade maritime", value: "37 km (Atlantique)" },
    ],
    tags: ["géographie", "rdc", "fleuve", "forêt", "virunga", "grands lacs", "congo"],
    relatedSlugs: ["fleuve-congo", "parc-national-virunga", "lac-kivu", "mont-nyiragongo"],
    quality: "article de qualité",
    coordinates: { lat: -4.0, lon: 21.76, label: "Centre géographique RDC" },
  },
  {
    slug: "provinces-rdc",
    title: "Provinces de la RDC",
    subtitle: "26 provinces · décentralisation · 2015",
    category: "lieu",
    summary:
      "Depuis 2015, la RDC est divisée en 26 provinces issues du découpage des 11 anciennes provinces. Cette décentralisation vise à rapprocher l'administration des citoyens et à mieux gérer les ressources locales.",
    body: [],
    sections: [
      {
        heading: "Historique du découpage",
        paragraphs: [
          "À l'indépendance (1960), le Congo comptait 6 provinces. Mobutu les réorganise en 8 régions en 1966, puis en 11 provinces en 1988. La Constitution de 2006 prévoit 26 provinces, effectivement créées en 2015.",
          "Ce découpage vise à réduire les déséquilibres entre provinces riches (Katanga, Kivu) et pauvres, et à renforcer la gouvernance locale.",
        ],
      },
      {
        heading: "Principales provinces",
        paragraphs: [
          "Kinshasa (ville-province) : capitale politique et économique, ~17 millions d'habitants. Haut-Katanga : pôle minier, Lubumbashi. Nord-Kivu : Goma, volcans, conflits. Sud-Kivu : Bukavu, lac Kivu.",
          "Kasaï-Oriental : Mbuji-Mayi, diamants. Kongo Central : Matadi, port, accès à l'Atlantique. Équateur : Mbandaka, forêt équatoriale. Maniema : Kindu, forêt et mines.",
          "Lualaba : Kolwezi, cobalt et cuivre. Tanganyika : Kalemie, lac Tanganyika. Ituri : Bunia, or et conflits. Tshopo : Kisangani, fleuve Congo.",
        ],
      },
      {
        heading: "Défis de la décentralisation",
        paragraphs: [
          "La rétrocession de 40% des recettes nationales aux provinces est souvent incomplète. Les gouverneurs élus font face à des défis de gouvernance, de sécurité et d'infrastructure.",
          "Certaines provinces comme le Lualaba et le Haut-Katanga bénéficient des revenus miniers, tandis que d'autres restent très dépendantes des transferts de Kinshasa.",
        ],
      },
    ],
    timeline: [
      { date: "1960", event: "6 provinces à l'indépendance" },
      { date: "1966", event: "8 régions sous Mobutu" },
      { date: "1988", event: "11 provinces" },
      { date: "2006", event: "Constitution prévoit 26 provinces" },
      { date: "2015", event: "Mise en place effective des 26 provinces" },
    ],
    facts: [
      { label: "Nombre", value: "26 provinces" },
      { label: "Réforme", value: "2015" },
      { label: "Plus grande", value: "Équateur (~400 000 km²)" },
      { label: "Plus peuplée", value: "Kinshasa (~17 M)" },
      { label: "Rétrocession", value: "40% recettes nationales" },
    ],
    tags: ["provinces", "décentralisation", "géographie", "administration", "rdc"],
    relatedSlugs: ["kinshasa", "lubumbashi", "goma", "bukavu", "kisangani"],
    quality: "standard",
  },
  {
    slug: "foret-congo",
    title: "Forêt du Congo",
    subtitle: "Deuxième forêt tropicale mondiale · biodiversité",
    category: "lieu",
    summary:
      "La forêt du bassin du Congo est la deuxième plus grande forêt tropicale du monde. Elle couvre environ 3,3 millions de km² sur six pays, dont 60% en RDC. Réservoir de biodiversité et puits de carbone planétaire, elle est menacée par la déforestation et les conflits.",
    body: [],
    sections: [
      {
        heading: "Étendue et biodiversité",
        paragraphs: [
          "La forêt congolaise abrite plus de 10 000 espèces végétales, 1 000 espèces d'oiseaux et 400 espèces de mammifères. Parmi les espèces emblématiques : le gorille de plaine de l'Ouest, le bonobo (endémique à la RDC), l'okapi, l'éléphant de forêt et le paon du Congo.",
          "Le bonobo (Pan paniscus) est l'un des primates les plus proches de l'humain. Il ne vit qu'en RDC, au sud du fleuve Congo. Sa protection est un enjeu de conservation mondial.",
          "La forêt abrite également des centaines de peuples autochtones (Pygmées Aka, Baka, Twa) dont les savoirs traditionnels sont essentiels à la gestion durable.",
        ],
      },
      {
        heading: "Rôle climatique",
        paragraphs: [
          "La forêt du Congo stocke environ 8% du carbone forestier mondial. Elle régule le cycle de l'eau pour l'Afrique centrale et influence les précipitations jusqu'en Afrique de l'Est.",
          "Des études récentes montrent que certaines zones de la forêt congolaise sont devenues des sources nettes de CO2 en raison de la dégradation, soulignant l'urgence de la protection.",
        ],
      },
      {
        heading: "Menaces et conservation",
        paragraphs: [
          "La déforestation progresse : agriculture itinérante, exploitation forestière, charbon de bois pour les villes et conflits armés. Le taux de déforestation reste inférieur à l'Amazonie mais s'accélère.",
          "Des initiatives comme REDD+ (Réduction des émissions liées à la déforestation) tentent de financer la conservation. Le gouvernement congolais a créé plusieurs parcs nationaux et réserves.",
        ],
      },
    ],
    timeline: [
      { date: "Préhistoire", event: "Formation de la forêt équatoriale" },
      { date: "1925", event: "Création du parc Albert (Virunga)" },
      { date: "2000s", event: "Accélération déforestation" },
      { date: "2010s", event: "Programmes REDD+ et conservation" },
    ],
    facts: [
      { label: "Superficie totale", value: "~3,3 millions km²" },
      { label: "Part RDC", value: "~60%" },
      { label: "Espèces végétales", value: ">10 000" },
      { label: "Espèce endémique", value: "Bonobo" },
      { label: "Carbone stocké", value: "~8% mondial" },
    ],
    tags: ["forêt", "congo", "biodiversité", "bonobo", "gorille", "climat", "conservation"],
    relatedSlugs: ["parc-national-virunga", "fleuve-congo", "geographie-rdc"],
    quality: "bon article",
  },
  {
    slug: "lac-tanganyika",
    title: "Lac Tanganyika",
    subtitle: "Deuxième lac le plus profond · frontière RDC–Tanzanie",
    category: "lieu",
    summary:
      "Le lac Tanganyika est le deuxième lac le plus profond du monde (1 470 m) et le deuxième plus grand d'Afrique par le volume. Il borde la RDC, la Tanzanie, le Burundi et la Zambie. Ses eaux abritent une biodiversité unique et ses rives sont habitées depuis des millénaires.",
    body: [],
    sections: [
      {
        heading: "Caractéristiques physiques",
        paragraphs: [
          "Long de 673 km et large de 50 km en moyenne, le lac Tanganyika est situé dans le rift est-africain. Sa profondeur maximale de 1 470 m en fait le deuxième lac le plus profond du monde après le Baïkal.",
          "Le lac est stratifié : les eaux profondes sont anoxiques (sans oxygène) et ne se mélangent pas avec les eaux de surface. Cette stratification préserve des archives sédimentaires de millions d'années.",
        ],
      },
      {
        heading: "Biodiversité",
        paragraphs: [
          "Le Tanganyika abrite plus de 350 espèces de cichlidés, dont 98% sont endémiques. Ces poissons colorés sont exportés dans le monde entier pour l'aquariophilie.",
          "La pêche artisanale (kapenta, ndakala) nourrit des millions de personnes sur les rives. Des flottes de pêche industrielle opèrent également sur le lac.",
        ],
      },
      {
        heading: "Importance régionale",
        paragraphs: [
          "Kalemie (RDC), Bujumbura (Burundi), Kigoma (Tanzanie) et Mpulungu (Zambie) sont les principales villes lacustres. Le lac est une voie de transport régionale importante.",
          "Le changement climatique affecte le lac : hausse des températures, baisse du niveau et perturbation des cycles de pêche sont documentés depuis les années 1990.",
        ],
      },
    ],
    timeline: [
      { date: "1858", event: "Découverte par Burton et Speke" },
      { date: "1914–18", event: "Batailles navales pendant la Première Guerre mondiale" },
      { date: "1960s", event: "Indépendances des pays riverains" },
      { date: "2000s", event: "Études sur le changement climatique" },
    ],
    facts: [
      { label: "Profondeur max.", value: "1 470 m" },
      { label: "Longueur", value: "673 km" },
      { label: "Pays riverains", value: "RDC, Tanzanie, Burundi, Zambie" },
      { label: "Ville principale RDC", value: "Kalemie" },
      { label: "Espèces cichlidés", value: ">350 (98% endémiques)" },
    ],
    tags: ["tanganyika", "lac", "géographie", "biodiversité", "rift", "kalemie"],
    relatedSlugs: ["lac-kivu", "geographie-rdc", "fleuve-congo"],
    quality: "bon article",
    coordinates: { lat: -6.5, lon: 29.5, label: "Lac Tanganyika" },
  },
  {
    slug: "katanga-region",
    title: "Katanga",
    subtitle: "Région minière · cuivre · cobalt · histoire",
    category: "lieu",
    summary:
      "Le Katanga (aujourd'hui divisé en quatre provinces) est la région la plus riche en ressources minières de la RDC. Cuivre, cobalt, uranium, zinc et manganèse y sont exploités depuis le début du XXe siècle. Son histoire est marquée par la sécession de 1960–1963 et les guerres du Congo.",
    body: [],
    sections: [
      {
        heading: "Géographie et ressources",
        paragraphs: [
          "Le Katanga occupe le sud-est de la RDC, bordant la Zambie et l'Angola. Son sous-sol contient les plus grandes réserves mondiales de cobalt et d'importantes réserves de cuivre, uranium, zinc et manganèse.",
          "La ceinture cuivrifère (Copperbelt) s'étend du Katanga à la Zambie. Les mines de Kolwezi, Tenke Fungurume, Kamoto et Mutanda sont parmi les plus productives du monde.",
        ],
      },
      {
        heading: "Sécession katangaise (1960–1963)",
        paragraphs: [
          "Dès l'indépendance, Moïse Tshombe proclame la sécession du Katanga le 11 juillet 1960, avec le soutien de l'Union Minière du Haut-Katanga (UMHK) et de mercenaires belges. La province riche refuse de partager ses revenus avec le gouvernement central.",
          "L'ONU intervient (ONUC) et des combats opposent forces onusiennes et katangaises. La sécession prend fin en janvier 1963 après l'opération Grandslam.",
        ],
      },
      {
        heading: "Économie et société",
        paragraphs: [
          "Lubumbashi est la capitale économique du Katanga. La ville concentre raffineries, universités (UNILU), hôpitaux et le club de football TP Mazembe.",
          "La population katangaise est diverse : Luba du Katanga, Bemba, Tshokwe et nombreuses communautés. Les tensions entre « Katangais de souche » et migrants du Kasaï ont parfois dégénéré en violences.",
        ],
      },
    ],
    timeline: [
      { date: "1906", event: "Création de l'Union Minière du Haut-Katanga" },
      { date: "1960", event: "Sécession katangaise" },
      { date: "1963", event: "Fin de la sécession" },
      { date: "2015", event: "Division en 4 provinces" },
    ],
    facts: [
      { label: "Provinces actuelles", value: "Haut-Katanga, Lualaba, Haut-Lomami, Tanganyika" },
      { label: "Capitale historique", value: "Lubumbashi" },
      { label: "Ressources", value: "Cuivre, cobalt, uranium, zinc" },
      { label: "Sécession", value: "1960 — 1963" },
    ],
    tags: ["katanga", "mines", "cuivre", "cobalt", "sécession", "lubumbashi", "histoire"],
    relatedSlugs: ["lubumbashi", "cobalt-rdc", "cuivre-katanga", "gecamines", "tp-mazembe"],
    quality: "bon article",
  },
  {
    slug: "kivu-region",
    title: "Région du Kivu",
    subtitle: "Nord-Kivu · Sud-Kivu · conflits · richesses",
    category: "lieu",
    summary:
      "Le Kivu désigne les provinces du Nord-Kivu et du Sud-Kivu, à l'est de la RDC. Région de hauts plateaux, de volcans et de lacs, elle est l'une des plus fertiles et des plus riches en minerais du pays, mais aussi l'une des plus touchées par les conflits armés depuis les années 1990.",
    body: [],
    sections: [
      {
        heading: "Géographie",
        paragraphs: [
          "Le Kivu est une région de hauts plateaux (1 500–2 500 m) bordée par le lac Kivu, les volcans des Virunga et le lac Édouard. Le climat tempéré d'altitude permet une agriculture diversifiée : café, thé, quinquina, maïs, haricots.",
          "Le Nord-Kivu (chef-lieu Goma) et le Sud-Kivu (chef-lieu Bukavu) sont séparés par le lac Kivu. La région partage ses frontières avec le Rwanda, le Burundi et l'Ouganda.",
        ],
      },
      {
        heading: "Richesses et économie",
        paragraphs: [
          "Le Kivu est riche en coltan, cassitérite, or et wolframite. Ces minerais alimentent une économie artisanale et industrielle, mais aussi des groupes armés qui en contrôlent l'extraction.",
          "L'agriculture est la principale activité : le café kivuien est réputé sur les marchés internationaux. Le tourisme (gorilles, volcans) représente un potentiel important.",
        ],
      },
      {
        heading: "Conflits et humanitaire",
        paragraphs: [
          "Depuis 1994, le Kivu est le théâtre de conflits armés quasi-permanents : FDLR, CNDP, M23, ADF, Maï-Maï et dizaines d'autres groupes. Ces conflits ont provoqué des millions de déplacés et des violations massives des droits humains.",
          "Goma est le hub humanitaire de l'Est : UNHCR, MSF, CICR et centaines d'ONG y opèrent. L'hôpital Panzi du Dr Mukwege à Bukavu est une référence mondiale pour la prise en charge des victimes de violences sexuelles.",
        ],
      },
    ],
    timeline: [
      { date: "1994", event: "Afflux réfugiés rwandais" },
      { date: "1996–97", event: "Première guerre du Congo" },
      { date: "1998–2003", event: "Deuxième guerre · RCD" },
      { date: "2012–13", event: "Rébellion M23" },
      { date: "2022–", event: "Résurgence M23" },
    ],
    facts: [
      { label: "Provinces", value: "Nord-Kivu, Sud-Kivu" },
      { label: "Chefs-lieux", value: "Goma, Bukavu" },
      { label: "Lac", value: "Kivu" },
      { label: "Altitude", value: "1 500–2 500 m" },
      { label: "Minerais", value: "Coltan, or, cassitérite" },
    ],
    tags: ["kivu", "goma", "bukavu", "conflits", "minerais", "gorilles", "est-congo"],
    relatedSlugs: ["goma", "bukavu", "lac-kivu", "parc-national-virunga", "denis-mukwege"],
    quality: "bon article",
  },
];
