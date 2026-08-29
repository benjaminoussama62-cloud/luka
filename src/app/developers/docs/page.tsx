import type { Metadata } from "next";
import Link from "next/link";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { oauthEndpoint } from "@/lib/oauth-provider/endpoints";
import { SISTER_APPS } from "@/lib/oauth-provider/sister-apps";

export const metadata: Metadata = {
  title: "Documentation OAuth — Ayeba Developers",
  description: "Guide d’intégration OAuth 2.0 / OpenID Connect pour Se connecter avec Ayeba.",
};

const SECTIONS = [
  {
    id: "overview",
    title: "Vue d’ensemble",
    body: "Ayeba agit comme fournisseur d’identité (équivalent accounts.google.com). Chaque utilisateur possède un identifiant stable sub (UUID Ayeba) partagé entre Omega et toutes les applications sœurs.",
  },
  {
    id: "flow",
    title: "Flux authorization code",
    body: "Utilisez response_type=code. Après consentement, Ayeba redirige vers votre redirect_uri avec ?code=...&state=.... Échangez le code côté serveur uniquement — ne exposez jamais client_secret au navigateur.",
  },
  {
    id: "scopes",
    title: "Scopes",
    body: "openid (obligatoire pour id_token), email, profile. Demandez openid email profile pour un profil complet.",
  },
  {
    id: "pkce",
    title: "PKCE (recommandé)",
    body: "Pour les clients publics (SPA, mobile), envoyez code_challenge (S256) à l’authorize et code_verifier au token endpoint.",
  },
];

export default function DevelopersDocsPage() {
  return (
    <DevelopersShell activePath="/developers/docs" kicker="Documentation" title="OAuth 2.0 & OpenID Connect">
      <div className="dev-docs-layout">
        <nav className="dev-docs-toc ayeba-panel" aria-label="Sommaire">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.title}
            </a>
          ))}
          <Link href="/developers/console">→ Console OAuth</Link>
        </nav>

        <article className="dev-docs-content">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="dev-docs-section ayeba-panel">
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}

          <section id="endpoints" className="dev-docs-section ayeba-panel">
            <h2>Endpoints</h2>
            <dl className="dev-console-endpoints">
              <div>
                <dt>Discovery</dt>
                <dd>
                  <code>{oauthEndpoint("discovery")}</code>
                </dd>
              </div>
              <div>
                <dt>Authorize</dt>
                <dd>
                  <code>{oauthEndpoint("authorize")}</code>
                </dd>
              </div>
              <div>
                <dt>Token</dt>
                <dd>
                  <code>{oauthEndpoint("token")}</code>
                </dd>
              </div>
              <div>
                <dt>Userinfo</dt>
                <dd>
                  <code>{oauthEndpoint("userinfo")}</code>
                </dd>
              </div>
            </dl>
          </section>

          <section id="sister-apps" className="dev-docs-section ayeba-panel">
            <h2>Apps sœurs Ayeba (pré-configurées)</h2>
            <p className="mb-4">
              Omega, JEMSA, TALA et Sombateka sont enregistrées comme clients OAuth vérifiés (tier{" "}
              <code>sister</code>).
            </p>
            <dl className="dev-console-endpoints">
              {SISTER_APPS.map((app) => (
                <div key={app.slug}>
                  <dt>{app.name}</dt>
                  <dd>
                    <code>{app.clientId}</code>
                    <br />
                    <code>{`https://${app.productionDomain}/api/ayeba/callback`}</code>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="omega" className="dev-docs-section ayeba-panel">
            <h2>Intégration Omega (production)</h2>
            <pre className="dev-console-pre overflow-x-auto text-xs leading-relaxed text-[var(--muted)]">
{`// 1. Redirection utilisateur
window.location = "${oauthEndpoint("authorize")}"
  + "?client_id=ayeba_omega_web_prod"
  + "&redirect_uri=" + encodeURIComponent("https://omega-web.org/api/ayeba/callback")
  + "&response_type=code"
  + "&scope=openid+email+profile"
  + "&state=" + csrfToken;

// 2. Callback serveur Omega — échange du code
const tokenRes = await fetch("${oauthEndpoint("token")}", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.AYEBA_CLIENT_ID,
    client_secret: process.env.AYEBA_CLIENT_SECRET,
    redirect_uri: "https://omega-web.org/api/ayeba/callback",
  }),
});
const { access_token, id_token, refresh_token } = await tokenRes.json();

// 3. Profil stable
const profile = await fetch("${oauthEndpoint("userinfo")}", {
  headers: { Authorization: \`Bearer \${access_token}\` },
}).then(r => r.json());
// profile.sub === ID Ayeba permanent`}
            </pre>
          </section>

          <section id="claims" className="dev-docs-section ayeba-panel">
            <h2>Claims userinfo</h2>
            <ul className="dev-docs-list">
              <li>
                <strong>sub</strong> — Identifiant Ayeba stable (UUID). Même humain = même sub partout.
              </li>
              <li>
                <strong>email</strong> — Adresse e-mail du compte (scope email).
              </li>
              <li>
                <strong>name</strong> — Nom affiché (scope profile).
              </li>
              <li>
                <strong>picture</strong> — Avatar généré (scope profile).
              </li>
            </ul>
          </section>
        </article>
      </div>
    </DevelopersShell>
  );
}
