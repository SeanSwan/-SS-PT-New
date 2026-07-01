import { describe, expect, it, vi } from 'vitest';
import {
  fetchClientActivationQueue,
  getAdminActivationCta,
  type ClientActivationQueueRow,
} from './clientActivationQueue';

function makeRow(nextStep: string, clientId = 3): ClientActivationQueueRow {
  return {
    cartId: 42,
    sessionId: 'cs_test_admin_queue',
    client: {
      id: clientId,
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
      waiverComplete: nextStep !== 'complete_waiver',
      onboardingComplete: !['complete_waiver', 'complete_onboarding'].includes(nextStep),
      sessionCreditsAllocated: nextStep !== 'await_session_allocation',
      orderRecorded: true,
      sessionsAvailable: 10,
      scheduledSessionCount: 0,
      forcePasswordChange: false,
      nextStep,
      nextRoute: '/dashboard/client/overview',
      nextAction: 'Continue activation',
    },
    nextSession: null,
    updatedAt: '2026-05-20T12:00:00.000Z',
  };
}

describe('client activation queue adapter', () => {
  it('fetches the admin activation queue from the canonical backend route', async () => {
    const response = {
      queue: [makeRow('complete_waiver')],
      summary: {
        total: 1,
        needsWaiver: 1,
        needsOnboarding: 0,
        awaitingSessionAllocation: 0,
        readyToSchedule: 0,
        byNextStep: { complete_waiver: 1 },
      },
    };
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: true, data: response } }),
    };

    await expect(fetchClientActivationQueue(authAxios, { limit: 25 })).resolves.toBe(response);
    expect(authAxios.get).toHaveBeenCalledWith('/api/admin/clients/activation-queue', {
      params: { limit: 25 },
    });
  });

  it('maps queue next steps to admin action routes', () => {
    expect(getAdminActivationCta(makeRow('complete_waiver'))).toEqual({
      label: 'Review Waiver',
      route: '/dashboard/admin/waivers?clientId=3',
    });

    expect(getAdminActivationCta(makeRow('complete_onboarding'))).toEqual({
      label: 'Complete Onboarding',
      route: '/dashboard/admin/coach-assistant?clientId=3&source=clients-team&workspace=onboarding&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D3&intent=client_profile_coverage_update',
    });

    expect(getAdminActivationCta(makeRow('await_session_allocation'))).toEqual({
      label: 'Allocate Sessions',
      route: '/dashboard/admin/session-allocation?clientId=3',
    });

    expect(getAdminActivationCta(makeRow('schedule_first_session', 9))).toEqual({
      label: 'Schedule Session',
      route: '/dashboard/admin/admin-sessions?clientId=9',
    });
  });

  it('normalizes activation client ids before building admin action routes', () => {
    expect(getAdminActivationCta(makeRow('complete_waiver', '12' as any))).toEqual({
      label: 'Review Waiver',
      route: '/dashboard/admin/waivers?clientId=12',
    });

    expect(getAdminActivationCta(makeRow('complete_waiver', '12junk' as any))).toBeNull();
    expect(getAdminActivationCta(makeRow('schedule_first_session', 0))).toBeNull();
  });
});
