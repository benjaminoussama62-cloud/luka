import type { Metadata } from "next";
import { Suspense } from "react";
import { SigninPage } from "./signin-client";

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
