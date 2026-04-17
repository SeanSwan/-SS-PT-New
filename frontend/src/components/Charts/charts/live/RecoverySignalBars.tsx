/**
 * ┌─── SUB-COMPONENT: RecoverySignalBars ───────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Phase 14 canonical replacement for                   │
 * │          MuscleRecoveryHeatmap. Reads chart-recovery-signal   │
 * │          (real data: pain notes + RPE >= 9 clusters per       │
 * │          exercise over 90 days) and renders a flagged bar     │
 * │          list highlighting overworked / painful exercises.    │
 * │ Props: { userId }                                             │
 * │ DATA: GET /api/analytics/:userId/chart-recovery-signal        │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Phase 15.4 (2026-04-16): replaces the deprecated
 * `chart-muscle-recovery` endpoint chain. The old chart's
 * "days-since-last-training per muscle group" join chain returned [] in
 * production. The canonical replacement reframes the question from
 * "when was each muscle group last trained" to "where is the body
 * showing recovery stress" — pain notes + redline (RPE >= 9) sets,
 * surfaced per exercise.
 *
 * Mirrors the canonical card shape from
 * `CanonicalProgressChartsGrid.tsx#RecoverySignalCard`.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  CHART_COLORS,
} from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

interface RecoveryRow {
  x: string;
  y: number;
  painFlags?: number;
  highRpeFlags?: number;
  totalSets?: number;
}

interface ApiResponse {
  success: boolean;
  data: RecoveryRow[];
}

const RecoverySignalBars: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<ApiResponse>(
    userId,
    'chart-recovery-signal',
  );

  const rows = useMemo(() => {
    if (!data?.data) return [];
    return data.data
      .filter((r): r is RecoveryRow => typeof r?.x === 'string')
      .slice(0, 6);
  }, [data]);

  if (loading) return <SkeletonChart height={320} />;

  if (error || rows.length === 0) {
    return (
      <ChartCard role="region" aria-label="Recovery Signals" tabIndex={0}>
        <ChartHeader>
          <ChartTitle>Recovery Signals</ChartTitle>
          <ChartSubtitle>No recovery flags — keep it up</ChartSubtitle>
        </ChartHeader>
      </ChartCard>
    );
  }

  return (
    <ChartCard role="region" aria-label="Recovery Signals" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Recovery Signals</ChartTitle>
        <ChartSubtitle>pain + RPE ≥ 9 · last 90 days</ChartSubtitle>
      </ChartHeader>
      <BarList>
        {rows.map((row) => {
          const totalSets = Math.max(row.totalSets ?? 0, 1);
          const pct = Math.min((row.y / totalSets) * 100, 100);
          const painFlags = row.painFlags ?? 0;
          const highRpeFlags = row.highRpeFlags ?? 0;
          return (
            <BarRow key={row.x}>
              <BarLabel title={row.x}>
                <AlertTriangle
                  size={11}
                  aria-hidden="true"
                  style={{
                    verticalAlign: '-2px',
                    marginRight: 4,
                    color: CHART_COLORS.crimsonFrost,
                  }}
                />
                {row.x}
              </BarLabel>
              <BarTrack>
                <BarFill $pct={pct} />
              </BarTrack>
              <BarValue>
                {painFlags > 0 ? `${painFlags} pain` : ''}
                {painFlags > 0 && highRpeFlags > 0 ? ' · ' : ''}
                {highRpeFlags > 0 ? `${highRpeFlags} redline` : ''}
              </BarValue>
            </BarRow>
          );
        })}
      </BarList>
    </ChartCard>
  );
};

export default React.memo(RecoverySignalBars);

// ─────────────────────────────────────────────────────────────
// Styled — mirrors CanonicalProgressChartsGrid recovery card
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
  width: ${({ $pct }) => Math.max(Math.min($pct, 100), 2)}%;
  background: ${CHART_COLORS.crimsonFrost};
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const BarValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: ${CHART_COLORS.crimsonFrost};
  white-space: nowrap;
`;
