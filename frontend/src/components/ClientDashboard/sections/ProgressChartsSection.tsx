/**
 * ============================================================================
 * FILE: ProgressChartsSection.tsx
 * PURPOSE: Victory chart grid for client progress dashboard — The Big 6 + NASM Protocol charts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a responsive grid of Victory charts showing
 * client progress data relevant to NASM OPT protocol. Charts are lazy-loaded
 * and wrapped in SafeChart error boundaries. Fetches real analytics data via
 * useAnalytics hook and passes it to chart components that accept a data prop.
 *
 * HOW IT FITS IN THE APP: RevolutionaryClientDashboard → ProgressConstellation → ProgressChartsSection
 *
 * KEY DECISIONS: Victory (not Recharts) for React Native cross-platform.
 * SafeChart wrapper isolates each chart failure. Lazy loading keeps bundle small.
 * Charts fall back to demo data with "(Preview)" label when real data is unavailable.
 *
 * NASM PROTOCOL CONTEXT: Charts map to OPT periodization data — 1RM tracking,
 * volume progression, muscle group balance, and training phase visualization.
 */

/**
 * ┌─── SUB-COMPONENT: ProgressChartsSection ───────────────────┐
 * │ PARENT: ProgressConstellation (CrystallineSections.tsx)           │
 * │ PURPOSE: Display Victory charts for client fitness data      │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────────────────┐    │
 * │ │ Progress Analytics                    [Expand All]   │    │
 * │ │                                                      │    │
 * │ │ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
 * │ │ │ Weight   │ │ 1RM      │ │ Heatmap  │            │    │
 * │ │ │ Progress │ │ Strength │ │ Calendar │            │    │
 * │ │ └──────────┘ └──────────┘ └──────────┘            │    │
 * │ │ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
 * │ │ │ Muscle   │ │ Weekly   │ │ Goal     │            │    │
 * │ │ │ Radar    │ │ Volume   │ │ Progress │            │    │
 * │ │ └──────────┘ └──────────┘ └──────────┘            │    │
 * │ │                                                      │    │
 * │ │ ── NASM Protocol ──                                  │    │
 * │ │ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
 * │ │ │Training  │ │ Body     │ │ OPT      │            │    │
 * │ │ │ Load     │ │ Comp     │ │ Phases   │            │    │
 * │ │ └──────────┘ └──────────┘ └──────────┘            │    │
 * │ └──────────────────────────────────────────────────────┘    │
 * │ Props: none (fetches own data via user context)              │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Chart hover] → Victory tooltip shows data point value       │
 * │ [Error] → SafeChart shows retry button per chart             │
 * │ GAMIFICATION: First view triggers 10 XP "Data Explorer"      │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { lazy, useMemo } from 'react';
import styled from 'styled-components';
import SafeChart from '../../Charts/SafeChart';
import SkeletonChart from '../../ui/SkeletonChart';
import { useAuth } from '../../../context/AuthContext';
import { useAnalytics } from '../../../hooks/useAnalytics';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy-loaded Victory chart components
// PURPOSE: Code-split each chart for minimal initial bundle
// WHY: 50 charts would bloat the bundle if eagerly imported
// ─────────────────────────────────────────────────────────────

// Tier 1: The Big 6 (always visible)
const WeightProgression = lazy(() => import('../../Charts/charts/line/WeightProgressionLine'));
const StrengthProgression = lazy(() => import('../../Charts/charts/line/StrengthProgressionLine'));
const WorkoutHeatmap = lazy(() => import('../../Charts/charts/heatmap/WorkoutHeatmapCalendar'));
const MuscleGroupRadar = lazy(() => import('../../Charts/charts/radar/MuscleGroupRadar'));
const WeeklyVolume = lazy(() => import('../../Charts/charts/bar/WeeklyVolumeBar'));
const GoalProgress = lazy(() => import('../../Charts/charts/bullet/GoalProgressBullet'));

// Tier 2: NASM Protocol (shown when data exists)
const TrainingLoad = lazy(() => import('../../Charts/charts/area/TrainingLoadArea'));
const BodyComposition = lazy(() => import('../../Charts/charts/area/BodyCompositionArea'));
const TrainingPhases = lazy(() => import('../../Charts/charts/stream/TrainingPhaseStream'));
const ExerciseComparison = lazy(() => import('../../Charts/charts/bar/ExerciseComparisonBar'));

// Tier 3: Engagement (toggle-able)
const SessionFrequency = lazy(() => import('../../Charts/charts/line/SessionFrequencyLine'));
const CalorieBurn = lazy(() => import('../../Charts/charts/area/CalorieBurnArea'));

// ─────────────────────────────────────────────────────────────
// SECTION: Chart grid definitions
// PURPOSE: Define chart layout with metadata for rendering
// WHY: analyticsKey maps each chart to its backend endpoint
// ─────────────────────────────────────────────────────────────

interface ChartDef {
  id: string;
  name: string;
  Component: React.LazyExoticComponent<React.FC<{ data?: unknown }>>;
  /** Backend analytics endpoint key — matches useAnalytics(userId, key) */
  analyticsKey?: string;
}

const BIG_SIX: ChartDef[] = [
  { id: 'weight-progression', name: 'Weight Progression', Component: WeightProgression as ChartDef['Component'], analyticsKey: 'chart-weight-progression' },
  { id: 'strength-1rm', name: 'Strength Progression (1RM)', Component: StrengthProgression as ChartDef['Component'] },
  { id: 'workout-heatmap', name: 'Workout Calendar', Component: WorkoutHeatmap as ChartDef['Component'] },
  { id: 'muscle-radar', name: 'Muscle Group Balance', Component: MuscleGroupRadar as ChartDef['Component'], analyticsKey: 'chart-muscle-group-focus' },
  { id: 'weekly-volume', name: 'Weekly Volume', Component: WeeklyVolume as ChartDef['Component'], analyticsKey: 'chart-workout-frequency' },
  { id: 'goal-progress', name: 'Goal Progress', Component: GoalProgress as ChartDef['Component'] },
];

