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
 *      (Back to Client Hub / Back to My Clients) when the user arrived
 *      via real-client auto-mount. "Back to Demo" only appears when the
 *      API actually failed and demo fallback is active.
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
    useSearchParams: () => [new URLSearchParams('clientId=61'), vi.fn()],
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
  default: () => <div data-testid="real-workout-logger">REAL_WORKOUT_LOGGER_MOUNTED</div>,
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
  });

  it('admin: /info success auto-mounts the real WorkoutLogger, shows role-aware back nav, hides stale demo copy', async () => {
    mockRole = 'admin';
    mockGet.mockResolvedValueOnce(REAL_CLIENT_INFO_RESPONSE);
    const user = userEvent.setup();

    render(<EnhancedWorkoutLogger />);

    // Real logger auto-mounts — no placeholder click required.
    await screen.findByTestId('real-workout-logger');

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

  it('API failure: keeps demo fallback path, does NOT auto-mount real WorkoutLogger', async () => {
    mockRole = 'trainer';
    mockGet.mockRejectedValueOnce(Object.assign(new Error('Request failed'), {
      response: { status: 403, data: { message: 'forbidden' } },
    }));

    render(<EnhancedWorkoutLogger />);

    // Demo toast fires on failure (preserves pre-existing fallback UX).
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/demo/i) }),
      );
    });

    // The real WorkoutLogger must NOT auto-mount on failure — demo UI
    // still requires the user to click "Try Full Logger" by hand.
    expect(screen.queryByTestId('real-workout-logger')).toBeNull();

    // Role-aware copy stays consistent: failure UX is demo mode (not
    // "Back to Client Hub" / "Back to My Clients"), but the Phase 17.1
    // invariant we care about is that real users aren't silently dropped
    // into this branch. Real path goes through the success branch above.
  });
});
