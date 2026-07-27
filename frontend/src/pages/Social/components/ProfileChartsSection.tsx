/**
 * ┌─── SUB-COMPONENT: ProfileChartsSection ─────────────────────┐
 * │ PARENT: UserProfilePage                                      │
 * │ PURPOSE: Renders user-selected Victory charts on public      │
 * │          profile based on chartVisibility JSONB settings      │
 * │ WIREFRAME:                                                    │
 * │ ┌──────────────────────────────────────────┐                 │
 * │ │ Progress & Analytics                     │                 │
 * │ │ ┌──────────────┐ ┌──────────────┐       │                 │
 * │ │ │ Muscle Radar │ │ Goal Progress│       │                 │
 * │ │ └──────────────┘ └──────────────┘       │                 │
 * │ │ ┌──────────────────────────────┐        │                 │
 * │ │ │ Exercise Rolodex (CSS bars)  │        │                 │
 * │ │ └──────────────────────────────┘        │                 │
 * │ └──────────────────────────────────────────┘                 │
 * │ Props: { userId, chartVisibility, isOwnProfile }              │
 * │ CLICK-OUTCOMES: None (read-only display)                      │
 * └───────────────────────────────────────────────────────────────┘
 */
import React, { lazy, Suspense, useMemo } from 'react';
import styled from 'styled-components';
import ChartSkeleton from '../../../components/SkeletonLoaders/ChartSkeleton';
import { useAuth } from '../../../context/AuthContext';
import { useSubscription } from '../../../hooks/useSubscription';
import type { ChartVisibility } from './ChartVisibilityToggle';

// Lazy-load chart components (per CLAUDE.md — all charts MUST be lazy)
const ExerciseHistoryChart = lazy(() => import('../../../components/Charts/ExerciseHistoryChart'));

// Live Victory charts — wired to /api/analytics/:userId/chart-* endpoints.
//
// Phase 15.4 (2026-04-16): visibility keys (`muscleRadar`, `sessionFrequency`,
// `muscleRecovery`, `rpeByExercise`) are preserved so saved user prefs in
// the chartVisibility JSONB are not orphaned, but the components behind
// them are now the Phase 14 canonical replacements:
//   muscleRadar      → MuscleGroupBalanceBars (chart-muscle-group-balance)
//   sessionFrequency → WorkoutFrequencyBar (chart-workout-frequency)
//   muscleRecovery   → RecoverySignalBars (chart-recovery-signal)
//   rpeByExercise    → IntensityRpeTrendLine (chart-intensity-rpe-trend)
// The `cardioEndurance` key is dropped from CHART_REGISTRY (no canonical
// equivalent — out of the 15-chart scope) and falls through harmlessly
// for any user who had it enabled in saved prefs.
const WorkoutFrequencyBar = lazy(() => import('../../../components/Charts/charts/live/WorkoutFrequencyBar'));
const WeightProgressionLive = lazy(() => import('../../../components/Charts/charts/live/WeightProgressionLive'));
const MuscleGroupBalanceBars = lazy(() => import('../../../components/Charts/charts/live/MuscleGroupBalanceBars'));
const MacroSplitDonut = lazy(() => import('../../../components/Charts/charts/live/MacroSplitDonut'));
const BodyFatTrendLine = lazy(() => import('../../../components/Charts/charts/live/BodyFatTrendLine'));
const RecoverySignalBars = lazy(() => import('../../../components/Charts/charts/live/RecoverySignalBars'));
const IntensityRpeTrendLine = lazy(() => import('../../../components/Charts/charts/live/IntensityRpeTrendLine'));

