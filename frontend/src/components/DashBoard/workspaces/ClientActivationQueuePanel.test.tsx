import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClientActivationQueuePanel from './ClientActivationQueuePanel';

function makeQueueResponse() {
  return {
    success: true,
    data: {
      queue: [
        {
          cartId: 42,
          sessionId: 'cs_test_queue_panel',
          client: {
            id: 3,
            firstName: 'Ava',
            lastName: 'Client',
            email: 'ava@example.test',
            isActive: true,
            availableSessions: 10,
          },
          cart: {
            id: 42,
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
            onboardingComplete: true,
            sessionCreditsAllocated: true,
            orderRecorded: true,
            sessionsAvailable: 10,
            scheduledSessionCount: 0,
            forcePasswordChange: false,
            nextStep: 'schedule_first_session',
            nextRoute: '/dashboard/client/schedule',
            nextAction: 'Schedule the first session.',
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
  };
}

describe('ClientActivationQueuePanel', () => {
  it('renders paid activation rows and routes admin actions from the queue data', async () => {
    const user = userEvent.setup();
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: makeQueueResponse() }),
    };
    const onSelectClient = vi.fn();
    const onNavigate = vi.fn();

    render(
      <ClientActivationQueuePanel
        authAxios={authAxios}
        onSelectClient={onSelectClient}
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('Ava Client')).toBeInTheDocument();
    expect(screen.getByText(/1 paid clients needing activation review/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /focus client/i }));
    expect(onSelectClient).toHaveBeenCalledWith(expect.objectContaining({
      id: 3,
      firstName: 'Ava',
      email: 'ava@example.test',
      availableSessions: 10,
    }));

    await user.click(screen.getByRole('button', { name: /schedule session/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/admin/admin-sessions?clientId=3');
  });

  it('disables refresh while loading so admins cannot fan out duplicate queue requests', async () => {
    const authAxios = {
      get: vi.fn(() => new Promise(() => {})),
    };

    render(
      <ClientActivationQueuePanel
        authAxios={authAxios}
        onSelectClient={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    const refresh = screen.getByRole('button', { name: /refresh activation queue/i });
    expect(refresh).toBeDisabled();

    await waitFor(() => expect(authAxios.get).toHaveBeenCalledTimes(1));
  });
});
