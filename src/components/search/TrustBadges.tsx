"use client";

import type { ConflictOfInterest, TrustSignals } from "@/lib/types";

export function TrustMeters({ trust }: { trust: TrustSignals }) {
  const rows: { label: string; value: number; invert?: boolean }[] = [
    { label: "Crédibilité", value: trust.credibility },
    { label: "Humain", value: trust.humanAuthoredLikelihood },
    { label: "Vérif.", value: trust.independentVerification },
    { label: "Clickbait", value: trust.clickbaitRisk, invert: true },
  ];
  return (
    <div className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">Signaux de confiance</p>
      {rows.map((row) => {
        const shown = row.invert ? 100 - row.value : row.value;
        return (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--faint)]">
              <span>{row.label}</span>
              <span className="tabular-nums text-[var(--muted)]">{row.value}</span>
            </div>
            <div className="ayeba-meter">
              <span style={{ width: `${shown}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CredibilityGauge({ trust }: { trust: TrustSignals }) {
  return (
    <span className="text-xs text-[var(--faint)]" title={`Crédibilité ${trust.credibility}`}>
      {trust.credibility}
    </span>
  );
}

export function ConflictBadge({ conflict }: { conflict: ConflictOfInterest }) {
  if (!conflict.detected) return null;
  return (
    <div className="mt-3 rounded-2xl border border-[rgba(255,107,122,0.4)] bg-[rgba(255,45,58,0.12)] px-3.5 py-2.5 text-xs text-[var(--bad)]">
      <strong className="text-white">Conflit d&apos;intérêts · {conflict.category}</strong>
      {conflict.owner ? <p className="mt-1 text-[var(--muted)]">Propriétaire : {conflict.owner}</p> : null}
      {conflict.funder ? <p className="text-[var(--muted)]">Financeur : {conflict.funder}</p> : null}
      {conflict.detail ? <p className="mt-1 text-[var(--muted)]">{conflict.detail}</p> : null}
    </div>
  );
}
