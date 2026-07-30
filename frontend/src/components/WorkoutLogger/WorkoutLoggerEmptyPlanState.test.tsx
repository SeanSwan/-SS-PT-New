/**
 * C4b empty-plan state contract: the no-plan dead-end renders a persistent,
 * role-aware in-page state (was toast-only + a bare add button).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLoggerEmptyPlanState from './WorkoutLoggerEmptyPlanState';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

const mockGet = vi.fn();
// Stable identity — a fresh object per call retriggers effects (C4c lesson).
const stableAuth = { authAxios: { get: mockGet } };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

const renderPanel = (
  kind: Parameters<typeof WorkoutLoggerEmptyPlanState>[0]['outcome']['kind'],
  isClientSelfMode: boolean,
  extra: Record<string, unknown> = {},
) =>
  render(
    <MemoryRouter>
      <WorkoutLoggerEmptyPlanState
        outcome={{ kind, message: 'Probe message.' }}
        isClientSelfMode={isClientSelfMode}
        {...extra}
      />
    </MemoryRouter>,
  );

beforeEach(() => {
  mockNavigate.mockClear();
  mockGet.mockReset();
  mockGet.mockRejectedValue(new Error('not wired for this case'));
});

describe('WorkoutLoggerEmptyPlanState', () => {
  it('renders the outcome title, message, and the freestyle hint', () => {
    renderPanel('no_plan', true);
    expect(screen.getByTestId('logger-empty-plan-state')).toBeInTheDocument();
    expect(screen.getByText('No active plan yet')).toBeInTheDocument();
    expect(screen.getByText(/Probe message\./)).toBeInTheDocument();
    expect(screen.getByText(/log freestyle/)).toBeInTheDocument();
  });

  it('self-mode clients get Ask Coach + plan vault CTAs that navigate', () => {
    renderPanel('no_exercises_today', true);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Coach' }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/coach-assistant');
    fireEvent.click(screen.getByRole('button', { name: /Plan Vault/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
  });

  it('hides client CTAs for trainer/admin contexts and for no_client', () => {
    renderPanel('no_plan', false);
    expect(screen.queryByRole('button', { name: 'Ask Coach' })).toBeNull();
    renderPanel('no_client', true);
    expect(screen.queryByRole('button', { name: 'Ask Coach' })).toBeNull();
  });

  it('offers the top suggestion on no_plan and loads it through the logger adapter', async () => {
    const onAddExercise = vi.fn();
    mockGet.mockResolvedValue({
      data: {
        data: {
          suggestions: [{
            title: 'Balanced Full-Body Session',
            whyRationale: ['Starting point — your coach will refine this as you log sessions.'],
            exercises: [
              { key: 'goblet_squat', name: 'goblet squat', category: 'squat', muscles: ['quads'] },
              { key: 'plank', name: 'plank', category: 'core', muscles: ['abs'] },
            ],
          }],
        },
      },
    });

    renderPanel('no_plan', true, { clientId: 11, onAddExercise });

    await waitFor(() => expect(screen.getByTestId('logger-suggested-session')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledWith('/api/workout-builder/suggested/11');
    fireEvent.click(screen.getByRole('button', { name: 'Load this session' }));
    expect(onAddExercise).toHaveBeenCalledTimes(2);
    expect(onAddExercise.mock.calls[0][0]).toMatchObject({
      id: 'goblet_squat',
      name: 'goblet squat',
      exerciseKey: 'goblet_squat',
      bodyPartCategory: 'squat',
      primaryMuscles: ['quads'],
    });
  });

  it('stays silent when the source fails or the surface is not eligible', async () => {
    renderPanel('no_plan', true, { clientId: 11, onAddExercise: vi.fn() });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByTestId('logger-suggested-session')).toBeNull();

    mockGet.mockClear();
    renderPanel('no_plan', false, { clientId: 11, onAddExercise: vi.fn() }); // trainer context
    renderPanel('no_exercises_today', true, { clientId: 11, onAddExercise: vi.fn() }); // wrong outcome
    expect(mockGet).not.toHaveBeenCalled();
  });
});
