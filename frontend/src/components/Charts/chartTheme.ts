/**
 * Crystalline Swan — Victory Chart Theme
 * =======================================
 * Shared theme configuration, color palettes, styled-components,
 * and Victory theme object for all charts.
 * Migrated from Nivo to Victory for React Native compatibility.
 * Design spec by Gemini 3.1 Pro + AI Village 11-Brain Consensus.
 */

import styled, { keyframes } from 'styled-components';

// ── Color Tokens ──
export const CHART_COLORS = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  wingPurple: '#8B5CF6',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  textSecondary: 'rgba(224, 236, 244, 0.90)', // AI Village: 4.8:1 contrast on #003080
  gridLine: 'rgba(96, 192, 240, 0.28)', // AI Village: increased visibility
  vaultShadow: 'rgba(0, 32, 96, 0.6)',
  errorRed: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  // AI Village Phase 3 consensus tokens (2026-03-22)
  glacialMist: '#A0C8E8',     // Inactive/neutral states (5.2:1 on Royal Depth)
  crimsonFrost: '#E14B67',    // Error/overdue status (5.8:1 on Royal Depth)
  auroraGreen: '#00D0A0',     // Success/ready status (6.2:1 on Royal Depth)
} as const;

export const hexAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

// ── Lens v2 chart palette bridge ──
// Victory receives RESOLVED color strings (SVG presentation attrs cannot
// carry CSS var()), so lens tokens are read via getComputedStyle from a
// host INSIDE the lens frame and fall back to Swan defaults — zero visual
// delta until a v2 recipe is worn. Chart chrome (axes, tooltips, labels)
// deliberately stays Swan-fixed for readability; only the data-series
// accent pair follows the lens.
export interface LensChartPalette {
  /** Primary data series (Swan default: Ice Wing). */
  primary: string;
  /** Secondary data series (Swan default: Wing Purple). */
  secondary: string;
}

export const SWAN_CHART_PALETTE: LensChartPalette = {
  primary: CHART_COLORS.iceWing,
  secondary: CHART_COLORS.wingPurple,
};

/** Resolve the lens chart palette from a host element (SSR/hostless-safe). */
export const resolveLensChartPalette = (host?: HTMLElement | null): LensChartPalette => {
  if (typeof window === 'undefined' || !host) return SWAN_CHART_PALETTE;
  const styles = getComputedStyle(host);
  const read = (token: string, fallback: string) =>
    styles.getPropertyValue(token).trim() || fallback;
  return {
    primary: read('--world-accent', SWAN_CHART_PALETTE.primary),
    secondary: read('--world-action', SWAN_CHART_PALETTE.secondary),
  };
};

// ── Palette Arrays ──
export const FULL_PALETTE = [
  CHART_COLORS.iceWing,
  CHART_COLORS.wingPurple,
  CHART_COLORS.gildedFern,
  CHART_COLORS.arcticCyan,
  CHART_COLORS.swanLavender,
  CHART_COLORS.frostWhite,
];

export const MACRO_PALETTE = [CHART_COLORS.iceWing, CHART_COLORS.wingPurple, CHART_COLORS.gildedFern];

export const STREAM_PALETTE = [
  CHART_COLORS.wingPurple,
  CHART_COLORS.arcticCyan,
  CHART_COLORS.swanLavender,
  CHART_COLORS.iceWing,
  CHART_COLORS.gildedFern,
];

// ── Breakpoints ──
export const BREAKPOINTS = {
  mobile: '430px',
  tablet: '768px',
  desktop: '1280px',
  wide: '1920px',
};

// ── Victory Theme Object ──
export const victoryTheme = {
  axis: {
    style: {
      axis: { stroke: hexAlpha(CHART_COLORS.iceWing, 0.2), strokeWidth: 1 },
      grid: { stroke: CHART_COLORS.gridLine, strokeWidth: 1, strokeDasharray: '4 4' },
      ticks: { stroke: hexAlpha(CHART_COLORS.iceWing, 0.2), size: 4 },
      tickLabels: {
        fill: CHART_COLORS.textSecondary,
        fontSize: 11,
        fontFamily: "'Fira Code', monospace",
        padding: 8,
      },
      axisLabel: {
        fill: CHART_COLORS.textSecondary,
        fontSize: 12,
        fontFamily: "'Sora', sans-serif",
        padding: 32,
      },
    },
  },
  chart: {
    padding: { top: 20, bottom: 40, left: 50, right: 20 },
  },
  line: {
    style: {
      data: { strokeWidth: 2.5 },
      labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Fira Code', monospace" },
    },
  },
  area: {
    style: {
      data: { strokeWidth: 2, fillOpacity: 0.3 },
      labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Fira Code', monospace" },
    },
  },
  bar: {
    style: {
      data: { strokeWidth: 0 },
      labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Fira Code', monospace" },
    },
    barRatio: 0.7,
  },
  pie: {
    style: {
      data: { stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 },
      labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Sora', sans-serif" },
    },
  },
  scatter: {
    style: {
      data: { strokeWidth: 1, opacity: 0.85 },
      labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Fira Code', monospace" },
    },
  },
  tooltip: {
    style: {
      fill: CHART_COLORS.frostWhite,
      fontSize: 12,
      fontFamily: "'Fira Code', monospace",
    },
    flyoutStyle: {
      fill: hexAlpha('#1A1A24', 0.95), // Graphite per Gemini spec
      stroke: hexAlpha(CHART_COLORS.wingPurple, 0.3),
      strokeWidth: 1,
    },
  },
  voronoi: {
    style: {
      labels: { fill: CHART_COLORS.frostWhite, fontSize: 12, fontFamily: "'Fira Code', monospace" },
    },
  },
  legend: {
    style: {
      labels: { fill: CHART_COLORS.frostWhite, fontSize: 12, fontFamily: "'Sora', sans-serif" },
    },
  },
};

