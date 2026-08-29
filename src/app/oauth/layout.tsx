import { GradientStage } from "@/components/effects/GradientStage";

export default function OAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientStage />
      {children}
    </>
  );
}
