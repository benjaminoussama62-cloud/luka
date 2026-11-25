import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { SigninPage } from "./signin-client";

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
  title: "Connexion — Ayeba Mail",
  description: "Connectez-vous à votre boîte @ayeba.app avec votre numéro de téléphone.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SigninPage />
    </Suspense>
  );
}
