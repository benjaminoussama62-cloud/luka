"use client";

import Image from "next/image";

/** Wordmark AYEBA — même tailles, style Gargantua (majuscules + lueur cyan) */
export function AyebaWordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  /** @deprecated conservé pour compat — ignoré */
  accentLast?: boolean;
}) {
  const sizes = {
    sm: "text-[20px]",
    md: "text-[26px]",
    lg: "text-[40px]",
    hero: "text-[clamp(2.6rem,12vw,7.5rem)] leading-[0.92]",
  } as const;

  return (
    <span
      className={`ayeba-wordmark inline-block font-[family-name:var(--font-brand)] ${sizes[size]} ${className}`}
      aria-label="Ayeba"
    >
      AYEBA
    </span>
  );
}

export function AyebaIcon({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/ayeba-mark-192.png"
      alt="AYEBA"
      width={size}
      height={size}
      className={`rounded-[22%] object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
