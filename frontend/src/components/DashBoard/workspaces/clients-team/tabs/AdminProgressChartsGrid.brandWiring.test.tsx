/**
 * A1b-2 wiring proof: the admin/trainer progress grid resolves the SUBJECT
 * client's source from the shared roster keyed by the charted clientId (not the
 * "active" client), then feeds it to the progress-report PDF button. This is the
 * single point that white-labels EVERY admin entry to that grid — Progress tab,
 * Workout History charts tab, View-As, and the workouts modal — without threading
 * a prop through each chain. Exporter branding is proven in progressReportPdf.test.ts.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import GlobalClientContext, {
  type ActiveClient,
  type GlobalClientContextType,
} from '../../../../../context/GlobalClientContext';

vi.mock('../../../progress-proof/ProgressReportPdfButton', () => ({
  default: (props: { clientSource?: string | null }) => (
    <div data-testid="pdf-btn" data-client-source={props.clientSource ?? '(none)'} />
  ),
}));

vi.mock('../../../../../hooks/analytics/useAdminClientProgressCharts', () => ({
  useAdminClientProgressCharts: () => ({
    charts: {
      workoutFrequency: [],
      attendanceReliability: { data: [], reliabilityPercent: 0, totals: { completed: 0, resolved: 0 } },
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
    nonEmptyChartCount: 1,
    unavailableChartCount: 0,
  }),
}));

import AdminProgressChartsGrid from './AdminProgressChartsGrid';

const makeCtx = (clientList: ActiveClient[]): GlobalClientContextType => ({
  activeClient: null,
  setActiveClient: () => {},
  clearActiveClient: () => {},
  clientList,
  loadingClients: false,
  refreshClients: async () => {},
});

const renderWithRoster = (clientList: ActiveClient[], clientId: number) =>
  render(
    <GlobalClientContext.Provider value={makeCtx(clientList)}>
      <MemoryRouter>
        <AdminProgressChartsGrid clientId={clientId} clientName="Fixture Client" />
      </MemoryRouter>
    </GlobalClientContext.Provider>,
  );

const roster: ActiveClient[] = [
  { id: 7, firstName: 'Mo', lastName: 'Fit', email: 'mf@x.io', clientSource: 'move_fitness' },
  { id: 8, firstName: 'Sw', lastName: 'Studio', email: 'sw@x.io', clientSource: 'swanstudios' },
];

const sourceOfButton = () =>
  screen.getByTestId('pdf-btn').getAttribute('data-client-source');

describe('AdminProgressChartsGrid brand wiring (A1b-2)', () => {
  it('resolves a Move Fitness client by charted clientId and feeds the PDF button', () => {
    renderWithRoster(roster, 7);
    expect(sourceOfButton()).toBe('move_fitness');
  });

  it('resolves a SwanStudios client by charted clientId (not the active client)', () => {
    renderWithRoster(roster, 8);
    expect(sourceOfButton()).toBe('swanstudios');
  });

  it('fails safe (SwanStudios) when the charted client is not in the roster', () => {
    renderWithRoster(roster, 999);
    expect(sourceOfButton()).toBe('(none)');
  });

  it('fails safe when rendered with no roster context at all', () => {
    render(
      <MemoryRouter>
        <AdminProgressChartsGrid clientId={7} clientName="Fixture Client" />
      </MemoryRouter>,
    );
    expect(sourceOfButton()).toBe('(none)');
  });
});
