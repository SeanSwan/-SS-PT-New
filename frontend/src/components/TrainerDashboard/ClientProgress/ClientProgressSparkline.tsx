import React, { useMemo } from 'react';
import type { ProgressMeasurement } from '../../UniversalMasterSchedule/hooks/useClientProgress';
import { EmptyState } from './ClientProgressView.styles';

export const buildSparklinePath = (points: number[], width: number, height: number) => {
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
};

interface ClientProgressSparklineProps {
  measurements: ProgressMeasurement[];
}

const ClientProgressSparkline: React.FC<ClientProgressSparklineProps> = ({ measurements }) => {
  const points = useMemo(() =>
    measurements
      .map((measurement) => measurement.weight)
      .filter((value): value is number => typeof value === 'number'),
    [measurements]
  );

  const path = useMemo(() => buildSparklinePath(points, 240, 80), [points]);

  if (points.length < 2) {
    return <EmptyState>No weight trend data yet.</EmptyState>;
  }

  return (
    <svg width="100%" height="90" viewBox="0 0 240 90" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <filter id="clientProgressSparkGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor="var(--chart-primary, #50A0F0)"
            floodOpacity="0.3"
          />
        </filter>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="var(--chart-primary, #50A0F0)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#clientProgressSparkGlow)"
      />
    </svg>
  );
};

export default ClientProgressSparkline;
