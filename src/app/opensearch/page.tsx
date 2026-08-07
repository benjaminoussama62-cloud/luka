import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";

export const metadata = {
  title: "Ajouter AYEBA au navigateur — OpenSearch",
};

export default function OpenSearchHelpPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ayeba.app";
  const descriptorUrl = `${siteUrl.replace(/\/$/, "")}/opensearch.xml`;

  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← Accueil
          </Link>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white">
            Ajouter AYEBA comme moteur de recherche
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Utilisez OpenSearch pour lancer vos recherches directement depuis la barre d&apos;adresse
            de Chrome, Edge ou Firefox.
          </p>

          <section className="ayeba-panel mt-8 p-6">
            <h2 className="ayeba-kicker ayeba-kicker-accent mb-4">Descripteur OpenSearch</h2>
            <p className="text-sm text-[var(--muted)]">
              Fichier XML officiel :{" "}
              <a href="/opensearch.xml" className="font-mono text-sm text-white underline">
                /opensearch.xml
              </a>
            </p>
            <p className="mt-2 break-all font-mono text-xs text-[var(--faint)]">{descriptorUrl}</p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Google Chrome / Microsoft Edge</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Ouvrez les paramètres du moteur de recherche (chrome://settings/searchEngines).</li>
              <li>Cliquez sur « Ajouter » ou « Gérer les moteurs de recherche ».</li>
              <li>
                Nom : <strong className="text-white">AYEBA</strong> · Raccourci :{" "}
                <strong className="text-white">aye</strong>
              </li>
              <li>
                URL :{" "}
                <code className="rounded bg-white/5 px-1 py-0.5 text-[var(--ink)]">
                  {siteUrl.replace(/\/$/, "")}/?q=%s
                </code>
              </li>
              <li>
                Ou visitez cette page sur ayeba.app : le navigateur peut proposer d&apos;ajouter
                AYEBA automatiquement via le descripteur OpenSearch.
              </li>
            </ol>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Mozilla Firefox</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Menu → Paramètres → Recherche.</li>
              <li>Dans « Moteurs de recherche par défaut », cliquez sur « Trouver plus de moteurs ».</li>
              <li>
                Ajoutez manuellement avec l&apos;URL{" "}
                <code className="rounded bg-white/5 px-1 py-0.5 text-[var(--ink)]">
                  {siteUrl.replace(/\/$/, "")}/?q=%s
                </code>
                , ou installez depuis le descripteur OpenSearch.
              </li>
            </ol>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Tester</h2>
            <p className="text-sm text-[var(--muted)]">
              Une fois AYEBA configuré, essayez une recherche exemple :
            </p>
            <Link
              href="/?q=Kinshasa"
              className="ayeba-ghost mt-4 inline-block px-4 py-2 text-sm text-white"
            >
              Rechercher « Kinshasa » →
            </Link>
          </section>

          <p className="mt-8 text-center text-xs text-[var(--faint)]">
            AYEBA · OpenSearch · Zéro pub
          </p>
        </div>
      </div>
    </>
  );
}
