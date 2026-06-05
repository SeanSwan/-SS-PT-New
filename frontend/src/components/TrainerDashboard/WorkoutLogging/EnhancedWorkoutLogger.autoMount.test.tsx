/**
 * Phase 17.1 (2026-04-20) — EnhancedWorkoutLogger auto-mount behavior
 * =====================================================================
 * Phase 17 switched the logger to the Codex-approved /info endpoint and
 * made navigation role-aware. Codex's follow-up review caught that
 * real-client success was still being routed through a stale
 * "Workout Logger Ready / Start Demo Workout" placeholder and a
 * "Back to Demo" nav button — both hold-overs from the pre-17
 * demo-first component.
 *
 * Phase 17.1 closes that gap:
 *   1. Successful /info load sets useOriginalLogger=true, mounting the
 *      real WorkoutLogger immediately (no placeholder click-through).
 *   2. The useOriginalLogger branch shows role-aware back copy
 *      (Back to Client Hub / Back to My Clients) for real-client
 *      auto-mount. The old demo fallback path is not allowed.
 *   3. The "Workout Logger Ready / Start Demo Workout" placeholder was
 *      deleted — real users should never see that copy.
 *
 * These tests mock authAxios + react-router-dom + the WorkoutLogger
 * child component (test marker) to exercise the success path without
 * pulling in the ~1000-line WorkoutLogger render stack.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scoped mocks — flipped per test
let mockRole: 'admin' | 'trainer' | 'client' | undefined = 'trainer';
let mockSearchQuery = 'clientId=61';
const mockNavigate = vi.fn();
const mockGet = vi.fn();
const mockToast = vi.fn();
// Stable authAxios reference — prevents loadClientData useCallback churn
// that would otherwise re-fire the /info request on every render and
// burn through `mockResolvedValueOnce` before the first render reads it.
const mockAuthAxios = { get: mockGet };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    // Client deep-link shape used by the admin/trainer CTAs.
    useSearchParams: () => [new URLSearchParams(mockSearchQuery), vi.fn()],
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios, user: { role: mockRole } }),
}));

vi.mock('../../../context/GlobalClientContext', () => ({
  useGlobalClient: () => ({ activeClient: null }),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Replace the real WorkoutLogger with a lightweight test marker so we
// can assert auto-mount without loading the full logger stack.
vi.mock('../../WorkoutLogger/WorkoutLogger', () => ({
  default: ({
    clientId,
    scheduledSessionId,
    onComplete,
  }: {
    clientId: number;
    scheduledSessionId?: string | null;
    onComplete?: (formData: unknown) => void;
  }) => (
    <button
      type="button"
      data-testid="real-workout-logger"
      data-client-id={String(clientId)}
      data-session-id={scheduledSessionId ?? ''}
      onClick={() => onComplete?.({ id: 'completed-form' })}
    >
      REAL_WORKOUT_LOGGER_MOUNTED
    </button>
  ),
}));

// Canonical /info response shape — matches backend handler at
// dailyWorkoutFormRoutes.mjs:200-218 (Phase 17 Canonical Surface Receipt).
const REAL_CLIENT_INFO_RESPONSE = {
  data: {
    success: true,
    client: {
      id: 61,
      firstName: 'Jackie',
      lastName: 'Client',
      email: 'jackie.c.movefitness@swanstudios.com',
      phone: null,
      availableSessions: 12,
      memberSince: '2026-01-15T00:00:00.000Z',
      recentWorkoutCount: 3,
      hasWorkoutToday: false,
      todayWorkoutId: null,
    },
  },
};

import EnhancedWorkoutLogger from './EnhancedWorkoutLogger';

describe('EnhancedWorkoutLogger — Phase 17.1 real-client auto-mount', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGet.mockReset();
    mockToast.mockReset();
    mockSearchQuery = 'clientId=61';
  });

  it('admin: scheduled-session /info success auto-mounts the real WorkoutLogger, shows role-aware back nav, hides stale demo copy', async () => {
    mockRole = 'admin';
    mockSearchQuery = 'clientId=61&sessionId=314';
    mockGet.mockResolvedValueOnce(REAL_CLIENT_INFO_RESPONSE);
    const user = userEvent.setup();

    render(<EnhancedWorkoutLogger />);

    // Real logger auto-mounts — no placeholder click required.
    const loggerButton = await screen.findByTestId('real-workout-logger');
    expect(loggerButton).toHaveAttribute('data-client-id', '61');
    expect(loggerButton).toHaveAttribute('data-session-id', '314');

    // Role-aware back nav for admin. getByRole throws if not found,
    // so the lookup itself is the presence assertion.
    const backBtn = screen.getByRole('button', { name: /back to client hub/i });

    // Stale demo copy must not render for a real client.
    expect(screen.queryByRole('button', { name: /start demo workout/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /back to demo/i })).toBeNull();
    expect(screen.queryByText(/workout logger ready/i)).toBeNull();

    // API path verification — the exact Phase 17 URL literal.
    expect(mockGet).toHaveBeenCalledWith('/api/workout-forms/client/61/info');

    // Back nav routes to admin client hub.
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/client-management');
  });

  it('admin: clients-team returnTo redirects into the embedded Client Hub logger', async () => {
    mockRole = 'admin';
    mockSearchQuery =
      'clientId=61&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D61';

    render(<EnhancedWorkoutLogger />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=logger',
        { replace: true }
      );
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByTestId('real-workout-logger')).toBeNull();
  });

  it('admin: stale clients-team full-page URLs redirect into the embedded Client Hub logger', async () => {
    mockRole = 'admin';
    mockSearchQuery = 'clientId=61&source=clients-team';

    render(<EnhancedWorkoutLogger />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=logger',
        { replace: true }
      );
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByTestId('real-workout-logger')).toBeNull();
  });

  it('admin: bare full-page client logging URLs redirect into the embedded Client Hub logger', async () => {
    mockRole = 'admin';
    mockSearchQuery = 'clientId=61';

    render(<EnhancedWorkoutLogger />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=logger',
        { replace: true }
      );
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByTestId('real-workout-logger')).toBeNull();
  });

  it('admin: master-schedule completion keeps the scheduled-session full-page logger flow', async () => {
    mockRole = 'admin';
    mockSearchQuery =
      'clientId=61&sessionId=314&source=master-schedule&returnTo=%2Fdashboard%2Fadmin%2Fmaster-schedule%3FsessionId%3D314';
    mockGet.mockResolvedValueOnce(REAL_CLIENT_INFO_RESPONSE);
    const user = userEvent.setup();

    render(<EnhancedWorkoutLogger />);

    const loggerButton = await screen.findByTestId('real-workout-logger');
    expect(loggerButton).toHaveAttribute('data-client-id', '61');
    expect(loggerButton).toHaveAttribute('data-session-id', '314');

    const backBtn = screen.getByRole('button', { name: /back to schedule/i });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/master-schedule?sessionId=314');

    await user.click(loggerButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard/admin/master-schedule?sessionId=314',
      expect.objectContaining({
        state: expect.objectContaining({ workoutCompleted: true }),
      })
    );
  });

  it('trainer: /info success auto-mounts the real WorkoutLogger with "Back to My Clients" nav', async () => {
    mockRole = 'trainer';
    mockGet.mockResolvedValueOnce(REAL_CLIENT_INFO_RESPONSE);
    const user = userEvent.setup();

    render(<EnhancedWorkoutLogger />);

    await screen.findByTestId('real-workout-logger');

    const backBtn = screen.getByRole('button', { name: /back to my clients/i });

    // Stale demo copy AND admin copy must both be absent for a real trainer.
    expect(screen.queryByRole('button', { name: /start demo workout/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /back to demo/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /back to client hub/i })).toBeNull();
    expect(screen.queryByText(/workout logger ready/i)).toBeNull();

    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/clients');
  });

  it('drops malformed master-schedule session ids before mounting WorkoutLogger', async () => {
    mockRole = 'trainer';
    mockSearchQuery = 'clientId=61&sessionId=314junk&source=master-schedule';
    mockGet.mockResolvedValueOnce(REAL_CLIENT_INFO_RESPONSE);

    render(<EnhancedWorkoutLogger />);

    expect(await screen.findByTestId('real-workout-logger')).toHaveAttribute('data-session-id', '');
    expect(mockGet).toHaveBeenCalledWith('/api/workout-forms/client/61/info');
  });

  it('rejects malformed URL client ids before hitting the client info endpoint', async () => {
    mockRole = 'admin';
    mockSearchQuery = 'clientId=61junk&source=clients-team';

    render(<EnhancedWorkoutLogger />);

    expect(await screen.findByRole('heading', { name: /workout logging error/i })).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByTestId('real-workout-logger')).toBeNull();
  });

  it('rejects malformed /info client ids before mounting the real WorkoutLogger', async () => {
    mockRole = 'trainer';
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        client: {
          ...REAL_CLIENT_INFO_RESPONSE.data.client,
          id: '61junk',
        },
      },
    });

    render(<EnhancedWorkoutLogger />);

    expect(await screen.findByRole('heading', { name: /workout logging error/i })).toBeInTheDocument();
    expect(screen.queryByTestId('real-workout-logger')).toBeNull();
  });

  it('API failure: shows an honest retry state and does NOT auto-mount real WorkoutLogger', async () => {
    mockRole = 'trainer';
    mockGet.mockRejectedValueOnce(Object.assign(new Error('Request failed'), {
      response: { status: 403, data: { message: 'forbidden' } },
    }));

    render(<EnhancedWorkoutLogger />);

    // Failure shows an honest retry state instead of falling into demo UX.
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/unavailable/i) }),
      );
    });

    // The real WorkoutLogger must NOT auto-mount on failure.
    expect(screen.queryByTestId('real-workout-logger')).toBeNull();
    expect(await screen.findByRole('heading', { name: /workout logging error/i })).toBeInTheDocument();
    expect(screen.getByText(/client workout data could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try full logger/i })).toBeNull();
    expect(screen.queryByText(/demo mode/i)).toBeNull();

    // Real paths go through the success branch above; failures stay in
    // retry-only UX until the client data can be loaded.
  });
});
