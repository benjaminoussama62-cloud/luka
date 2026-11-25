import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { SignupPage } from "./signup-client";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Créer un compte — Ayeba Mail",
  description: "Créez votre adresse @ayeba.app — messagerie chiffrée, vérifiée par téléphone.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignupPage />
    </Suspense>
  );
}
