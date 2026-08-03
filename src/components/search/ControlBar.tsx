"use client";

import { useAyeba } from "@/lib/store";

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ayeba-chip px-3.5 py-1.5 text-sm ${active ? "active" : ""}`}
    >
      {label}
    </button>
  );
}

export function ControlBar() {
  const {
    zeroAi,
    setZeroAi,
    zeroAds,
    setZeroAds,
    privateMode,
    setPrivateMode,
    splitScreen,
    setSplitScreen,
    setDeepResearchOpen,
    setCanvasOpen,
    setCodeOpen,
    setPodcastOpen,
    response,
  } = useAyeba();

  return (
    <div className="flex flex-wrap gap-2">
      <Toggle active={zeroAi} onClick={() => setZeroAi(!zeroAi)} label="Zéro IA" />
      <Toggle
        active={zeroAds || privateMode}
        onClick={() => setZeroAds(!(zeroAds || privateMode))}
        label="Zéro Pub"
      />
      <Toggle
        active={privateMode}
        onClick={() => setPrivateMode(!privateMode)}
        label="Privé"
      />
      <Toggle
        active={splitScreen}
        onClick={() => setSplitScreen(!splitScreen)}
        label="Split"
      />
      <button
        type="button"
        onClick={() => setDeepResearchOpen(true)}
        className="rounded-full bg-gradient-to-r from-[var(--red)] to-[#6b7280] px-3.5 py-1.5 text-sm font-semibold text-white"
      >
        Recherche Profonde
      </button>
      <button type="button" onClick={() => setCanvasOpen(true)} className="ayeba-chip px-3.5 py-1.5 text-sm">
        Canevas
      </button>
      <button
        type="button"
        onClick={() => setCodeOpen(true)}
        disabled={!response?.code}
        className="ayeba-chip px-3.5 py-1.5 text-sm disabled:opacity-35"
      >
        Code
      </button>
      <button type="button" onClick={() => setPodcastOpen(true)} className="ayeba-chip px-3.5 py-1.5 text-sm">
        Podcast
      </button>
    </div>
  );
}
