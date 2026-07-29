/**
 * C4b empty-plan state contract: the no-plan dead-end renders a persistent,
 * role-aware in-page state (was toast-only + a bare add button).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkoutLoggerEmptyPlanState from './WorkoutLoggerEmptyPlanState';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}));

const renderPanel = (kind: Parameters<typeof WorkoutLoggerEmptyPlanState>[0]['outcome']['kind'], isClientSelfMode: boolean) =>
  render(
    <MemoryRouter>
      <WorkoutLoggerEmptyPlanState
        outcome={{ kind, message: 'Probe message.' }}
        isClientSelfMode={isClientSelfMode}
      />
    </MemoryRouter>,
  );

beforeEach(() => mockNavigate.mockClear());

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
});
