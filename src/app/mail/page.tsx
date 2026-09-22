import type { Metadata } from "next";
import { MailApp } from "@/components/mail/MailApp";
import "./mail.css";

export const metadata: Metadata = {
  title: "Ayeba Mail — messagerie sécurisée",
  description:
    "Votre adresse @ayeba.app — messagerie chiffrée, vérifiée par téléphone, sans analyse de contenu.",
};

export default function MailPage() {
  return <MailApp />;
}
