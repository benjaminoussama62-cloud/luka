import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata = {
  title: "Définir AYEBA comme moteur par défaut",
  description:
    "Ajoutez AYEBA à Chrome, Edge ou Firefox — recherches depuis la barre d’adresse, zéro pub, priorité RDC.",
};

export default function OpenSearchHelpPage() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://ayeba.app").replace(/\/$/, "");
  const searchUrl = `${siteUrl}/?q=%s`;
  const descriptorUrl = `${siteUrl}/opensearch.xml`;

  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← AYEBA
          </Link>

          <p className="mt-10 font-[family-name:var(--font-display)] text-5xl tracking-tight text-white sm:text-6xl">
            AYEBA
          </p>
          <h1 className="mt-3 text-xl text-white/90 sm:text-2xl">
            Votre moteur par défaut
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
            Changer de moteur, c’est un geste rare. AYEBA doit le mériter : rapide, sans pub, ancré
            sur la RDC — et disponible dès la barre d’adresse.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href={descriptorUrl} className="ayeba-ghost bg-white px-5 py-2.5 text-sm font-medium text-black">
              Installer via OpenSearch
            </a>
            <Link href="/?q=Kinshasa" className="ayeba-ghost px-5 py-2.5 text-sm text-white">
              Tester une recherche
            </Link>
          </div>

          <section className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--faint)]">
              Chrome · Edge
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--muted)]">
              <li>
                Ouvrez{" "}
                <code className="text-[var(--ink)]">chrome://settings/searchEngines</code> (ou Edge
                équivalent).
              </li>
              <li>
                Ajoutez un moteur — Nom <span className="text-white">AYEBA</span>, raccourci{" "}
                <span className="text-white">aye</span>.
              </li>
              <li>
                URL de recherche :{" "}
                <code className="break-all text-[var(--ink)]">{searchUrl}</code>
              </li>
              <li>Définissez AYEBA comme moteur par défaut.</li>
            </ol>
          </section>

          <section className="mt-10 border-t border-white/10 pt-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--faint)]">
              Firefox
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--muted)]">
              <li>Paramètres → Recherche → Ajouter.</li>
              <li>
                Utilisez le descripteur{" "}
                <a href={descriptorUrl} className="text-white underline underline-offset-2">
                  opensearch.xml
                </a>{" "}
                ou l’URL <code className="break-all text-[var(--ink)]">{searchUrl}</code>.
              </li>
              <li>Choisissez AYEBA comme moteur par défaut.</li>
            </ol>
          </section>

          <p className="mt-10 text-xs text-[var(--faint)]">
            Descripteur : <span className="font-mono text-[var(--muted)]">{descriptorUrl}</span>
          </p>

          <div className="mt-14">
            <SiteFooter />
          </div>
        </div>
      </div>
    </>
  );
}
