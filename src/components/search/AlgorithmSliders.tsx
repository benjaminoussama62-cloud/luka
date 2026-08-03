"use client";

import { useAyeba } from "@/lib/store";

function SliderRow({
  label,
  left,
  right,
  value,
  onChange,
}: {
  label: string;
  left: string;
  right: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--faint)]">
          {label}
        </span>
        <span className="rounded-full bg-[rgba(255,45,63,0.15)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--red)]">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10"
      />
      <div className="flex justify-between text-[11px] text-[var(--faint)]">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="ayeba-meter">
        <span style={{ width: `${value}%` }} />
      </div>
    </label>
  );
}

export function AlgorithmSliders() {
  const { sliders, setSlider, zeroAi, zeroAds, privateMode } = useAyeba();
  return (
    <section className="ayeba-panel space-y-6 p-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          Mix algorithmique
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--faint)]">
          Curseurs publics — ce que tu vois n&apos;est pas une boîte noire.
        </p>
      </div>
      <SliderRow
        label="Audience"
        left="Grand public"
        right="Scientifique"
        value={sliders.audience}
        onChange={(v) => setSlider("audience", v)}
      />
      <SliderRow
        label="Autorité"
        left="Fraîcheur"
        right="Institutions"
        value={sliders.authority}
        onChange={(v) => setSlider("authority", v)}
      />
      <SliderRow
        label="Géographie"
        left="Priorité locale"
        right="Monde entier"
        value={sliders.locality}
        onChange={(v) => setSlider("locality", v)}
      />
      <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
        <span className={`ayeba-chip px-2.5 py-1 text-[10px] ${zeroAi ? "active text-white" : "text-[var(--faint)]"}`}>
          Zéro IA {zeroAi ? "ON" : "OFF"}
        </span>
        <span className={`ayeba-chip px-2.5 py-1 text-[10px] ${zeroAds || privateMode ? "active text-white" : "text-[var(--faint)]"}`}>
          Zéro Pub {(zeroAds || privateMode) ? "ON" : "OFF"}
        </span>
        <span className={`ayeba-chip px-2.5 py-1 text-[10px] ${privateMode ? "active text-white" : "text-[var(--faint)]"}`}>
          Privé {privateMode ? "ON" : "OFF"}
        </span>
      </div>
    </section>
  );
}
