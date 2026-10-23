import type { Metadata } from "next";
import { SignupPage } from "./signup-client";

export const metadata: Metadata = {
  title: "Créer un compte — Ayeba Mail",
  description: "Créez votre adresse @ayeba.app — messagerie chiffrée, vérifiée par téléphone.",
};

export default function Page() {
  return <SignupPage />;
}
