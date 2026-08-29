/** Apps sœurs Ayeba — pré-enregistrées comme clients OAuth système vérifiés. */
export type SisterAppConfig = {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  productionDomain: string;
  clientId: string;
  clientIdEnv: string;
  secretEnv: string;
  logoUrl: string;
};

export const SISTER_APPS: SisterAppConfig[] = [
  {
    slug: "omega",
    name: "Omega",
    description: "Plateforme sœur Omega — écosystème Ayeba",
    websiteUrl: "https://omega-web.org",
    productionDomain: "omega-web.org",
    clientId: "ayeba_omega_web_prod",
    clientIdEnv: "OMEGA_OAUTH_CLIENT_ID",
    secretEnv: "OMEGA_OAUTH_CLIENT_SECRET",
    logoUrl: "",
  },
  {
    slug: "jemsa",
    name: "JEMSA",
    description: "JEMSA — application sœur de l'écosystème Ayeba",
    websiteUrl: "https://jemsa.net",
    productionDomain: "jemsa.net",
    clientId: "ayeba_jemsa_web_prod",
    clientIdEnv: "JEMSA_OAUTH_CLIENT_ID",
    secretEnv: "JEMSA_OAUTH_CLIENT_SECRET",
    logoUrl: "/brand/shortcuts/jemsa.svg",
  },
  {
    slug: "tala",
    name: "TALA",
    description: "TALA — application sœur de l'écosystème Ayeba",
    websiteUrl: "https://to-tala.com",
    productionDomain: "to-tala.com",
    clientId: "ayeba_tala_web_prod",
    clientIdEnv: "TALA_OAUTH_CLIENT_ID",
    secretEnv: "TALA_OAUTH_CLIENT_SECRET",
    logoUrl: "/brand/shortcuts/tala.svg",
  },
  {
    slug: "sombateka",
    name: "Sombateka",
    description: "Sombateka Online — application sœur de l'écosystème Ayeba",
    websiteUrl: "https://sombatekaonline.com",
    productionDomain: "sombatekaonline.com",
    clientId: "ayeba_sombateka_web_prod",
    clientIdEnv: "SOMBATEKA_OAUTH_CLIENT_ID",
    secretEnv: "SOMBATEKA_OAUTH_CLIENT_SECRET",
    logoUrl: "/brand/shortcuts/sombateka.png",
  },
];

export function sisterProductionCallback(domain: string) {
  return `https://${domain}/api/ayeba/callback`;
}

export function sisterDevCallback(slug: string) {
  return `http://localhost:3000/api/ayeba/callback/${slug}`;
}
