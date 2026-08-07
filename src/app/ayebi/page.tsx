import { AyebiBrowser } from "@/components/ayebi/AyebiBrowser";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getAllArticlesMerged } from "@/lib/ayebi/server";

export const metadata = {
  title: "Ayebi — Encyclopédie libre RDC",
  description:
    "Encyclopédie congolaise libre et collaborative : créez un compte, rédigez et modifiez des fiches 100 % RDC.",
};

export default async function AyebiHomePage() {
  const articles = await getAllArticlesMerged();

  return (
    <>
      <AyebiStage />
      <AyebiBrowser articles={articles} />
    </>
  );
}
