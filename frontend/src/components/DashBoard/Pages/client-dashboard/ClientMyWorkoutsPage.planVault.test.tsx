/**
 * ClientMyWorkoutsPage plan vault target tests
 * ============================================
 * Locks the dashboard Plan Vault CTA target so /dashboard/client/workouts
 * contains the client's training-plan arcs, not only historical workout logs.
 */

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useWorkoutSessions: vi.fn(),
  useCurrentClientWorkout: vi.fn(),
  openPlanPdf: vi.fn(),
  closePlanPdf: vi.fn(),
  openPlanPdfExternal: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  // The page reads location.state.workoutChallengeProgress (logger handoff).
  useLocation: () => ({ pathname: '/dashboard/my-workouts', search: '', hash: '', state: null, key: 'test' }),
}));

vi.mock('../../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: (params: unknown) => mocks.useWorkoutSessions(params),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, role: 'client', clientSource: 'swanstudios' },
  }),
}));

vi.mock('./observatory/useCurrentClientWorkout', () => ({
  useCurrentClientWorkout: (userId: unknown) => mocks.useCurrentClientWorkout(userId),
}));

vi.mock('./observatory/useClientPlanPdfViewer', () => ({
  useClientPlanPdfViewer: () => ({
    viewer: null,
    error: null,
    openPlanPdf: mocks.openPlanPdf,
    closePlanPdf: mocks.closePlanPdf,
    openPlanPdfExternal: mocks.openPlanPdfExternal,
  }),
}));

import ClientMyWorkoutsPage from './ClientMyWorkoutsPage';

describe('ClientMyWorkoutsPage plan vault target', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.useWorkoutSessions.mockReset();
    mocks.useCurrentClientWorkout.mockReset();
    mocks.openPlanPdf.mockReset();
    mocks.closePlanPdf.mockReset();
    mocks.openPlanPdfExternal.mockReset();

    mocks.useWorkoutSessions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mocks.useCurrentClientWorkout.mockReturnValue({
      workout: { isLoggable: true },
      planVault: {
        filledCount: 1,
        slots: [
          {
            horizonKey: 'six_month',
            label: '6 Month',
            isDefaultHorizon: true,
            isFilled: true,
            isPrimary: true,
            planStatus: 'active',
            planTitle: 'Phase 1 Stabilization',
            pdfFile: {
              url: '/api/workout-plans/plan-6m/pdf/content.pdf',
              fileName: 'Six Month Foundation.pdf',
              contentType: 'application/pdf',
            },
          },
        ],
      },
      loading: false,
      error: false,
    });
  });

  it('shows the plan vault arcs on the My Workouts target route', () => {
    render(<ClientMyWorkoutsPage />);

    expect(mocks.useCurrentClientWorkout).toHaveBeenCalledWith(42);
    const vault = screen.getByTestId('client-plan-vault-card');
    expect(vault).toHaveTextContent(/plan vault/i);
    expect(vault).toHaveTextContent(/1 of 7 arcs ready/i);
    const primaryRow = within(vault).getByLabelText(/6 month primary plan arc/i);
    expect(primaryRow).toHaveTextContent(/phase 1 stabilization/i);
    expect(screen.getByRole('button', { name: /log today from 6 month primary plan/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open workout plan vault/i })).not.toBeInTheDocument();
  });

  it('keeps the plan vault visible while workout history is loading', () => {
    mocks.useWorkoutSessions.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientMyWorkoutsPage />);

    expect(screen.getByTestId('client-plan-vault-card')).toHaveTextContent(/plan vault/i);
    expect(screen.getByRole('button', { name: /log today from 6 month primary plan/i })).toBeInTheDocument();
  });
});
