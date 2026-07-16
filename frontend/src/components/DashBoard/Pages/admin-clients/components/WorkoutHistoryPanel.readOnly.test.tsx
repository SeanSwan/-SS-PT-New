/**
 * WorkoutHistoryPanel read-only behavior
 * =====================================
 * Locks the admin View-As drilldown contract: previewing a client's workout
 * history may read sessions/charts, but must not expose edit or social-share
 * actions. Normal Clients & Team usage keeps those controls.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';

import type {
  AnalyticsData,
  WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';

const mockPatch = vi.fn();
const mockRefetch = vi.fn();
const mockAnalytics = vi.fn();

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { patch: mockPatch, get: vi.fn(), post: vi.fn() },
  }),
}));

vi.mock('../../../../../hooks/analytics/useWorkoutAnalytics', async () => {
  const actual = await vi.importActual<any>(
    '../../../../../hooks/analytics/useWorkoutAnalytics',
  );
  return {
    ...actual,
    useWorkoutAnalytics: () => mockAnalytics(),
  };
});

vi.mock(
  '../../../workspaces/clients-team/tabs/AdminProgressChartsGrid',
  () => ({ default: () => <div data-testid="mock-charts-tab" /> }),
);

vi.mock('../../../../Shared/ShareToFeedModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div role="dialog">Share modal</div> : null),
}));

import WorkoutHistoryPanel from './WorkoutHistoryPanel';

const makeSession = (): WorkoutSession => ({
  id: 'session-1',
  title: 'Upper Body Push',
  date: '2026-05-01T12:00:00Z',
  duration: 45,
  intensity: 7,
  status: 'completed',
  totalSets: 2,
  totalReps: 20,
  totalWeight: 2700,
  notes: undefined,
  logs: [
    {
      id: 1,
      exerciseName: 'Bench Press',
      setNumber: 1,
      reps: 10,
      weight: 135,
    },
  ],
});

const makeAnalyticsData = (): AnalyticsData => ({
  sessions: [makeSession()],
  weeklyVolume: [],
  exerciseFrequency: [],
  intensityTrend: [],
  workoutCalendar: [],
  personalRecords: [
    {
      exercise: 'Bench Press',
      weight: 135,
      reps: 10,
      date: '2026-05-01T12:00:00Z',
      estimated1RM: 180,
    },
  ],
  oneRMProgression: [],
  muscleGroupVolume: [],
  rpeTrend: [],
  summary: {
    totalWorkouts: 1,
    totalExercises: 1,
    totalVolume: 2700,
    avgIntensity: 7,
    avgRPE: 0,
    longestStreak: 1,
  },
});

const setAnalytics = () => {
  mockAnalytics.mockReturnValue({
    data: makeAnalyticsData(),
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  });
};

describe('WorkoutHistoryPanel read-only mode', () => {
  beforeEach(() => {
    mockPatch.mockClear();
    mockRefetch.mockClear();
    mockAnalytics.mockReset();
    setAnalytics();
  });

  it('hides edit and share controls while preserving session read access', () => {
    render(
      <WorkoutHistoryPanel
        clientId={42}
        clientName="Fixture Client"
        variant="modal"
        active
        readOnly
      />,
    );

    fireEvent.click(screen.getByText('Upper Body Push'));

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-start-session-1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /share upper body push/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /prs/i }));

    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /share bench press personal record/i })).not.toBeInTheDocument();
  });

  it('keeps edit and share controls available for normal trainer/admin workflow usage', () => {
    render(
      <WorkoutHistoryPanel
        clientId={42}
        clientName="Fixture Client"
        variant="modal"
        active
      />,
    );

    fireEvent.click(screen.getByText('Upper Body Push'));

    expect(screen.getByTestId('edit-start-session-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share upper body push/i })).toBeInTheDocument();
  });
});
