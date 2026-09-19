import type { PageProtection } from "@/lib/ayebi/db-sqlite";

const LABELS: Record<PageProtection, { label: string; color: string } | null> = {
  none: null,
  semi: { label: "Semi-protégée", color: "rgba(255,180,0,0.8)" },
  full: { label: "Protégée", color: "rgba(255,80,80,0.8)" },
};

export function AyebiProtectionBadge({ protection }: { protection: PageProtection }) {
  const info = LABELS[protection];
  if (!info) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider"
      style={{ borderColor: info.color, color: info.color }}
    >
      🔒 {info.label}
    </span>
  );
}
