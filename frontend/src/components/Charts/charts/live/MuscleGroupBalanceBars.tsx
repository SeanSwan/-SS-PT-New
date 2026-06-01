/**
 * ┌─── SUB-COMPONENT: MuscleGroupBalanceBars ───────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Phase 14 canonical replacement for MuscleGroupFocus  │
 * │          Radar. Reads chart-muscle-group-balance (real data    │
 * │          from workout_logs) and renders a horizontal bar list │
 * │          of training volume per muscle group (lbs · 90 days). │
 * │ Props: { userId }                                             │
 * │ DATA: GET /api/analytics/:userId/chart-muscle-group-balance   │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Phase 15.4 (2026-04-16): replaces the deprecated
 * `chart-muscle-group-focus` endpoint chain. The old chart's PascalCase
 * SQL join chain returned [] in production; the canonical replacement
 * (`chart-muscle-group-balance`) reads aggregated volume from
 * workout_logs grouped by NASM-style muscle-group inference.
 *
 * Visualization: bar list (one row per muscle group, fill scaled to
 * the heaviest group). Mirrors the canonical card shape from
 * `CanonicalProgressChartsGrid.tsx#MuscleGroupBalanceCard`.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  CHART_COLORS,
} from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

interface MuscleGroupRow {
  x: string;
  y: number;
  sets?: number;
}

interface ApiResponse {
  success: boolean;
  data: MuscleGroupRow[];
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export function sanitizeMuscleGroupBalanceRows(input: unknown): MuscleGroupRow[] {
  if (!Array.isArray(input)) return [];

  return input.reduce<MuscleGroupRow[]>((rows, raw) => {
    if (!raw || typeof raw !== 'object') return rows;
    const record = raw as Record<string, unknown>;
    const x = typeof record.x === 'string' ? record.x.trim() : '';
    const y = toFiniteNumber(record.y);
    if (!x || y <= 0) return rows;

    rows.push({
      x,
      y,
      sets: Math.max(toFiniteNumber(record.sets), 0),
    });

    return rows;
  }, []);
}

const MuscleGroupBalanceBars: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<ApiResponse>(
    userId,
    'chart-muscle-group-balance',
  );

  const rows = useMemo(() => {
    return sanitizeMuscleGroupBalanceRows(data?.data);
  }, [data]);

  const max = useMemo(
    () => (rows.length > 0 ? Math.max(...rows.map((r) => r.y)) : 0),
    [rows],
  );

  if (loading) return <SkeletonChart height={320} />;
  if (error || rows.length === 0) {
    return (
      <ChartCard role="region" aria-label="Muscle Group Volume" tabIndex={0}>
        <ChartHeader>
          <ChartTitle>Muscle Group Volume</ChartTitle>
          <ChartSubtitle>No muscle-group data yet</ChartSubtitle>
        </ChartHeader>
      </ChartCard>
    );
  }

  return (
    <ChartCard role="region" aria-label="Muscle Group Volume" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Muscle Group Volume</ChartTitle>
        <ChartSubtitle>lbs · last 90 days</ChartSubtitle>
      </ChartHeader>
      <BarList>
        {rows.map((row) => {
          const pct = max > 0 ? (row.y / max) * 100 : 0;
          return (
            <BarRow key={row.x}>
              <BarLabel title={row.x}>{row.x}</BarLabel>
              <BarTrack>
                <BarFill $pct={pct} />
              </BarTrack>
              <BarValue>{Math.round(row.y).toLocaleString()}</BarValue>
            </BarRow>
          );
        })}
      </BarList>
    </ChartCard>
  );
};

export default React.memo(MuscleGroupBalanceBars);

// ─────────────────────────────────────────────────────────────
// Styled — mirrors CanonicalProgressChartsGrid card primitives
// ─────────────────────────────────────────────────────────────

const BarList = styled.ul`
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
`;

const BarRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-primary, #E0ECF4);
`;

const BarLabel = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const BarTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.08);
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => {
    const safePct = Number.isFinite($pct) ? $pct : 0;
    return Math.max(Math.min(safePct, 100), 2);
  }}%;
  background: ${CHART_COLORS.gildedFern};
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const BarValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;
