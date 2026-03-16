import React from 'react';
import styled from 'styled-components';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, FULL_PALETTE,
} from '../../chartTheme';

const FunnelContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 16px;
`;

const FunnelStep = styled.div<{ $width: number; $color: string }>`
  height: 36px;
  width: ${({ $width }) => $width}%;
  background: ${({ $color }) => $color};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: ${CHART_COLORS.frostWhite};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: default;

  &:hover {
    transform: scaleX(1.03);
    box-shadow: 0 0 16px ${({ $color }) => $color}40;
  }
`;

const DATA = [
  { label: 'Set (100)',           width: 100, color: FULL_PALETTE[0] },
  { label: 'In Progress (78)',    width: 78,  color: FULL_PALETTE[1] },
  { label: 'Near Complete (55)',  width: 55,  color: FULL_PALETTE[2] },
  { label: 'Achieved (42)',       width: 42,  color: FULL_PALETTE[3] },
];

const GoalAchievementFunnel: React.FC = () => (
  <ChartCard role="region" aria-label="Goal achievement funnel chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Goal Achievement</ChartTitle>
        <ChartSubtitle>Goal completion pipeline</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <FunnelContainer>
        {DATA.map((step, i) => (
          <FunnelStep key={i} $width={step.width} $color={step.color}>
            {step.label}
          </FunnelStep>
        ))}
      </FunnelContainer>
    </ChartContainer>
  </ChartCard>
);

export default GoalAchievementFunnel;
