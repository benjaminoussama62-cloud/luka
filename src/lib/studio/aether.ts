import { radarOverview } from "./radar";
import { traceOverview } from "./trace";
import { yieldOverview } from "./yield";
import { velocityOverview } from "./velocity";
import type { AetherAction, AetherOverview, StudioSite } from "./types";

export function aetherOverview(site: StudioSite): AetherOverview {
  const radar = radarOverview(site);
  const trace = traceOverview(site);
  const yieldData = yieldOverview(site);
  const velocity = velocityOverview(site);

  const actions: AetherAction[] = [];
  const base = `/studio/app/${site.id}`;

  if (site.status !== "verified") {
    actions.push({
      id: "verify",
      module: "radar",
      impact: "high",
      title: "Vérifier la propriété du domaine",
      detail: "Sans vérification, crawl prioritaire et Yield restent limités.",
      href: `${base}/verify`,
    });
  }

  if (!trace.snippetInstalled) {
    actions.push({
      id: "trace-snippet",
      module: "trace",
      impact: "high",
      title: "Installer le snippet Trace",
      detail: "Mesurez l’audience réelle sur votre site — sessions, pages et referrers.",
      href: `${base}/trace`,
    });
  }

  if (radar.indexedPages === 0) {
    actions.push({
      id: "radar-index",
      module: "radar",
      impact: "high",
      title: "Indexer votre site dans Ayeba",
      detail: "Soumettez un sitemap ou priorisez le crawl de la page d’accueil.",
      href: `${base}/radar`,
    });
  } else if (radar.impressions7d > 15 && radar.clicks7d === 0) {
    actions.push({
      id: "radar-ctr",
      module: "radar",
      impact: "high",
      title: "Améliorer titres et extraits",
      detail: `${radar.impressions7d} impressions sans clic cette semaine — optimisez pour le CTR.`,
      href: `${base}/radar`,
    });
  }

  if (!velocity.latestScore || velocity.latestScore < 70) {
    actions.push({
      id: "velocity-audit",
      module: "velocity",
      impact: velocity.latestScore != null && velocity.latestScore < 50 ? "high" : "medium",
      title: velocity.latestScore
        ? `Score vitesse ${velocity.latestScore}/100 — plan d’action`
        : "Lancer un audit Velocity",
      detail: velocity.latestScore
        ? "Corrigez TTFB, compression et scripts bloquants."
        : "Mesurez TTFB et obtenez un plan priorisé.",
      href: `${base}/velocity`,
    });
  }

  if (!yieldData.enabled && trace.pageviews7d > 50) {
    actions.push({
      id: "yield-enable",
      module: "yield",
      impact: "medium",
      title: "Activer Yield",
      detail: `${trace.pageviews7d} pages vues cette semaine — monétisez le trafic Ayeba.`,
      href: `${base}/yield`,
    });
  }

  if (radar.queueFailed > 0) {
    actions.push({
      id: "radar-failed",
      module: "radar",
      impact: "medium",
      title: `${radar.queueFailed} URL(s) en échec de crawl`,
      detail: "Inspectez robots.txt et codes HTTP.",
      href: `${base}/radar`,
    });
  }

  if (trace.searchReferrals7d > 0 && trace.pageviews7d < trace.searchReferrals7d) {
    actions.push({
      id: "trace-bounce",
      module: "trace",
      impact: "medium",
      title: "Trafic Ayeba qui ne reste pas",
      detail: "Plus de clics depuis Ayeba que de pages vues — améliorez l’accueil landing.",
      href: `${base}/trace`,
    });
  }

  const deduped = actions.slice(0, 6);
  const top3 = deduped.slice(0, 3);

  if (top3.length < 3) {
    if (top3.every((a) => a.id !== "radar-index") && radar.indexedPages > 0) {
      top3.push({
        id: "radar-queries",
        module: "radar",
        impact: "medium",
        title: "Analyser les requêtes Radar",
        detail: "Identifiez les mots-clés qui amènent du trafic depuis Ayeba.",
        href: `${base}/radar`,
      });
    }
  }

  const headline =
    top3[0]?.title ||
    (site.status === "verified"
      ? "Tous les signaux sont verts — surveillez Radar et Trace."
      : "Commencez par vérifier votre domaine.");

  return {
    domain: site.domain,
    headline,
    actions: top3.slice(0, 3),
    signals: [
      { label: "Pages indexées", value: String(radar.indexedPages) },
      { label: "Clics Ayeba 7j", value: String(radar.clicks7d) },
      { label: "Pages vues 7j", value: String(trace.pageviews7d) },
      { label: "Score vitesse", value: velocity.latestScore != null ? `${velocity.latestScore}/100` : "—" },
      { label: "Yield", value: yieldData.enabled ? "Actif" : "Off" },
    ],
  };
}
