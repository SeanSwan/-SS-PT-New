/**
 * OverviewPanel Component
 * ======================
 * Reusable overview panel component for displaying key metrics.
 * Features galaxy theme styling and responsive design.
 */

import React from 'react';
import styled from 'styled-components';

interface Metric {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: string;
  color?: string;
}

interface OverviewPanelProps {
  title: string;
  metrics: Metric[];
  className?: string;
}

const PanelContainer = styled.div`
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  color: white;
  /* GPU layer promotion for smoother scroll */
  transform: translateZ(0);

  h2 {
    color: #00ffff;
    margin-bottom: 1.5rem;
    font-size: 1.4rem;
    text-align: center;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    /* Reduce blur on mobile for better scroll performance */
    backdrop-filter: blur(6px);
    padding: 1.25rem;
    border-radius: 12px;
  }

  @media (max-width: 480px) {
    backdrop-filter: blur(4px);
    padding: 1rem;
    border-radius: 10px;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const MetricCard = styled.div<{ color?: string }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  transition: background 0.2s ease, border-color 0.2s ease;
  /* GPU layer promotion */
  transform: translateZ(0);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${props => props.color || '#00ffff'};
    box-shadow: 0 0 20px ${props => props.color || '#00ffff'}33;
  }

  @media (max-width: 768px) {
    padding: 0.875rem;

    &:hover {
      /* Disable hover effects on mobile for smoother scrolling */
      transform: translateZ(0);
      box-shadow: none;
    }
  }
`;

const MetricIcon = styled.div<{ color?: string }>`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: ${props => props.color || '#00ffff'};
`;

const MetricValue = styled.div<{ color?: string }>`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => props.color || '#00ffff'};
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: #b8bcc8;
  margin-bottom: 0.5rem;
`;

const MetricChange = styled.div<{ type: 'increase' | 'decrease' }>`
  font-size: 0.8rem;
  color: ${props => props.type === 'increase' ? '#2ebf91' : '#ff416c'};
  
  &::before {
    content: '${props => props.type === 'increase' ? '↗' : '↘'}';
    margin-right: 0.25rem;
  }
`;

const OverviewPanel: React.FC<OverviewPanelProps> = ({
  title,
  metrics,
  className
}) => {
  return (
    <PanelContainer className={className}>
      <h2>{title}</h2>
      <MetricsGrid>
        {metrics.map((metric, index) => (
          <MetricCard key={index} color={metric.color}>
            {metric.icon && (
              <MetricIcon color={metric.color}>
                {metric.icon}
              </MetricIcon>
            )}
            <MetricValue color={metric.color}>
              {metric.value}
            </MetricValue>
            <MetricLabel>{metric.label}</MetricLabel>
            {metric.change && (
              <MetricChange type={metric.change.type}>
                {Math.abs(metric.change.value)}% vs last week
              </MetricChange>
            )}
          </MetricCard>
        ))}
      </MetricsGrid>
    </PanelContainer>
  );
};

export default OverviewPanel;
