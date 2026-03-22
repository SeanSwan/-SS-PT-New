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
import SkeletonChart from '../../../components/UI/SkeletonChart';
import type { ChartVisibility } from './ChartVisibilityToggle';

// Lazy-load chart components (per CLAUDE.md — all charts MUST be lazy)
const ExerciseHistoryChart = lazy(() => import('../../../components/Charts/ExerciseHistoryChart'));

// Live Victory charts — wired to /api/analytics/:userId/chart-* endpoints
const WorkoutFrequencyBar = lazy(() => import('../../../components/Charts/charts/live/WorkoutFrequencyBar'));
const WeightProgressionLive = lazy(() => import('../../../components/Charts/charts/live/WeightProgressionLive'));
const MuscleGroupFocusRadar = lazy(() => import('../../../components/Charts/charts/live/MuscleGroupFocusRadar'));
const MacroSplitDonut = lazy(() => import('../../../components/Charts/charts/live/MacroSplitDonut'));
const CardioEnduranceLine = lazy(() => import('../../../components/Charts/charts/live/CardioEnduranceLine'));
const SessionFrequencyArea = lazy(() => import('../../../components/Charts/charts/live/SessionFrequencyArea'));
const BodyFatTrendLine = lazy(() => import('../../../components/Charts/charts/live/BodyFatTrendLine'));
const MuscleRecoveryHeatmap = lazy(() => import('../../../components/Charts/charts/live/MuscleRecoveryHeatmap'));
const RPEByExerciseScatter = lazy(() => import('../../../components/Charts/charts/live/RPEByExerciseScatter'));

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
}

const CHART_REGISTRY: ChartEntry[] = [
  { key: 'workoutFrequency', label: 'Workout Frequency', Component: WorkoutFrequencyBar },
  { key: 'weightProgression', label: 'Weight Progression', Component: WeightProgressionLive },
  { key: 'muscleRadar', label: 'Muscle Group Focus', Component: MuscleGroupFocusRadar },
  { key: 'macroSplit', label: 'Macro Split', Component: MacroSplitDonut },
  { key: 'cardioEndurance', label: 'Cardio Endurance', Component: CardioEnduranceLine },
  { key: 'sessionFrequency', label: 'Session Frequency', Component: SessionFrequencyArea },
  { key: 'bodyFatTrend', label: 'Body Fat Trend', Component: BodyFatTrendLine },
  { key: 'muscleRecovery', label: 'Muscle Recovery', Component: MuscleRecoveryHeatmap },
  { key: 'rpeByExercise', label: 'Exercise Intensity (RPE)', Component: RPEByExerciseScatter },
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
  const visibleCharts = useMemo(
    () => CHART_REGISTRY.filter(c => chartVisibility[c.key] === true),
    [chartVisibility]
  );

  if (visibleCharts.length === 0) {
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
            <Suspense fallback={<SkeletonChart height={height || 280} />}>
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
