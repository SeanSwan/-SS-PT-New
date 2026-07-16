
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SocialProgressAnalyticsPreview from './SocialProgressAnalyticsPreview';

const mockUseClientProgressCharts = vi.fn();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const homeSource = readFileSync(resolve(__dirname, 'ClientDashboardHome.tsx'), 'utf8');

vi.mock('../../../hooks/analytics/useClientProgressCharts', () => ({
  useClientProgressCharts: () => mockUseClientProgressCharts(),
}));

vi.mock('../../DashBoard/progress/ProgressChartCube', () => ({
  default: ({ nonEmptyChartCount }: { nonEmptyChartCount: number }) => (
    <div data-testid="mock-progress-cube">{nonEmptyChartCount} live charts</div>
  ),
}));

vi.mock('../../DashBoard/progress/ProgressChartWarRoomBoard', () => ({
  default: ({ storageKey }: { storageKey: string }) => (
    <div data-testid="mock-war-room-board">{storageKey}</div>
  ),
}));

const emptyCharts = {
  workoutFrequency: [],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 0,
    totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
  },
  weeklyVolume: [],
  setsRepsTrend: { sets: [], reps: [] },
  durationTrend: [],
  intensityRpeTrend: [],
  prTimeline: [],
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [],
};

describe('SocialProgressAnalyticsPreview', () => {
  beforeEach(() => {
    mockUseClientProgressCharts.mockReset();
  });

  it('shows a social-user starter state without fabricating chart data', () => {
    const onNavigate = vi.fn();
    const onTarget = vi.fn();
    mockUseClientProgressCharts.mockReturnValue({
      charts: emptyCharts,
      isLoading: false,
      nonEmptyChartCount: 0,
      unavailableChartCount: 12,
    });

    render(<SocialProgressAnalyticsPreview onNavigate={onNavigate} onTarget={onTarget} />);

    expect(screen.getByText(/Unlock the rotating chart cube/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Log Workout/i }));
    fireEvent.click(screen.getByRole('button', { name: /Progress/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/log-workout');
    expect(onTarget).toHaveBeenCalledWith('progress');
  });

  it('renders the cube and War Room board when real chart signal exists', () => {
    mockUseClientProgressCharts.mockReturnValue({
      charts: { ...emptyCharts, workoutFrequency: [{ x: 'Mon', y: 1 }] },
      isLoading: false,
      nonEmptyChartCount: 1,
      unavailableChartCount: 11,
    });

    render(<SocialProgressAnalyticsPreview onNavigate={vi.fn()} onTarget={vi.fn()} />);

    expect(screen.getByTestId('mock-progress-cube')).toHaveTextContent('1 live charts');
    expect(screen.getByTestId('mock-war-room-board')).toHaveTextContent('swan-progress-war-room-board-user-dashboard');
  });

  it('is mounted in the user-dashboard home primary stack', () => {
    expect(homeSource).toContain("import SocialProgressAnalyticsPreview from './SocialProgressAnalyticsPreview'");
    expect(homeSource).toContain('<SocialProgressAnalyticsPreview onNavigate={props.onNavigate} onTarget={props.onTarget} />');
  });
});