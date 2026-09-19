import type { AyebiArticle } from "./types";

export const SANTE_ARTICLES: AyebiArticle[] = [
  {
    slug: "hopital-panzi",
    title: "Hôpital de Panzi",
    subtitle: "Bukavu · Dr Mukwege · violences sexuelles",
    category: "institution",
    summary: "L'hôpital de Panzi, fondé en 1999 par le Dr Denis Mukwege à Bukavu, est une référence mondiale pour la prise en charge des victimes de violences sexuelles en temps de guerre. Il a soigné des dizaines de milliers de femmes victimes des conflits de l'Est congolais.",
    body: [],
    sections: [
      {
        heading: "Fondation et mission",
        paragraphs: [
          "Le Dr Denis Mukwege fonde l'hôpital de Panzi en 1999 pour répondre à l'afflux de femmes victimes de violences sexuelles liées aux conflits armés du Kivu. L'hôpital offre soins chirurgicaux, soutien psychologique, accompagnement juridique et réinsertion sociale.",
          "La Fondation Panzi, bras humanitaire de l'hôpital, étend son action à la plaidoirie internationale pour la justice et la paix.",
        ],
      },
      {
        heading: "Reconnaissance mondiale",
        paragraphs: [
          "L'hôpital de Panzi est cité dans les rapports de l'ONU, de l'OMS et des grandes ONG comme modèle de prise en charge holistique des survivantes.",
          "Le Prix Nobel de la paix 2018 décerné au Dr Mukwege a mis l'hôpital sous les projecteurs mondiaux, attirant financements et partenariats internationaux.",
        ],
      },
    ],
    timeline: [
      { date: "1999", event: "Fondation de l'hôpital" },
      { date: "2018", event: "Prix Nobel de la paix · Dr Mukwege" },
      { date: "2020s", event: "Expansion services et plaidoirie" },
    ],
    facts: [
      { label: "Fondateur", value: "Dr Denis Mukwege" },
      { label: "Ville", value: "Bukavu · Sud-Kivu" },
      { label: "Spécialité", value: "Violences sexuelles · chirurgie" },
      { label: "Patients", value: "Dizaines de milliers" },
    ],
    tags: ["panzi", "hôpital", "mukwege", "bukavu", "santé", "femmes", "conflit"],
    relatedSlugs: ["denis-mukwege", "bukavu", "kivu-region"],
    quality: "bon article",
  },
  {
    slug: "hopital-biamba-marie",
    title: "Hôpital Biamba Marie Mutombo",
    subtitle: "Kinshasa · Dikembe Mutombo · philanthropie",
    category: "institution",
    summary: "L'hôpital Biamba Marie Mutombo est un hôpital moderne construit à Kinshasa grâce aux fonds de la fondation du basketteur Dikembe Mutombo. Inauguré en 2007, il offre des soins de qualité à la population kinoise.",
    body: [],
    sections: [
      {
        heading: "Construction et inauguration",
        paragraphs: [
          "Dikembe Mutombo finance la construction de cet hôpital en mémoire de sa mère Biamba Marie. Il investit plusieurs millions de dollars personnels et mobilise des donateurs internationaux.",
          "L'hôpital est inauguré en 2007 en présence de personnalités congolaises et internationales. Il dispose de blocs opératoires, d'une maternité, d'un service de pédiatrie et d'urgences.",
        ],
      },
      {
        heading: "Impact",
        paragraphs: [
          "L'hôpital soigne des milliers de patients par an, offrant des soins inaccessibles dans les structures publiques surpeuplées. Il est un modèle de philanthropie sportive africaine.",
        ],
      },
    ],
    timeline: [
      { date: "2000s", event: "Financement et construction" },
      { date: "2007", event: "Inauguration" },
    ],
    facts: [
      { label: "Fondateur", value: "Dikembe Mutombo" },
      { label: "Ville", value: "Kinshasa" },
      { label: "Inauguration", value: "2007" },
      { label: "Financement", value: "Fondation Mutombo" },
    ],
    tags: ["hôpital", "mutombo", "kinshasa", "santé", "philanthropie"],
    relatedSlugs: ["dikembe-mutombo-full", "kinshasa"],
    quality: "standard",
  },
  {
    slug: "ebola-rdc",
    title: "Épidémies d'Ebola en RDC",
    subtitle: "Virus · épidémies · réponse sanitaire",
    category: "institution",
    summary: "La RDC a connu plus d'une dizaine d'épidémies d'Ebola depuis la découverte du virus en 1976 près de la rivière Ebola (Équateur). Le pays a développé une expertise mondiale dans la réponse aux épidémies, notamment lors de l'épidémie de 2018–2020 au Nord-Kivu.",
    body: [],
    sections: [
      {
        heading: "Découverte du virus",
        paragraphs: [
          "Le virus Ebola est identifié pour la première fois en 1976 lors de deux épidémies simultanées : l'une à Nzara (Soudan) et l'autre à Yambuku (Zaïre), près de la rivière Ebola. Le Dr Peter Piot et une équipe internationale identifient le nouveau pathogène.",
          "Depuis 1976, la RDC a connu plus de 14 épidémies, plus que tout autre pays au monde. Cette expérience a forgé une expertise nationale unique.",
        ],
      },
      {
        heading: "Épidémie 2018–2020",
        paragraphs: [
          "L'épidémie de 2018–2020 au Nord-Kivu et en Ituri est la deuxième plus meurtrière de l'histoire d'Ebola : plus de 2 200 morts. Elle se déroule dans une zone de conflit actif, compliquant la réponse sanitaire.",
          "Pour la première fois, un vaccin (rVSV-ZEBOV) est utilisé à grande échelle. L'INRB, l'OMS et des centaines de travailleurs de santé congolais mènent la riposte.",
        ],
      },
      {
        heading: "Expertise congolaise",
        paragraphs: [
          "La RDC a développé des protocoles de riposte reconnus mondialement : traçage des contacts, centres de traitement Ebola, vaccination en anneau, communication communautaire.",
          "L'INRB (Institut national de recherche biomédicale) est le laboratoire de référence. Des épidémiologistes congolais forment désormais d'autres pays africains.",
        ],
      },
    ],
    timeline: [
      { date: "1976", event: "Découverte du virus Ebola à Yambuku" },
      { date: "1995", event: "Épidémie de Kikwit · 250 morts" },
      { date: "2018–2020", event: "Épidémie Nord-Kivu · 2 200 morts" },
      { date: "2021", event: "Épidémie Équateur · rapidement maîtrisée" },
    ],
    facts: [
      { label: "Découverte", value: "1976 · Yambuku (Équateur)" },
      { label: "Épidémies", value: ">14 depuis 1976" },
      { label: "Pire épidémie", value: "2018–2020 · Nord-Kivu" },
      { label: "Vaccin", value: "rVSV-ZEBOV (2018)" },
      { label: "Laboratoire", value: "INRB · Kinshasa" },
    ],
    tags: ["ebola", "épidémie", "santé", "virus", "inrb", "rdc", "yambuku"],
    relatedSlugs: ["inrb", "kivu-region", "sante-rdc"],
    quality: "bon article",
  },
  {
    slug: "sante-rdc",
    title: "Système de santé de la RDC",
    subtitle: "Zones de santé · hôpitaux · défis",
    category: "institution",
    summary: "Le système de santé congolais est organisé en zones de santé (519 au total). Il fait face à des défis immenses : sous-financement, manque de personnel qualifié, infrastructures dégradées et maladies tropicales endémiques. Les Églises et les ONG jouent un rôle supplétif crucial.",
    body: [],
    sections: [
      {
        heading: "Organisation",
        paragraphs: [
          "Le système est pyramidal : centres de santé (niveau primaire), hôpitaux généraux de référence (niveau secondaire) et hôpitaux provinciaux et nationaux (niveau tertiaire).",
          "Les 519 zones de santé couvrent l'ensemble du territoire. Chaque zone comprend un hôpital général de référence et plusieurs centres de santé.",
          "Le ministère de la Santé publique coordonne avec les partenaires : OMS, UNICEF, MSF, USAID et des centaines d'ONG nationales et internationales.",
        ],
      },
      {
        heading: "Maladies prioritaires",
        paragraphs: [
          "Le paludisme est la première cause de mortalité, notamment chez les enfants de moins de 5 ans. La RDC représente environ 12% des cas mondiaux.",
          "La tuberculose, le VIH/SIDA, la trypanosomiase (maladie du sommeil), la schistosomiase et les maladies diarrhéiques sont également prioritaires.",
          "La malnutrition chronique touche environ 43% des enfants de moins de 5 ans, l'une des prévalences les plus élevées au monde.",
        ],
      },
      {
        heading: "Défis et réformes",
        paragraphs: [
          "Le budget de la santé représente moins de 5% du budget national, bien en dessous des 15% recommandés par l'Union africaine (Déclaration d'Abuja).",
          "La couverture santé universelle (CSU) est un objectif du gouvernement Tshisekedi. Des réformes de financement et de gouvernance sont en cours.",
        ],
      },
    ],
    timeline: [
      { date: "1960", event: "Héritage système colonial" },
      { date: "1984", event: "Réforme zones de santé" },
      { date: "2018", event: "Stratégie nationale de santé" },
      { date: "2020s", event: "Couverture santé universelle" },
    ],
    facts: [
      { label: "Zones de santé", value: "519" },
      { label: "Budget santé", value: "<5% budget national" },
      { label: "1ère cause mortalité", value: "Paludisme" },
      { label: "Malnutrition enfants", value: "~43%" },
      { label: "Partenaires", value: "OMS, UNICEF, MSF, USAID" },
    ],
    tags: ["santé", "hôpital", "paludisme", "rdc", "zones de santé", "médecine"],
    relatedSlugs: ["ebola-rdc", "hopital-panzi", "inrb"],
    quality: "bon article",
  },
  {
    slug: "paludisme-rdc",
    title: "Paludisme en RDC",
    subtitle: "Première cause de mortalité · prévention",
    category: "institution",
    summary: "Le paludisme est la première cause de mortalité en RDC, représentant environ 12% des cas mondiaux. La RDC est le pays le plus touché d'Afrique. Des programmes de distribution de moustiquaires, de traitement préventif et de pulvérisation intradomiciliaire tentent de réduire le fardeau.",
    body: [],
    sections: [
      {
        heading: "Ampleur du problème",
        paragraphs: [
          "La RDC enregistre environ 25 millions de cas de paludisme par an, dont la majorité chez les enfants de moins de 5 ans et les femmes enceintes. Le plasmodium falciparum est l'espèce dominante.",
          "Le climat équatorial (chaleur et humidité) favorise la reproduction des moustiques anophèles vecteurs. La forêt dense et les zones marécageuses amplifient le risque.",
        ],
      },
      {
        heading: "Prévention et traitement",
        paragraphs: [
          "La distribution de moustiquaires imprégnées d'insecticide (MII) est la principale mesure préventive. Des millions de moustiquaires sont distribuées chaque année par le gouvernement et les ONG.",
          "Le traitement de première ligne est l'artémisinine combinée (ACT). Des programmes de traitement préventif intermittent (TPI) ciblent les femmes enceintes.",
          "Le vaccin RTS,S (Mosquirix) est en cours de déploiement dans certaines zones. La RDC participe aux essais du vaccin R21.",
        ],
      },
    ],
    timeline: [
      { date: "1960s", event: "Programmes d'éradication coloniaux" },
      { date: "2000s", event: "Distribution massive moustiquaires" },
      { date: "2019", event: "Déploiement vaccin RTS,S" },
    ],
    facts: [
      { label: "Cas annuels", value: "~25 millions" },
      { label: "Part mondiale", value: "~12%" },
      { label: "Espèce", value: "Plasmodium falciparum" },
      { label: "Prévention", value: "Moustiquaires · TPI" },
      { label: "Traitement", value: "ACT (artémisinine)" },
    ],
    tags: ["paludisme", "malaria", "santé", "rdc", "moustique", "enfants"],
    relatedSlugs: ["sante-rdc", "ebola-rdc", "foret-congo"],
    quality: "standard",
  },
];