// ── Victory Motion Config ──
export const VICTORY_ANIMATE = { duration: 800, easing: 'cubicInOut' as const };

// ── Styled Components ──

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const DashboardGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  width: 100%;
  max-width: 2400px;
  margin: 0 auto;
  padding: 1.5rem;
  grid-template-columns: 1fr;

  @media (min-width: ${BREAKPOINTS.tablet})  { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: ${BREAKPOINTS.desktop}) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: ${BREAKPOINTS.wide})    { grid-template-columns: repeat(4, 1fr); }
`;

export const ChartCard = styled.article<{ $span?: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(
      168deg,
      ${hexAlpha(CHART_COLORS.royalDepth, 0.75)} 0%,
      ${hexAlpha(CHART_COLORS.midnightSapphire, 0.65)} 55%,
      ${hexAlpha('#0A0A0F', 0.7)} 100%
    );
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.12)};
  border-top-color: ${hexAlpha(CHART_COLORS.iceWing, 0.25)};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow:
    0 2px 4px ${hexAlpha('#000', 0.3)},
    0 8px 24px ${hexAlpha('#000', 0.25)},
    0 16px 48px ${CHART_COLORS.vaultShadow};
  box-sizing: border-box;
  height: 320px;
  grid-column: span 1;
  transform: perspective(800px) rotateX(1deg);
  transform-origin: center bottom;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s ease,
              border-color 0.3s ease;
  will-change: transform, box-shadow;

  animation: ${fadeUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;

  /* Top-edge highlight — simulates overhead light source for 3D depth */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${hexAlpha(CHART_COLORS.iceWing, 0.35)} 30%,
      ${hexAlpha(CHART_COLORS.frostWhite, 0.2)} 50%,
      ${hexAlpha(CHART_COLORS.iceWing, 0.35)} 70%,
      transparent 100%
    );
    border-radius: inherit;
    pointer-events: none;
    z-index: 3;
  }

  /* Inner depth shadow — creates recessed panel effect */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 1px 0 ${hexAlpha(CHART_COLORS.frostWhite, 0.04)},
      inset 0 -8px 24px ${hexAlpha('#000', 0.15)},
      inset 0 0 20px ${hexAlpha(CHART_COLORS.wingPurple, 0.04)};
    pointer-events: none;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: perspective(800px) rotateX(0deg) translateY(-6px) translateZ(0);
      box-shadow:
        0 4px 8px ${hexAlpha('#000', 0.3)},
        0 16px 48px ${hexAlpha(CHART_COLORS.midnightSapphire, 0.8)},
        0 0 24px ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
      border-color: ${hexAlpha(CHART_COLORS.iceWing, 0.4)};
      border-top-color: ${hexAlpha(CHART_COLORS.iceWing, 0.5)};
    }
  }

  &:focus-within {
    transform: perspective(800px) rotateX(0deg) translateY(-4px) translateZ(0);
    border: 1px solid ${CHART_COLORS.wingPurple};
    box-shadow: 0 0 0 2px ${CHART_COLORS.midnightSapphire},
                0 0 0 4px ${CHART_COLORS.wingPurple},
                0 16px 48px ${hexAlpha(CHART_COLORS.wingPurple, 0.3)};
  }

  @media (min-width: ${BREAKPOINTS.tablet}) {
    height: 380px;
    grid-column: span ${({ $span }) => Math.min($span || 1, 2)};
  }
  @media (min-width: ${BREAKPOINTS.desktop}) {
    height: 420px;
    grid-column: span ${({ $span }) => Math.min($span || 1, 3)};
  }
  @media (min-width: ${BREAKPOINTS.wide}) {
    grid-column: span ${({ $span }) => Math.min($span || 1, 4)};
  }

  @media (max-width: ${BREAKPOINTS.mobile}) {
    padding: 1rem;
    border-radius: 12px;
    /* Reduce perspective effect on small screens for usability */
    transform: perspective(800px) rotateX(0.5deg);
  }

  @supports not (backdrop-filter: blur(1px)) {
    background: ${hexAlpha('#0A0A0F', 0.95)};
    box-shadow: 0 8px 32px ${hexAlpha('#000', 0.5)};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
    transform: none;
    &:hover, &:focus-within {
      transform: none;
      transition: none;
    }
  }
`;

