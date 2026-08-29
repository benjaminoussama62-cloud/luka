import { GradientStage } from "@/components/effects/GradientStage";

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientStage />
      {children}
    </>
  );
}
