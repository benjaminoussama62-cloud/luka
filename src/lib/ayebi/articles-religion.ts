import type { AyebiArticle } from "./types";

export const RELIGION_ARTICLES: AyebiArticle[] = [
  {
    slug: "christianisme-rdc",
    title: "Christianisme en RDC",
    subtitle: "Catholicisme · protestantisme · kimbanguisme",
    category: "culture",
    summary:
      "Le christianisme est la religion majoritaire en RDC, pratiqué par environ 95% de la population. Catholiques, protestants, kimbanguistes et évangéliques coexistent dans un paysage religieux vivant qui structure la vie sociale, l'éducation et la politique congolaise.",
    body: [],
    sections: [
      {
        heading: "Catholicisme",
        paragraphs: [
          "L'Église catholique est la plus grande institution religieuse du pays. Elle gère des milliers d'écoles, hôpitaux et universités. L'archidiocèse de Kinshasa, dirigé par le cardinal Fridolin Ambongo, est l'un des plus importants d'Afrique.",
          "La CENCO (Conférence épiscopale nationale du Congo) joue un rôle politique important : elle a médié des crises électorales (2016–2018) et publie régulièrement des déclarations sur la gouvernance et la paix.",
          "Le catholicisme congolais est marqué par une forte inculturation : messes en lingala et swahili, chants traditionnels, danses liturgiques et intégration d'éléments culturels locaux.",
        ],
      },
      {
        heading: "Protestantisme et évangélisme",
        paragraphs: [
          "Les Églises protestantes historiques (Baptiste, Méthodiste, Presbytérienne) sont regroupées dans l'Église du Christ au Congo (ECC). Elles gèrent également de nombreuses écoles et hôpitaux.",
          "Les Églises évangéliques et pentecôtistes connaissent une croissance explosive depuis les années 1980. Des milliers de nouvelles Églises émergent chaque année à Kinshasa et dans les provinces.",
          "Les « prophètes » et pasteurs charismatiques attirent des foules immenses. Certains cumulent influence spirituelle et pouvoir économique, suscitant des débats sur la régulation des Églises.",
        ],
      },
      {
        heading: "Kimbanguisme",
        paragraphs: [
          "L'Église kimbanguiste (EJCSK) est la plus grande Église africaine indépendante. Fondée par Simon Kimbangu (1887–1951), elle compte des millions de fidèles en RDC et dans la diaspora.",
          "Kimbangu, prédicateur baptiste, est arrêté par les Belges en 1921 et emprisonné jusqu'à sa mort. Son mouvement, d'abord clandestin, est officiellement reconnu en 1959.",
          "La théologie kimbanguiste intègre des éléments africains : Kimbangu est vénéré comme prophète, ses fils lui succèdent à la tête de l'Église. Le siège est à Nkamba (Kongo Central), lieu de pèlerinage.",
        ],
      },
      {
        heading: "Rôle social et politique",
        paragraphs: [
          "Les Églises gèrent environ 70% des écoles et 40% des hôpitaux en RDC, suppléant un État aux capacités limitées. Cette présence leur confère une influence sociale considérable.",
          "Les leaders religieux participent aux médiations politiques. Mgr Laurent Monsengwo a présidé la Conférence nationale souveraine (1991–92). Le cardinal Ambongo est une voix critique sur la gouvernance.",
        ],
      },
    ],
    timeline: [
      { date: "1491", event: "Christianisation du Royaume Kongo" },
      { date: "1878", event: "Missions catholiques dans le bassin du Congo" },
      { date: "1921", event: "Arrestation de Simon Kimbangu" },
      { date: "1959", event: "Reconnaissance officielle du kimbanguisme" },
      { date: "1991–92", event: "Monsengwo préside la CNS" },
    ],
    facts: [
      { label: "Catholiques", value: "~50% de la population" },
      { label: "Protestants/évangéliques", value: "~35%" },
      { label: "Kimbanguistes", value: "~10%" },
      { label: "Cardinal", value: "Fridolin Ambongo" },
      { label: "CENCO", value: "Conférence épiscopale nationale" },
    ],
    tags: ["christianisme", "catholicisme", "kimbanguisme", "religion", "église", "rdc"],
    relatedSlugs: ["kimbanguisme", "simon-kimbangu", "conference-nationale-souveraine"],
    quality: "bon article",
  },
  {
    slug: "simon-kimbangu",
    title: "Simon Kimbangu",
    subtitle: "Prophète · fondateur EJCSK · 1887–1951",
    category: "personnalité",
    summary:
      "Simon Kimbangu est un prophète et guérisseur congolais, fondateur du mouvement kimbanguiste. Arrêté par les autorités coloniales belges en 1921, il passe 30 ans en prison. Son Église (EJCSK) est aujourd'hui la plus grande Église africaine indépendante avec des millions de fidèles.",
    body: [],
    sections: [
      {
        heading: "Vie et ministère",
        paragraphs: [
          "Simon Kimbangu naît vers 1887 à Nkamba (Kongo Central). Baptisé dans l'Église baptiste britannique, il travaille comme catéchiste. En avril 1921, il commence à prêcher et à pratiquer des guérisons à Nkamba, attirant des foules immenses.",
          "Son message mêle christianisme et résistance à l'oppression coloniale. Il prêche en kikongo, utilise des symboles locaux et rejette les fétiches traditionnels. Les Belges voient dans son mouvement une menace politique.",
        ],
      },
      {
        heading: "Arrestation et emprisonnement",
        paragraphs: [
          "Arrêté en septembre 1921, Kimbangu est condamné à mort pour sédition. La peine est commuée en prison à vie par le roi Albert Ier. Il est transféré à Élisabethville (Lubumbashi) où il reste emprisonné jusqu'à sa mort en 1951.",
          "Pendant ses 30 ans de prison, son mouvement continue clandestinement. Des milliers de ses fidèles sont déportés dans d'autres provinces par les autorités coloniales.",
        ],
      },
      {
        heading: "Héritage",
        paragraphs: [
          "L'EJCSK (Église de Jésus-Christ sur la Terre par le Prophète Simon Kimbangu) est officiellement reconnue en 1959. Elle est membre du Conseil œcuménique des Églises depuis 1969.",
          "Nkamba, rebaptisée « Nouvelle Jérusalem », est un lieu de pèlerinage. La dépouille de Kimbangu y est conservée. Ses fils et petits-fils ont successivement dirigé l'Église.",
        ],
      },
    ],
    timeline: [
      { date: "~1887", event: "Naissance à Nkamba" },
      { date: "Avr. 1921", event: "Début du ministère public" },
      { date: "Sept. 1921", event: "Arrestation par les Belges" },
      { date: "1951", event: "Décès en prison à Lubumbashi" },
      { date: "1959", event: "Reconnaissance officielle de l'EJCSK" },
    ],
    facts: [
      { label: "Naissance", value: "~1887 · Nkamba" },
      { label: "Décès", value: "1951 · Lubumbashi" },
      { label: "Église", value: "EJCSK" },
      { label: "Lieu saint", value: "Nkamba · Nouvelle Jérusalem" },
      { label: "Langue", value: "Kikongo" },
    ],
    tags: ["kimbangu", "kimbanguisme", "religion", "prophète", "histoire", "kongo central"],
    relatedSlugs: ["christianisme-rdc", "kongo-central"],
    quality: "bon article",
  },
  {
    slug: "islam-rdc",
    title: "Islam en RDC",
    subtitle: "Minorité · Maniema · Kivu · commerce",
    category: "culture",
    summary:
      "L'islam est pratiqué par environ 1 à 5% de la population congolaise, principalement dans les provinces du Maniema, du Kivu et dans certains quartiers de Kinshasa. Il est arrivé via les routes commerciales swahilies de l'Est africain au XIXe siècle.",
    body: [],
    sections: [
      {
        heading: "Histoire et diffusion",
        paragraphs: [
          "L'islam pénètre le Congo par l'Est au XIXe siècle, via les réseaux commerciaux swahilis et les caravanes de Zanzibar. Des marchands comme Tippu Tip établissent des comptoirs dans le Maniema et le Kivu.",
          "La colonisation belge freine l'expansion de l'islam, perçu comme concurrent des missions chrétiennes. Après l'indépendance, les communautés musulmanes se développent librement.",
        ],
      },
      {
        heading: "Communautés et pratiques",
        paragraphs: [
          "Les musulmans congolais sont majoritairement sunnites. Les mosquées sont présentes dans toutes les grandes villes. Kinshasa compte plusieurs mosquées importantes, dont la Grande Mosquée de Kinshasa.",
          "La communauté musulmane est active dans le commerce, notamment dans les quartiers de Kinshasa (Matonge, Barumbu) et dans les villes de l'Est.",
        ],
      },
      {
        heading: "Relations interreligieuses",
        paragraphs: [
          "La RDC est généralement un exemple de coexistence religieuse pacifique. Chrétiens et musulmans partagent quartiers, marchés et institutions. Les mariages mixtes sont courants.",
          "Le Conseil islamique de la RDC représente la communauté auprès des autorités et participe aux dialogues interreligieux.",
        ],
      },
    ],
    timeline: [
      { date: "XIXe s.", event: "Arrivée via routes commerciales swahilies" },
      { date: "1880s", event: "Tippu Tip et comptoirs dans le Maniema" },
      { date: "1960", event: "Liberté religieuse à l'indépendance" },
      { date: "2000s", event: "Croissance des communautés urbaines" },
    ],
    facts: [
      { label: "Population", value: "~1–5% de la RDC" },
      { label: "Régions", value: "Maniema, Kivu, Kinshasa" },
      { label: "Rite", value: "Sunnite majoritaire" },
      { label: "Entrée", value: "Via l'Est · XIXe siècle" },
    ],
    tags: ["islam", "religion", "maniema", "kivu", "swahili", "rdc"],
    relatedSlugs: ["christianisme-rdc", "kivu-region"],
    quality: "standard",
  },
  {
    slug: "religions-traditionnelles-rdc",
    title: "Religions traditionnelles congolaises",
    subtitle: "Animisme · ancêtres · fétiches · guérisseurs",
    category: "culture",
    summary:
      "Les religions traditionnelles congolaises, souvent appelées animisme, constituent le substrat spirituel de la société congolaise. Culte des ancêtres, croyance aux esprits, pratiques de guérison et rituels d'initiation coexistent avec le christianisme dans la vie quotidienne.",
    body: [],
    sections: [
      {
        heading: "Croyances fondamentales",
        paragraphs: [
          "Les religions traditionnelles congolaises partagent plusieurs traits communs : croyance en un Dieu créateur suprême (Nzambe en lingala, Nzambi en kikongo), culte des ancêtres comme intermédiaires entre vivants et divinités, et croyance en des esprits de la nature.",
          "Les fétiches (nkisi en kikongo) sont des objets rituels chargés de puissance spirituelle. Ils servent à la protection, à la guérison ou à l'attaque. Les nganga (guérisseurs-devins) les fabriquent et les activent.",
        ],
      },
      {
        heading: "Pratiques et rituels",
        paragraphs: [
          "Les rituels d'initiation marquent les passages de vie : naissance, puberté, mariage, mort. Ils varient selon les ethnies : initiation mukanda chez les Tshokwe, rituels bwami chez les Lega.",
          "La danse et la musique sont centrales dans les cérémonies religieuses. Les masques rituels (Tshokwe, Kuba, Luba) sont des œuvres d'art et des objets sacrés.",
        ],
      },
      {
        heading: "Syncrétisme",
        paragraphs: [
          "La majorité des Congolais pratiquent un syncrétisme entre christianisme et croyances traditionnelles. Les Églises de réveil intègrent souvent des éléments de délivrance contre les « sorciers » et les « mauvais esprits ».",
          "La sorcellerie (kindoki) reste une réalité sociale : accusations, conflits familiaux et parfois violences liées à ces croyances sont documentés dans tout le pays.",
        ],
      },
    ],
    timeline: [
      { date: "Préhistoire", event: "Développement des religions bantoues" },
      { date: "XVe–XVIe s.", event: "Contact avec le christianisme" },
      { date: "XIXe–XXe s.", event: "Colonisation et missions" },
      { date: "Aujourd'hui", event: "Syncrétisme vivant" },
    ],
    facts: [
      { label: "Dieu suprême", value: "Nzambe (lingala) · Nzambi (kikongo)" },
      { label: "Guérisseurs", value: "Nganga" },
      { label: "Objets rituels", value: "Nkisi (fétiches)" },
      { label: "Pratique", value: "Syncrétisme avec christianisme" },
    ],
    tags: ["animisme", "religion", "tradition", "ancêtres", "fétiches", "nganga", "rdc"],
    relatedSlugs: ["christianisme-rdc", "royaume-kongo"],
    quality: "standard",
  },
  {
    slug: "eglises-de-reveil-rdc",
    title: "Églises de réveil en RDC",
    subtitle: "Pentecôtisme · prophètes · croissance",
    category: "culture",
    summary:
      "Les Églises de réveil (pentecôtistes, charismatiques, évangéliques indépendantes) connaissent une croissance explosive en RDC depuis les années 1980. Elles attirent des millions de fidèles avec des cultes dynamiques, des guérisons miraculeuses et des prophètes charismatiques.",
    body: [],
    sections: [
      {
        heading: "Émergence et croissance",
        paragraphs: [
          "Le mouvement de réveil prend son essor dans les années 1980, en réponse à la crise économique et sociale du Zaïre de Mobutu. Des pasteurs forment leurs propres Églises, souvent dans des maisons ou des hangars.",
          "Aujourd'hui, Kinshasa compte des milliers d'Églises de réveil. Certaines rassemblent des dizaines de milliers de fidèles dans des stades ou des cathédrales construites à cet effet.",
        ],
      },
      {
        heading: "Figures emblématiques",
        paragraphs: [
          "Des pasteurs comme Dieu Merci Ndongala, Théodore Ngoy et d'autres ont bâti des empires religieux avec médias, écoles et entreprises. Certains sont devenus des figures politiques.",
          "Les « prophètes » annoncent des révélations, pratiquent des guérisons et des délivrances. Leurs cultes télévisés et YouTube touchent des millions de personnes en RDC et dans la diaspora.",
        ],
      },
      {
        heading: "Débats et régulation",
        paragraphs: [
          "La prolifération des Églises soulève des questions : escroqueries, abus de confiance, exploitation financière des fidèles. Le gouvernement tente de réguler sans succès durable.",
          "Les Églises de réveil jouent néanmoins un rôle social important : réseaux d'entraide, soutien psychologique, éducation et emploi pour leurs membres.",
        ],
      },
    ],
    timeline: [
      { date: "1980s", event: "Émergence des premières Églises de réveil" },
      { date: "1990s", event: "Explosion du mouvement" },
      { date: "2000s", event: "Médiatisation · télévision · internet" },
      { date: "2010s", event: "Débats sur régulation" },
    ],
    facts: [
      { label: "Nombre estimé", value: "Des milliers d'Églises à Kinshasa" },
      { label: "Courant", value: "Pentecôtiste · charismatique" },
      { label: "Médias", value: "TV, radio, YouTube" },
      { label: "Croissance", value: "Exponentielle depuis 1980" },
    ],
    tags: ["église", "réveil", "pentecôtisme", "religion", "kinshasa", "prophète"],
    relatedSlugs: ["christianisme-rdc", "kinshasa"],
    quality: "standard",
  },
];
