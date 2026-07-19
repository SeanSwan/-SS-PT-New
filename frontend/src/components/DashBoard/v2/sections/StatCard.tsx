/**
 * Dashboards v2 — StatCard (KIMI-DASHBOARDS §2.4). Renders a server-shaped StatDef.
 * testid `dash-stat-{key}`; value in tabular-nums; accent via semantic slot → token.
 * The 7-point spark is an inline SVG polyline (stroke=currentColor ← --dash-accent) — a decorative
 * primitive, not a data chart; TrendChart/ProgressRing use Victory per spec. [flagged vs §2.4 SparkChart]
 */
import styled from 'styled-components';
import type { StatDef } from '../types';
import { accentVar, deltaVar } from './accents';

export interface StatCardProps {
  stat: StatDef;
  size?: 'compact' | 'standard';
}

const Card = styled.article<{ $accent: string }>`
  --card-accent: ${(p) => p.$accent};
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 88px;
  padding: 16px;
  background: var(--dash-panel);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-panel);
  box-shadow: var(--dash-elev-1);
  &[data-size='standard'] {
    min-height: 112px;
  }
`;
const Label = styled.span`
  font-size: 12px;
  line-height: 18px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dash-ink-2);
`;
const Value = styled.span`
  font-variant-numeric: tabular-nums;
  font-size: 28px;
  line-height: 34px;
  font-weight: 700;
  color: var(--dash-ink);
`;
const Delta = styled.span<{ $tone: string }>`
  font-size: 13px;
  color: ${(p) => p.$tone};
`;
const Spark = styled.svg`
  color: var(--card-accent);
  width: 100%;
  height: 40px;
  overflow: visible;
`;

const sparkPoints = (points: number[]): string => {
  if (points.length < 2) return '';
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 38 - ((p - min) / span) * 36;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

export function StatCard({ stat, size = 'compact' }: StatCardProps) {
  const arrow = stat.delta ? (stat.delta.direction === 'up' ? '▲' : stat.delta.direction === 'down' ? '▼' : '→') : '';
  return (
    <Card $accent={accentVar(stat.accent)} data-size={size} data-testid={`dash-stat-${stat.key}`}>
      <Label>{stat.label}</Label>
      <Value>{stat.value}</Value>
      {stat.delta ? (
        <Delta $tone={deltaVar(stat.delta.tone)}>
          {arrow} {stat.delta.text}
        </Delta>
      ) : null}
      {stat.spark && stat.spark.length > 1 ? (
        <Spark viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={sparkPoints(stat.spark)} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </Spark>
      ) : null}
    </Card>
  );
}
