import type { AyebiArticle } from "./types";

export const EXTRA_ARTICLES: AyebiArticle[] = [
  {
    slug: "mbandaka",
    title: "Mbandaka",
    subtitle: "Capitale de l'Équateur · fleuve Congo",
    category: "lieu",
    summary: "Mbandaka est la capitale de la province de l'Équateur, située sur le fleuve Congo à l'équateur géographique. Ville fluviale entourée de forêt équatoriale, elle est un carrefour commercial entre Kinshasa et l'intérieur du pays.",
    body: [],
    sections: [
      {
        heading: "Géographie et vie",
        paragraphs: [
          "Mbandaka est traversée par l'équateur (0° de latitude). Son climat est équatorial : chaleur constante et pluies abondantes toute l'année.",
          "La ville vit du commerce fluvial, de la pêche et de l'agriculture. Des barges relient régulièrement Mbandaka à Kinshasa (1 700 km en aval) et à Kisangani (en amont).",
        ],
      },
      {
        heading: "Histoire",
        paragraphs: [
          "Fondée sous le nom de Coquilhatville à l'époque coloniale, la ville est rebaptisée Mbandaka en 1966. Elle a été le théâtre d'une épidémie d'Ebola en 2018, rapidement maîtrisée.",
        ],
      },
    ],
    timeline: [
      { date: "Époque coloniale", event: "Fondation de Coquilhatville" },
      { date: "1966", event: "Rebaptisée Mbandaka" },
      { date: "2018", event: "Épidémie Ebola maîtrisée" },
    ],
    facts: [
      { label: "Province", value: "Équateur" },
      { label: "Fleuve", value: "Congo" },
      { label: "Latitude", value: "0° (équateur)" },
      { label: "Accès", value: "Fluvial et aérien" },
    ],
    tags: ["mbandaka", "équateur", "fleuve", "ville", "rdc"],
    relatedSlugs: ["fleuve-congo", "foret-congo", "kinshasa"],
    quality: "standard",
  },
  {
    slug: "bunia",
    title: "Bunia",
    subtitle: "Chef-lieu de l'Ituri · or · conflits",
    category: "lieu",
    summary: "Bunia est le chef-lieu de la province de l'Ituri. Ville de l'est de la RDC, elle a été au cœur des conflits Hema-Lendu des années 2000 et reste un hub humanitaire et commercial pour la région.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "Bunia est une ville de taille moyenne, carrefour commercial entre l'Ouganda et l'intérieur de la RDC. Son marché est animé par des échanges transfrontaliers.",
          "La ville accueille des bases de la MONUSCO, des ONG internationales et des agences onusiennes en raison de l'insécurité persistante dans la région.",
        ],
      },
    ],
    timeline: [
      { date: "1999–2003", event: "Conflits Hema-Lendu" },
      { date: "2003", event: "Opération Artémis (France)" },
    ],
    facts: [
      { label: "Province", value: "Ituri" },
      { label: "Frontière", value: "Ouganda" },
    ],
    tags: ["bunia", "ituri", "or", "conflits", "rdc"],
    relatedSlugs: ["ituri-province", "or-rdc", "monusco"],
    quality: "standard",
  },
  {
    slug: "kalemie",
    title: "Kalemie",
    subtitle: "Lac Tanganyika · Tanganyika province",
    category: "lieu",
    summary: "Kalemie est le chef-lieu de la province du Tanganyika, sur les rives du lac Tanganyika. Ancienne Albertville, c'est un port lacustre important et un centre commercial pour la région.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "Kalemie est une ville portuaire sur le lac Tanganyika. Elle est reliée à Lubumbashi par le chemin de fer de la SNCC et au reste du pays par voie lacustre.",
          "La pêche au kapenta et au tilapia est une activité économique majeure. La ville exporte des poissons séchés vers les provinces voisines.",
        ],
      },
    ],
    timeline: [
      { date: "Époque coloniale", event: "Fondation d'Albertville" },
      { date: "1966", event: "Rebaptisée Kalemie" },
    ],
    facts: [
      { label: "Province", value: "Tanganyika" },
      { label: "Lac", value: "Tanganyika" },
      { label: "Accès", value: "Lacustre et ferroviaire" },
    ],
    tags: ["kalemie", "tanganyika", "lac", "port", "rdc"],
    relatedSlugs: ["lac-tanganyika", "chemin-de-fer-rdc"],
    quality: "standard",
  },
  {
    slug: "kolwezi",
    title: "Kolwezi",
    subtitle: "Lualaba · cobalt · cuivre · mines",
    category: "lieu",
    summary: "Kolwezi est la capitale de la province du Lualaba et le cœur de l'exploitation du cobalt et du cuivre en RDC. La ville est entourée de mines industrielles et artisanales qui font d'elle l'une des villes minières les plus importantes d'Afrique.",
    body: [],
    sections: [
      {
        heading: "Mines et économie",
        paragraphs: [
          "Kolwezi est entourée de mines majeures : Tenke Fungurume (CMOC), Mutanda (Glencore), Kamoto (KCC) et des dizaines de sites artisanaux.",
          "La ville attire des travailleurs de tout le pays et des expatriés des compagnies minières. Son économie est entièrement dépendante des mines.",
        ],
      },
      {
        heading: "Défis sociaux",
        paragraphs: [
          "La croissance rapide crée des tensions : logement insuffisant, pollution, accidents miniers et conflits entre mineurs artisanaux et industriels.",
          "Des programmes de responsabilité sociale des entreprises (RSE) financent écoles, hôpitaux et infrastructures.",
        ],
      },
    ],
    timeline: [
      { date: "1937", event: "Fondation par l'UMHK" },
      { date: "2015", event: "Capitale province Lualaba" },
      { date: "2020s", event: "Boom cobalt · Kamoa-Kakula" },
    ],
    facts: [
      { label: "Province", value: "Lualaba" },
      { label: "Ressources", value: "Cobalt, cuivre" },
      { label: "Mines", value: "Tenke, Mutanda, Kamoto" },
    ],
    tags: ["kolwezi", "lualaba", "cobalt", "cuivre", "mines", "rdc"],
    relatedSlugs: ["cobalt-rdc", "kamoa-kakula", "gecamines-full"],
    quality: "bon article",
  },
  {
    slug: "beni-ville",
    title: "Beni",
    subtitle: "Nord-Kivu · ADF · commerce",
    category: "lieu",
    summary: "Beni est une ville du Nord-Kivu, proche de la frontière ougandaise. Elle est connue pour son commerce transfrontalier actif mais aussi pour les massacres perpétrés par le groupe armé ADF (Allied Democratic Forces) depuis 2014.",
    body: [],
    sections: [
      {
        heading: "Commerce et économie",
        paragraphs: [
          "Beni est un carrefour commercial entre la RDC et l'Ouganda. Des produits agricoles, du bois et des minerais transitent par ses marchés.",
          "La ville est entourée de zones agricoles fertiles (café, cacao, banane) et de forêts riches en bois.",
        ],
      },
      {
        heading: "Insécurité ADF",
        paragraphs: [
          "Depuis 2014, les ADF (groupe armé d'origine ougandaise) perpètrent des massacres dans la région de Beni. Des centaines de civils ont été tués.",
          "L'armée congolaise (FARDC) et la MONUSCO mènent des opérations contre les ADF, avec des résultats mitigés.",
        ],
      },
    ],
    timeline: [
      { date: "2014", event: "Début massacres ADF" },
      { date: "2020s", event: "Opérations militaires FARDC" },
    ],
    facts: [
      { label: "Province", value: "Nord-Kivu" },
      { label: "Frontière", value: "Ouganda" },
      { label: "Menace", value: "ADF" },
    ],
    tags: ["beni", "nord-kivu", "adf", "conflits", "commerce", "rdc"],
    relatedSlugs: ["kivu-region", "goma", "monusco"],
    quality: "standard",
  },
  {
    slug: "tshopo-province",
    title: "Tshopo",
    subtitle: "Province · Kisangani · forêt · fleuve",
    category: "lieu",
    summary: "La Tshopo est une province du nord-est de la RDC, chef-lieu Kisangani. Couverte de forêt équatoriale et traversée par le fleuve Congo, elle est riche en ressources naturelles mais enclavée.",
    body: [],
    sections: [
      {
        heading: "Géographie",
        paragraphs: [
          "La Tshopo est traversée par le fleuve Congo et ses affluents. La forêt équatoriale couvre la majorité du territoire. Le climat est équatorial humide.",
          "Kisangani, chef-lieu, est le troisième pôle urbain du pays. Les chutes Wagenia sur le fleuve sont un site touristique célèbre.",
        ],
      },
      {
        heading: "Économie",
        paragraphs: [
          "L'exploitation forestière, la pêche et l'agriculture (café, cacao, hévéa) sont les principales activités. Le bois est exporté vers Kinshasa et l'étranger.",
        ],
      },
    ],
    timeline: [
      { date: "2015", event: "Création province Tshopo" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Kisangani" },
      { label: "Ressources", value: "Bois, café, cacao" },
      { label: "Fleuve", value: "Congo" },
    ],
    tags: ["tshopo", "kisangani", "forêt", "fleuve", "rdc"],
    relatedSlugs: ["kisangani", "foret-congo", "fleuve-congo"],
    quality: "standard",
  },
  {
    slug: "kongo-central-province",
    title: "Kongo Central",
    subtitle: "Province · Matadi · Atlantique · histoire",
    category: "lieu",
    summary: "Le Kongo Central est la seule province de la RDC avec un accès à l'Atlantique. Héritière du Royaume Kongo, elle abrite le port de Matadi, le barrage d'Inga et des sites historiques majeurs.",
    body: [],
    sections: [
      {
        heading: "Géographie et histoire",
        paragraphs: [
          "Le Kongo Central borde l'Angola et la République du Congo. Son territoire comprend la bande côtière atlantique (37 km), les collines du Mayombe et la vallée du fleuve Congo.",
          "C'est le berceau du Royaume Kongo et de l'Église kimbanguiste (Nkamba). La population est majoritairement kikongo.",
        ],
      },
      {
        heading: "Économie",
        paragraphs: [
          "Le port de Matadi, le barrage d'Inga, la cimenterie CINAT et l'agriculture (manioc, café, cacao) structurent l'économie.",
          "La province bénéficie de sa position stratégique : toutes les importations maritimes de la RDC transitent par Matadi.",
        ],
      },
    ],
    timeline: [
      { date: "XIVe s.", event: "Royaume Kongo" },
      { date: "1898", event: "Chemin de fer Matadi-Léopoldville" },
      { date: "1972", event: "Barrage Inga I" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Matadi" },
      { label: "Accès mer", value: "37 km Atlantique" },
      { label: "Ressources", value: "Port, hydroélectricité, agriculture" },
      { label: "Langue", value: "Kikongo" },
    ],
    tags: ["kongo central", "matadi", "atlantique", "inga", "kikongo", "rdc"],
    relatedSlugs: ["matadi", "barrage-inga", "royaume-kongo", "simon-kimbangu"],
    quality: "bon article",
  },
  {
    slug: "equateur-province",
    title: "Équateur",
    subtitle: "Province · Mbandaka · forêt · fleuve",
    category: "lieu",
    summary: "La province de l'Équateur est l'une des plus grandes de la RDC. Traversée par l'équateur géographique, elle est couverte de forêt équatoriale dense et parcourue par le fleuve Congo et ses affluents.",
    body: [],
    sections: [
      {
        heading: "Géographie",
        paragraphs: [
          "L'Équateur borde la République du Congo et la République centrafricaine. Sa forêt dense est l'une des moins perturbées du bassin du Congo.",
          "Mbandaka, chef-lieu, est accessible principalement par voie fluviale et aérienne. L'enclavement est un défi majeur.",
        ],
      },
      {
        heading: "Ressources et culture",
        paragraphs: [
          "La province est riche en bois, poisson et produits forestiers non ligneux. L'agriculture vivrière (manioc, plantain) est la base de l'alimentation.",
          "Mobutu Sese Seko est originaire de Lisala, dans l'actuelle province du Nord-Ubangi (anciennement Équateur).",
        ],
      },
    ],
    timeline: [
      { date: "1960", event: "Province à l'indépendance" },
      { date: "2015", event: "Division en 4 provinces" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Mbandaka" },
      { label: "Ressources", value: "Bois, pêche, agriculture" },
      { label: "Frontières", value: "Congo-Brazzaville, RCA" },
    ],
    tags: ["équateur", "mbandaka", "forêt", "fleuve", "rdc"],
    relatedSlugs: ["mbandaka", "foret-congo", "fleuve-congo"],
    quality: "standard",
  },
  {
    slug: "kasai-oriental-province",
    title: "Kasaï-Oriental",
    subtitle: "Mbuji-Mayi · diamants · tshiluba",
    category: "lieu",
    summary: "Le Kasaï-Oriental est une province du centre de la RDC, chef-lieu Mbuji-Mayi. Capitale mondiale du diamant industriel, la province est aussi un important bassin agricole et le cœur de la culture luba.",
    body: [],
    sections: [
      {
        heading: "Économie et ressources",
        paragraphs: [
          "Le diamant est la ressource principale : la MIBA et des milliers de creuseurs artisanaux exploitent les gisements autour de Mbuji-Mayi.",
          "L'agriculture (manioc, maïs, arachides) emploie la majorité de la population rurale.",
        ],
      },
      {
        heading: "Culture Luba",
        paragraphs: [
          "Le Kasaï-Oriental est le cœur de la culture luba. La langue tshiluba est parlée par des millions de personnes. L'art luba (sculptures, masques) est mondialement reconnu.",
        ],
      },
    ],
    timeline: [
      { date: "1961", event: "Création MIBA" },
      { date: "2015", event: "Province autonome" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Mbuji-Mayi" },
      { label: "Ressource", value: "Diamants" },
      { label: "Langue", value: "Tshiluba" },
    ],
    tags: ["kasaï-oriental", "mbuji-mayi", "diamant", "luba", "tshiluba", "rdc"],
    relatedSlugs: ["mbuji-mayi", "diamant-mbuji-mayi", "art-luba"],
    quality: "standard",
  },
  {
    slug: "nord-kivu-province",
    title: "Nord-Kivu",
    subtitle: "Goma · volcans · conflits · richesses",
    category: "lieu",
    summary: "Le Nord-Kivu est une province de l'est de la RDC, chef-lieu Goma. Région de hauts plateaux volcaniques, de lacs et de forêts, elle est l'une des plus riches en ressources naturelles mais aussi l'une des plus touchées par les conflits armés.",
    body: [],
    sections: [
      {
        heading: "Géographie et ressources",
        paragraphs: [
          "Le Nord-Kivu borde le Rwanda et l'Ouganda. Il comprend le parc national des Virunga, le lac Kivu, les volcans Nyiragongo et Nyamulagira.",
          "Les ressources minières (coltan, or, cassitérite) et agricoles (café, thé, quinquina) sont abondantes.",
        ],
      },
      {
        heading: "Conflits",
        paragraphs: [
          "Le Nord-Kivu est le théâtre de conflits armés quasi-permanents depuis 1994 : FDLR, CNDP, M23, ADF et dizaines de milices.",
          "Goma, chef-lieu, est régulièrement menacée par les groupes armés et les éruptions volcaniques.",
        ],
      },
    ],
    timeline: [
      { date: "1994", event: "Afflux réfugiés rwandais" },
      { date: "2012–13", event: "Rébellion M23" },
      { date: "2021", event: "Éruption Nyiragongo" },
      { date: "2022–", event: "Résurgence M23" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Goma" },
      { label: "Frontières", value: "Rwanda, Ouganda" },
      { label: "Volcan", value: "Nyiragongo" },
      { label: "Lac", value: "Kivu" },
    ],
    tags: ["nord-kivu", "goma", "volcans", "conflits", "m23", "rdc"],
    relatedSlugs: ["goma", "kivu-region", "parc-national-virunga", "mont-nyiragongo"],
    quality: "bon article",
  },
  {
    slug: "sud-kivu-province",
    title: "Sud-Kivu",
    subtitle: "Bukavu · lac Kivu · café · conflits",
    category: "lieu",
    summary: "Le Sud-Kivu est une province de l'est de la RDC, chef-lieu Bukavu. Région de hauts plateaux fertiles bordant le lac Kivu, elle est connue pour son café de qualité, ses universités et l'hôpital Panzi du Dr Mukwege.",
    body: [],
    sections: [
      {
        heading: "Géographie et économie",
        paragraphs: [
          "Le Sud-Kivu borde le Rwanda, le Burundi et la Tanzanie. Son relief accidenté et son climat tempéré favorisent la culture du café, du thé et des légumes.",
          "Bukavu, chef-lieu, est une ville universitaire (UCB, ISP) et humanitaire. Son port lacustre relie le Sud-Kivu au Nord-Kivu.",
        ],
      },
      {
        heading: "Société et conflits",
        paragraphs: [
          "Le Sud-Kivu est marqué par des décennies de conflits armés. L'hôpital Panzi du Dr Mukwege soigne des milliers de victimes de violences sexuelles.",
          "La société civile du Sud-Kivu est l'une des plus actives du pays : associations de femmes, journalistes et défenseurs des droits humains.",
        ],
      },
    ],
    timeline: [
      { date: "1994", event: "Afflux réfugiés" },
      { date: "1999", event: "Fondation hôpital Panzi" },
      { date: "2018", event: "Nobel Mukwege" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Bukavu" },
      { label: "Lac", value: "Kivu" },
      { label: "Frontières", value: "Rwanda, Burundi, Tanzanie" },
      { label: "Café", value: "Arabica de qualité" },
    ],
    tags: ["sud-kivu", "bukavu", "lac kivu", "café", "mukwege", "rdc"],
    relatedSlugs: ["bukavu", "kivu-region", "hopital-panzi", "cafe-kivu"],
    quality: "bon article",
  },
  {
    slug: "haut-uele-province",
    title: "Haut-Uélé",
    subtitle: "Isiro · or · frontière Soudan du Sud",
    category: "lieu",
    summary: "Le Haut-Uélé est une province du nord-est de la RDC, chef-lieu Isiro. Région forestière et minière, elle borde le Soudan du Sud et la République centrafricaine. L'or artisanal et le café sont ses principales ressources.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "Le Haut-Uélé est une région enclavée, accessible principalement par avion ou par des pistes difficiles. Sa forêt dense abrite une biodiversité exceptionnelle.",
          "L'or artisanal est exploité dans plusieurs zones. Le café arabica de la région est de bonne qualité.",
        ],
      },
    ],
    timeline: [
      { date: "2015", event: "Création province Haut-Uélé" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Isiro" },
      { label: "Frontières", value: "Soudan du Sud, RCA" },
      { label: "Ressources", value: "Or, café, bois" },
    ],
    tags: ["haut-uélé", "isiro", "or", "forêt", "rdc"],
    relatedSlugs: ["or-rdc", "foret-congo"],
    quality: "standard",
  },
  {
    slug: "sankuru-province",
    title: "Sankuru",
    subtitle: "Province · Lodja · bonobo · forêt",
    category: "lieu",
    summary: "Le Sankuru est une province du centre de la RDC, chef-lieu Lodja. Région forestière peu peuplée, elle est le berceau de Patrice Lumumba et abrite une importante population de bonobos.",
    body: [],
    sections: [
      {
        heading: "Présentation",
        paragraphs: [
          "Le Sankuru est traversé par la rivière Sankuru, affluent du Kasaï. Sa forêt dense est l'un des derniers refuges du bonobo.",
          "Patrice Lumumba est né à Onalua, dans l'actuel Sankuru. La région est fière de ce lien avec le héros national.",
        ],
      },
    ],
    timeline: [
      { date: "1925", event: "Naissance de Lumumba à Onalua" },
      { date: "2015", event: "Création province Sankuru" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Lodja" },
      { label: "Personnalité", value: "Patrice Lumumba (natif)" },
      { label: "Faune", value: "Bonobo" },
    ],
    tags: ["sankuru", "lodja", "lumumba", "bonobo", "forêt", "rdc"],
    relatedSlugs: ["patrice-lumumba", "foret-congo", "okapi"],
    quality: "standard",
  },
  {
    slug: "lomami-province",
    title: "Lomami",
    subtitle: "Province · Kabinda · forêt · parc",
    category: "lieu",
    summary: "La Lomami est une province du centre de la RDC, chef-lieu Kabinda. Elle abrite le parc national de la Lomami, créé en 2016, qui protège une forêt primaire exceptionnelle et des espèces rares.",
    body: [],
    sections: [
      {
        heading: "Parc national de la Lomami",
        paragraphs: [
          "Le parc national de la Lomami (3 600 km²) est l'un des derniers grands parcs créés en RDC. Il protège une forêt primaire abritant des bonobos, des éléphants de forêt et des espèces encore peu connues.",
          "Des scientifiques ont découvert dans cette région de nouvelles espèces de primates et d'oiseaux au début du XXIe siècle.",
        ],
      },
    ],
    timeline: [
      { date: "2016", event: "Création parc national Lomami" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Kabinda" },
      { label: "Parc", value: "Lomami · 3 600 km²" },
      { label: "Faune", value: "Bonobo, éléphant de forêt" },
    ],
    tags: ["lomami", "kabinda", "parc", "forêt", "bonobo", "rdc"],
    relatedSlugs: ["foret-congo", "parc-salonga", "environnement-rdc"],
    quality: "standard",
  },
];
