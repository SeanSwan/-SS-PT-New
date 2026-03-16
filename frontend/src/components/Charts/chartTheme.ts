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
} as const;

export const hexAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

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
      fill: hexAlpha(CHART_COLORS.royalDepth, 0.9),
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
  background: ${hexAlpha(CHART_COLORS.royalDepth, 0.6)};
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px ${CHART_COLORS.vaultShadow};
  box-sizing: border-box;
  height: 320px;
  grid-column: span 1;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s ease,
              border-color 0.3s ease;
  will-change: transform, box-shadow;

  animation: ${fadeUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 20px ${hexAlpha(CHART_COLORS.wingPurple, 0.05)};
    pointer-events: none;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-4px) translateZ(0);
      box-shadow: 0 12px 40px ${hexAlpha(CHART_COLORS.midnightSapphire, 0.8)},
                  0 0 20px ${hexAlpha(CHART_COLORS.iceWing, 0.2)};
      border-color: ${hexAlpha(CHART_COLORS.iceWing, 0.4)};
    }
  }

  &:focus-within {
    transform: translateY(-4px) translateZ(0);
    border: 1px solid ${CHART_COLORS.wingPurple};
    box-shadow: 0 0 0 2px ${CHART_COLORS.midnightSapphire},
                0 0 0 4px ${CHART_COLORS.wingPurple},
                0 12px 40px ${hexAlpha(CHART_COLORS.wingPurple, 0.3)};
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
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
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
  background: ${hexAlpha(CHART_COLORS.royalDepth, 0.9)};
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
