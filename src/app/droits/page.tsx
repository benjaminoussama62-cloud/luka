import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Vos droits — AYEBA",
  description:
    "Droits des utilisateurs Ayeba : accès, rectification, effacement, opposition, réclamation et gestion des applications connectées.",
};

export default function DroitsPage() {
  return (
    <LegalDocumentShell
      title="Vos droits"
      subtitle="Ayeba reconnaît les droits des personnes sur leurs données et sur leur compte. Cette page résume vos recours concrets."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Droit d’accès">
        <p>
          Vous pouvez demander confirmation que des données vous concernant sont traitées, et
          obtenir une copie des informations de compte détenues par Ayeba, dans les limites prévues
          par la loi.
        </p>
      </LegalSection>

      <LegalSection title="2. Rectification">
        <p>
          Vous pouvez faire corriger des informations inexactes (nom, e-mail de contact, préférences)
          en passant par votre compte ou en écrivant à{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Effacement et clôture">
        <p>
          Vous pouvez demander la suppression de votre compte et des données associées, sous réserve
          des obligations légales de conservation (par exemple litiges, sécurité, obligations
          fiscales ou pénales). Certaines traces techniques anonymisées peuvent être conservées
          sans permettre de vous réidentifier.
        </p>
      </LegalSection>

      <LegalSection title="4. Opposition et limitation">
        <p>
          Vous pouvez vous opposer à certains traitements fondés sur l’intérêt légitime, ou demander
          une limitation temporaire du traitement, lorsque la réglementation le permet. Les
          traitements strictement nécessaires à la sécurité du service peuvent être maintenus.
        </p>
      </LegalSection>

      <LegalSection title="5. Applications connectées">
        <p>
          Vous contrôlez quelles applications ont accès à votre identité Ayeba. Depuis{" "}
          <Link href="/compte/applications" className="text-[var(--ink)] underline">
            Compte → Applications connectées
          </Link>
          , vous pouvez retirer un accès. Le retrait révoque les autorisations futures ; les données
          déjà copiées chez l’éditeur tiers doivent être gérées auprès de cet éditeur selon sa
          propre politique.
        </p>
      </LegalSection>

      <LegalSection title="6. Sécurité du compte">
        <p>
          Vous pouvez renforcer la protection de votre compte via{" "}
          <Link href="/compte/securite" className="text-[var(--ink)] underline">
            Compte → Sécurité
          </Link>
          . En cas de suspicion d’accès non autorisé, changez immédiatement vos identifiants et
          contactez{" "}
          <a href="mailto:security@ayeba.app" className="text-[var(--ink)] underline">
            security@ayeba.app
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Réclamation">
        <p>
          Si vous estimez que vos droits n’ont pas été respectés, contactez d’abord{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          . Vous pouvez également saisir l’autorité de protection des données compétente dans votre
          pays de résidence.
        </p>
      </LegalSection>

      <LegalSection title="8. Documents associés">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link href="/privacy" className="text-[var(--ink)] underline">
              Politique de confidentialité
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-[var(--ink)] underline">
              Conditions générales d’utilisation
            </Link>
          </li>
          <li>
            <Link href="/support" className="text-[var(--ink)] underline">
              Support
            </Link>
          </li>
        </ul>
      </LegalSection>
    </LegalDocumentShell>
  );
}
