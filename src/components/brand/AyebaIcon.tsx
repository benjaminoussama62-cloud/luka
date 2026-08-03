"use client";

/** Wordmark Ayeba — typographie pure, accent rouge discret. */
export function AyebaWordmark({
  size = "md",
  className = "",
  accentLast = false,
}: {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  accentLast?: boolean;
}) {
  const sizes = {
    sm: "text-[20px]",
    md: "text-[26px]",
    lg: "text-[40px]",
    hero: "text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.92]",
  } as const;

  if (accentLast) {
    return (
      <span
        className={`ayeba-wordmark inline-block font-[family-name:var(--font-brand)] ${sizes[size]} ${className}`}
        aria-label="Ayeba"
      >
        Aye<span className="accent">ba</span>
      </span>
    );
  }

  return (
    <span
      className={`ayeba-wordmark inline-block font-[family-name:var(--font-brand)] ${sizes[size]} ${className}`}
      aria-label="Ayeba"
    >
      Ayeba
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
      className={`inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] font-[family-name:var(--font-brand)] font-bold text-[var(--red)] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      A
    </span>
  );
}
