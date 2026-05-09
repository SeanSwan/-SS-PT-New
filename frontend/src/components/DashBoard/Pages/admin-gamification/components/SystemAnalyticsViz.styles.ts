/**
 * Visualization-only styles for SystemAnalytics.
 */

import styled from 'styled-components';

const vizTheme = {
  bgDefault: 'var(--analytics-bg-default, rgba(10, 15, 30, 0.8))',
  border: 'var(--analytics-border, rgba(96, 192, 240, 0.18))',
};

export const BarChartArea = styled.div`
  min-height: 220px;
  display: flex;
  align-items: end;
  justify-content: space-around;
  gap: 12px;
`;

export const BarColumn = styled.div`
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

export const Bar = styled.div<{ $height: number; $bgColor: string }>`
  width: 48px;
  max-width: 100%;
  min-height: 8px;
  height: ${({ $height }) => `${Math.max(8, Math.min($height, 200))}px`};
  border-radius: 8px 8px 0 0;
  background: ${({ $bgColor }) => $bgColor};
`;

export const ProgressTrack = styled.div`
  width: 100%;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--analytics-progress-track, rgba(255, 255, 255, 0.08));
`;

export const ProgressFill = styled.div<{ $width: number; $color: string }>`
  width: ${({ $width }) => `${Math.max(0, Math.min($width, 100))}%`};
  height: 100%;
  background: ${({ $color }) => $color};
`;

export const ColorDot = styled.span<{ $color: string; $size?: number }>`
  width: ${({ $size = 16 }) => `${$size}px`};
  height: ${({ $size = 16 }) => `${$size}px`};
  flex-shrink: 0;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`;

export const ChartPlaceholder = styled.div`
  min-height: 300px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const LegendBar = styled.div`
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
`;

export const InsightBox = styled.div`
  padding: 16px;
  border: 1px solid ${vizTheme.border};
  border-radius: 8px;
  background: ${vizTheme.bgDefault};
`;
