"use client";

import { AyebaWordmark } from "./AyebaIcon";
import { RdcMaterialIcon } from "./RdcMaterialIcon";

type Size = "sm" | "md" | "lg" | "hero";

const iconSizes: Record<Size, number> = {
  sm: 28,
  md: 36,
  lg: 52,
  hero: 72,
};

const gaps: Record<Size, string> = {
  sm: "gap-2",
  md: "gap-2.5",
  lg: "gap-3",
  hero: "gap-4 sm:gap-5",
};

export function AyebaBrand({
  size = "md",
  className = "",
  accentLast = true,
  showRdc = false,
}: {
  size?: Size;
  className?: string;
  accentLast?: boolean;
  showRdc?: boolean;
}) {
  return (
    <span className={`inline-flex items-center ${gaps[size]} ${className}`}>
      <AyebaWordmark size={size} accentLast={accentLast} />
      {showRdc ? <RdcMaterialIcon size={iconSizes[size]} /> : null}
    </span>
  );
}
