/**
 * Ayeba Mbongo — montants.
 * TOUT est en unités mineures entières (centimes pour USD et CDF, exposant 2).
 * Jamais de nombre à virgule pour le ledger : les floats binaires perdent des
 * centimes (0.1 + 0.2 !== 0.3). Seules les frontières (parsing/affichage/
 * appel provider) convertissent.
 */

export type MoneyCurrency = "USD" | "CDF";

export const MONEY_CURRENCIES: readonly MoneyCurrency[] = ["USD", "CDF"] as const;

const MINOR_EXP: Record<MoneyCurrency, number> = { USD: 2, CDF: 2 };

/** Plafonds anti-abus (en unités mineures) — ~1M USD / ~2.8M CDF par opération. */
export const MAX_MINOR: Record<MoneyCurrency, number> = {
  USD: 100_000_000,
  CDF: 100_000_000,
};

/** Minimum par opération interne (0.10 USD / 100 CDF). */
export const MIN_MINOR: Record<MoneyCurrency, number> = {
  USD: 10,
  CDF: 10_000,
};

export function isMoneyCurrency(v: unknown): v is MoneyCurrency {
  return v === "USD" || v === "CDF";
}

/**
 * "25.50" → 2550. Strict : pas de notation scientifique, pas d'espaces
 * internes, max 2 décimales, plafond par devise. Retourne null si invalide.
 */
export function parseAmountToMinor(raw: unknown, currency: MoneyCurrency): number | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s)) return null;
  const [intPart, fracPart = ""] = s.split(".");
  const exp = MINOR_EXP[currency];
  const frac = Number(fracPart.padEnd(exp, "0").slice(0, exp) || "0");
  const minor = Number(intPart) * 10 ** exp + frac;
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > MAX_MINOR[currency]) return null;
  return minor;
}

/** 2550 → "25.50" (toujours 2 décimales — les centimes CDF existent formellement). */
export function minorToMajorString(minor: number, currency: MoneyCurrency): string {
  const exp = MINOR_EXP[currency];
  const sign = minor < 0 ? "-" : "";
  const digits = String(Math.abs(minor)).padStart(exp + 1, "0");
  return `${sign}${digits.slice(0, -exp)}.${digits.slice(-exp)}`;
}

/** 2550 → 25.5 — pour l'affichage et l'appel provider (major units en number). */
export function minorToMajor(minor: number, currency: MoneyCurrency): number {
  return minor / 10 ** MINOR_EXP[currency];
}
