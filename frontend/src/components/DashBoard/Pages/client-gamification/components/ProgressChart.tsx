import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';

interface ProgressSnapshot {
  date: string;
  points: number;
  level: number;
  achievements: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface ProgressChartProps {
  snapshots: ProgressSnapshot[];
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2'
};

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const ChartContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  padding: 16px;
`;

const GridLayer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
`;

const GridLine = styled.div<{ $bottom: number }>`
  position: absolute;
  width: 100%;
  height: 1px;
  bottom: ${props => props.$bottom}%;
  left: 0;
  background-color: rgba(128, 128, 128, 0.2);
  z-index: 1;
  display: flex;
  align-items: center;
`;

const GridLabel = styled.span`
  position: absolute;
  left: -40px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
`;

const BarsContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 16px;
  z-index: 2;
`;

const Bar = styled.div<{ $height: string; $color: string; $visible: boolean; $delay: number; $hovered: boolean }>`
  height: ${props => props.$visible ? props.$height : '0%'};
  background-color: ${props => props.$color};
  margin: 0 4px;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  position: relative;
  box-shadow: ${props => props.$hovered ? '0 0 10px 2px rgba(0, 255, 255, 0.3)' : 'none'};
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 1s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: ${props => props.$delay}s;
  cursor: pointer;
  will-change: transform, height, box-shadow;

  &:hover {
    filter: brightness(1.2);
    transform: translateY(-5px);
  }
`;

const BarLabel = styled.span<{ $hovered: boolean }>`
  position: absolute;
  top: -25px;
  left: 0;
  width: 100%;
  text-align: center;
  font-weight: bold;
  font-size: 0.75rem;
  color: ${props => props.$hovered ? '#00ffff' : 'rgba(255, 255, 255, 0.5)'};
  transform: ${props => props.$hovered ? 'scale(1.1)' : 'scale(1)'};
  transition: all 0.3s ease;
`;

const DateLabel = styled.span<{ $hovered: boolean }>`
  position: absolute;
  bottom: -25px;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 0.75rem;
  color: ${props => props.$hovered ? '#00ffff' : 'rgba(255, 255, 255, 0.5)'};
  transform: ${props => props.$hovered ? 'scale(1.1)' : 'scale(1)'};
  transition: all 0.3s ease;
`;

const GainLabel = styled.span<{ $visible: boolean }>`
  position: absolute;
  top: -45px;
  left: 0;
  width: 100%;
  text-align: center;
  color: #4caf50;
  font-weight: bold;
  font-size: 0.75rem;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: ${props => props.$visible ? 'translateY(0)' : 'translateY(5px)'};
  transition: all 0.3s ease;
`;

const HoverTooltip = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(15, 15, 30, 0.95);
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 10;
  animation: ${fadeIn} 0.3s forwards;
  animation-delay: 0.1s;
  opacity: 0;
  white-space: nowrap;
`;

const TooltipLevel = styled.span`
  font-size: 0.875rem;
  font-weight: bold;
  color: white;
  display: block;
`;

const TooltipMeta = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  display: block;
`;

const TooltipTier = styled.span<{ $color: string }>`
  font-size: 0.75rem;
  color: ${props => props.$color};
  font-weight: bold;
  display: block;
`;

const AxisLabel = styled.span<{ $axis: 'x' | 'y' }>`
  position: absolute;
  color: rgba(255, 255, 255, 0.5);
  font-weight: bold;
  font-size: 0.75rem;

  ${props => props.$axis === 'y' && css`
    left: -45px;
    top: 50%;
    transform: rotate(-90deg) translateX(50%);
    transform-origin: left center;
  `}

  ${props => props.$axis === 'x' && css`
    left: 50%;
    bottom: -45px;
    transform: translateX(-50%);
  `}
`;

/**
 * Enhanced Progress Chart Component with smooth animations and transitions
 */
const ProgressChart: React.FC<ProgressChartProps> = ({ snapshots }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxPoints = Math.max(...snapshots.map(s => s.points));

  useEffect(() => {
    if (chartRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(chartRef.current);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <ChartContainer ref={chartRef} data-testid="points-chart">
      {/* Chart grid lines */}
      <GridLayer>
        {[0, 25, 50, 75, 100].map((percent) => (
          <GridLine key={`gridline-${percent}`} $bottom={percent}>
            <GridLabel>
              {Math.round((maxPoints * percent) / 100).toLocaleString()}
            </GridLabel>
          </GridLine>
        ))}
      </GridLayer>

      {/* Bars */}
      <BarsContainer>
        {snapshots.map((snapshot, index) => {
          const height = `${(snapshot.points / maxPoints) * 80}%`;
          const isHovered = hoveredIndex === index;
          const pointsGained = index > 0
            ? snapshot.points - snapshots[index - 1].points
            : snapshot.points;
          const showPositiveChange = index > 0 && snapshot.points > snapshots[index - 1].points;
          const tierColor = TIER_COLORS[snapshot.tier] || '#00ffff';

          return (
            <Bar
              key={index}
              $height={height}
              $color={tierColor}
              $visible={isVisible}
              $delay={index * 0.1}
              $hovered={isHovered}
              style={{ width: `${80 / snapshots.length}%` }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <BarLabel $hovered={isHovered}>
                {snapshot.points.toLocaleString()}
              </BarLabel>

              <DateLabel $hovered={isHovered}>
                {new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </DateLabel>

              {showPositiveChange && (
                <GainLabel $visible={isHovered}>
                  +{pointsGained.toLocaleString()}
                </GainLabel>
              )}

              {isHovered && (
                <HoverTooltip>
                  <TooltipLevel>Level {snapshot.level}</TooltipLevel>
                  <TooltipMeta>{snapshot.achievements} achievements</TooltipMeta>
                  <TooltipTier $color={tierColor}>
                    {snapshot.tier.toUpperCase()}
                  </TooltipTier>
                </HoverTooltip>
              )}
            </Bar>
          );
        })}
      </BarsContainer>

      <AxisLabel $axis="y">POINTS</AxisLabel>
      <AxisLabel $axis="x">TIME</AxisLabel>
    </ChartContainer>
  );
};

export default React.memo(ProgressChart);
