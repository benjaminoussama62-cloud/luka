import type { Metadata } from "next";
import Link from "next/link";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { API_CATALOG } from "@/lib/developers/catalog";

export const metadata: Metadata = {
  title: "Ayeba Developers — APIs, identité & intégration",
  description:
    "Plateforme développeurs Ayeba : APIs REST, Se connecter avec Ayeba (OAuth 2.0 / OpenID Connect), clés, quotas, journaux — console complète.",
  openGraph: {
    title: "Ayeba Developers",
    url: "https://ayeba.app/developers",
  },
};

const PILLARS = [
  {
    title: "Une identité pour l’écosystème",
    text: "Un même compte Ayeba permet d’ouvrir les applications sœurs et les services partenaires, avec un identifiant stable partagé uniquement après consentement explicite de l’utilisateur.",
  },
  {
    title: "Standards ouverts",
    text: "L’intégration s’appuie sur OAuth 2.0 et OpenID Connect. Les endpoints publics sont découverts via le document OpenID Configuration — sans dépendance à une bibliothèque propriétaire.",
  },
  {
    title: "Contrôle utilisateur",
    text: "Chaque autorisation passe par un écran de consentement. L’utilisateur peut révoquer l’accès d’une application depuis son compte Ayeba à tout moment.",
  },
  {
    title: "Vérification des applications",
    text: "Les applications tierces destinées à la production font l’objet d’une revue (finalité, redirect URIs, site web, usage des scopes) avant d’être pleinement activées.",
  },
] as const;

const CONSOLE_FEATURES = [
  { title: "Projets", text: "Regroupez clés, applications OAuth et quotas par produit. Partagez l’accès en lecture ou édition à vos collaborateurs." },
  { title: "Clés API", text: "Secrets affichés une seule fois, stockés en hash. Restrictions par référent, IP, portées et quota quotidien." },
  { title: "Explorateur", text: "Testez chaque API depuis la console — les requêtes réelles sont journalisées comme les appels de production." },
  { title: "Supervision", text: "Trafic par jour, latence moyenne, taux de succès, codes de statut, journaux détaillés — mesurés, jamais estimés." },
] as const;

export default function DevelopersLandingPage() {
  return (
    <DevelopersShell activePath="/developers">
      <p className="ayeba-kicker ayeba-kicker-accent -mt-2">Ayeba Developers</p>
      <h1 className="max-w-3xl font-[family-name:var(--font-brand)] text-[clamp(2.4rem,8vw,4.2rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-[var(--ink)]">
        Construisez sur Ayeba.
      </h1>
      <p className="mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-[var(--muted)]">
        APIs de recherche, suggestions en temps réel et identité «&nbsp;Se connecter avec
        Ayeba&nbsp;» — une console complète pour gérer projets, clés, quotas et journaux, comme
        les grandes plateformes cloud.
      </p>

      {/* Catalogue d'APIs réel */}
      <h2 className="mt-12 text-lg font-semibold text-[var(--ink)]">APIs disponibles</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {API_CATALOG.map((api) => (
          <article key={api.id} className="ayeba-panel p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[var(--ink)]">{api.name}</h3>
              <span className="dcw-chip dcw-chip-blue">
                {api.status === "ga" ? "Disponible" : "Bêta"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{api.description}</p>
            <p className="mt-3">
              <code className="dev-console-code">{api.method} {api.endpoint}</code>
            </p>
            <Link href={`/developers/docs#${api.docsAnchor}`} className="dcw-link mt-2 inline-block">
              Documentation →
            </Link>
          </article>
        ))}
      </div>

      {/* Exemple réel */}
      <div className="mt-8 ayeba-panel p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Premier appel</h2>
        <pre className="dcw-pre mt-4">{`curl "https://ayeba.app/api/v1/search?q=kinshasa&limit=5" \\
  -H "Authorization: Bearer ayb_live_…"`}</pre>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Créez une clé dans la console, choisissez ses portées et ses restrictions — elle est
          utilisable immédiatement.
        </p>
      </div>

      {/* Capacités console */}
      <h2 className="mt-12 text-lg font-semibold text-[var(--ink)]">La console</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {CONSOLE_FEATURES.map((f) => (
          <article key={f.title} className="ayeba-panel p-5">
            <h3 className="text-base font-semibold text-[var(--ink)]">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.text}</p>
          </article>
        ))}
      </div>

      {/* Identité */}
      <h2 className="mt-12 text-lg font-semibold text-[var(--ink)]">Identité — Se connecter avec Ayeba</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <article key={p.title} className="ayeba-panel p-5">
            <h3 className="text-base font-semibold text-[var(--ink)]">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{p.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 ayeba-panel p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Pour commencer</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--muted)]">
          <li>
            Créez un projet dans la{" "}
            <Link href="/developers/console" className="text-[var(--ink)] underline">
              console
            </Link>{" "}
            — il regroupe vos clés, applications et quotas.
          </li>
          <li>
            Activez les APIs dont vous avez besoin dans la{" "}
            <Link href="/developers/console/apis" className="text-[var(--ink)] underline">
              bibliothèque
            </Link>
            , puis testez-les avec l’explorateur intégré.
          </li>
          <li>
            Consultez la{" "}
            <Link href="/developers/docs" className="text-[var(--ink)] underline">
              documentation
            </Link>{" "}
            et la{" "}
            <Link href="/developers/policy" className="text-[var(--ink)] underline">
              politique développeurs
            </Link>
            .
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/developers/console" className="ayeba-cta px-6 py-3 text-sm">
          Ouvrir la console
        </Link>
        <Link href="/developers/docs" className="ayeba-ghost px-6 py-3 text-sm">
          Documentation
        </Link>
        <Link href="/developers/policy" className="ayeba-ghost px-6 py-3 text-sm">
          Politique
        </Link>
      </div>
    </DevelopersShell>
  );
}
