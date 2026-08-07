import { Suspense } from "react";
import { AyebiConnexionPage } from "@/components/ayebi/AyebiConnexionPage";

export const metadata = {
  title: "Compte contributeur — Ayebi",
  description: "Créez un compte pour rédiger l'encyclopédie congolaise Ayebi.",
};

export default function AyebiConnexionRoute() {
  return (
    <Suspense>
      <AyebiConnexionPage />
    </Suspense>
  );
}
