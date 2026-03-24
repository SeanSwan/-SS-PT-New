/**
 * ┌─── SUB-COMPONENT: SkeletonChart ──────────────────────────┐
 * │ PARENT: SafeChart, ClientChartsPanel, any chart container  │
 * │ PURPOSE: Frost Shimmer skeleton loader for chart cards      │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ ███████████████░░░░░  (title)    │                        │
 * │ │ ██████████░░░░░░░░░  (subtitle)  │                        │
 * │ │ ┌────────────────────────────┐   │                        │
 * │ │ │    ░░░ shimmer effect ░░░  │   │                        │
 * │ │ │                            │   │                        │
 * │ │ └────────────────────────────┘   │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: SkeletonChartProps                                   │
 * │ CLICK-OUTCOMES: None (passive loading state)                │
 * └────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Frost Shimmer Animation
// PURPOSE: Arctic Cyan shimmer at ~8% opacity per CLAUDE.md design system
// WHY: Hardware-accelerated transform-only animation (GPU-composited)
// ─────────────────────────────────────────────────────────────
const shimmer = keyframes`
  0% { transform: translateX(-150%); }
  50% { transform: translateX(-60%); }
  100% { transform: translateX(150%); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
`;

const ASPECT_MAP = { '16:9': 56.25, '4:3': 75, '1:1': 100 } as const;

interface SkeletonChartProps {
  height?: number;
  aspectRatio?: '16:9' | '4:3' | '1:1';
  variant?: 'chart' | 'card' | 'list';
  className?: string;
}

const SkeletonChart: React.FC<SkeletonChartProps> = ({
  height = 320,
  aspectRatio,
  variant = 'chart',
  className,
}) => (
  <Card
    $height={aspectRatio ? undefined : height}
    $aspectPct={aspectRatio ? ASPECT_MAP[aspectRatio] : undefined}
    className={className}
    role="status"
    aria-live="polite"
    aria-label="Loading chart data"
  >
    {variant !== 'list' && <TitleBar style={{ width: '60%' }} />}
    {variant === 'chart' && <SubtitleBar style={{ width: '40%' }} />}
    <ChartArea />
  </Card>
);

export default SkeletonChart;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components — CSS custom properties with dark fallbacks
// ─────────────────────────────────────────────────────────────
const Card = styled.div<{ $height?: number; $aspectPct?: number }>`
  background: var(--bg-surface, #141419);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  ${({ $aspectPct }) => $aspectPct ? `aspect-ratio: auto; padding-bottom: ${$aspectPct}%; height: 0;` : ''}
  ${({ $height, $aspectPct }) => !$aspectPct && $height ? `height: ${$height}px;` : ''}
  width: 100%;
  position: relative;
  overflow: hidden;
  padding: ${({ $aspectPct }) => $aspectPct ? '0' : '1.25rem'};
  display: flex;
  flex-direction: column;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      var(--bg-surface, #141419),
      color-mix(in srgb, var(--arctic-cyan, #50A0F0) 10%, transparent),
      var(--bg-surface, #141419)
    );
    animation: ${shimmer} 1.5s ease-in-out infinite;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; }
  }
`;

const TitleBar = styled.div`
  height: 14px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--arctic-cyan, #50A0F0) 25%, transparent);
  animation: ${pulse} 1.5s ease-in-out infinite;
  margin-bottom: 6px;
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.5; }
`;

const SubtitleBar = styled.div`
  height: 10px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--arctic-cyan, #50A0F0) 15%, transparent);
  animation: ${pulse} 1.5s ease-in-out infinite;
  margin-bottom: 16px;
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.4; }
`;

const ChartArea = styled.div`
  flex: 1;
  border-radius: 8px;
  background: color-mix(in srgb, var(--arctic-cyan, #50A0F0) 12%, transparent);
  animation: ${pulse} 1.5s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; opacity: 0.4; }
`;
