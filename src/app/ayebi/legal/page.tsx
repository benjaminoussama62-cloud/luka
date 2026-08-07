import Link from "next/link";
import { AyebiStage } from "@/components/ayebi/AyebiStage";

export const metadata = {
  title: "Licence & conditions — Ayebi",
};

export default function AyebiLegalPage() {
  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← Encyclopédie
          </Link>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white">
            Licence & conditions
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Ayebi est une encyclopédie libre dédiée à la République démocratique du Congo.
          </p>

          <section className="ayeba-panel mt-8 p-6">
            <h2 className="ayeba-kicker ayeba-kicker-accent mb-4">Licence des contributions</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              En publiant sur Ayebi, vous acceptez que vos contributions soient disponibles sous la licence{" "}
              <strong className="text-white">Creative Commons Attribution – Partage dans les mêmes conditions 4.0
              International (CC BY-SA 4.0)</strong>. Vous conservez vos droits d&apos;auteur ; vous accordez à
              la communauté le droit de réutiliser, modifier et redistribuer le contenu sous la même licence,
              avec attribution.
            </p>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Images téléversées : indiquez la licence (par défaut CC BY-SA 4.0). Ne publiez que des médias
              dont vous détenez les droits ou qui sont libres de droits.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Conditions d&apos;utilisation</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Citations et sources cliquables obligatoires pour les faits vérifiables.</li>
              <li>Pas de vandalisme, spam, ou contenu illégal.</li>
              <li>Les modérateurs peuvent protéger ou restaurer des pages.</li>
              <li>Le contenu est fourni « en l&apos;état » ; vérifiez les informations importantes.</li>
            </ul>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Rôles communautaires</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-white">Lecteur</dt>
                <dd className="text-[var(--muted)]">Consultation et recherche.</dd>
              </div>
              <div>
                <dt className="text-white">Contributeur</dt>
                <dd className="text-[var(--muted)]">Création et édition de fiches (sauf pages protégées).</dd>
              </div>
              <div>
                <dt className="text-white">Modérateur</dt>
                <dd className="text-[var(--muted)]">Pages semi-protégées, file de modération.</dd>
              </div>
              <div>
                <dt className="text-white">Admin</dt>
                <dd className="text-[var(--muted)]">Protection complète, configuration.</dd>
              </div>
            </dl>
          </section>

          <p className="mt-8 text-center text-xs text-[var(--faint)]">
            Ayebi · Encyclopédie 100&nbsp;% RDC · Projet AYEBA
          </p>
        </div>
      </div>
    </>
  );
}
