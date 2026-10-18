"use client";

/**
 * Icones du chrome navigateur — glyphes vectoriels trait fin (style SF Symbols),
 * aucune emoji. `stroke` sur `currentColor` pour heriter la teinte Ayeba.
 */
type P = { size?: number; strokeWidth?: number; className?: string };

function Svg({
  size = 22,
  strokeWidth = 1.8,
  className,
  children,
  filled,
}: P & { children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);

export const IconForward = (p: P) => (
  <Svg {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Svg>
);

/** Partage iOS : carre + fleche vers le haut. */
export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 15V3.8" />
    <path d="M8 7.5 12 3.5l4 4" />
    <path d="M8.5 9H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2.5" />
  </Svg>
);

/** Livre ouvert = favoris/liste de lecture (Safari). */
export const IconBook = (p: P) => (
  <Svg {...p}>
    <path d="M12 6.2C10.6 5 8.8 4.5 6.7 4.5c-1 0-2 .15-2.7.35v14c.7-.2 1.7-.35 2.7-.35 2.1 0 3.9.5 5.3 1.7 1.4-1.2 3.2-1.7 5.3-1.7 1 0 2 .15 2.7.35v-14c-.7-.2-1.7-.35-2.7-.35-2.1 0-3.9.5-5.3 1.7Z" />
    <path d="M12 6.2v14" />
  </Svg>
);

export const IconBookFilled = (p: P) => (
  <Svg {...p} filled>
    <path d="M12 6.2C10.6 5 8.8 4.5 6.7 4.5c-1 0-2 .15-2.7.35v14c.7-.2 1.7-.35 2.7-.35 2.1 0 3.9.5 5.3 1.7 1.4-1.2 3.2-1.7 5.3-1.7 1 0 2 .15 2.7.35v-14c-.7-.2-1.7-.35-2.7-.35-2.1 0-3.9.5-5.3 1.7Z" />
  </Svg>
);

/** Deux carres superposes = onglets (Safari). */
export const IconTabs = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="8" width="13" height="13" rx="2.5" />
    <path d="M5.5 16H4.9A1.9 1.9 0 0 1 3 14.1V4.9A1.9 1.9 0 0 1 4.9 3h9.2A1.9 1.9 0 0 1 16 4.9v.6" />
  </Svg>
);

/** textformat / aA — options de page (glyphes texte, comme Safari). */
export const IconTextSize = ({ size = 22, className }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <text
      x="3"
      y="18.5"
      fontSize="10"
      fontWeight="500"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
    >
      a
    </text>
    <text
      x="10"
      y="19.5"
      fontSize="16.5"
      fontWeight="600"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
    >
      A
    </text>
  </svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2" />
    <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m15.4 15.4 5.1 5.1" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2.4" />
  </Svg>
);

export const IconRestore = (p: P) => (
  <Svg {...p}>
    <path d="M4 10a8 8 0 1 1 2 6" />
    <path d="M4 10V4.5M4 10h5.5" />
  </Svg>
);

export const IconDesktop = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="12.5" rx="2" />
    <path d="M9 21h6M12 17v4" />
  </Svg>
);

export const IconPhone = (p: P) => (
  <Svg {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2.2" />
    <path d="M10.5 5.5h3" />
  </Svg>
);

export const IconReload = (p: P) => (
  <Svg {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.8 3.5v3.8H16" />
  </Svg>
);

export const IconGlobe = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5Z" />
  </Svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5 5 6.2v5.1c0 4.4 3 8.1 7 9.2 4-1.1 7-4.8 7-9.2V6.2L12 3.5Z" />
  </Svg>
);

export const IconChevronUp = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 14.5 12 8l6.5 6.5" />
  </Svg>
);

export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="M5.5 9.5 12 16l6.5-6.5" />
  </Svg>
);

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="m4 11 8-6.5L20 11" />
    <path d="M6 9.5V20h12V9.5" />
  </Svg>
);

export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.2" />
    <path d="M5.5 15.5h-1A1.5 1.5 0 0 1 3 14V5.5A1.5 1.5 0 0 1 4.5 4H13a1.5 1.5 0 0 1 1.5 1.5v1" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconDoc = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="2.2" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" />
  </Svg>
);
