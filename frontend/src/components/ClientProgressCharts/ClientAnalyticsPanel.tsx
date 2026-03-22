/**
 * ┌─── SUB-COMPONENT: ClientAnalyticsPanel ─────────────────────┐
 * │ PARENT: ClientProgressView, ClientDetailsPanel               │
 * │ PURPOSE: Real-time analytics dashboard with 9 Victory charts │
 * │          powered by /api/analytics/:userId/* endpoints        │
 * │ WIREFRAME:                                                    │
 * │ ┌─────────────────────────────────────────────┐              │
 * │ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │              │
 * │ │ │Wkouts│ │Volume│ │ PRs  │ │Streak│       │              │
 * │ │ └──────┘ └──────┘ └──────┘ └──────┘       │              │
 * │ │ ┌────────────┐ ┌────────────┐              │              │
 * │ │ │ Frequency  │ │ Weight     │              │              │
 * │ │ │ Bar        │ │ Line       │              │              │
 * │ │ └────────────┘ └────────────┘              │              │
 * │ │ ┌────────────┐ ┌────────────┐              │              │
 * │ │ │ Muscle     │ │ Macro      │              │              │
 * │ │ │ Radar      │ │ Donut      │              │              │
 * │ │ └────────────┘ └────────────┘              │              │
 * │ │ ┌────────────┐ ┌────────────┐              │              │
 * │ │ │ Cardio     │ │ Body Fat   │              │              │
 * │ │ │ Lines      │ │ Trend      │              │              │
 * │ │ └────────────┘ └────────────┘              │              │
 * │ │ ┌────────────┐ ┌────────────┐              │              │
 * │ │ │ Session    │ │ Recovery   │              │              │
 * │ │ │ Frequency  │ │ Heatmap    │              │              │
 * │ │ └────────────┘ └────────────┘              │              │
 * │ │ ┌──────────────────────────┐               │              │
 * │ │ │ RPE by Exercise (wide)   │               │              │
 * │ │ └──────────────────────────┘               │              │
 * │ │ ┌── Exercise History (CSS bars) ─────────┐ │              │
 * │ │ │ Bench Press  ████████████░░░  24×      │ │              │
 * │ │ └────────────────────────────────────────┘ │              │
 * │ └─────────────────────────────────────────────┘              │
 * │ Props: { userId, compact? }                                   │
 * └───────────────────────────────────────────────────────────────┘
 */
import React, { lazy, Suspense } from 'react';
import styled from 'styled-components';
import { useDashboardAnalytics, usePersonalRecords } from '../../hooks/useAnalytics';
import SkeletonChart from '../UI/SkeletonChart';

// Lazy-load all charts (per CLAUDE.md — all charts MUST use React.lazy)
const ExerciseHistoryChart = lazy(() => import('../Charts/ExerciseHistoryChart'));
const WorkoutFrequencyBar = lazy(() => import('../Charts/charts/live/WorkoutFrequencyBar'));
const WeightProgressionLive = lazy(() => import('../Charts/charts/live/WeightProgressionLive'));
const MuscleGroupFocusRadar = lazy(() => import('../Charts/charts/live/MuscleGroupFocusRadar'));
const MacroSplitDonut = lazy(() => import('../Charts/charts/live/MacroSplitDonut'));
const CardioEnduranceLine = lazy(() => import('../Charts/charts/live/CardioEnduranceLine'));
const SessionFrequencyArea = lazy(() => import('../Charts/charts/live/SessionFrequencyArea'));
const BodyFatTrendLine = lazy(() => import('../Charts/charts/live/BodyFatTrendLine'));
const MuscleRecoveryHeatmap = lazy(() => import('../Charts/charts/live/MuscleRecoveryHeatmap'));
const RPEByExerciseScatter = lazy(() => import('../Charts/charts/live/RPEByExerciseScatter'));

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface ClientAnalyticsPanelProps {
  userId: number | string;
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Full analytics panel — KPI cards + 9 Victory charts + exercise history
// WHY: Victory charts pull real data from /api/analytics endpoints
// ─────────────────────────────────────────────────────────────

const ClientAnalyticsPanel: React.FC<ClientAnalyticsPanelProps> = ({ userId, compact = false }) => {
  const { data: dashboard, loading: dashLoading } = useDashboardAnalytics(userId);
  const { data: prData, loading: prLoading } = usePersonalRecords(userId);

  const kpis = [
    {
      label: 'Workouts',
      value: dashboard?.exerciseTotals?.totalSessions ?? '—',
    },
    {
      label: 'Total Volume',
      value: dashboard?.exerciseTotals?.totalVolume
        ? `${(dashboard.exerciseTotals.totalVolume / 1000).toFixed(1)}k`
        : '—',
    },
    {
      label: 'Personal Records',
      value: prData?.records?.length ?? '—',
    },
    {
      label: 'Avg/Week',
      value: dashboard?.frequency?.weeklyAverage ?? '—',
    },
  ];

  const skeleton = <SkeletonChart height={320} />;

  return (
    <PanelContainer $compact={compact}>
      {/* KPI cards row */}
      <KPIGrid>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} $loading={dashLoading || prLoading}>
            <KPIValue>{dashLoading || prLoading ? '…' : kpi.value}</KPIValue>
            <KPILabel>{kpi.label}</KPILabel>
          </KPICard>
        ))}
      </KPIGrid>

      {/* Victory Charts Grid — 2 columns on desktop, 1 on mobile */}
      <ChartGrid>
        <Suspense fallback={skeleton}><WorkoutFrequencyBar userId={userId} /></Suspense>
        <Suspense fallback={skeleton}><WeightProgressionLive userId={userId} /></Suspense>
        <Suspense fallback={skeleton}><MuscleGroupFocusRadar userId={userId} /></Suspense>
        <Suspense fallback={skeleton}><MacroSplitDonut userId={userId} /></Suspense>
        <Suspense fallback={skeleton}><CardioEnduranceLine userId={userId} /></Suspense>
        <Suspense fallback={skeleton}><BodyFatTrendLine userId={userId} /></Suspense>
        <Suspense fallback={skeleton}><SessionFrequencyArea userId={userId} /></Suspense>
        <Suspense fallback={skeleton}><MuscleRecoveryHeatmap userId={userId} /></Suspense>
      </ChartGrid>

      {/* RPE chart spans full width */}
      <Suspense fallback={skeleton}><RPEByExerciseScatter userId={userId} /></Suspense>

      {/* Exercise History CSS bars */}
      <Suspense fallback={<SkeletonChart height={compact ? 250 : 400} />}>
        <ExerciseHistoryChart userId={userId} />
      </Suspense>
    </PanelContainer>
  );
};

export default React.memo(ClientAnalyticsPanel);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const PanelContainer = styled.div<{ $compact: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '0.75rem' : '1.25rem')};
  width: 100%;
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 375px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
`;

const KPICard = styled.div<{ $loading: boolean }>`
  background: ${({ theme }) => theme?.colors?.surface || '#1A1A24'};
  border-radius: 12px;
  border: 1px solid rgba(80, 160, 240, 0.15);
  padding: 1rem;
  text-align: center;
  opacity: ${({ $loading }) => ($loading ? 0.6 : 1)};
  transition: opacity 0.3s ease;
`;

const KPIValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  color: #60C0F0;
  line-height: 1.2;
`;

const KPILabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  color: rgba(224, 236, 244, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
