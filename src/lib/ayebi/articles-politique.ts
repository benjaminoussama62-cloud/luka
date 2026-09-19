import type { AyebiArticle } from "./types";

export const POLITIQUE_ARTICLES: AyebiArticle[] = [
  {
    slug: "constitution-rdc-2006",
    title: "Constitution de la RDC (2006)",
    subtitle: "IIIe République · démocratie · droits fondamentaux",
    category: "institution",
    summary: "La Constitution du 18 février 2006 est la loi fondamentale de la République démocratique du Congo. Adoptée par référendum, elle instaure la IIIe République avec un régime semi-présidentiel, la décentralisation en 26 provinces et la garantie des droits fondamentaux.",
    body: [],
    sections: [
      {
        heading: "Élaboration et adoption",
        paragraphs: [
          "La Constitution est rédigée dans le cadre du processus de paix post-guerre (Accords de Sun City 2002). Un comité de rédaction associe toutes les composantes politiques du pays.",
          "Elle est adoptée par référendum le 18 décembre 2005 avec 84% de oui, et promulguée le 18 février 2006. Elle remplace l'Acte constitutionnel de la transition de 2003.",
        ],
      },
      {
        heading: "Institutions",
        paragraphs: [
          "La Constitution instaure un régime semi-présidentiel : un président élu au suffrage universel direct (mandat de 5 ans, renouvelable une fois) et un Premier ministre issu de la majorité parlementaire.",
          "Le Parlement est bicaméral : Assemblée nationale (500 députés) et Sénat (108 sénateurs). La Cour constitutionnelle est la gardienne de la Constitution.",
          "La décentralisation est constitutionnalisée : 26 provinces avec gouverneurs élus et assemblées provinciales.",
        ],
      },
      {
        heading: "Droits et libertés",
        paragraphs: [
          "La Constitution garantit les droits civils et politiques (liberté d'expression, de réunion, de presse), les droits économiques et sociaux (droit au travail, à l'éducation, à la santé) et les droits culturels.",
          "Elle interdit la peine de mort pour les mineurs et les femmes enceintes, et garantit l'égalité homme-femme.",
        ],
      },
    ],
    timeline: [
      { date: "2002", event: "Accords de Sun City" },
      { date: "2005", event: "Référendum constitutionnel" },
      { date: "18 fév. 2006", event: "Promulgation" },
      { date: "2011", event: "Révision · mandat présidentiel" },
    ],
    facts: [
      { label: "Date", value: "18 février 2006" },
      { label: "Régime", value: "Semi-présidentiel" },
      { label: "Mandat présidentiel", value: "5 ans · renouvelable 1 fois" },
      { label: "Provinces", value: "26" },
      { label: "Parlement", value: "Bicaméral" },
    ],
    tags: ["constitution", "2006", "droit", "politique", "rdc", "démocratie"],
    relatedSlugs: ["assemblee-nationale", "ceni", "felix-tshisekedi"],
    quality: "bon article",
  },
  {
    slug: "cour-constitutionnelle-rdc",
    title: "Cour constitutionnelle de la RDC",
    subtitle: "Gardienne de la Constitution · Kinshasa",
    category: "institution",
    summary: "La Cour constitutionnelle de la RDC est la plus haute juridiction en matière constitutionnelle. Elle valide les élections présidentielles, contrôle la constitutionnalité des lois et tranche les conflits de compétence entre institutions.",
    body: [],
    sections: [
      {
        heading: "Composition et fonctionnement",
        paragraphs: [
          "La Cour est composée de 9 membres nommés pour 9 ans non renouvelables : 3 par le président de la République, 3 par le Parlement et 3 par le Conseil supérieur de la magistrature.",
          "Elle siège à Kinshasa et rend des arrêts définitifs et non susceptibles de recours.",
        ],
      },
      {
        heading: "Rôle électoral",
        paragraphs: [
          "La Cour valide les résultats des élections présidentielles et législatives. Ses décisions sur les contentieux électoraux de 2018 et 2023 ont été au cœur des débats politiques.",
          "Elle a validé l'élection de Félix Tshisekedi en 2019 malgré les contestations de l'opposition.",
        ],
      },
    ],
    timeline: [
      { date: "2006", event: "Création par la Constitution" },
      { date: "2013", event: "Installation effective" },
      { date: "2019", event: "Validation élection Tshisekedi" },
    ],
    facts: [
      { label: "Membres", value: "9" },
      { label: "Mandat", value: "9 ans non renouvelables" },
      { label: "Siège", value: "Kinshasa" },
      { label: "Rôle", value: "Contrôle constitutionnel · élections" },
    ],
    tags: ["cour constitutionnelle", "justice", "droit", "élections", "rdc"],
    relatedSlugs: ["constitution-rdc-2006", "ceni", "felix-tshisekedi"],
    quality: "standard",
  },
  {
    slug: "senat-rdc",
    title: "Sénat de la RDC",
    subtitle: "Chambre haute · 108 sénateurs",
    category: "institution",
    summary: "Le Sénat est la chambre haute du Parlement congolais. Composé de 108 sénateurs élus par les assemblées provinciales, il représente les provinces et participe à l'élaboration des lois organiques et constitutionnelles.",
    body: [],
    sections: [
      {
        heading: "Composition et élection",
        paragraphs: [
          "Chaque province élit 4 sénateurs au suffrage indirect (par l'assemblée provinciale). Le mandat est de 5 ans. Les anciens présidents de la République sont sénateurs de droit à vie.",
          "Le Sénat siège au Palais du Peuple à Kinshasa, avec l'Assemblée nationale.",
        ],
      },
      {
        heading: "Rôle législatif",
        paragraphs: [
          "Le Sénat examine les lois organiques, les lois relatives aux provinces et les révisions constitutionnelles. Il peut initier des lois et amender les textes de l'Assemblée nationale.",
          "En cas de dissolution de l'Assemblée nationale, le Sénat assure la continuité législative.",
        ],
      },
    ],
    timeline: [
      { date: "2006", event: "Création par la Constitution" },
      { date: "2007", event: "Premier Sénat élu" },
    ],
    facts: [
      { label: "Membres", value: "108 sénateurs" },
      { label: "Élection", value: "Suffrage indirect · assemblées provinciales" },
      { label: "Mandat", value: "5 ans" },
      { label: "Siège", value: "Palais du Peuple · Kinshasa" },
    ],
    tags: ["sénat", "parlement", "politique", "rdc", "provinces"],
    relatedSlugs: ["assemblee-nationale", "palais-du-peuple", "constitution-rdc-2006"],
    quality: "standard",
  },
  {
    slug: "udps",
    title: "Union pour la Démocratie et le Progrès Social (UDPS)",
    subtitle: "Parti · Tshisekedi · opposition historique",
    category: "institution",
    summary: "L'UDPS est le principal parti politique congolais, fondé en 1982 par Étienne Tshisekedi. Longtemps dans l'opposition sous Mobutu et Kabila, il accède au pouvoir en 2019 avec l'élection de Félix Tshisekedi à la présidence.",
    body: [],
    sections: [
      {
        heading: "Fondation et opposition",
        paragraphs: [
          "L'UDPS est fondée le 15 février 1982 par 13 parlementaires qui signent une lettre ouverte à Mobutu réclamant le multipartisme. Étienne Tshisekedi en devient le leader charismatique.",
          "Pendant 30 ans, l'UDPS résiste aux pressions, arrestations et tentatives de récupération. Elle refuse de participer aux élections qu'elle juge frauduleuses sous Mobutu et Kabila.",
        ],
      },
      {
        heading: "Accession au pouvoir",
        paragraphs: [
          "Après le décès d'Étienne Tshisekedi en 2017, son fils Félix prend la tête du parti. Il remporte l'élection présidentielle de décembre 2018 et est investi le 24 janvier 2019.",
          "C'est la première alternance pacifique du pouvoir dans l'histoire de la RDC.",
        ],
      },
    ],
    timeline: [
      { date: "1982", event: "Fondation par Étienne Tshisekedi" },
      { date: "1990s", event: "Opposition à Mobutu · CNS" },
      { date: "2017", event: "Décès Étienne · Félix prend la tête" },
      { date: "2019", event: "Félix Tshisekedi élu président" },
    ],
    facts: [
      { label: "Fondation", value: "15 février 1982" },
      { label: "Fondateur", value: "Étienne Tshisekedi" },
      { label: "Président actuel", value: "Félix Tshisekedi" },
      { label: "Idéologie", value: "Démocratie chrétienne · social-démocratie" },
    ],
    tags: ["udps", "parti", "tshisekedi", "politique", "opposition", "rdc"],
    relatedSlugs: ["felix-tshisekedi", "etienne-tshisekedi", "conference-nationale-souveraine"],
    quality: "bon article",
  },
  {
    slug: "monusco",
    title: "MONUSCO",
    subtitle: "Mission ONU · RDC · paix",
    category: "institution",
    summary: "La Mission de l'Organisation des Nations Unies pour la stabilisation en République démocratique du Congo (MONUSCO) est l'une des plus grandes opérations de maintien de la paix de l'ONU. Présente depuis 1999, elle opère principalement dans l'Est du pays.",
    body: [],
    sections: [
      {
        heading: "Historique",
        paragraphs: [
          "La MONUC (Mission de l'ONU au Congo) est créée en 1999 après l'Accord de Lusaka. Elle devient MONUSCO en 2010 avec un mandat renforcé incluant la protection des civils.",
          "À son apogée, la MONUSCO déploie plus de 20 000 soldats, policiers et civils, faisant d'elle l'une des missions ONU les plus coûteuses.",
        ],
      },
      {
        heading: "Mandat et controverses",
        paragraphs: [
          "La MONUSCO est mandatée pour protéger les civils, soutenir le processus de paix et aider à la stabilisation de l'Est. Elle dispose d'une brigade d'intervention offensive (FIB) depuis 2013.",
          "La mission est critiquée pour son inefficacité face aux groupes armés et pour des scandales d'abus sexuels commis par certains casques bleus.",
          "Le gouvernement Tshisekedi a demandé le retrait progressif de la MONUSCO, qui a commencé en 2023.",
        ],
      },
    ],
    timeline: [
      { date: "1999", event: "Création MONUC" },
      { date: "2010", event: "Transformation en MONUSCO" },
      { date: "2013", event: "Brigade d'intervention offensive" },
      { date: "2023", event: "Début retrait progressif" },
    ],
    facts: [
      { label: "Création", value: "1999" },
      { label: "Effectif max.", value: ">20 000" },
      { label: "Zone", value: "Est de la RDC" },
      { label: "Budget annuel", value: "~1 milliard $" },
    ],
    tags: ["monusco", "onu", "paix", "est-congo", "casques bleus", "rdc"],
    relatedSlugs: ["guerre-congo-1996-2003", "goma", "kivu-region"],
    quality: "bon article",
  },
  {
    slug: "cour-penale-internationale-rdc",
    title: "RDC et la Cour pénale internationale",
    subtitle: "CPI · crimes de guerre · justice",
    category: "institution",
    summary: "La RDC est l'un des pays les plus actifs devant la Cour pénale internationale (CPI). Plusieurs chefs de guerre congolais ont été poursuivis pour crimes de guerre et crimes contre l'humanité commis lors des conflits de l'Est.",
    body: [],
    sections: [
      {
        heading: "Affaires congolaises",
        paragraphs: [
          "La RDC saisit la CPI en 2004. Les premières affaires concernent des chefs de milices de l'Ituri : Thomas Lubanga (condamné pour enrôlement d'enfants soldats), Germain Katanga et Mathieu Ngudjolo.",
          "Bosco Ntaganda, chef militaire du M23, est condamné en 2019 à 30 ans de prison pour crimes de guerre et crimes contre l'humanité.",
        ],
      },
      {
        heading: "Enjeux de justice",
        paragraphs: [
          "Les procès de la CPI sont suivis de près par les victimes congolaises. Ils contribuent à la lutte contre l'impunité mais sont critiqués pour leur lenteur et leur coût.",
          "Des juridictions nationales (tribunaux militaires) jugent également des crimes de guerre, avec des résultats variables.",
        ],
      },
    ],
    timeline: [
      { date: "2004", event: "Saisine de la CPI par la RDC" },
      { date: "2012", event: "Condamnation Lubanga" },
      { date: "2019", event: "Condamnation Ntaganda" },
    ],
    facts: [
      { label: "Saisine", value: "2004" },
      { label: "Condamnés", value: "Lubanga, Katanga, Ntaganda" },
      { label: "Siège CPI", value: "La Haye (Pays-Bas)" },
    ],
    tags: ["cpi", "justice", "crimes de guerre", "rdc", "ituri", "m23"],
    relatedSlugs: ["guerre-congo-1996-2003", "kivu-region", "ituri"],
    quality: "standard",
  },
  {
    slug: "ituri-province",
    title: "Ituri",
    subtitle: "Province · or · conflits · Bunia",
    category: "lieu",
    summary: "L'Ituri est une province du nord-est de la RDC, chef-lieu Bunia. Riche en or et en ressources forestières, elle a été le théâtre de violences interethniques (Hema-Lendu) et de conflits armés depuis les années 1990.",
    body: [],
    sections: [
      {
        heading: "Géographie et ressources",
        paragraphs: [
          "L'Ituri borde l'Ouganda et le Soudan du Sud. Elle est traversée par la rivière Ituri et couverte de forêts denses. L'or artisanal est la principale ressource économique.",
          "Le lac Albert, à la frontière avec l'Ouganda, est une ressource halieutique importante. Des réserves pétrolières sont explorées dans le bassin du lac.",
        ],
      },
      {
        heading: "Conflits",
        paragraphs: [
          "Les conflits Hema-Lendu (1999–2003) font des dizaines de milliers de morts et des centaines de milliers de déplacés. Des milices comme l'UPC (Thomas Lubanga) et le FNI commettent des atrocités.",
          "Depuis 2017, de nouvelles violences impliquant la milice CODECO (Coopérative pour le développement du Congo) font des milliers de victimes parmi les Lendu.",
        ],
      },
    ],
    timeline: [
      { date: "1999", event: "Début conflits Hema-Lendu" },
      { date: "2003", event: "Intervention française (Artémis)" },
      { date: "2017", event: "Résurgence violences CODECO" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Bunia" },
      { label: "Ressources", value: "Or, pétrole, forêt" },
      { label: "Frontières", value: "Ouganda, Soudan du Sud" },
      { label: "Lac", value: "Albert" },
    ],
    tags: ["ituri", "bunia", "or", "conflits", "hema", "lendu", "rdc"],
    relatedSlugs: ["kivu-region", "guerre-congo-1996-2003", "cour-penale-internationale-rdc"],
    quality: "standard",
  },
  {
    slug: "maniema-province",
    title: "Maniema",
    subtitle: "Province · Kindu · forêt · or",
    category: "lieu",
    summary: "Le Maniema est une province de l'est de la RDC, chef-lieu Kindu. Enclavée entre le Kivu et la Tshopo, elle est couverte de forêts denses et riche en or, cassitérite et coltan. Sa population est majoritairement swahilophone.",
    body: [],
    sections: [
      {
        heading: "Géographie",
        paragraphs: [
          "Le Maniema est traversé par la rivière Lualaba (haut Congo) et ses affluents. Le relief est accidenté, avec des forêts denses et des collines. Le climat est équatorial humide.",
          "Kindu, chef-lieu, est accessible par voie fluviale depuis Kisangani et par route depuis Bukavu. L'enclavement est un défi majeur pour le développement.",
        ],
      },
      {
        heading: "Histoire et culture",
        paragraphs: [
          "Le Maniema a été une zone de traite esclavagiste au XIXe siècle, avec des comptoirs arabes-swahilis. Cette histoire explique la prédominance du swahili et la présence de communautés musulmanes.",
          "L'artisanat minier (or, cassitérite) emploie une grande partie de la population active.",
        ],
      },
    ],
    timeline: [
      { date: "XIXe s.", event: "Comptoirs arabes-swahilis" },
      { date: "1960", event: "Province à l'indépendance" },
      { date: "2015", event: "Province autonome" },
    ],
    facts: [
      { label: "Chef-lieu", value: "Kindu" },
      { label: "Ressources", value: "Or, cassitérite, coltan" },
      { label: "Langue", value: "Swahili dominant" },
      { label: "Accès", value: "Fluvial et routier" },
    ],
    tags: ["maniema", "kindu", "or", "forêt", "swahili", "rdc"],
    relatedSlugs: ["kivu-region", "kisangani", "islam-rdc"],
    quality: "standard",
  },
];
