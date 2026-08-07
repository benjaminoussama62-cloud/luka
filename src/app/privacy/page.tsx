import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";

export const metadata = {
  title: "Politique de confidentialité — AYEBA",
};

export default function PrivacyPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/legal" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← Informations légales
          </Link>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white">
            Politique de confidentialité
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Dernière mise à jour : août 2026 · Moteur de recherche AYEBA (ayeba.app)
          </p>

          <section className="ayeba-panel mt-8 p-6">
            <h2 className="ayeba-kicker ayeba-kicker-accent mb-4">Notre engagement</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              AYEBA est conçu pour minimiser la collecte de données personnelles. Nous ne vendons pas
              vos requêtes à des annonceurs et n&apos;affichons pas de publicité ciblée. La recherche
              reste au centre du service.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Données traitées lors d&apos;une recherche</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Termes de recherche transmis via l&apos;URL ou le formulaire.</li>
              <li>Adresse IP et en-têtes HTTP standards (durée de conservation limitée).</li>
              <li>Signaux agrégés anonymisés pour améliorer la pertinence (clics, langue).</li>
              <li>Aucun profilage publicitaire ni revente de données à des tiers.</li>
            </ul>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Comptes et authentification</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Si vous créez un compte ou vous connectez via Google, GitHub ou Microsoft, nous
              conservons votre nom, adresse e-mail et identifiant fournisseur uniquement pour
              l&apos;authentification et la personnalisation de session. Les mots de passe sont
              hachés ; nous ne stockons jamais de mot de passe en clair.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Indexation et contenu web</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              AYEBA indexe des pages publiques conformément aux fichiers robots.txt et aux bonnes
              pratiques d&apos;exploration. Les extraits affichés proviennent de sources ouvertes ;
              les éditeurs de sites peuvent demander la suppression ou la mise à jour d&apos;une URL
              via{" "}
              <a href="mailto:contact@ayeba.app" className="text-white underline">
                contact@ayeba.app
              </a>
              .
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Cookies et stockage local</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Un cookie de session sécurisé peut être déposé après connexion. Des préférences
              (langue, marché) peuvent être mémorisées localement dans votre navigateur. Aucun cookie
              publicitaire tiers n&apos;est utilisé par défaut.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Vos droits</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Conformément au RGPD et aux lois applicables, vous pouvez demander l&apos;accès, la
              rectification ou la suppression de vos données de compte en écrivant à{" "}
              <a href="mailto:contact@ayeba.app" className="text-white underline">
                contact@ayeba.app
              </a>
              . Nous répondons dans un délai raisonnable.
            </p>
          </section>

          <p className="mt-8 text-center text-xs text-[var(--faint)]">
            AYEBA · Politique de confidentialité · ayeba.app
          </p>
        </div>
      </div>
    </>
  );
}
