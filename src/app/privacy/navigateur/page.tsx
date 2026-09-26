import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Confidentialité — Navigateur Ayeba",
  description:
    "Notice de confidentialité du navigateur Ayeba et des applications mobiles Ayeba : données locales, requêtes de recherche, absence de télémétrie.",
};

export default function BrowserPrivacyPage() {
  return (
    <LegalDocumentShell
      title="Confidentialité — Navigateur Ayeba"
      subtitle="Cette notice couvre le navigateur Ayeba (application de bureau) et les applications mobiles Ayeba. Elle précise ce qui reste sur votre appareil et ce qui transite vers les services Ayeba. Elle complète la politique de confidentialité générale."
      updated="Dernière mise à jour · 26 septembre 2026"
    >
      <LegalSection title="1. Périmètre">
        <p>
          Le navigateur Ayeba comprend l’application de bureau Ayeba Browser et les applications
          mobiles publiées sous le nom Ayeba. Les applications mobiles fonctionnent comme une
          enveloppe applicative autour des services ayeba.app.
        </p>
        <p>
          Cette notice couvre les traitements propres au logiciel. Les traitements effectués par
          les services eux-mêmes (recherche, compte, Ayeba Mail) relèvent de la{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            politique de confidentialité générale
          </Link>
          {" "}et des notices produit correspondantes.
        </p>
      </LegalSection>

      <LegalSection title="2. Données qui restent sur votre appareil">
        <p>
          L’historique de navigation, les onglets ouverts, les favoris, les cookies, le cache et les
          préférences d’affichage sont stockés localement sur votre appareil. Ces éléments ne sont
          pas transmis aux serveurs d’Ayeba et ne sont pas synchronisés sans action de votre part.
        </p>
        <p>
          Vous pouvez les effacer à tout moment depuis les paramètres du navigateur, ou en
          désinstallant l’application — la désinstallation supprime les données locales associées.
        </p>
      </LegalSection>

      <LegalSection title="3. Ce qui transite vers les services Ayeba">
        <p>
          Lorsque vous saisissez une recherche ou visitez un service ayeba.app, votre requête est
          transmise aux serveurs d’Ayeba comme toute navigation web : termes recherchés et
          métadonnées techniques usuelles (adresse IP, agent utilisateur, horodatage). Ce traitement
          est décrit dans la section « Données liées à la recherche » de la politique générale.
        </p>
        <p>
          Si vous vous connectez à un compte Ayeba, une session est établie au moyen d’un cookie ou
          équivalent technique. Les données de compte relèvent de la section « Compte Ayeba et
          authentification » de la politique générale.
        </p>
      </LegalSection>

      <LegalSection title="4. Télémétrie et rapports">
        <p>
          Le navigateur n’embarque pas de télémétrie d’usage : pas de rapport automatique sur les
          pages visitées, pas de statistiques de navigation transmises à des fins d’analyse ou de
          publicité.
        </p>
        <p>
          Une vérification de mise à jour ou la consultation du statut des services peut produire
          une requête technique limitée, sans identifiant de suivi publicitaire.
        </p>
      </LegalSection>

      <LegalSection title="5. Permissions demandées (Android)">
        <p>
          Les applications mobiles Ayeba ne requièrent que l’accès au réseau (INTERNET), nécessaire
          au chargement des services. Elles ne demandent ni la localisation, ni les contacts, ni le
          microphone, ni l’appareil photo, ni les fichiers du téléphone.
        </p>
      </LegalSection>

      <LegalSection title="6. Sites tiers visités">
        <p>
          Les sites que vous visitez avec le navigateur sont soumis à leurs propres politiques.
          Ayeba n’est pas responsable des traitements opérés par des sites tiers — le navigateur
          affiche leur contenu sans en modifier les pratiques.
        </p>
      </LegalSection>

      <LegalSection title="7. Vos droits et contact">
        <p>
          Les données locales relèvent de votre seul appareil. Pour les données traitées par les
          services Ayeba (recherches, compte), les droits d’accès, de rectification, d’effacement et
          d’opposition s’exercent comme décrit sur{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            Vos droits
          </Link>
          {" "}ou via{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
