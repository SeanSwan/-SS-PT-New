import React from 'react';
import styled from 'styled-components';

interface ProgressAreaChartProps {
  data: any[];
  height?: number;
  xKey: string;
  yKeys: {
    key: string;
    name: string;
    color: string;
    fillOpacity?: number;
  }[];
  title?: string;
}

const ChartShell = styled.div`
  background: rgba(12, 14, 24, 0.75);
  border: 1px solid rgba(0, 255, 255, 0.18);
  border-radius: 16px;
  padding: 1.25rem;
  color: rgba(255, 255, 255, 0.85);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
`;

const ChartTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #00ffff;
`;

const ChartPlaceholder = styled.div`
  min-height: 180px;
  border-radius: 12px;
  border: 1px dashed rgba(0, 255, 255, 0.2);
  background: rgba(0, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.95rem;
`;

const MetaLine = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
`;

const ProgressAreaChart: React.FC<ProgressAreaChartProps> = ({
  data,
  height = 300,
  title
}) => {
  return (
    <ChartShell style={{ minHeight: height }}>
      {title && <ChartTitle>{title}</ChartTitle>}
      <ChartPlaceholder>
        <div>Chart visualization is temporarily unavailable.</div>
        <MetaLine>{(data?.length ?? 0)} data points ready</MetaLine>
      </ChartPlaceholder>
    </ChartShell>
  );
};

export default ProgressAreaChart;
