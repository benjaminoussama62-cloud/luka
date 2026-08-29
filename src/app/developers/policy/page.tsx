import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { SISTER_APPS } from "@/lib/oauth-provider/sister-apps";

export const metadata: Metadata = {
  title: "Politique OAuth — Ayeba Developers",
};

export default function DevelopersPolicyPage() {
  return (
    <DevelopersShell activePath="/developers/policy" kicker="Légal" title="Politique OAuth & identité Ayeba">
      <article className="dev-docs-section ayeba-panel space-y-4">
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">1. Fournisseur d&apos;identité</h2>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Ayeba opère un service OAuth 2.0 / OpenID Connect ouvert aux applications sœurs (Omega,
            JEMSA, TALA, Sombateka) et aux entreprises tierces, sur le modèle de Google Sign-In. L&apos;identifiant{" "}
            <code>sub</code> est stable et unique par compte humain.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">2. Apps sœurs (tier sister)</h2>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Les plateformes de l&apos;écosystème DevAlpha sont pré-enregistrées et vérifiées :
          </p>
          <ul className="dev-docs-list mt-2">
            {SISTER_APPS.map((a) => (
              <li key={a.slug}>
                <strong>{a.name}</strong> — {a.websiteUrl}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">3. Applications tierces</h2>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            Toute entreprise peut créer une application dans la{" "}
            <a href="/developers/console">Console OAuth</a>. Les apps publiques passent par une vérification
            Ayeba (redirect URIs, site web, usage des scopes) avant d&apos;être utilisables en production —
            équivalent à la Google OAuth App Verification.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">4. Données & scopes</h2>
          <ul className="dev-docs-list">
            <li>
              <strong>openid</strong> — identifiant stable (obligatoire pour id_token)
            </li>
            <li>
              <strong>email</strong> — adresse e-mail Ayeba
            </li>
            <li>
              <strong>profile</strong> — nom et avatar
            </li>
          </ul>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Les utilisateurs peuvent révoquer l&apos;accès depuis{" "}
            <a href="/compte/applications">Compte → Applications connectées</a>.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">5. Sécurité</h2>
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            id_token signés RS256 (JWKS public). client_secret jamais exposé côté navigateur. PKCE
            recommandé pour clients publics. Rate limiting sur token et authorize. Journal d&apos;audit
            OAuth. 2FA disponible sur les comptes Ayeba.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">6. Contact</h2>
          <p className="text-sm text-[var(--muted)]">
            Vérification d&apos;apps tierces :{" "}
            <a href="mailto:developers@ayeba.app">developers@ayeba.app</a>
          </p>
        </section>
      </article>
    </DevelopersShell>
  );
}
