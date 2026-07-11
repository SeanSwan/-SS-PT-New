/**
 * A1b-2 wiring proof: the client self-view feeds the logged-in user's
 * clientSource into the progress-report PDF button, so a Move Fitness member
 * downloading their OWN progress report gets a Move-Fitness-only document (never
 * SwanStudios). The button -> exporter branding is proven separately in
 * progressReportPdf.test.ts; this asserts only that the right source is wired.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Capture the clientSource the grid hands to the PDF button.
vi.mock('../../progress-proof/ProgressReportPdfButton', () => ({
  default: (props: { clientSource?: string | null }) => (
    <div data-testid="pdf-btn" data-client-source={props.clientSource ?? '(none)'} />
  ),
}));

const mockUser = vi.hoisted(() => ({ current: null as { clientSource?: string } | null }));
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

vi.mock('../../../../hooks/analytics/useClientProgressCharts', () => ({
  useClientProgressCharts: () => ({
    charts: {
      workoutFrequency: [],
      attendanceReliability: { data: [], reliabilityPercent: 0, totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 } },
      weeklyVolume: [],
      setsRepsTrend: { sets: [], reps: [] },
      durationTrend: [],
      intensityRpeTrend: [],
      prTimeline: [],
      anchorLifts: { exercises: [], data: {} },
      exerciseFrequency: [],
      movementPatternBalance: [],
      muscleGroupBalance: [],
      recoverySignal: [],
      weightTrend: [],
      bodyFatTrend: [],
      estOneRm: { exercise: null, data: [] },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    nonEmptyChartCount: 1,
    unavailableChartCount: 0,
    lockedChartIds: [],
  }),
}));

import CanonicalProgressChartsGrid from './CanonicalProgressChartsGrid';

const sourceOfButton = () =>
  screen.getByTestId('pdf-btn').getAttribute('data-client-source');

describe('CanonicalProgressChartsGrid brand wiring (A1b-2)', () => {
  it('feeds a Move Fitness member their own source into the progress-report PDF button', () => {
    mockUser.current = { clientSource: 'move_fitness' };
    render(<MemoryRouter><CanonicalProgressChartsGrid /></MemoryRouter>);
    expect(sourceOfButton()).toBe('move_fitness');
  });

  it('passes a SwanStudios member their SwanStudios source through', () => {
    mockUser.current = { clientSource: 'swanstudios' };
    render(<MemoryRouter><CanonicalProgressChartsGrid /></MemoryRouter>);
    expect(sourceOfButton()).toBe('swanstudios');
  });

  it('fails safe (no source -> exporter defaults to SwanStudios) when the user has no clientSource', () => {
    mockUser.current = {};
    render(<MemoryRouter><CanonicalProgressChartsGrid /></MemoryRouter>);
    expect(sourceOfButton()).toBe('(none)');
  });
});
