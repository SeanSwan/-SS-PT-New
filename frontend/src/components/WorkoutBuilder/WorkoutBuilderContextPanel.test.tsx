import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ClientContext } from '../../hooks/useWorkoutBuilderAPI';
import WorkoutBuilderContextPanel from './WorkoutBuilderContextPanel';

const contextWithMissingEffort = {
  clientId: 42,
  trainerId: 7,
  clientName: 'Client #42',
  fetchedAt: '2026-06-08T00:00:00.000Z',
  pain: {
    activeEntries: 0,
    exclusions: [],
    warnings: [],
    excludedMuscles: [],
  },
  movement: {
    nasmPhaseRecommendation: null,
    compensations: [],
    exerciseScores: {},
    totalAnalyses: 0,
  },
  formAnalysis: {
    recentCount: 0,
    detectedCompensations: [],
    avgScore: 0,
    flaggedExercises: [],
  },
  workouts: {
    sessionsLast2Weeks: 1,
    recentExercises: ['Deadlift'],
    avgFormRating: null,
    avgIntensity: null,
  },
  equipment: [],
  variation: {
    recentSessions: 0,
    lastSessionType: null,
    lastSessionDate: null,
    recentlyUsedExercises: [],
    currentPattern: 'standard',
  },
  constraints: {
    excludedMuscles: [],
    compensationTypes: [],
    recentlyUsedExercises: [],
    nasmPhase: null,
  },
} as unknown as ClientContext;

describe('WorkoutBuilderContextPanel', () => {
  it('renders missing workout ratings as not logged instead of null scores', () => {
    render(
      <WorkoutBuilderContextPanel
        clientId="42"
        context={contextWithMissingEffort}
        parsedClientId={42}
        onClientIdChange={() => {}}
      />,
    );

    expect(screen.getByText(/avg form: not logged/i)).toBeInTheDocument();
    expect(screen.getByText(/intensity: not logged/i)).toBeInTheDocument();
    expect(screen.queryByText(/null\/5/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/null\/10/i)).not.toBeInTheDocument();
  });
});
