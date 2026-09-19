import type { AyebiArticle } from "./types";

export const SOCIETE_ARTICLES: AyebiArticle[] = [
  {
    slug: "langues-rdc",
    title: "Langues de la RDC",
    subtitle: "Français · lingala · swahili · kikongo · tshiluba",
    category: "culture",
    summary: "La RDC est l'un des pays les plus multilingues du monde avec plus de 200 langues locales. Le français est la langue officielle. Quatre langues nationales sont reconnues : le lingala, le swahili, le kikongo et le tshiluba.",
    body: [],
    sections: [
      {
        heading: "Français et langues nationales",
        paragraphs: [
          "Le français est la langue de l'administration, de l'enseignement supérieur, de la justice et des médias nationaux. Héritage colonial, il sert de lingua franca entre locuteurs de langues différentes.",
          "Les quatre langues nationales ont chacune une zone géographique dominante : le lingala (Kinshasa, Équateur, fleuve Congo), le swahili (Est : Kivu, Maniema, Katanga), le kikongo (Kongo Central, Kinshasa) et le tshiluba (Kasaï).",
        ],
      },
      {
        heading: "Lingala",
        paragraphs: [
          "Le lingala est la langue la plus parlée à Kinshasa et dans les provinces du nord et de l'ouest. C'est la langue de la musique congolaise (rumba, ndombolo), de l'armée et de la rue kinshasoise.",
          "Il s'est développé comme langue de commerce le long du fleuve Congo. Sa grammaire est relativement simple, ce qui facilite son apprentissage comme deuxième langue.",
        ],
      },
      {
        heading: "Swahili",
        paragraphs: [
          "Le swahili est la langue dominante de l'Est congolais. Langue bantoue avec de nombreux emprunts arabes, il est parlé de la côte est-africaine jusqu'au Kivu et au Katanga.",
          "Le swahili congolais (kingwana) a ses propres particularités par rapport au swahili standard de Tanzanie ou du Kenya.",
        ],
      },
      {
        heading: "Kikongo et Tshiluba",
        paragraphs: [
          "Le kikongo est parlé dans le Kongo Central et certains quartiers de Kinshasa. C'est la langue du Royaume Kongo et de l'Église kimbanguiste.",
          "Le tshiluba est la langue du Grand Kasaï (Kasaï-Central, Kasaï-Oriental, Lomami). C'est une langue tonale avec une riche tradition orale.",
        ],
      },
    ],
    timeline: [
      { date: "1885", event: "Français imposé par la colonisation" },
      { date: "1960", event: "Français langue officielle à l'indépendance" },
      { date: "1971", event: "Reconnaissance des 4 langues nationales" },
      { date: "2006", event: "Constitution confirme le statut des langues" },
    ],
    facts: [
      { label: "Langue officielle", value: "Français" },
      { label: "Langues nationales", value: "Lingala, Swahili, Kikongo, Tshiluba" },
      { label: "Langues locales", value: ">200" },
      { label: "Lingala", value: "Kinshasa · Équateur · fleuve" },
      { label: "Swahili", value: "Est · Kivu · Katanga" },
    ],
    tags: ["langues", "lingala", "swahili", "kikongo", "tshiluba", "français", "rdc"],
    relatedSlugs: ["rumba-congolaise", "kinshasa", "kivu-region"],
    quality: "bon article",
  },
  {
    slug: "cuisine-congolaise",
    title: "Cuisine congolaise",
    subtitle: "Manioc · pondu · moambe · fufu",
    category: "culture",
    summary: "La cuisine congolaise est riche et variée, basée sur le manioc, le maïs, les légumes-feuilles, le poisson et la viande. Le pondu (feuilles de manioc), le fufu (pâte de manioc ou maïs) et le poulet moambe (sauce aux noix de palme) sont les plats emblématiques.",
    body: [],
    sections: [
      {
        heading: "Aliments de base",
        paragraphs: [
          "Le manioc est l'aliment de base de la majorité des Congolais. Il se consomme sous forme de fufu (pâte), de chikwangue (pain de manioc fermenté enveloppé dans des feuilles), de cossettes séchées ou de farine.",
          "Le maïs (sous forme de fufu ou de bouillie) est dominant dans le Katanga et le Kasaï. Le riz est consommé dans les villes et les zones de l'Est.",
          "Le plantain (banane plantain) est omniprésent : frit, bouilli, en chips ou en bouillie.",
        ],
      },
      {
        heading: "Plats emblématiques",
        paragraphs: [
          "Le pondu est la sauce nationale : feuilles de manioc pilées et cuites avec huile de palme, oignons et parfois poisson fumé. Servi avec du fufu, c'est le repas quotidien de millions de Congolais.",
          "Le poulet moambe est le plat de fête par excellence : poulet mijoté dans une sauce aux noix de palme (moambe), avec épices et légumes. Il est servi lors des mariages, baptêmes et fêtes.",
          "Le liboke est un mode de cuisson : poisson, viande ou légumes enveloppés dans des feuilles de bananier et cuits à la vapeur ou sur braises.",
        ],
      },
      {
        heading: "Boissons",
        paragraphs: [
          "La bière Primus (Bralima) est la boisson nationale. Le vin de palme (nsamba) est une boisson traditionnelle fermentée. Le jus de maracuja, de mangue et d'ananas sont populaires.",
          "Le café congolais (Kivu, Ituri) est réputé pour sa qualité. Le thé du Kivu est également exporté.",
        ],
      },
    ],
    timeline: [
      { date: "XVIe s.", event: "Introduction du manioc par les Portugais" },
      { date: "XIXe s.", event: "Diffusion du maïs et du plantain" },
      { date: "Aujourd'hui", event: "Fusion cuisine traditionnelle et influences urbaines" },
    ],
    facts: [
      { label: "Aliment de base", value: "Manioc" },
      { label: "Plat national", value: "Pondu · fufu" },
      { label: "Plat de fête", value: "Poulet moambe" },
      { label: "Bière nationale", value: "Primus" },
      { label: "Café", value: "Kivu · Ituri" },
    ],
    tags: ["cuisine", "manioc", "pondu", "fufu", "moambe", "culture", "rdc"],
    relatedSlugs: ["kinshasa", "agriculture-rdc", "bralima"],
    quality: "bon article",
  },
  {
    slug: "art-sculpture-kuba",
    title: "Art Kuba",
    subtitle: "Royaume Kuba · masques · tissus · sculpture",
    category: "culture",
    summary: "L'art du Royaume Kuba (Kasaï) est l'un des plus raffinés d'Afrique centrale. Masques royaux, tissus de raphia aux motifs géométriques complexes, sculptures en bois et objets rituels ont influencé des artistes occidentaux comme Picasso et Matisse.",
    body: [],
    sections: [
      {
        heading: "Le Royaume Kuba",
        paragraphs: [
          "Le Royaume Kuba est fondé au XVIIe siècle dans le Kasaï. Ses rois (Nyim) sont des mécènes qui encouragent les arts. La cour royale de Nsheng est un centre de création artistique.",
          "L'art Kuba est caractérisé par des motifs géométriques complexes (interlacs, spirales, damiers) appliqués sur tous les supports : tissus, bois, ivoire, céramique.",
        ],
      },
      {
        heading: "Masques et sculptures",
        paragraphs: [
          "Les masques Kuba (Mukenga, Bwoom, Ngady a Mwaash) représentent des personnages mythologiques et sont utilisés lors des cérémonies d'initiation et funéraires.",
          "Les statues royales (ndop) représentent les rois Kuba avec leurs attributs. Elles sont parmi les sculptures africaines les plus collectionnées dans les musées mondiaux.",
        ],
      },
      {
        heading: "Influence mondiale",
        paragraphs: [
          "Des pièces d'art Kuba sont exposées au British Museum, au Metropolitan Museum of Art et au Musée royal de l'Afrique centrale (Tervuren, Belgique).",
          "Les motifs Kuba ont influencé le cubisme et l'art moderne occidental. Des créateurs de mode contemporains s'en inspirent.",
        ],
      },
    ],
    timeline: [
      { date: "XVIIe s.", event: "Fondation du Royaume Kuba" },
      { date: "XIXe s.", event: "Contact avec les explorateurs européens" },
      { date: "1907", event: "Emil Torday collecte des pièces pour le British Museum" },
    ],
    facts: [
      { label: "Région", value: "Kasaï" },
      { label: "Matériaux", value: "Bois, raphia, ivoire, cuivre" },
      { label: "Motifs", value: "Géométriques · interlacs" },
      { label: "Musées", value: "British Museum, Met, Tervuren" },
    ],
    tags: ["kuba", "art", "masque", "sculpture", "kasaï", "culture", "rdc"],
    relatedSlugs: ["art-luba", "mbuji-mayi", "kananga"],
    quality: "bon article",
  },
  {
    slug: "art-luba",
    title: "Art Luba",
    subtitle: "Katanga · Kasaï · sculpture · divination",
    category: "culture",
    summary: "L'art Luba, produit par les peuples Luba du Katanga et du Kasaï, est célèbre pour ses sculptures féminines, ses sièges à cariatides, ses bâtons de mémoire (lukasa) et ses objets de divination. Il est l'un des arts africains les plus étudiés.",
    body: [],
    sections: [
      {
        heading: "Contexte culturel",
        paragraphs: [
          "L'Empire Luba (XVIe–XIXe siècle) est l'un des plus puissants États précoloniaux d'Afrique centrale. Son art reflète une cosmologie complexe centrée sur la royauté sacrée et le féminin.",
          "Les sculptures Luba représentent souvent des femmes : gardiennes de la mémoire, épouses royales, figures de fertilité. Le corps féminin est le support de la connaissance et du pouvoir.",
        ],
      },
      {
        heading: "Objets emblématiques",
        paragraphs: [
          "Le lukasa (bâton de mémoire) est un objet couvert de perles et de coquillages qui encode l'histoire et la généalogie royale. Seuls les initiés (mbudye) savent le lire.",
          "Les sièges à cariatides (kipona) représentent une femme soutenant le siège du roi. Ils symbolisent le soutien féminin au pouvoir masculin.",
        ],
      },
    ],
    timeline: [
      { date: "XVIe s.", event: "Empire Luba · apogée artistique" },
      { date: "XIXe s.", event: "Collecte par explorateurs et missionnaires" },
      { date: "XXe s.", event: "Études académiques · musées mondiaux" },
    ],
    facts: [
      { label: "Région", value: "Katanga · Kasaï" },
      { label: "Objet emblème", value: "Lukasa · siège cariatide" },
      { label: "Thème", value: "Royauté · féminin · mémoire" },
    ],
    tags: ["luba", "art", "sculpture", "katanga", "kasaï", "culture"],
    relatedSlugs: ["art-sculpture-kuba", "katanga-region"],
    quality: "standard",
  },
  {
    slug: "peinture-contemporaine-rdc",
    title: "Peinture contemporaine congolaise",
    subtitle: "Chéri Samba · Moke · Kinshasa",
    category: "culture",
    summary: "La peinture populaire et contemporaine congolaise est reconnue mondialement. Des artistes comme Chéri Samba, Moke et Bodys Isek Kingelez ont exposé dans les plus grands musées du monde, portant la créativité kinoise sur la scène internationale.",
    body: [],
    sections: [
      {
        heading: "Peinture populaire de Kinshasa",
        paragraphs: [
          "La peinture populaire kinoise émerge dans les années 1970–1980. Des artistes autodidactes peignent sur toile ou bois des scènes de la vie quotidienne, des fables morales et des commentaires sociaux.",
          "Chéri Samba (né 1956) est le plus célèbre : ses tableaux colorés et narratifs commentent la politique, la sexualité et la société congolaise avec humour et ironie. Il expose au Centre Pompidou et au MoMA.",
        ],
      },
      {
        heading: "Moke et la scène kinshasoise",
        paragraphs: [
          "Moke (1950–2001) peint les bars, les musiciens et la vie nocturne de Kinshasa avec une énergie et une couleur caractéristiques. Ses œuvres sont des documents sociaux autant qu'artistiques.",
          "Bodys Isek Kingelez (1948–2015) crée des maquettes architecturales utopiques de villes africaines idéales, exposées au MoMA de New York.",
        ],
      },
    ],
    timeline: [
      { date: "1970s", event: "Émergence peinture populaire Kinshasa" },
      { date: "1989", event: "Exposition Magiciens de la Terre · Paris" },
      { date: "2018", event: "Rétrospective Kingelez au MoMA" },
    ],
    facts: [
      { label: "Artiste phare", value: "Chéri Samba" },
      { label: "Style", value: "Peinture populaire narrative" },
      { label: "Musées", value: "Pompidou, MoMA, Tate" },
      { label: "Hub", value: "Kinshasa" },
    ],
    tags: ["peinture", "art", "chéri samba", "moke", "kinshasa", "culture", "contemporain"],
    relatedSlugs: ["cinema-congolais", "kinshasa", "sape-congolaise"],
    quality: "bon article",
  },
  {
    slug: "theatre-congolais",
    title: "Théâtre congolais",
    subtitle: "Kinshasa · satire · tradition orale",
    category: "culture",
    summary: "Le théâtre congolais mêle tradition orale africaine, satire sociale et influences occidentales. De la scène populaire des nganda aux grandes salles de Kinshasa, il est un miroir de la société congolaise et un espace de liberté d'expression.",
    body: [],
    sections: [
      {
        heading: "Tradition et modernité",
        paragraphs: [
          "Le théâtre congolais s'enracine dans les traditions orales : contes, proverbes, masques et cérémonies rituelles. La colonisation introduit le théâtre occidental via les missions et les écoles.",
          "Après l'indépendance, des troupes comme le Théâtre National du Congo et des compagnies privées développent un répertoire original en français et en lingala.",
        ],
      },
      {
        heading: "Figures emblématiques",
        paragraphs: [
          "Maman Wuaku est la figure la plus populaire du théâtre comique kinois. Ses sketches en lingala commentent la vie quotidienne avec un humour mordant.",
          "Des dramaturges comme Caya Makhélé et des metteurs en scène formés en Europe apportent une dimension internationale au théâtre congolais.",
        ],
      },
    ],
    timeline: [
      { date: "1960s", event: "Théâtre National du Congo" },
      { date: "1980s", event: "Essor théâtre populaire" },
      { date: "2000s", event: "Festivals et scène internationale" },
    ],
    facts: [
      { label: "Hub", value: "Kinshasa" },
      { label: "Langues", value: "Français, lingala" },
      { label: "Figure", value: "Maman Wuaku" },
    ],
    tags: ["théâtre", "culture", "kinshasa", "satire", "lingala", "art"],
    relatedSlugs: ["cinema-congolais", "lingala-langue", "kinshasa"],
    quality: "standard",
  },
  {
    slug: "mode-fashion-rdc",
    title: "Mode et fashion en RDC",
    subtitle: "Sape · créateurs · wax · Kinshasa",
    category: "culture",
    summary: "La mode congolaise est influencée par la Sape, les tissus wax africains et une nouvelle génération de créateurs kinois. Kinshasa est une capitale de la mode africaine, avec des défilés, des boutiques et des influenceurs qui rayonnent sur la diaspora.",
    body: [],
    sections: [
      {
        heading: "La Sape",
        paragraphs: [
          "La Société des ambianceurs et personnes élégantes (Sape) est un mouvement culturel né à Kinshasa et Brazzaville. Les sapeurs s'habillent avec des marques de luxe européennes comme acte d'affirmation identitaire et de résistance symbolique.",
          "Papa Wemba est le parrain de la Sape. Des documentaires et expositions internationaux ont popularisé ce mouvement unique.",
        ],
      },
      {
        heading: "Créateurs contemporains",
        paragraphs: [
          "Une nouvelle génération de créateurs congolais fusionne wax africain, couture et influences urbaines. Des marques kinoisies commencent à se faire connaître en Afrique et dans la diaspora.",
          "Les réseaux sociaux (Instagram, TikTok) permettent aux créateurs congolais de toucher une audience mondiale sans passer par les circuits traditionnels de la mode.",
        ],
      },
    ],
    timeline: [
      { date: "1960s", event: "Émergence de la Sape" },
      { date: "1980s", event: "Papa Wemba · Sape internationale" },
      { date: "2010s", event: "Nouvelle génération créateurs" },
    ],
    facts: [
      { label: "Mouvement", value: "Sape" },
      { label: "Hub", value: "Kinshasa" },
      { label: "Tissu", value: "Wax africain" },
      { label: "Parrain", value: "Papa Wemba" },
    ],
    tags: ["mode", "sape", "fashion", "kinshasa", "wax", "culture"],
    relatedSlugs: ["sape-congolaise", "papa-wemba-full", "kinshasa"],
    quality: "standard",
  },
  {
    slug: "diaspora-congolaise",
    title: "Diaspora congolaise",
    subtitle: "Belgique · France · Canada · transferts",
    category: "culture",
    summary: "La diaspora congolaise compte plusieurs millions de personnes réparties principalement en Belgique, France, Canada, États-Unis et Afrique du Sud. Elle joue un rôle économique (transferts de fonds), culturel et politique majeur pour la RDC.",
    body: [],
    sections: [
      {
        heading: "Géographie de la diaspora",
        paragraphs: [
          "La Belgique accueille la plus grande communauté congolaise d'Europe, héritière des liens coloniaux. Bruxelles, Liège et Anvers ont des quartiers congolais vivants.",
          "Paris et la région parisienne concentrent une importante communauté. Montréal est la principale destination canadienne. Johannesburg accueille une diaspora économique active.",
          "Aux États-Unis, des villes comme Washington D.C., Atlanta et New York ont des communautés congolaises significatives.",
        ],
      },
      {
        heading: "Rôle économique",
        paragraphs: [
          "Les transferts de fonds de la diaspora représentent plusieurs milliards de dollars par an, dépassant l'aide publique au développement. Ils financent logements, éducation et petites entreprises en RDC.",
          "Des entrepreneurs de la diaspora investissent en RDC : immobilier, restauration, tech et commerce.",
        ],
      },
      {
        heading: "Influence culturelle et politique",
        paragraphs: [
          "La diaspora produit des artistes, intellectuels et militants qui influencent la culture et la politique congolaises. Des associations diasporiques organisent des événements culturels et des collectes de fonds.",
          "Les réseaux sociaux permettent à la diaspora de suivre l'actualité congolaise en temps réel et de participer aux débats politiques.",
        ],
      },
    ],
    timeline: [
      { date: "1960s", event: "Premières vagues d'étudiants en Belgique" },
      { date: "1990s", event: "Exil politique · guerres" },
      { date: "2000s", event: "Diaspora économique · Afrique du Sud" },
      { date: "2020s", event: "Diaspora tech · startups" },
    ],
    facts: [
      { label: "Principales destinations", value: "Belgique, France, Canada, USA" },
      { label: "Transferts", value: "Plusieurs milliards $/an" },
      { label: "Hub européen", value: "Bruxelles" },
      { label: "Hub Afrique", value: "Johannesburg" },
    ],
    tags: ["diaspora", "belgique", "france", "canada", "transferts", "rdc", "congolais"],
    relatedSlugs: ["kinshasa", "independance-rdc-1960", "sape-congolaise"],
    quality: "bon article",
  },
];
