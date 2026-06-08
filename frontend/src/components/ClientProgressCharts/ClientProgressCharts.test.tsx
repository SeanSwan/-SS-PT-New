import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COMPONENT_SOURCE = readFileSync(
  resolve(__dirname, './ClientProgressCharts.tsx'),
  'utf8'
);

const { mockGet, mockToast } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, firstName: 'Test', lastName: 'Client' },
  }),
}));

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: mockGet,
  },
}));

vi.mock('../../utils/chartCapture', () => ({
  captureChartAsImage: vi.fn(),
}));

vi.mock('./ShareChartModal', () => ({
  default: () => null,
}));

vi.mock('./charts/VolumeOverTimeChart', () => ({
  default: () => <div data-testid="volume-chart" />,
}));

vi.mock('./charts/OneRepMaxChart', () => ({
  default: () => <div data-testid="one-rep-max-chart" />,
}));

vi.mock('./charts/FormQualityChart', () => ({
  default: () => <div data-testid="form-quality-chart" />,
}));

vi.mock('./charts/NASMCategoryRadar', () => ({
  default: () => <div data-testid="nasm-category-radar" />,
}));

vi.mock('./charts/BodyCompositionChart', () => ({
  default: () => <div data-testid="body-composition-chart" />,
}));

vi.mock('./charts/StrengthProgressionChart', () => ({
  default: () => <div data-testid="strength-progression-chart" />,
}));

vi.mock('./charts/ConsistencyHeatmap', () => ({
  default: () => <div data-testid="consistency-heatmap-chart" />,
}));

vi.mock('./charts/MuscleGroupRadar', () => ({
  default: () => <div data-testid="muscle-group-radar-chart" />,
}));

vi.mock('./charts/TrainingLoadChart', () => ({
  default: () => <div data-testid="training-load-chart" />,
}));

vi.mock('./charts/RPEDistributionChart', () => ({
  default: () => <div data-testid="rpe-distribution-chart" />,
}));

vi.mock('./charts/PersonalRecordsChart', () => ({
  default: () => <div data-testid="personal-records-chart" />,
}));

vi.mock('./charts/RestComplianceChart', () => ({
  default: () => <div data-testid="rest-compliance-chart" />,
}));

vi.mock('./charts/ExerciseFrequencyChart', () => ({
  default: () => <div data-testid="exercise-frequency-chart" />,
}));

vi.mock('./charts/SessionIntensityChart', () => ({
  default: () => <div data-testid="session-intensity-chart" />,
}));

import ClientProgressCharts from './ClientProgressCharts';

const makeProgressResponse = (progressDataOverrides: Record<string, unknown> = {}) => ({
  data: {
    progressData: {
      workoutHistory: [],
      volumeProgression: [],
      oneRepMaxes: [],
      formTrends: [],
      nasmCategories: [],
      categories: [],
      bodyComposition: [],
      strengthProgression: [],
      consistencyData: [],
      muscleGroupVolume: [],
      personalRecords: [],
      restCompliance: [],
      exerciseFrequency: [],
      sessionIntensity: [],
      ...progressDataOverrides,
    },
  },
});

