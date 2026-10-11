import type { Metadata } from "next";
import { MailApp } from "@/components/mail/MailApp";
import "./mail.css";

export const metadata: Metadata = {
  title: "Ayeba Mail — messagerie sécurisée",
  description:
    "Votre adresse @ayeba.app — messagerie chiffrée, vérifiée par téléphone, sans analyse de contenu.",
};

const mailJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ayeba Mail",
  applicationCategory: "CommunicationApplication",
  operatingSystem: "Android, Web",
  url: "https://ayeba.app/mail",
  description:
    "Messagerie @ayeba.app chiffrée sur l'appareil — envoi et réception d'emails, pièces jointes, hors ligne, aucune donnée collectée.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function MailPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mailJsonLd) }}
      />
      <MailApp />
    </>
  );
}
