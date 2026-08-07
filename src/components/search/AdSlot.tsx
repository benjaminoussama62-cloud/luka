"use client";

import { useAyeba } from "@/lib/store";

/** Infrastructure pub — désactivée quand zeroAds est actif (défaut AYEBA) */
export function AdSlot({ placement }: { placement: string }) {
  const { zeroAds } = useAyeba();
  if (zeroAds) return null;

  return (
    <aside
      className="ayeba-panel mb-6 flex min-h-[90px] items-center justify-center border-dashed p-4 text-center"
      data-ad-placement={placement}
    >
      <p className="text-xs text-[var(--faint)]">Espace partenaire · {placement}</p>
    </aside>
  );
}
