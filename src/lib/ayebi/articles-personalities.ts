import { ayebi } from "./types";

export const PERSONALITY_ARTICLES = [
  ayebi(
    "patrice-lumumba",
    "Patrice Lumumba",
    "Premier ministre · indépendance 1960",
    "personnalité",
    "Figure centrale de l'indépendance congolaise. Premier Premier ministre de la RDC, symbole de souveraineté africaine, assassiné en 1961.",
    [
      "Journaliste et militant, Lumumba fonde le MNC et porte la voix d'un Congo libre lors des négociations avec la Belgique.",
      "Son discours du 30 juin 1960 marque les esprits. La crise katangaise et les ingérences étrangères précipitent sa chute et son exécution.",
    ],
    [
      { label: "Naissance", value: "1925 · Sankuru" },
      { label: "Décès", value: "1961 · Lubumbashi" },
      { label: "Parti", value: "MNC-Lumumba" },
    ],
    ["lumumba", "indépendance", "1960", "histoire", "politique"],
  ),
  ayebi(
    "felix-tshisekedi",
    "Félix Tshisekedi",
    "Président de la République · depuis 2019",
    "personnalité",
    "Chef de l'État congolais, président de l'UDPS. Élu en 2019, réélu en 2023. Fils de l'opposant historique Étienne Tshisekedi.",
    [
      "Son premier mandat mêle coalition avec le camp Kabila, réformes institutionnelles et défis sécuritaires à l'Est.",
      "Le second mandat ouvre sur la souveraineté minière, l'intégration régionale CEEAC/SADC et la modernisation administrative.",
    ],
    [
      { label: "Naissance", value: "13 juin 1963" },
      { label: "Parti", value: "UDPS" },
      { label: "Mandat", value: "2019 — présent" },
    ],
    ["tshisekedi", "président", "udps", "politique"],
  ),
  ayebi(
    "joseph-kabila",
    "Joseph Kabila",
    "Ancien président · 2001–2019",
    "personnalité",
    "Succède à Laurent-Désiré Kabila après son assassinat. Président durant les Accords de Sun City, les guerres de l'Est et la première transition électorale de 2018.",
    [
      "Kabila dirige la RDC pendant près de deux décennies, période marquée par stabilisation relative, boom minier et tensions démocratiques.",
      "Il quitte le pouvoir après l'élection de 2018 tout en conservant une influence politique via la FCC.",
    ],
    [
      { label: "Mandat", value: "2001 — 2019" },
      { label: "Parti", value: "PPRD / FCC" },
    ],
    ["kabila", "président", "fcc", "politique", "sun city"],
  ),
  ayebi(
    "mobutu-sese-seko",
    "Mobutu Sese Seko",
    "Président · Zaïre 1965–1997",
    "personnalité",
    "Dirigeant du Zaïre pendant 32 ans. Architecte du régime du Mouvement populaire de la Révolution (MPR) et de la politique d'authenticité.",
    [
      "Mobutu prend le pouvoir par un coup d'État en 1965 et renomme le pays Zaïre en 1971.",
      "Son règne combine centralisation, culte de la personnalité et déclin économique, jusqu'à sa chute en 1997 face à l'AFDL.",
    ],
    [
      { label: "Règne", value: "1965 — 1997" },
      { label: "Capitale", value: "Kinshasa" },
      { label: "Parti", value: "MPR" },
    ],
    ["mobutu", "zaïre", "mpr", "histoire", "politique"],
  ),
  ayebi(
    "etienne-tshisekedi",
    "Étienne Tshisekedi",
    "Opposant historique · UDPS",
    "personnalité",
    "Figure majeure de l'opposition congolaise. Fondateur de l'UDPS, Premier ministre sous Mobutu, symbole de la résistance démocratique.",
    [
      "Tshisekedi refuse à plusieurs reprises des compromis avec Mobutu, consolidant l'UDPS comme force d'opposition.",
      "Son décès en 2017 laisse un héritage politique repris par son fils Félix et une base militante nationale.",
    ],
    [
      { label: "Naissance", value: "1932" },
      { label: "Décès", value: "2017" },
      { label: "Parti", value: "UDPS" },
    ],
    ["tshisekedi", "udps", "opposition", "politique"],
  ),
  ayebi(
    "laurent-desire-kabila",
    "Laurent-Désiré Kabila",
    "Président · AFDL · 1997–2001",
    "personnalité",
    "Chef de l'AFDL qui renverse Mobutu en 1997. Président de la RDC jusqu'à son assassinat en janvier 2001.",
    [
      "Kabila mène la rébellion de l'AFDL avec un soutien régional, promettant démocratie et reconstruction.",
      "Son mandat est marqué par la guerre dite des « six jours » avec le Rwanda et une gouvernance autoritaire.",
    ],
    [
      { label: "Mandat", value: "1997 — 2001" },
      { label: "Mouvement", value: "AFDL" },
    ],
    ["kabila", "afdl", "1997", "histoire", "politique"],
  ),
  ayebi(
    "moise-katumbi",
    "Moïse Katumbi",
    "Homme d'affaires · politique · Katanga",
    "personnalité",
    "Entrepreneur et ancien gouverneur du Katanga. Propriétaire du TP Mazembe, figure économique et politique du sud-est congolais.",
    [
      "Katumbi modernise les infrastructures katangaises et popularise le football via le Mazembe, club continental prestigieux.",
      "Exilé puis revenu, il s'impose comme leader d'opposition/allié selon les cycles électoraux.",
    ],
    [
      { label: "Région", value: "Katanga" },
      { label: "Club", value: "TP Mazembe" },
    ],
    ["katumbi", "katanga", "mazembe", "politique", "football"],
  ),
  ayebi(
    "denis-mukwege",
    "Denis Mukwege",
    "Gynécologue · Nobel de la paix 2018",
    "personnalité",
    "Médecin congolais, fondateur de l'hôpital Panzi à Bukavu. Prix Nobel pour son combat contre les violences sexuelles en temps de guerre.",
    [
      "Le Dr Mukwege opère des milliers de survivantes et plaide internationalement pour la justice et la paix à l'Est.",
      "Sa voix critique les groupes armés et l'impunité, au prix de menaces et d'exil temporaire.",
    ],
    [
      { label: "Prix", value: "Nobel de la paix 2018" },
      { label: "Hôpital", value: "Panzi · Bukavu" },
    ],
    ["mukwege", "nobel", "bukavu", "santé", "paix"],
  ),
  ayebi(
    "jean-pierre-bemba",
    "Jean-Pierre Bemba",
    "Homme politique · MLC · ancien vice-président",
    "personnalité",
    "Leader du Mouvement de libération du Congo. Ancien vice-président, sénateur et figure de l'opposition.",
    [
      "Bemba dirige le MLC pendant la deuxième guerre du Congo et participe au gouvernement d'union nationale.",
      "Acquitté par la CPI après des procédures longues, il reste une voix politique audible à Kinshasa.",
    ],
    [
      { label: "Parti", value: "MLC" },
      { label: "Fonction", value: "Vice-président (2003–2006)" },
    ],
    ["bemba", "mlc", "politique", "opposition"],
  ),
  ayebi(
    "kasa-vubu",
    "Joseph Kasa-Vubu",
    "Premier président · République du Congo 1960–1965",
    "personnalité",
    "Président de la RDC à l'indépendance. Chef de l'ABAKO, il incarne la figure présidentielle face à Lumumba.",
    [
      "Kasa-Vubu prononce la déclaration d'indépendance et entre en conflit ouvert avec Lumumba en 1960.",
      "Son mandat précède la montée de Mobutu et reste une référence du nationalisme kongo.",
    ],
    [
      { label: "Mandat", value: "1960 — 1965" },
      { label: "Parti", value: "ABAKO" },
    ],
    ["kasa-vubu", "abako", "indépendance", "histoire"],
  ),
  ayebi(
    "martin-fayulu",
    "Martin Fayulu",
    "Opposant · Lamuka · élections 2018",
    "personnalité",
    "Homme d'affaires et leader de l'opposition regroupée Lamuka. Candidat contesté à l'élection présidentielle de 2018.",
    [
      "Fayulu revendique la victoire selon des compilations parallèles de résultats et reste actif dans la scène politique.",
      "Il représente une opposition civique et économique exigeant transparence électorale.",
    ],
    [
      { label: "Coalition", value: "Lamuka" },
      { label: "Élection", value: "2018" },
    ],
    ["fayulu", "lamuka", "opposition", "élection"],
  ),
  ayebi(
    "vital-kamerhe",
    "Vital Kamerhe",
    "Homme politique · UNC · ancien président AN",
    "personnalité",
    "Leader de l'Union pour la nation congolaise. Ancien président de l'Assemblée nationale et allié puis opposant selon les cycles.",
    [
      "Kamerhe joue un rôle clé dans les coalitions électorales et la vie parlementaire.",
      "Sa trajectoire illustre les recompositions rapides de la politique kinshasaise.",
    ],
    [
      { label: "Parti", value: "UNC" },
      { label: "Région", value: "Sud-Kivu" },
    ],
    ["kamerhe", "unc", "politique", "assemblée"],
  ),
  ayebi(
    "augustin-matata-ponyo",
    "Augustin Matata Ponyo",
    "Économiste · ancien Premier ministre",
    "personnalité",
    "Ancien gouverneur de la Banque centrale puis Premier ministre sous Joseph Kabila. Figure de la gestion macroéconomique.",
    [
      "Matata Ponyo supervise des réformes budgétaires et la négociation avec le FMI.",
      "Il reste une référence dans les débats sur la dette, les mines et la gouvernance économique.",
    ],
    [
      { label: "Fonction", value: "Premier ministre (2012–2016)" },
      { label: "Formation", value: "Économiste" },
    ],
    ["matata", "premier ministre", "économie", "bcc"],
  ),
  ayebi(
    "maman-wuaku",
    "Maman Wuaku",
    "Artiste · théâtre · culture populaire",
    "personnalité",
    "Comédienne et metteuse en scène emblématique du théâtre congolais. Voix de la satire sociale à Kinshasa.",
    [
      "Maman Wuaku utilise l'humour pour commenter la vie quotidienne des Kinois.",
      "Elle forme des générations d'acteurs et reste une présence des scènes populaires.",
    ],
    [
      { label: "Domaine", value: "Théâtre · comédie" },
      { label: "Ville", value: "Kinshasa" },
    ],
    ["maman wuaku", "théâtre", "culture", "humour"],
  ),
  ayebi(
    "dikembe-mutombo",
    "Dikembe Mutombo",
    "Basketteur · NBA · philanthropie",
    "personnalité",
    "Joueur congolais légendaire de NBA. Célèbre pour ses blocks et son engagement humanitaire via la fondation Mutombo.",
    [
      "Mutombo popularise le basketball congolais à l'international et finance des projets de santé à Kinshasa.",
      "Son parcours inspire les jeunes sportifs congolais vers les ligues américaines et européennes.",
    ],
    [
      { label: "Sport", value: "Basketball · NBA" },
      { label: "Origine", value: "Kinshasa" },
    ],
    ["mutombo", "basketball", "nba", "sport", "philanthropie"],
  ),
];
