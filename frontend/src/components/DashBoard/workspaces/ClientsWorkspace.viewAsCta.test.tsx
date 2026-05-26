/**
 * Phase 18.C.1B.1R — ClientsWorkspace "View As" CTA navigation tests
 * ===================================================================
 * The Client Hub at /dashboard/admin/client-management is the canonical
 * live entry point for admin client ops. Phase 18.C.1B.1R added a
 * selected-client "View As" CTA in the top-bar action row that navigates
 * to the canonical AdminViewAsWrapper mount at
 * /dashboard/admin/client-management/view-as/:userId.
 *
 * These tests prove the workflow gap is closed:
 *   - Clicking the CTA with a selected client navigates to the correct
 *     canonical URL (regression guard against the CTA pointing at
 *     /dashboard/people/view-as/:userId, the dead path).
 *   - The CTA is not rendered when no client is selected (matches the
 *     gating pattern of the adjacent "Log Workout" button and prevents
 *     navigation to /view-as/undefined).
 */
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted keeps the mock objects stable across renders. Without this,
// each useAuth() call returns a fresh object, which makes the `authAxios`
// reference change on every render, which re-fires ClientsWorkspace's
// effect at line 274 (deps: [authAxios]), which calls setState, which
// triggers another render — classic infinite loop. Hoisting fixes it
// because useAuth returns the SAME reference every time.
const { mockNavigate, mockAuthAxios, mockUser } = vi.hoisted(() => {
  const mockAuthAxiosGet = vi.fn();
  return {
    mockNavigate: vi.fn(),
    mockAuthAxios: { get: mockAuthAxiosGet },
    mockUser: { id: 1, role: 'admin' as const },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mockAuthAxios,
    user: mockUser,
  }),
}));

// Convenience alias for test-body access
const mockAuthAxiosGet = mockAuthAxios.get as ReturnType<typeof vi.fn>;

// Tab content components trigger heavy imports in JSDOM; stub them so the
// CTA render path stays focused on the top bar.
vi.mock('./clients-team/tabs/TrainingTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/ProgressTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/BiometricsTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/OverviewTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/SettingsTabContent', () => ({ default: () => null }));
vi.mock('./clients-team', async () => {
  const actual = await vi.importActual<any>('./clients-team');
  return {
    ...actual,
    ClientDetailView: ({ activeTab }: any) => (
      <div data-testid="mock-client-detail-tab">{activeTab}</div>
    ),
  };
});

import ClientsWorkspace from './ClientsWorkspace';

// Synthetic fixture id chosen to keep production PII out of commit-bound
// files (rule 44). 424242 has no resemblance to any real client id.
const FIXTURE_CLIENT_ID = 424242;

const CLIENTS_RESPONSE = {
  data: {
    success: true,
    data: {
      clients: [
        {
          id: FIXTURE_CLIENT_ID,
          firstName: 'Fixture',
          lastName: 'Client',
          email: 'fixture.client@example.test',
          clientSource: 'swanstudios',
          isActive: true,
          totalWorkouts: 7,
          availableSessions: 12,
        },
      ],
    },
  },
};

const renderWorkspace = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ClientsWorkspace />
    </MemoryRouter>
  );

describe('ClientsWorkspace — Phase 18.C.1B.1R "View As" CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients') return Promise.resolve(CLIENTS_RESPONSE);
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('navigates to canonical /dashboard/admin/client-management/view-as/:userId when clicked with a selected client', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    // Auto-selects fixture client from URL param (ClientsWorkspace.tsx
    // auto-select branch). Button accessible name comes from text content
    // ("View As"), not the title attribute (which becomes the tooltip).
    // The Eye icon is decorative.
    const viewAsBtn = await screen.findByRole('button', { name: /^view as$/i });

    await user.click(viewAsBtn);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      `/dashboard/admin/client-management/view-as/${FIXTURE_CLIENT_ID}`
    );

    // Regression guard: the click must NOT navigate to the dead legacy path
    // that Phase 19 cleanup unmounted.
    const navCalls = mockNavigate.mock.calls.map((args) => args[0] as string);
    expect(navCalls.some((u) => u.startsWith('/dashboard/people/'))).toBe(false);
  });

  it('renders the daily training cockpit actions for the selected client', async () => {
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    expect(await screen.findByText(/daily training flow/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^log today$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^plan next$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^progress$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^dictate \/ ai$/i })).toBeInTheDocument();
  });

  it('jumps the selected-client detail panel to Progress from the daily cockpit', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    expect(await screen.findByTestId('mock-client-detail-tab')).toHaveTextContent('training');

    await user.click(screen.getByRole('button', { name: /^progress$/i }));

    expect(screen.getByTestId('mock-client-detail-tab')).toHaveTextContent('progress');
  });

  it('opens the workout planner with the selected client preloaded', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    const planNextBtn = await screen.findByRole('button', { name: /^plan next$/i });
    await user.click(planNextBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      `/dashboard/admin/workout-planner?clientId=${FIXTURE_CLIENT_ID}`
    );
  });

  it('opens Swan Coach with selected-client daily logging context', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    const dictateBtn = await screen.findByRole('button', { name: /^dictate \/ ai$/i });
    await user.click(dictateBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      `/dashboard/admin/coach-assistant?clientId=${FIXTURE_CLIENT_ID}&intent=log_workout&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D${FIXTURE_CLIENT_ID}`
    );
  });

  it('turns admin overview log-workout intent plus one client click into the logger route', async () => {
    const user = userEvent.setup();
    renderWorkspace('/dashboard/admin/client-management?intent=log_workout');

    const clientCard = await screen.findByRole('button', { name: /open fixture client/i });
    await user.click(clientCard);

    expect(mockNavigate).toHaveBeenCalledWith(
      `/dashboard/admin/log-workout?clientId=${FIXTURE_CLIENT_ID}`
    );
  });

  it('does not render the View As button when no client is selected', async () => {
    renderWorkspace('/dashboard/admin/client-management');

    // Wait for the client fetch to resolve so the "no client selected"
    // state is stable, not a pre-fetch render.
    await screen.findByText(/client.*hub/i).catch(() => {
      // ClientHeaderCard / heading may differ; fall back to polling for
      // absence directly. Either approach is fine — the absence assertion
      // below is the authoritative check.
    });

    // The CTA is gated on `selectedClient && ...`. With no ?clientId in the
    // URL, selectedClient stays null and the button must not render.
    const maybeBtn = screen.queryByRole('button', { name: /^view as$/i });
    expect(maybeBtn).toBeNull();
  });
});
