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
 * │ Props: { height?: number }                                  │
 * │ CLICK-OUTCOMES: None (passive loading state)                │
 * └────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Frost Shimmer Animation
// PURPOSE: Arctic Cyan shimmer at 10% opacity per CLAUDE.md design system
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

interface SkeletonChartProps {
  height?: number;
}

const SkeletonChart: React.FC<SkeletonChartProps> = ({ height = 320 }) => (
  <Card $height={height} aria-live="polite" aria-busy="true" role="status">
    <TitleBar style={{ width: '60%' }} />
    <SubtitleBar style={{ width: '40%' }} />
    <ChartArea />
    <SrOnly>Loading chart data, please wait</SrOnly>
  </Card>
);

export default SkeletonChart;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Card = styled.div<{ $height: number }>`
  background: ${({ theme }) => theme?.colors?.surface || '#003080'};
  border-radius: 16px;
  border: 1px solid rgba(64, 112, 192, 0.25);
  height: ${({ $height }) => $height}px;
  width: 100%;
  position: relative;
  overflow: hidden;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 32, 96, 0.4);

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(80, 160, 240, 0.1),
      transparent
    );
    animation: ${shimmer} 1.5s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
    pointer-events: none;
  }
`;

const TitleBar = styled.div`
  height: 14px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.15);
  animation: ${pulse} 1.5s ease-in-out infinite;
  margin-bottom: 6px;
`;

const SubtitleBar = styled.div`
  height: 10px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.1);
  animation: ${pulse} 1.5s ease-in-out infinite;
  margin-bottom: 16px;
`;

const ChartArea = styled.div`
  flex: 1;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.08);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;
