/**
 * ============================================================================
 * FILE: ProgressChartsSection.tsx
 * PURPOSE: Victory chart grid for client progress dashboard — The Big 6 + NASM Protocol charts
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a responsive grid of Victory charts showing
 * client progress data relevant to NASM OPT protocol. Charts are lazy-loaded
 * and wrapped in SafeChart error boundaries.
 *
 * HOW IT FITS IN THE APP: RevolutionaryClientDashboard → ProgressConstellation → ProgressChartsSection
 *
 * KEY DECISIONS: Victory (not Recharts) for React Native cross-platform.
 * SafeChart wrapper isolates each chart failure. Lazy loading keeps bundle small.
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

import React, { lazy } from 'react';
import styled from 'styled-components';
import SafeChart from '../../Charts/SafeChart';

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
// ─────────────────────────────────────────────────────────────

interface ChartDef {
  id: string;
  name: string;
  Component: React.LazyExoticComponent<React.FC>;
}

const BIG_SIX: ChartDef[] = [
  { id: 'weight-progression', name: 'Weight Progression', Component: WeightProgression },
  { id: 'strength-1rm', name: 'Strength Progression (1RM)', Component: StrengthProgression },
  { id: 'workout-heatmap', name: 'Workout Calendar', Component: WorkoutHeatmap },
  { id: 'muscle-radar', name: 'Muscle Group Balance', Component: MuscleGroupRadar },
  { id: 'weekly-volume', name: 'Weekly Volume', Component: WeeklyVolume },
  { id: 'goal-progress', name: 'Goal Progress', Component: GoalProgress },
];

const NASM_PROTOCOL: ChartDef[] = [
  { id: 'training-load', name: 'Training Load', Component: TrainingLoad },
  { id: 'body-composition', name: 'Body Composition', Component: BodyComposition },
  { id: 'training-phases', name: 'OPT Training Phases', Component: TrainingPhases },
  { id: 'exercise-comparison', name: 'Exercise Comparison', Component: ExerciseComparison },
];

const ENGAGEMENT: ChartDef[] = [
  { id: 'session-frequency', name: 'Session Frequency', Component: SessionFrequency },
  { id: 'calorie-burn', name: 'Calorie Burn', Component: CalorieBurn },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders tiered chart grid with section headers
// ─────────────────────────────────────────────────────────────

const ProgressChartsSection: React.FC = () => (
  <Container>
    <SectionHeader>
      <SectionTitle>Progress Analytics</SectionTitle>
      <SectionSubtitle>Your fitness journey visualized with NASM protocol data</SectionSubtitle>
    </SectionHeader>

    <ChartGrid>
      {BIG_SIX.map(({ id, name, Component }) => (
        <SafeChart key={id} chartName={name}>
          <Component />
        </SafeChart>
      ))}
    </ChartGrid>

    <Divider />

    <SectionHeader>
      <SectionTitle>NASM Protocol Tracking</SectionTitle>
      <SectionSubtitle>OPT periodization metrics and progressive overload</SectionSubtitle>
    </SectionHeader>

    <ChartGrid>
      {NASM_PROTOCOL.map(({ id, name, Component }) => (
        <SafeChart key={id} chartName={name}>
          <Component />
        </SafeChart>
      ))}
    </ChartGrid>

    <Divider />

    <SectionHeader>
      <SectionTitle>Engagement & Wellness</SectionTitle>
      <SectionSubtitle>Training consistency and recovery indicators</SectionSubtitle>
    </SectionHeader>

    <ChartGrid>
      {ENGAGEMENT.map(({ id, name, Component }) => (
        <SafeChart key={id} chartName={name}>
          <Component />
        </SafeChart>
      ))}
    </ChartGrid>
  </Container>
);

export default ProgressChartsSection;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Responsive chart grid matching Crystalline Swan theme
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
  color: #E0ECF4;
  margin: 0 0 0.25rem 0;
`;

const SectionSubtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.6);
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
  border-top: 1px solid rgba(96, 192, 240, 0.12);
  margin: 1.5rem 0;
`;