describe('ClientProgressCharts — detailed progress truth', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockToast.mockReset();
  });

  it('hides the NASM chart when the backend returns no truthful categories', async () => {
    mockGet.mockResolvedValue(makeProgressResponse());

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/Total Volume Over Time/i)).toBeInTheDocument();
    expect(screen.queryByText(/NASM Category Focus/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('nasm-category-radar')).not.toBeInTheDocument();
  });

  it('retries the legacy fallback endpoint when progress-detailed fails', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('primary failed'))
      .mockResolvedValueOnce(makeProgressResponse());

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    expect(mockGet.mock.calls[0][0]).toContain('/api/workout-forms/client/42/progress-detailed');
    expect(mockGet.mock.calls[1][0]).toContain('/api/workout-forms/client/42/progress');
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('hides the Muscle Group chart when the writer chain persists no classification metadata', async () => {
    // Phase 2 audit: WorkoutLogger's ExerciseEntry shape has no muscleGroup /
    // category / exerciseType. The backend previously bucketed everything
    // under "Uncategorized" so the chart rendered a single blob of fake
    // classification. The fix is to skip unclassified exercises; an empty
    // muscleGroupVolume must hide the mounted chart card.
    mockGet.mockResolvedValue(makeProgressResponse({ muscleGroupVolume: [] }));

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText(/Muscle Group Balance/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('muscle-group-radar-chart')).not.toBeInTheDocument();
  });

  it('renders the Muscle Group chart once the writer chain persists real classification buckets', async () => {
    mockGet.mockResolvedValue(
      makeProgressResponse({
        muscleGroupVolume: [
          { muscleGroup: 'Chest', volume: 8200, previousVolume: 6500 },
          { muscleGroup: 'Back', volume: 7400, previousVolume: 5100 },
        ],
      })
    );

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(screen.getByTestId('muscle-group-radar-chart')).toBeInTheDocument();
    });
  });

  it('renders the RPE Distribution chart when the backend ships real per-set zone buckets', async () => {
    mockGet.mockResolvedValue(
      makeProgressResponse({
        rpeDistribution: [
          { zone: 'Easy (1-3)', count: 4, percentage: 10, color: '#50A0F0' },
          { zone: 'Moderate (4-6)', count: 20, percentage: 50, color: '#60C0F0' },
          { zone: 'Hard (7-8)', count: 12, percentage: 30, color: '#8B5CF6' },
          { zone: 'Max Effort (9-10)', count: 4, percentage: 10, color: '#C6A84B' },
        ],
      })
    );

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(screen.getByTestId('rpe-distribution-chart')).toBeInTheDocument();
    });
  });

  it('hides the RPE Distribution chart when the backend ships an empty distribution', async () => {
    mockGet.mockResolvedValue(makeProgressResponse({ rpeDistribution: [] }));

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId('rpe-distribution-chart')).not.toBeInTheDocument();
  });

  it('does not invent RPE buckets from unrated workout history', async () => {
    mockGet.mockResolvedValue(
      makeProgressResponse({
        rpeDistribution: [],
        workoutHistory: [
          { date: '2026-04-08', duration: 45, intensity: null, totalVolume: 12450 },
          { date: '2026-04-10', duration: 50, overallRPE: undefined, totalVolume: 14200 },
        ],
      })
    );

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId('rpe-distribution-chart')).not.toBeInTheDocument();
  });

  it('renders the Personal Records chart when the backend ships real PR entries', async () => {
    mockGet.mockResolvedValue(
      makeProgressResponse({
        personalRecords: [
          { date: '2026-04-01', exercise: 'Back Squat', weight: 315, reps: 3, estimated1RM: 347 },
          { date: '2026-04-05', exercise: 'Bench Press', weight: 225, reps: 5, estimated1RM: 263 },
        ],
      })
    );

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(screen.getByTestId('personal-records-chart')).toBeInTheDocument();
    });
  });

  it('renders the Exercise Frequency chart when the backend ships real counts', async () => {
    mockGet.mockResolvedValue(
      makeProgressResponse({
        exerciseFrequency: [
          { exercise: 'Back Squat', count: 8, lastPerformed: '2026-04-10' },
          { exercise: 'Bench Press', count: 6, lastPerformed: '2026-04-09' },
        ],
      })
    );

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-frequency-chart')).toBeInTheDocument();
    });
  });

  it('renders the Session Intensity chart when the backend ships real per-form entries', async () => {
    mockGet.mockResolvedValue(
      makeProgressResponse({
        sessionIntensity: [
          { date: '2026-04-08', duration: 55, intensity: 7, totalVolume: 12450 },
          { date: '2026-04-10', duration: 60, intensity: 8, totalVolume: 14200 },
        ],
      })
    );

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(screen.getByTestId('session-intensity-chart')).toBeInTheDocument();
    });
  });

  it('Rest Compliance chart JSX is removed from the canonical surface — structurally unmeasurable', () => {
    // Source-level lock. The live-render variant of this assertion was
    // tautological: <RestComplianceChart> is lazy-loaded inside <Suspense>
    // and the title text is "Rest Period Compliance" (not "Rest Compliance"),
    // so both queryByTestId and queryByText trivially pass regardless of
    // whether the render block exists. A source-text lock on the JSX literal
    // is race-free and unambiguous.
    //
    // ExerciseSet has restTime (goal) but no restTaken (actual). Without a
    // writer-side schema change, rest compliance cannot be computed
    // truthfully. Any re-introduction of <RestComplianceChart must be
    // accompanied by an ExerciseSet schema audit.
    expect(COMPONENT_SOURCE).not.toMatch(/<RestComplianceChart/);
  });

  it('restCompliance is not default-visible in ChartVisibility state', () => {
    // Second lock: even if the render block is accidentally restored, the
    // default-visibility flag must stay false so the chart does not appear
    // unless a future fix intentionally flips it back on.
    expect(COMPONENT_SOURCE).not.toMatch(/restCompliance:\s*true/);
  });

  it('renders the NASM chart when the backend returns real category data', async () => {
    mockGet.mockResolvedValue(
      makeProgressResponse({
        nasmCategories: [
          { category: 'Strength', level: 120, percentComplete: 12 },
          { category: 'Power', level: 80, percentComplete: 8 },
        ],
      })
    );

    render(<ClientProgressCharts />);

    await waitFor(() => {
      expect(screen.getByText(/NASM Category Focus/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('nasm-category-radar')).toBeInTheDocument();
  });
});
