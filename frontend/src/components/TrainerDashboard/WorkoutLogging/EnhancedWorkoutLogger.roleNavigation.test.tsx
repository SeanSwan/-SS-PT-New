/**
 * Phase 17 (2026-04-20) — EnhancedWorkoutLogger role-aware navigation
 * ====================================================================
 * Before Phase 17 the logger hard-coded `/dashboard/trainer/clients`
 * as the back/cancel/complete target, which silently broke admin
 * navigation (admins landed on a trainer-only URL).
 *
 * After Phase 17 the component derives `backToClientsPath` from
 * `user?.role`: admin -> `/dashboard/admin/client-management`, any
 * other role -> `/dashboard/trainer/clients`.
 *
 * This test renders the error-state branch (no clientId in URL, no
 * activeClient in GlobalClientContext) so the "Back to My Clients"
 * button renders immediately without the full client-loading stack.
 * Clicking the button asserts that navigate() was called with the
 * role-appropriate path.
 *
 * Mock pattern mirrors WorkoutCopilotPanel.test.tsx: a module-scoped
 * `mockRole` variable flipped per test before rendering.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-scoped role flag — read by the useAuth mock below. Flip this
// before calling render() to exercise the admin vs trainer branch.
let mockRole: 'admin' | 'trainer' | 'client' | undefined = 'trainer';

const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(''), vi.fn()],
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: {}, user: { role: mockRole } }),
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

// WorkoutLogger child isn't rendered in the error-state path we exercise,
// but the module is still imported — keep the import cheap.
vi.mock('../../WorkoutLogger/WorkoutLogger', () => ({
  default: () => null,
}));

import EnhancedWorkoutLogger from './EnhancedWorkoutLogger';

describe('EnhancedWorkoutLogger — role-aware back navigation (Phase 17)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockToast.mockReset();
  });

  it('admin sees "Back to Client Hub" and navigates to /dashboard/admin/client-management', async () => {
    mockRole = 'admin';
    const user = userEvent.setup();

    render(<EnhancedWorkoutLogger />);

    // Admin copy is "Back to Client Hub"; "My Clients" is trainer-only.
    const backButton = await screen.findByRole('button', { name: /back to client hub/i });
    expect(screen.queryByRole('button', { name: /back to my clients/i })).toBeNull();

    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/admin/client-management');
  });

  it('trainer sees "Back to My Clients" and navigates to /dashboard/trainer/clients', async () => {
    mockRole = 'trainer';
    const user = userEvent.setup();

    render(<EnhancedWorkoutLogger />);

    const backButton = await screen.findByRole('button', { name: /back to my clients/i });
    expect(screen.queryByRole('button', { name: /back to client hub/i })).toBeNull();

    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/clients');
  });

  it('defaults non-admin roles (including undefined) to the trainer copy + surface', async () => {
    // The Phase 17 policy is "admin gets Client Hub, everything else
    // gets the trainer My Clients surface" — this locks the default.
    mockRole = undefined;
    const user = userEvent.setup();

    render(<EnhancedWorkoutLogger />);

    const backButton = await screen.findByRole('button', { name: /back to my clients/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/trainer/clients');
  });
});
