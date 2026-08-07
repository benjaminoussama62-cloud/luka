"use client";

import { useId } from "react";
import { DRC_PATH, DRC_VIEWBOX } from "@/components/effects/drc-path";

type Props = {
  size?: number;
  className?: string;
  title?: string;
};

/** Silhouette RDC style emoji matériel — contour dégradé, intérieur vide/sombre. */
export function RdcMaterialIcon({ size = 44, className = "", title = "RDC" }: Props) {
  const uid = useId().replace(/:/g, "");
  const grad = `rdc-grad-${uid}`;
  const shine = `rdc-shine-${uid}`;
  const shadow = `rdc-shadow-${uid}`;

  return (
    <span
      className={`rdc-material inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={title}
      aria-hidden
    >
      <svg viewBox={DRC_VIEWBOX} width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id={grad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#007fff">
              <animate
                attributeName="stop-color"
                values="#007fff;#fcd116;#e85d04;#007fff"
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#fcd116">
              <animate
                attributeName="stop-color"
                values="#fcd116;#e85d04;#00d4aa;#fcd116"
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#e85d04">
              <animate
                attributeName="stop-color"
                values="#e85d04;#007fff;#fcd116;#e85d04"
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
          <linearGradient id={shine} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id={shadow} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#e85d04" floodOpacity="0.35" />
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>
        {/* Corps mat — intérieur noir, pas de dégradé à l'intérieur */}
        <path
          d={DRC_PATH}
          fill="#060606"
          stroke={`url(#${grad})`}
          strokeWidth="10"
          strokeLinejoin="round"
          filter={`url(#${shadow})`}
        />
        {/* Reflet matériel sur le bord supérieur */}
        <path
          d={DRC_PATH}
          fill="none"
          stroke={`url(#${shine})`}
          strokeWidth="3"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>
    </span>
  );
}

type StarProps = {
  size?: number;
  className?: string;
};

const STAR_PATH =
  "M 200,28 L 224,148 L 348,148 L 248,218 L 284,338 L 200,262 L 116,338 L 152,218 L 52,148 L 176,148 Z";

/** Étoile style matériau — même traitement que la RDC (contour dégradé, cœur vide). */
export function MaterialStarIcon({ size = 32, className = "" }: StarProps) {
  const uid = useId().replace(/:/g, "");
  const grad = `star-grad-${uid}`;
  const shadow = `star-shadow-${uid}`;

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={`overflow-visible ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={grad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd116">
            <animate
              attributeName="stop-color"
              values="#fcd116;#e85d04;#007fff;#fcd116"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#e85d04">
            <animate
              attributeName="stop-color"
              values="#e85d04;#007fff;#fcd116;#e85d04"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
        <filter id={shadow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#fcd116" floodOpacity="0.45" />
        </filter>
      </defs>
      <path
        d={STAR_PATH}
        fill="#050505"
        stroke={`url(#${grad})`}
        strokeWidth="12"
        strokeLinejoin="round"
        filter={`url(#${shadow})`}
      />
    </svg>
  );
}
