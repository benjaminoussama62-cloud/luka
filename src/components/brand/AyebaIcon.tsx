"use client";

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
    <span
      className={`inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] font-[family-name:var(--font-brand)] font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      A
    </span>
  );
}
