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
