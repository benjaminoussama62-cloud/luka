import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation — AYEBA",
  description: "Conditions d’utilisation du moteur de recherche Ayeba, des comptes et des services associés.",
};

export default function TermsPage() {
  return (
    <LegalDocumentShell
      title="Conditions générales d’utilisation"
      subtitle="Les présentes conditions régissent l’accès et l’utilisation du site ayeba.app, du compte Ayeba et des services associés (recherche, Ayebi, Studio, identité pour applications partenaires)."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Acceptation">
        <p>
          En accédant au service Ayeba ou en créant un compte, vous acceptez les présentes
          conditions. Si vous n’acceptez pas ces conditions, vous ne devez pas utiliser le service.
          L’utilisation au nom d’une organisation suppose que vous êtes habilité à engager
          celle-ci.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>
          Ayeba propose un moteur de recherche web, des résultats enrichis (actualités, images,
          marchés, contenus Ayebi) et des outils destinés aux utilisateurs et aux éditeurs
          (notamment Studio). Le service évolue : des fonctionnalités peuvent être ajoutées,
          modifiées ou retirées sans que cela constitue un manquement contractuel, sous réserve
          des engagements légaux applicables.
        </p>
        <p>
          Les résultats de recherche s’appuient sur des sources indexées et des prestataires
          techniques. Ayeba ne garantit ni l’exhaustivité, ni l’exactitude permanente de chaque
          résultat. Pour toute décision sensible (santé, juridique, financière, sécurité),
          vérifiez auprès de sources officielles ou de professionnels compétents.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte utilisateur">
        <p>
          Vous êtes responsable de l’exactitude des informations fournies et de la
          confidentialité de vos identifiants. Toute activité réalisée via votre compte est
          réputée effectuée sous votre responsabilité, sauf preuve d’accès frauduleux non
          imputable à une négligence de votre part.
        </p>
        <p>
          Ayeba peut suspendre ou clôturer un compte en cas d’usage frauduleux, d’abus technique,
          de spam, d’atteinte à la sécurité d’autrui ou de violation manifeste des présentes
          conditions, après examen des faits et, lorsque possible, information préalable.
        </p>
      </LegalSection>

      <LegalSection title="4. Usages autorisés et interdits">
        <p>Vous vous engagez à utiliser Ayeba de manière licite et proportionnée, notamment :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>recherche personnelle ou professionnelle conforme à la loi ;</li>
          <li>respect des interfaces documentées et des limitations d’usage raisonnables ;</li>
          <li>respect des droits de propriété intellectuelle et de la vie privée des tiers.</li>
        </ul>
        <p>Sont notamment interdits :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>les attaques, tentatives d’intrusion, contournement des contrôles d’accès ;</li>
          <li>l’extraction automatisée abusive ou le déni de service ;</li>
          <li>la publication ou la diffusion de contenus illicites via les espaces contributifs ;</li>
          <li>l’usurpation d’identité et l’usage trompeur de la marque Ayeba.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Applications connectées et développeurs">
        <p>
          Les développeurs qui intègrent « Se connecter avec Ayeba » doivent respecter la{" "}
          <Link href="/developers/policy" className="text-[var(--ink)] underline">
            politique développeurs
          </Link>
          , enregistrer leurs applications de bonne foi et protéger les secrets qui leur sont
          confiés. Les utilisateurs restent libres d’autoriser ou de révoquer l’accès des
          applications à leur compte.
        </p>
      </LegalSection>

      <LegalSection title="6. Propriété intellectuelle">
        <p>
          La marque Ayeba, l’interface, les logiciels et les éléments graphiques propres au
          service sont protégés. Toute reproduction non autorisée est interdite. Les contenus
          indexés appartiennent à leurs auteurs ; Ayeba affiche des liens et extraits dans le
          cadre de l’indexation et du droit applicable.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilité et responsabilité">
        <p>
          Ayeba s’efforce d’assurer une disponibilité continue, sans engagement de résultat
          absolu. Le service peut connaître des interruptions pour maintenance, incident ou cause
          externe. Dans les limites autorisées par la loi, Ayeba ne saurait être tenu responsable
          des dommages indirects, perte de données ou préjudices résultant de l’usage des
          résultats de recherche ou d’une indisponibilité temporaire.
        </p>
      </LegalSection>

      <LegalSection title="8. Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            politique de confidentialité
          </Link>
          . En utilisant le service, vous reconnaissez en avoir pris connaissance.
        </p>
      </LegalSection>

      <LegalSection title="9. Droit applicable">
        <p>
          Les présentes conditions sont régies par le droit applicable au siège de l’éditeur,
          sous réserve des dispositions impératives protectrices du consommateur. En cas de
          litige, une solution amiable sera recherchée avant toute action judiciaire.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Pour toute question relative aux présentes conditions :{" "}
          <a href="mailto:legal@ayeba.app" className="text-[var(--ink)] underline">
            legal@ayeba.app
          </a>{" "}
          ou{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>
          . Support utilisateur :{" "}
          <Link href="/support" className="text-[var(--ink)] underline">
            ayeba.app/support
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
