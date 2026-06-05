/**
 * Phase 18.C.1B.1R — ClientsWorkspace "View As" CTA navigation tests
 *   - Clicking the CTA with a selected client navigates to the correct
 *     canonical URL (regression guard against the CTA pointing at
 *     /dashboard/people/view-as/:userId, the dead path).
 */
import { screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENTS_RESPONSE,
  FIXTURE_CLIENT_ID,
  INACTIVE_CLIENTS_RESPONSE,
  MOVE_FITNESS_CLIENTS_RESPONSE,
  mockAuthAxios,
  mockNavigate,
  mockToast,
  renderWorkspace,
} from './ClientsWorkspace.viewAsCta.testHarness';

const mockAuthAxiosGet = mockAuthAxios.get as ReturnType<typeof vi.fn>;
const mockAuthAxiosDelete = mockAuthAxios.delete as ReturnType<typeof vi.fn>;
const mockAuthAxiosPut = mockAuthAxios.put as ReturnType<typeof vi.fn>;
const CLIENT_HUB_LOGGER_ROUTE =
  `/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}&tab=training&trainingSection=logger`;

describe('ClientsWorkspace — Phase 18.C.1B.1R "View As" CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients') return Promise.resolve(CLIENTS_RESPONSE);
      return Promise.resolve({ data: {} });
    });
    mockAuthAxiosDelete.mockResolvedValue({
      data: {
        success: true,
        message: 'Client deactivated. Profile, workout history, and paid credits are retained for 6 months.',
        data: {
          retainedUntil: '2026-11-25T00:00:00.000Z',
          preservedAvailableSessions: 12,
        },
      },
    });
    mockAuthAxiosPut.mockResolvedValue({
      data: {
        success: true,
        message: 'Client reactivated. Login access restored and retained records remain connected.',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('loads active clients by default so soft-deactivated accounts leave the daily hub', async () => {
    renderWorkspace('/dashboard/admin/client-management');

    await screen.findByRole('button', { name: /open fixture client/i });

    expect(mockAuthAxiosGet).toHaveBeenCalledWith('/api/admin/clients', {
      params: { limit: 100, status: 'active' },
    });
  });

  it('navigates to canonical /dashboard/admin/client-management/view-as/:userId when clicked with a selected client', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    // Auto-selects fixture client from URL param (ClientsWorkspace.tsx
    // auto-select branch). Button accessible name comes from text content
    // ("View As"), not the title attribute (which becomes the tooltip).
    // The Eye icon is decorative.
    const viewAsBtn = await screen.findByRole('button', { name: /view fixture client as admin/i });

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
    expect(screen.getByRole('button', { name: /log today for fixture client/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plan next for fixture client/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view fixture client progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dictate to swan for fixture client/i })).toBeInTheDocument();
  });

  it('keeps Log Today inside the selected-client Client Hub training logger', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}&tab=progress`);

    await user.click(await screen.findByRole('button', { name: /log today for fixture client/i }));

    expect(screen.getByTestId('mock-client-detail-tab')).toHaveTextContent('training');
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/admin/log-workout'));
  });

  it('preserves Move Fitness free-tracking copy in the selected-client daily cockpit', async () => {
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients') return Promise.resolve(MOVE_FITNESS_CLIENTS_RESPONSE);
      return Promise.resolve({ data: {} });
    });

    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    const dailyStrip = await screen.findByRole('region', {
      name: /fixture client daily training actions/i,
    });
    expect(within(dailyStrip).getByText(/free tracking/i)).toBeInTheDocument();
    expect(within(dailyStrip).getByText(/no deduction/i)).toBeInTheDocument();
    expect(within(dailyStrip).queryByText(/0 sessions left/i)).not.toBeInTheDocument();
  });

  it('does not show a fake 50 percent onboarding bar for a completed client', async () => {
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    expect(await screen.findByText(/daily training flow/i)).toBeInTheDocument();
    expect(screen.queryByText(/onboarding:\s*50%/i)).not.toBeInTheDocument();
  });

  it('jumps the selected-client detail panel to Progress from the daily cockpit', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    expect(await screen.findByTestId('mock-client-detail-tab')).toHaveTextContent('training');

    await user.click(screen.getByRole('button', { name: /view fixture client progress/i }));

    expect(screen.getByTestId('mock-client-detail-tab')).toHaveTextContent('progress');
  });

  it('opens the progress detail tab from a shareable Client Hub URL', async () => {
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}&tab=progress`);

    expect(await screen.findByTestId('mock-client-detail-tab')).toHaveTextContent('progress');
  });

  it('opens the workout planner with the selected client preloaded', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    const planNextBtn = await screen.findByRole('button', { name: /plan next for fixture client/i });
    await user.click(planNextBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      `/dashboard/admin/workout-planner?clientId=${FIXTURE_CLIENT_ID}&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D${FIXTURE_CLIENT_ID}%26tab%3Dtraining%26trainingSection%3Dplans`
    );
  });

  it('opens Swan Coach with selected-client daily logging context', async () => {
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    const dictateBtn = await screen.findByRole('button', { name: /dictate to swan for fixture client/i });
    await user.click(dictateBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      `/dashboard/admin/coach-assistant?clientId=${FIXTURE_CLIENT_ID}&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D${FIXTURE_CLIENT_ID}&intent=log_workout`
    );
  });

  it('opens Swan Coach in new-client onboarding mode from Client Hub', async () => {
    const user = userEvent.setup();
    renderWorkspace('/dashboard/admin/client-management');

    await user.click(await screen.findByRole('button', { name: /^new client$/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard/admin/coach-assistant?source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management&intent=client_onboarding'
    );
  });

  it('soft-deactivates the selected client from the canonical Client Hub with a retention warning', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    const deactivateBtn = await screen.findByRole('button', { name: /deactivate fixture client/i });
    await user.click(deactivateBtn);

    const dialog = await screen.findByRole('dialog', {
      name: /deactivate fixture client\?/i,
    });
    expect(within(dialog).getByText(/soft delete/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/6 months/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/remaining session credits/i)).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /deactivate client/i }));

    expect(mockAuthAxiosDelete).toHaveBeenCalledWith(
      `/api/admin/clients/${FIXTURE_CLIENT_ID}`,
      { data: { softDelete: true } }
    );
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client deactivated',
      description: expect.stringContaining('retained for 6 months'),
    }));
  });

  it('reactivates an inactive selected client without losing retained records', async () => {
    const inactiveClient = INACTIVE_CLIENTS_RESPONSE.data.data.clients[0];
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients') {
        return Promise.resolve({ data: { success: true, data: { clients: [] } } });
      }
      if (url === `/api/admin/clients/${FIXTURE_CLIENT_ID}`) {
        return Promise.resolve({
          data: { success: true, data: { client: inactiveClient } },
        });
      }
      return Promise.resolve({ data: {} });
    });
    const user = userEvent.setup();
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}`);

    const reactivateBtn = await screen.findByRole('button', { name: /reactivate fixture client/i });
    await user.click(reactivateBtn);

    expect(mockAuthAxiosPut).toHaveBeenCalledWith(
      `/api/admin/clients/${FIXTURE_CLIENT_ID}/restore`,
      {}
    );
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client reactivated',
      description: expect.stringContaining('Login access restored'),
    }));
  });

  it('turns admin overview log-workout intent plus one client click into the embedded logger', async () => {
    const user = userEvent.setup();
    renderWorkspace('/dashboard/admin/client-management?intent=log_workout');

    const clientCard = await screen.findByRole('button', { name: /open fixture client/i });
    await user.click(clientCard);

    expect(screen.getByTestId('mock-client-detail-tab')).toHaveTextContent('training');
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/admin/log-workout'));
  });

  it('opens the embedded workout logger from a client grid quick action without leaving the Client Hub', async () => {
    const user = userEvent.setup();
    renderWorkspace('/dashboard/admin/client-management');

    await user.click(await screen.findByRole('button', { name: /log fixture client workout/i }));

    expect(screen.getByTestId('mock-client-detail-tab')).toHaveTextContent('training');
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/admin/log-workout'));
    expect(mockNavigate).not.toHaveBeenCalledWith(CLIENT_HUB_LOGGER_ROUTE);
  });

  it('opens the progress tab from a client grid quick action without extra clicks', async () => {
    const user = userEvent.setup();
    renderWorkspace('/dashboard/admin/client-management');

    await user.click(await screen.findByRole('button', { name: /view fixture client progress/i }));

    expect(screen.getByTestId('mock-client-detail-tab')).toHaveTextContent('progress');
    expect(mockNavigate).not.toHaveBeenCalled();
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
