import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { AyebiAdvancedSearch } from "@/components/ayebi/AyebiAdvancedSearch";

export const metadata = { title: "Recherche avancée — Ayebi" };

export default function RechercheAvanceePage() {
  return (
    <>
      <AyebiStage />
      <AyebiAdvancedSearch />
    </>
  );
}
