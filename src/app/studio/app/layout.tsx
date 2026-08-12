import { GradientStage } from "@/components/effects/GradientStage";

export default function StudioAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientStage />
      {children}
    </>
  );
}
