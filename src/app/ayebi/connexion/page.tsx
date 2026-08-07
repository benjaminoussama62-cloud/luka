import { Suspense } from "react";
import { AyebiConnexionPage } from "@/components/ayebi/AyebiConnexionPage";

export const metadata = {
  title: "Compte contributeur — Ayebi",
  description: "Créez un compte pour rédiger l'encyclopédie congolaise Ayebi.",
};

export const dynamic = "force-dynamic";

export default function AyebiConnexionRoute() {
  return (
    <Suspense fallback={null}>
      <AyebiConnexionPage />
    </Suspense>
  );
}
