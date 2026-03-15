/**
 * Crystalline Swan — Nivo Chart Theme
 * ====================================
 * Shared theme configuration, color palettes, styled-components,
 * and SVG gradient definitions for all Nivo charts.
 * Design spec by Gemini 3.1 Pro (Lead Design Authority).
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
  textSecondary: 'rgba(224, 236, 244, 0.75)',
  gridLine: 'rgba(96, 192, 240, 0.15)',
} as const;

export const hexAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

// ── Palette Arrays ──
export const MACRO_PALETTE = [CHART_COLORS.iceWing, CHART_COLORS.wingPurple, CHART_COLORS.gildedFern];
export const FULL_PALETTE = [
  CHART_COLORS.iceWing,
  CHART_COLORS.wingPurple,
  CHART_COLORS.gildedFern,
  CHART_COLORS.arcticCyan,
  CHART_COLORS.swanLavender,
  'rgba(224, 236, 244, 0.5)', // muted Frost White for variety
];
export const STREAM_PALETTE = [
  CHART_COLORS.wingPurple,
  CHART_COLORS.arcticCyan,
  CHART_COLORS.swanLavender,
  CHART_COLORS.iceWing,
  CHART_COLORS.gildedFern,
];

// ── Nivo Theme Object ──
export const nivoCrystallineTheme = {
  background: 'transparent',
  textColor: CHART_COLORS.frostWhite,
  fontSize: 12,
  fontFamily: "'Sora', sans-serif",
  axis: {
    domain: {
      line: { stroke: 'rgba(96, 192, 240, 0.2)', strokeWidth: 1 },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: CHART_COLORS.textSecondary,
        fontFamily: "'Sora', sans-serif",
      },
    },
    ticks: {
      line: { stroke: 'rgba(96, 192, 240, 0.2)', strokeWidth: 1 },
      text: {
        fontSize: 11,
        fill: CHART_COLORS.textSecondary,
        fontFamily: "'Fira Code', monospace",
      },
    },
  },
  grid: {
    line: {
      stroke: CHART_COLORS.gridLine,
      strokeWidth: 1,
      strokeDasharray: '4 4',
    },
  },
  legends: {
    text: {
      fill: CHART_COLORS.frostWhite,
      fontSize: 12,
      fontFamily: "'Sora', sans-serif",
    },
  },
  tooltip: {
    container: {
      background: 'rgba(0, 32, 96, 0.75)',
      backdropFilter: 'blur(12px) saturate(120%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '8px',
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(139, 92, 246, 0.15)',
      color: CHART_COLORS.frostWhite,
      fontFamily: "'Sora', sans-serif",
      fontSize: '0.75rem',
    },
  },
  crosshair: {
    line: {
      stroke: CHART_COLORS.iceWing,
      strokeWidth: 1,
      strokeOpacity: 0.8,
      strokeDasharray: '6 6',
    },
  },
};

// ── Nivo Motion Config ──
export const NIVO_MOTION = { mass: 1, tension: 120, friction: 14 };

// ── SVG Gradient Definitions (for Nivo defs prop) ──
export const AREA_GRADIENT_DEFS = [
  {
    id: 'gradientIceWing',
    type: 'linearGradient' as const,
    colors: [
      { offset: 0, color: CHART_COLORS.iceWing, opacity: 0.4 },
      { offset: 100, color: CHART_COLORS.iceWing, opacity: 0 },
    ],
  },
  {
    id: 'gradientPurple',
    type: 'linearGradient' as const,
    colors: [
      { offset: 0, color: CHART_COLORS.wingPurple, opacity: 0.4 },
      { offset: 100, color: CHART_COLORS.wingPurple, opacity: 0 },
    ],
  },
  {
    id: 'gradientCyan',
    type: 'linearGradient' as const,
    colors: [
      { offset: 0, color: CHART_COLORS.arcticCyan, opacity: 0.4 },
      { offset: 100, color: CHART_COLORS.arcticCyan, opacity: 0 },
    ],
  },
];

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

  @media (min-width: 768px)  { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1280px) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1920px) { grid-template-columns: repeat(4, 1fr); }
`;

export const ChartCard = styled.article<{ $span?: number; $delay?: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  background: rgba(0, 48, 128, 0.45);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 32, 96, 0.4);
  box-sizing: border-box;
  height: 320px;
  grid-column: span 1;

  animation: ${fadeUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: ${({ $delay }) => ($delay ? `${$delay}ms` : '0ms')};
  opacity: 0;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.05);
    pointer-events: none;
  }

  @media (min-width: 768px) {
    height: 380px;
    grid-column: span ${({ $span }) => ($span ? Math.min($span, 2) : 1)};
  }
  @media (min-width: 1280px) {
    height: 420px;
    grid-column: span ${({ $span }) => $span || 1};
  }

  &:focus-visible {
    outline: 2px solid ${CHART_COLORS.wingPurple};
    outline-offset: 2px;
    box-shadow:
      0 0 0 4px rgba(139, 92, 246, 0.15),
      0 4px 12px rgba(139, 92, 246, 0.25);
    transition: box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), outline-offset 0.2s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

export const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  z-index: 2;
  flex-shrink: 0;
`;

export const ChartTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 1.25rem;
  color: ${CHART_COLORS.frostWhite};
  margin: 0;
  letter-spacing: -0.02em;
`;

export const ChartSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: ${CHART_COLORS.textSecondary};
  margin: 0;
`;

export const ChartContainer = styled.div`
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
  z-index: 1;
`;

export const TooltipBox = styled.div`
  background: rgba(0, 32, 96, 0.75);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(139, 92, 246, 0.15);
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