const NASM_PROTOCOL: ChartDef[] = [
  { id: 'training-load', name: 'Training Load', Component: TrainingLoad as ChartDef['Component'] },
  { id: 'body-composition', name: 'Body Composition', Component: BodyComposition as ChartDef['Component'], analyticsKey: 'chart-body-fat-trend' },
  { id: 'training-phases', name: 'OPT Training Phases', Component: TrainingPhases as ChartDef['Component'] },
  { id: 'exercise-comparison', name: 'Exercise Comparison', Component: ExerciseComparison as ChartDef['Component'] },
];

const ENGAGEMENT: ChartDef[] = [
  { id: 'session-frequency', name: 'Session Frequency', Component: SessionFrequency as ChartDef['Component'] },
  { id: 'calorie-burn', name: 'Calorie Burn', Component: CalorieBurn as ChartDef['Component'] },
];

// All analytics keys used across chart tiers
const ALL_ANALYTICS_KEYS = ['chart-workout-frequency', 'chart-weight-progression', 'chart-muscle-group-focus', 'chart-body-fat-trend'] as const;

// ─────────────────────────────────────────────────────────────
// SECTION: Analytics data fetcher
// PURPOSE: Centralize all useAnalytics calls for chart data
// WHY: Hooks must be called unconditionally at top level
// ─────────────────────────────────────────────────────────────

/** Fetch all chart analytics in parallel. Returns a map of key → { data, loading }. */
function useChartAnalytics(userId: string | undefined) {
  const freq = useAnalytics(userId, ALL_ANALYTICS_KEYS[0], !!userId);
  const weight = useAnalytics(userId, ALL_ANALYTICS_KEYS[1], !!userId);
  const muscle = useAnalytics(userId, ALL_ANALYTICS_KEYS[2], !!userId);
  const bodyFat = useAnalytics(userId, ALL_ANALYTICS_KEYS[3], !!userId);

  return useMemo(() => ({
    'chart-workout-frequency': { data: freq.data, loading: freq.loading },
    'chart-weight-progression': { data: weight.data, loading: weight.loading },
    'chart-muscle-group-focus': { data: muscle.data, loading: muscle.loading },
    'chart-body-fat-trend': { data: bodyFat.data, loading: bodyFat.loading },
  }), [freq.data, freq.loading, weight.data, weight.loading, muscle.data, muscle.loading, bodyFat.data, bodyFat.loading]);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Chart renderer helper
// PURPOSE: Renders a chart with skeleton loader or real/demo data
// ─────────────────────────────────────────────────────────────

interface ChartGridSectionProps {
  charts: ChartDef[];
  analyticsMap: ReturnType<typeof useChartAnalytics>;
}

const ChartGridSection: React.FC<ChartGridSectionProps> = React.memo(({ charts, analyticsMap }) => (
  <ChartGrid>
    {charts.map(({ id, name, Component, analyticsKey }) => {
      const analytics = analyticsKey ? analyticsMap[analyticsKey as keyof typeof analyticsMap] : null;
      const isLoading = analytics?.loading && !analytics?.data;

      return (
        <SafeChart key={id} chartName={name}>
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <Component data={analytics?.data ?? undefined} />
          )}
        </SafeChart>
      );
    })}
  </ChartGrid>
));
ChartGridSection.displayName = 'ChartGridSection';

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// PURPOSE: Renders tiered chart grid with section headers
// ─────────────────────────────────────────────────────────────

const ProgressChartsSection: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const analyticsMap = useChartAnalytics(userId);

  return (
    <Container>
      <SectionHeader>
        <PremiumSectionTitle>Progress Analytics</PremiumSectionTitle>
        <SectionSubtitle>Your fitness journey visualized with NASM protocol data</SectionSubtitle>
      </SectionHeader>

      <ChartGridSection charts={BIG_SIX} analyticsMap={analyticsMap} />

      <Divider />

      <SectionHeader>
        <SectionTitle>NASM Protocol Tracking</SectionTitle>
        <SectionSubtitle>OPT periodization metrics and progressive overload</SectionSubtitle>
      </SectionHeader>

      <ChartGridSection charts={NASM_PROTOCOL} analyticsMap={analyticsMap} />

      <Divider />

      <SectionHeader>
        <SectionTitle>Engagement & Wellness</SectionTitle>
        <SectionSubtitle>Training consistency and recovery indicators</SectionSubtitle>
      </SectionHeader>

      <ChartGridSection charts={ENGAGEMENT} analyticsMap={analyticsMap} />
    </Container>
  );
};

export default ProgressChartsSection;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Responsive chart grid matching Crystalline Swan theme
// WHY: CSS variables with dark-theme fallbacks per CLAUDE.md
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  width: 100%;
  padding: 0;
`;

const SectionHeader = styled.div`
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  margin: 0 0 0.25rem 0;
`;

// AI Village Phase 3 consensus: Gilded Fern accent for Big Six header
const PremiumSectionTitle = styled(SectionTitle)`
  color: var(--gilded-fern, #C6A84B);
  text-shadow: 0 0 12px color-mix(in srgb, var(--gilded-fern, #C6A84B) 30%, transparent);
`;

const SectionSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: color-mix(in srgb, var(--frost-white, #E0ECF4) 80%, transparent);
  margin: 0;
`;

const ChartGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;

  /* 10-breakpoint responsive matrix */
  grid-template-columns: 1fr;

  @media (min-width: 375px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1920px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  margin: 1.5rem 0;
`;
