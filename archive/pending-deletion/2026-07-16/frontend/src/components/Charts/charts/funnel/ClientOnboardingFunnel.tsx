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

const FunnelStep = styled.div<{ $width: number; $color: string; $isDemo: boolean }>`
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
  opacity: ${({ $isDemo }) => ($isDemo ? 0.5 : 1)};
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: default;

  &:hover {
    transform: scaleX(1.03);
    box-shadow: 0 0 16px ${({ $color }) => $color}40;
  }
`;

const DEMO_DATA = [
  { label: 'Lead (200)',     width: 100, color: FULL_PALETTE[0] },
  { label: 'Trial (120)',    width: 60,  color: FULL_PALETTE[1] },
  { label: 'Signup (85)',    width: 42,  color: FULL_PALETTE[2] },
  { label: 'Active (68)',    width: 34,  color: FULL_PALETTE[3] },
  { label: 'Retained (52)', width: 26,  color: FULL_PALETTE[4] },
];

interface Props {
  data?: Array<{ label: string; width: number; color: string }>;
}

const ClientOnboardingFunnel: React.FC<Props> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : DEMO_DATA;
  const isDemo = !data || data.length === 0;

  return (
    <ChartCard role="region" aria-label="Client onboarding funnel chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Client Onboarding{isDemo ? ' (Preview)' : ''}</ChartTitle>
          <ChartSubtitle>Lead to retained client pipeline</ChartSubtitle>
        </div>
      </ChartHeader>
      <ChartContainer>
        <FunnelContainer>
          {chartData.map((step, i) => (
            <FunnelStep key={i} $width={step.width} $color={step.color} $isDemo={isDemo}>
              {step.label}
            </FunnelStep>
          ))}
        </FunnelContainer>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(ClientOnboardingFunnel);