// Victory gallery charts (demo/static data)
const WorkoutHeatmapCalendar = lazy(() => import('../../../components/Charts/charts/heatmap/WorkoutHeatmapCalendar'));
const GoalProgressBullet = lazy(() => import('../../../components/Charts/charts/bullet/GoalProgressBullet'));

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface ProfileChartsSectionProps {
  userId: number | string;
  chartVisibility: Partial<ChartVisibility>;
  isOwnProfile?: boolean;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Chart registry
// PURPOSE: Maps visibility keys to lazy-loaded chart components
// WHY: Single source of truth for which key renders which chart
// ─────────────────────────────────────────────────────────────

interface ChartEntry {
  key: keyof ChartVisibility;
  label: string;
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  height?: number;
  requiresPro?: boolean;
}

const CHART_REGISTRY: ChartEntry[] = [
  { key: 'workoutFrequency', label: 'Workout Frequency', Component: WorkoutFrequencyBar, requiresPro: true },
  { key: 'weightProgression', label: 'Weight Progression', Component: WeightProgressionLive, requiresPro: true },
  // Phase 15.4: muscleRadar key now points at the canonical
  // muscle-group-balance bar list. Old radar visualization no longer
  // applies — the underlying data shape is bars, not a polar fill.
  { key: 'muscleRadar', label: 'Muscle Group Volume', Component: MuscleGroupBalanceBars, requiresPro: true },
  { key: 'macroSplit', label: 'Macro Split', Component: MacroSplitDonut, requiresPro: true },
  // `cardioEndurance` key intentionally omitted — no canonical replacement
  // (out of Phase 14 12-chart scope). Saved prefs with this key fall
  // through harmlessly.
  // Phase 15.4: sessionFrequency reuses the canonical chart-workout-
  // frequency bar (per Sean's mapping). User-facing label kept distinct
  // from `workoutFrequency` so a user who has both keys enabled sees
  // two clearly-labeled bars rather than a duplicate-looking surface.
  { key: 'sessionFrequency', label: 'Session Frequency', Component: WorkoutFrequencyBar, requiresPro: true },
  { key: 'bodyFatTrend', label: 'Body Fat Trend', Component: BodyFatTrendLine, requiresPro: true },
  { key: 'muscleRecovery', label: 'Recovery Signals', Component: RecoverySignalBars, requiresPro: true },
  { key: 'rpeByExercise', label: 'Effort Trend (RPE)', Component: IntensityRpeTrendLine, requiresPro: true },
  { key: 'exerciseRolodex', label: 'Exercise History', Component: ExerciseHistoryChart, height: 400 },
  { key: 'workoutHeatmap', label: 'Workout Calendar', Component: WorkoutHeatmapCalendar },
  { key: 'goalProgress', label: 'Goal Progress', Component: GoalProgressBullet },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ProfileChartsSection: React.FC<ProfileChartsSectionProps> = ({
  userId,
  chartVisibility,
  isOwnProfile = false,
}) => {
  const { user } = useAuth();
  const { isPro, isElite, loading: subscriptionLoading } = useSubscription();
  const isStaffRole = user?.role === 'admin' || user?.role === 'trainer';
  const hasPaidChartAccess = isStaffRole || isPro || isElite;
  const hasProtectedChartSelected = useMemo(
    () => CHART_REGISTRY.some(c => chartVisibility[c.key] === true && c.requiresPro),
    [chartVisibility]
  );
  const visibleCharts = useMemo(
    () => CHART_REGISTRY.filter(c => chartVisibility[c.key] === true && (!c.requiresPro || hasPaidChartAccess)),
    [chartVisibility, hasPaidChartAccess]
  );

  if (subscriptionLoading && hasProtectedChartSelected && !isStaffRole) {
    return <ChartSkeleton height={280} />;
  }

  if (visibleCharts.length === 0) {
    if (isOwnProfile && hasProtectedChartSelected && !hasPaidChartAccess) {
      return (
        <EmptyHint>
          Upgrade to Swan Guardian to show advanced progress charts on your profile.
        </EmptyHint>
      );
    }

    if (isOwnProfile) {
      return (
        <EmptyHint>
          No charts visible on your profile yet. Go to Settings → Chart Visibility to enable them.
        </EmptyHint>
      );
    }
    return null; // Other users see nothing if no charts enabled
  }

  return (
    <Section>
      <SectionTitle>Progress & Analytics</SectionTitle>
      <ChartGrid $count={visibleCharts.length}>
        {visibleCharts.map(({ key, label, Component, height }) => (
          <ChartSlot key={key}>
            <ChartLabel>{label}</ChartLabel>
            <Suspense fallback={<ChartSkeleton height={height || 280} />}>
              <Component userId={userId} />
            </Suspense>
          </ChartSlot>
        ))}
      </ChartGrid>
    </Section>
  );
};

export default React.memo(ProfileChartsSection);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Section = styled.section`
  width: 100%;
  margin-top: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 1rem;
`;

const ChartGrid = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: ${({ $count }) => $count === 1 ? '1fr' : 'repeat(2, 1fr)'};
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartSlot = styled.div`
  min-height: 200px;
`;

const ChartLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.5rem;
`;

const EmptyHint = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(224, 236, 244, 0.4);
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  border: 1px dashed rgba(80, 160, 240, 0.2);
  border-radius: 12px;
  margin-top: 1rem;
`;
