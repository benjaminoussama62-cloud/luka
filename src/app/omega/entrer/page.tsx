import { Suspense } from "react";
import { OmegaEntrerPage } from "@/components/omega/OmegaEntrerPage";

export const metadata = {
  title: "Connexion Ayeba — Omega",
  description: "Ouvrez Omega avec votre compte Ayeba.",
};

export const dynamic = "force-dynamic";

export default function OmegaEntrerRoute() {
  return (
    <Suspense fallback={null}>
      <OmegaEntrerPage />
    </Suspense>
  );
}