export const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  z-index: 2;
  flex-shrink: 0;
`;

export const ChartTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: ${CHART_COLORS.frostWhite};
  margin: 0;
  letter-spacing: -0.02em;
`;

export const ChartSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: ${CHART_COLORS.textSecondary};
  margin: 0.25rem 0 0;
`;

export const ChartContainer = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
  z-index: 1;
`;

export const TooltipBox = styled.div`
  background: ${hexAlpha('#1A1A24', 0.95)}; /* Graphite per Gemini spec */
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid ${hexAlpha(CHART_COLORS.wingPurple, 0.3)};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${hexAlpha(CHART_COLORS.wingPurple, 0.15)};
  color: ${CHART_COLORS.frostWhite};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;

  strong {
    font-family: 'Fira Code', monospace;
    font-size: 0.875rem;
    color: ${CHART_COLORS.iceWing};
    display: block;
    margin-top: 0.25rem;
  }
`;

export const CenterLabel = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  z-index: 2;

  .value {
    font-family: 'Fira Code', monospace;
    font-size: 1.5rem;
    font-weight: 600;
    color: ${CHART_COLORS.frostWhite};
  }
  .label {
    font-family: 'Sora', sans-serif;
    font-size: 0.7rem;
    color: ${CHART_COLORS.textSecondary};
    margin-top: 2px;
  }
`;

/**
 * Strips data points where x or y is undefined, null, NaN, or otherwise
 * unparseable before passing to any Victory chart. Prevents "Expected
 * number, NaN" SVG path errors that occur when backend returns sparse
 * or partially-populated data.
 *
 * 2026-05-01 hardening: prior version only validated y. When x was an
 * unparseable date string or null, Victory produced paths like
 * "M NaN, 137.8..." flooding the console with hundreds of errors. Now
 * also validates x: numbers must be finite; strings must be non-empty
 * (Victory accepts string categorical x); other shapes are dropped.
 */
export function sanitizeChartData<T extends { x?: unknown; y: unknown }>(data: T[]): T[] {
  if (!Array.isArray(data)) return [];
  return data.filter(d => {
    if (typeof d.y !== 'number' || isNaN(d.y) || !isFinite(d.y)) return false;
    if (d.x === undefined || d.x === null) return false;
    if (typeof d.x === 'number') return isFinite(d.x);
    if (typeof d.x === 'string') return d.x.length > 0;
    if (d.x instanceof Date) return !isNaN(d.x.getTime());
    return true;
  });
}

// ── Category Tab Components (AI Village Phase 3 consensus) ──

export const CategoryTabsContainer = styled.div`
  margin: 24px 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: ${BREAKPOINTS.tablet}) {
    margin: 16px -16px;
    padding: 0 16px;
  }
`;

export const TabList = styled.div`
  display: flex;
  gap: 12px;
  min-width: min-content;
`;

export const CategoryTab = styled.button`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  background: ${hexAlpha(CHART_COLORS.midnightSapphire, 0.5)};
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.2)};
  color: ${CHART_COLORS.textSecondary};
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
  transition: all 0.3s ease;

  &[aria-selected="true"] {
    background: ${hexAlpha(CHART_COLORS.wingPurple, 0.2)};
    border-color: ${CHART_COLORS.wingPurple};
    color: ${CHART_COLORS.frostWhite};
    box-shadow: 0 0 16px ${hexAlpha(CHART_COLORS.wingPurple, 0.4)};
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not([aria-selected="true"]) {
      background: ${hexAlpha(CHART_COLORS.iceWing, 0.1)};
      color: ${CHART_COLORS.frostWhite};
    }
  }

  &:focus-visible {
    outline: 2px solid ${CHART_COLORS.wingPurple};
    outline-offset: 2px;
  }
`;

// ── Icon Wrap (AI Village: token-based gradients) ──
export const IconWrap = styled.div`
  --gradient-start: ${hexAlpha(CHART_COLORS.iceWing, 0.2)};
  --gradient-end: ${hexAlpha(CHART_COLORS.wingPurple, 0.15)};
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.3)};
  box-shadow: inset 0 0 12px ${hexAlpha(CHART_COLORS.wingPurple, 0.1)};
  color: ${CHART_COLORS.iceWing};
  flex-shrink: 0;
`;
