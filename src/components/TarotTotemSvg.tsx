import React from 'react';

interface TarotTotemSvgProps {
  arcanaNumber: number; // 0..21
  className?: string;
}

/**
 * Bespoke sacred-geometry & symbolic SVG emblems for all 22 Major Arcana.
 * Designed in an antique brass gold & deep ink-green editorial line-art style.
 */
export const TarotTotemSvg: React.FC<TarotTotemSvgProps> = ({
  arcanaNumber,
  className = 'w-20 h-20',
}) => {
  const num = arcanaNumber === 22 ? 0 : arcanaNumber;

  const renderGlyph = () => {
    switch (num) {
      case 0: // 愚者: Cliff edge, rising sun, boundless spiral
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <circle cx="60" cy="34" r="10" />
            <path d="M60 16v4M60 48v4M42 34h4M74 34h4M47 21l3 3M70 44l3 3M73 21l-3 3M50 44l-3 3" />
            <path d="M26 88 L56 64 L66 72 L94 90" />
            <path d="M56 64 C62 52, 74 52, 74 62 C74 70, 62 72, 58 64" />
          </g>
        );
      case 1: // 魔術師: Lemniscate (infinity), wand, four elemental points
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M40 34 C40 24, 54 24, 60 34 C66 44, 80 44, 80 34 C80 24, 66 24, 60 34 C54 44, 40 44, 40 34 Z" />
            <line x1="60" y1="46" x2="60" y2="90" />
            <polygon points="60,52 68,62 60,72 52,62" />
            <circle cx="38" cy="72" r="3" />
            <circle cx="82" cy="72" r="3" />
            <path d="M36 86 H84" />
          </g>
        );
      case 2: // 女祭師: Twin pillars, crescent moon, veil
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <rect x="30" y="28" width="10" height="62" />
            <rect x="80" y="28" width="10" height="62" />
            <circle cx="60" cy="48" r="11" />
            <path d="M46 78 A16 16 0 0 0 74 78 A12 12 0 0 1 46 78 Z" />
            <line x1="40" y1="36" x2="80" y2="36" strokeDasharray="3 3" />
          </g>
        );
      case 3: // 皇后: Venus emblem, crown of stars, wheat arc
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <circle cx="60" cy="48" r="14" />
            <line x1="60" y1="62" x2="60" y2="90" />
            <line x1="48" y1="76" x2="72" y2="76" />
            <path d="M34 32 Q60 16 86 32" />
            <circle cx="44" cy="24" r="1.8" fill="currentColor" />
            <circle cx="60" cy="20" r="2.2" fill="currentColor" />
            <circle cx="76" cy="24" r="1.8" fill="currentColor" />
          </g>
        );
      case 4: // 皇帝: Architectural throne, Ankh scepter, square stability
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <rect x="32" y="34" width="56" height="54" />
            <polygon points="32,34 46,20 60,30 74,20 88,34" />
            <circle cx="60" cy="52" r="8" />
            <line x1="60" y1="60" x2="60" y2="82" />
            <line x1="50" y1="69" x2="70" y2="69" />
          </g>
        );
      case 5: // 教皇: Triple crown, crossed keys
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <line x1="60" y1="22" x2="60" y2="88" />
            <line x1="46" y1="32" x2="74" y2="32" />
            <line x1="42" y1="44" x2="78" y2="44" />
            <line x1="48" y1="56" x2="72" y2="56" />
            <circle cx="44" cy="78" r="6" />
            <circle cx="76" cy="78" r="6" />
            <line x1="49" y1="74" x2="72" y2="62" />
            <line x1="71" y1="74" x2="48" y2="62" />
          </g>
        );
      case 6: // 戀人: Interlocking Vesica Piscis, radiant apex
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <circle cx="49" cy="62" r="18" />
            <circle cx="71" cy="62" r="18" />
            <circle cx="60" cy="28" r="7" />
            <line x1="60" y1="16" x2="60" y2="19" />
            <line x1="48" y1="22" x2="51" y2="24" />
            <line x1="72" y1="22" x2="69" y2="24" />
            <path d="M60 44 L60 80" strokeDasharray="2 3" />
          </g>
        );
      case 7: // 戰車: Star canopy, twin wheels, spearhead vector
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <polygon points="60,20 84,66 36,66" />
            <rect x="44" y="48" width="32" height="28" />
            <circle cx="34" cy="78" r="9" />
            <circle cx="86" cy="78" r="9" />
            <line x1="60" y1="20" x2="60" y2="86" />
          </g>
        );
      case 8: // 力量: Infinity over concentric lion solar emblem
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M44 28 C44 20, 56 20, 60 28 C64 36, 76 36, 76 28 C76 20, 64 20, 60 28 C56 36, 44 36, 44 28 Z" />
            <circle cx="60" cy="64" r="20" />
            <circle cx="60" cy="64" r="11" />
            <path d="M60 44 L60 39 M60 84 L60 89 M40 64 L35 64 M80 64 L85 64" />
          </g>
        );
      case 9: // 隱者: Six-pointed lantern star atop mountain peak
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <polygon points="60,24 72,46 48,46" />
            <polygon points="60,52 72,30 48,30" />
            <path d="M26 88 L60 56 L94 88" />
            <line x1="60" y1="56" x2="60" y2="88" strokeDasharray="3 3" />
          </g>
        );
      case 10: // 命運之輪: 8-spoked Dharma/Fortune wheel
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <circle cx="60" cy="56" r="28" />
            <circle cx="60" cy="56" r="18" />
            <circle cx="60" cy="56" r="5" />
            <line x1="60" y1="28" x2="60" y2="84" />
            <line x1="32" y1="56" x2="88" y2="56" />
            <line x1="40" y1="36" x2="80" y2="76" />
            <line x1="80" y1="36" x2="40" y2="76" />
          </g>
        );
      case 11: // 正義: Upright sword and balanced scales
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <line x1="60" y1="20" x2="60" y2="90" />
            <line x1="32" y1="42" x2="88" y2="42" />
            <path d="M32 42 L24 62 H40 Z" />
            <path d="M88 42 L80 62 H96 Z" />
            <line x1="48" y1="84" x2="72" y2="84" />
          </g>
        );
      case 12: // 吊人: Inverted T-cross with illuminated halo below
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <line x1="28" y1="26" x2="92" y2="26" />
            <line x1="60" y1="26" x2="60" y2="70" />
            <path d="M60 44 L44 58 L60 58" />
            <circle cx="60" cy="78" r="10" />
            <circle cx="60" cy="78" r="15" strokeDasharray="2 4" />
          </g>
        );
      case 13: // 死神: Eclipse horizon and five-petal mystic rose
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M24 72 H96" />
            <path d="M40 72 A20 20 0 0 1 80 72" />
            <circle cx="60" cy="40" r="14" />
            <circle cx="60" cy="40" r="6" />
            <line x1="60" y1="20" x2="60" y2="26" />
            <line x1="42" y1="40" x2="46" y2="40" />
            <line x1="74" y1="40" x2="78" y2="40" />
          </g>
        );
      case 14: // 節制: Twin chalices with flowing alchemical stream & triangle in square
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M32 30 H50 L41 44 Z" />
            <path d="M70 68 H88 L79 82 Z" />
            <path d="M41 44 C48 56, 72 54, 79 68" />
            <path d="M45 42 C54 52, 74 52, 83 66" strokeDasharray="2 3" />
            <rect x="52" y="24" width="16" height="16" />
            <polygon points="60,26 66,37 54,37" />
          </g>
        );
      case 15: // 惡魔: Inverted pentagram & openable link rings
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <polygon points="60,72 44,32 78,56 42,56 76,32" />
            <circle cx="42" cy="80" r="7" />
            <circle cx="78" cy="80" r="7" />
            <line x1="49" y1="80" x2="71" y2="80" strokeDasharray="3 3" />
          </g>
        );
      case 16: // 高塔: Spire split by lightning flash
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <rect x="44" y="42" width="32" height="48" />
            <path d="M40 42 L48 30 L60 36 L72 30 L80 42" />
            <polyline points="84,18 62,38 72,42 46,66" />
            <line x1="32" y1="90" x2="88" y2="90" />
          </g>
        );
      case 17: // 星星: Eight-pointed Sirius star & ripples
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <polygon points="60,20 65,42 87,47 65,52 60,74 55,52 33,47 55,42" />
            <circle cx="34" cy="28" r="2" fill="currentColor" />
            <circle cx="86" cy="28" r="2" fill="currentColor" />
            <path d="M28 82 Q44 76 60 82 T92 82" />
            <path d="M36 90 Q48 86 60 90 T84 90" />
          </g>
        );
      case 18: // 月亮: Crescent & full moon above twin towers & winding path
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <circle cx="60" cy="36" r="14" />
            <path d="M62 23 A12 12 0 0 0 62 49 A9 9 0 0 1 62 23 Z" />
            <rect x="28" y="58" width="12" height="30" />
            <rect x="80" y="58" width="12" height="30" />
            <path d="M52 90 C54 78, 66 76, 60 60" />
          </g>
        );
      case 19: // 太陽: Radiant 12-ray sun disc
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <circle cx="60" cy="56" r="16" />
            <circle cx="60" cy="56" r="7" />
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 60 + Math.cos(angle) * 21;
              const y1 = 56 + Math.sin(angle) * 21;
              const x2 = 60 + Math.cos(angle) * (i % 2 === 0 ? 32 : 27);
              const y2 = 56 + Math.sin(angle) * (i % 2 === 0 ? 32 : 27);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
        );
      case 20: // 審判: Ascending horn, sound wave arcs, rising phoenix V
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <polygon points="60,20 50,48 70,48" />
            <path d="M40 58 Q60 68 80 58" />
            <path d="M32 68 Q60 80 88 68" />
            <polyline points="42,88 60,72 78,88" />
          </g>
        );
      case 21: // 世界: Laurel mandorla wreath & four corner anchors
      default:
        return (
          <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <ellipse cx="60" cy="56" rx="20" ry="30" />
            <ellipse cx="60" cy="56" rx="14" ry="23" strokeDasharray="3 3" />
            <circle cx="60" cy="56" r="5" />
            <circle cx="32" cy="28" r="3" />
            <circle cx="88" cy="28" r="3" />
            <circle cx="32" cy="84" r="3" />
            <circle cx="88" cy="84" r="3" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 120 112"
      className={className}
      aria-hidden="true"
    >
      {/* Subtle archival border corners */}
      <rect
        x="8"
        y="8"
        width="104"
        height="96"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      <rect
        x="13"
        y="13"
        width="94"
        height="86"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="0.75"
      />
      {renderGlyph()}
    </svg>
  );
};
