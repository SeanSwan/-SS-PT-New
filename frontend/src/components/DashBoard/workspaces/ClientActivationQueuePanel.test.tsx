import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientActivationQueuePanel from './ClientActivationQueuePanel';

describe('ClientActivationQueuePanel', () => {
  it('uses fallback client identity when paid activation rows have blank names', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            queue: [
              {
                cartId: 7,
                sessionId: 'cs_test_blank_identity',
                client: {
                  id: 424242,
                  firstName: '',
                  lastName: '',
                  email: 'fallback.client@example.test',
                  isActive: true,
                  availableSessions: 3,
                },
                cart: {
                  id: 7,
                  status: 'completed',
                  paymentStatus: 'paid',
                  sessionsGranted: true,
                  total: 300,
                  completedAt: '2026-05-20T11:00:00.000Z',
                  updatedAt: '2026-05-20T12:00:00.000Z',
                },
                activation: {
                  paid: true,
                  accountLinked: true,
                  waiverComplete: true,
                  onboardingComplete: true,
                  sessionCreditsAllocated: true,
                  orderRecorded: true,
                  sessionsAvailable: 3,
                  scheduledSessionCount: 0,
                  forcePasswordChange: false,
                  nextStep: 'schedule_first_session',
                  nextRoute: '/dashboard/client/overview',
                  nextAction: 'Schedule first session',
                },
                nextSession: null,
                updatedAt: '2026-05-20T12:00:00.000Z',
              },
            ],
            summary: {
              total: 1,
              needsWaiver: 0,
              needsOnboarding: 0,
              awaitingSessionAllocation: 0,
              readyToSchedule: 1,
              byNextStep: { schedule_first_session: 1 },
            },
          },
        },
      }),
    };

    render(
      <ClientActivationQueuePanel
        authAxios={authAxios}
        onSelectClient={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('fallback.client@example.test')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', {
      name: /focus fallback.client@example.test/i,
    })).toHaveAttribute('type', 'button');

    const mobileToggle = document.querySelector('[data-swan-activation-queue-mobile-toggle]');
    expect(mobileToggle).toHaveTextContent(/show 1 queued/i);
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(mobileToggle as Element);

    expect(mobileToggle).toHaveTextContent(/hide queue/i);
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('navigates complete onboarding rows to the Coach onboarding Workbench', async () => {
    const onNavigate = vi.fn();
    const authAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            queue: [
              {
                cartId: 9,
                sessionId: 'cs_test_onboarding_handoff',
                client: {
                  id: 3,
                  firstName: 'Ava',
                  lastName: 'Client',
                  email: 'ava.client@example.test',
                  isActive: true,
                  availableSessions: 10,
                },
                cart: {
                  id: 9,
                  status: 'completed',
                  paymentStatus: 'paid',
                  sessionsGranted: true,
                  total: 500,
                  completedAt: '2026-05-20T11:00:00.000Z',
                  updatedAt: '2026-05-20T12:00:00.000Z',
                },
                activation: {
                  paid: true,
                  accountLinked: true,
                  waiverComplete: true,
                  onboardingComplete: false,
                  sessionCreditsAllocated: true,
                  orderRecorded: true,
                  sessionsAvailable: 10,
                  scheduledSessionCount: 0,
                  forcePasswordChange: false,
                  nextStep: 'complete_onboarding',
                  nextRoute: '/dashboard/client/overview',
                  nextAction: 'Complete onboarding',
                },
                nextSession: null,
                updatedAt: '2026-05-20T12:00:00.000Z',
              },
            ],
            summary: {
              total: 1,
              needsWaiver: 0,
              needsOnboarding: 1,
              awaitingSessionAllocation: 0,
              readyToSchedule: 0,
              byNextStep: { complete_onboarding: 1 },
            },
          },
        },
      }),
    };

    render(
      <ClientActivationQueuePanel
        authAxios={authAxios}
        onSelectClient={vi.fn()}
        onNavigate={onNavigate}
      />
    );

    const cta = await screen.findByRole('button', { name: /complete onboarding for ava client/i });
    fireEvent.click(cta);

    expect(onNavigate).toHaveBeenCalledWith(
      '/dashboard/admin/coach-assistant?clientId=3&source=clients-team&workspace=onboarding&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D3&intent=client_profile_coverage_update',
    );
  });
  it('does not expose focus or navigation actions for malformed activation client ids', async () => {
    const onSelectClient = vi.fn();
    const onNavigate = vi.fn();
    const authAxios = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            queue: [
              {
                cartId: 7,
                sessionId: 'cs_test_bad_identity',
                client: {
                  id: '424242junk',
                  firstName: 'Bad',
                  lastName: 'Identifier',
                  email: 'bad.identifier@example.test',
                  isActive: true,
                  availableSessions: 3,
                },
                cart: {
                  id: 7,
                  status: 'completed',
                  paymentStatus: 'paid',
                  sessionsGranted: true,
                  total: 300,
                  completedAt: '2026-05-20T11:00:00.000Z',
                  updatedAt: '2026-05-20T12:00:00.000Z',
                },
                activation: {
                  paid: true,
                  accountLinked: true,
                  waiverComplete: true,
                  onboardingComplete: true,
                  sessionCreditsAllocated: true,
                  orderRecorded: true,
                  sessionsAvailable: 3,
                  scheduledSessionCount: 0,
                  forcePasswordChange: false,
                  nextStep: 'schedule_first_session',
                  nextRoute: '/dashboard/client/overview',
                  nextAction: 'Schedule first session',
                },
                nextSession: null,
                updatedAt: '2026-05-20T12:00:00.000Z',
              },
            ],
            summary: {
              total: 1,
              needsWaiver: 0,
              needsOnboarding: 0,
              awaitingSessionAllocation: 0,
              readyToSchedule: 1,
              byNextStep: { schedule_first_session: 1 },
            },
          },
        },
      }),
    };

    render(
      <ClientActivationQueuePanel
        authAxios={authAxios}
        onSelectClient={onSelectClient}
        onNavigate={onNavigate}
      />
    );

    const focusButton = await screen.findByRole('button', { name: /focus bad identifier/i });
    const routeButton = screen.getByRole('button', { name: /activation route unavailable for bad identifier/i });

    expect(focusButton).toBeDisabled();
    expect(routeButton).toBeDisabled();

    fireEvent.click(focusButton);
    fireEvent.click(routeButton);

    expect(onSelectClient).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
