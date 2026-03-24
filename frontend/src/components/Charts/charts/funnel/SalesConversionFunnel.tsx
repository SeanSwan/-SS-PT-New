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
  { label: 'Website Visit (1000)',  width: 100, color: FULL_PALETTE[0] },
  { label: 'Inquiry (280)',         width: 28,  color: FULL_PALETTE[1] },
  { label: 'Consultation (120)',    width: 12,  color: FULL_PALETTE[2] },
  { label: 'Purchase (65)',         width: 6.5, color: FULL_PALETTE[3] },
];

interface Props {
  data?: Array<{ label: string; width: number; color: string }>;
}

const SalesConversionFunnel: React.FC<Props> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : DEMO_DATA;
  const isDemo = !data || data.length === 0;

  return (
    <ChartCard role="region" aria-label="Sales conversion funnel chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Sales Conversion{isDemo ? ' (Preview)' : ''}</ChartTitle>
          <ChartSubtitle>Website visit to purchase pipeline</ChartSubtitle>
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

export default React.memo(SalesConversionFunnel);
