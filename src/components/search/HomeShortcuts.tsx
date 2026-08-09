"use client";

export type HomeShortcut = {
  id: string;
  name: string;
  href: string;
  letter: string;
  tint: string;
};

/** Raccourcis type Yandex — sous la barre de recherche. */
export const HOME_SHORTCUTS: HomeShortcut[] = [
  {
    id: "jemsa",
    name: "JEMSA",
    href: process.env.NEXT_PUBLIC_SHORTCUT_JEMSA || "https://jensa.vercel.app",
    letter: "J",
    tint: "#2563eb",
  },
  {
    id: "sombateka",
    name: "SOMBATEKAONLE",
    href: process.env.NEXT_PUBLIC_SHORTCUT_SOMBATEKA || "https://sombateka.vercel.app",
    letter: "S",
    tint: "#059669",
  },
  {
    id: "devalpha1",
    name: "DEVALPHA1",
    href: process.env.NEXT_PUBLIC_SHORTCUT_DEVALPHA1 || "https://devalpha1.vercel.app",
    letter: "D",
    tint: "#dc2626",
  },
  {
    id: "tala",
    name: "TALA",
    href: process.env.NEXT_PUBLIC_SHORTCUT_TALA || "https://tala.vercel.app",
    letter: "T",
    tint: "#ca8a04",
  },
];

function ShortcutMark({ letter, tint, name }: { letter: string; tint: string; name: string }) {
  return (
    <span
      className="ayeba-shortcut-mark"
      style={{ background: tint }}
      aria-hidden
    >
      {letter}
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function HomeShortcuts() {
  return (
    <nav className="ayeba-shortcuts" aria-label="Accès rapides">
      {HOME_SHORTCUTS.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className="ayeba-shortcut-tile"
          title={s.name}
        >
          <ShortcutMark letter={s.letter} tint={s.tint} name={s.name} />
          <span className="ayeba-shortcut-label">{s.name}</span>
        </a>
      ))}
    </nav>
  );
}
