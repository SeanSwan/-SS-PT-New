import { describe, expect, it, vi } from 'vitest';
import {
  buildOrderDataFromActivationStatus,
  fetchCheckoutActivationStatus,
  getActivationCta,
  type CheckoutActivationStatus,
} from './checkoutActivation';

function makeStatus(nextStep: string, nextRoute: string): CheckoutActivationStatus {
  return {
    sessionId: 'cs_test_activation',
    userId: 3,
    cart: {
      id: 42,
      status: 'completed',
      paymentStatus: 'paid',
      sessionsGranted: true,
      total: 500,
      completedAt: '2026-05-20T12:00:00.000Z',
      updatedAt: '2026-05-20T12:01:00.000Z',
    },
    activation: {
      paid: true,
      accountLinked: true,
      waiverComplete: nextStep !== 'complete_waiver',
      onboardingComplete: !['complete_waiver', 'complete_onboarding'].includes(nextStep),
      sessionCreditsAllocated: true,
      orderRecorded: true,
      sessionsAvailable: 10,
      scheduledSessionCount: 0,
      forcePasswordChange: false,
      nextStep,
      nextRoute,
      nextAction: 'Continue activation',
    },
    nextSession: null,
  };
}

describe('checkout activation adapter', () => {
  it('fetches activation status from the backend-owned resolver', async () => {
    const status = makeStatus('complete_waiver', '/waiver?source=in_app');
    const apiClient = {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: status,
        },
      }),
    };

    await expect(fetchCheckoutActivationStatus(apiClient, 'cs_test_activation')).resolves.toBe(status);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v2/payments/activation-status', {
      params: { sessionId: 'cs_test_activation' },
    });
  });

  it('maps waiver and scheduling statuses to primary CTAs', () => {
    expect(getActivationCta(makeStatus('complete_waiver', '/waiver?source=in_app'))).toEqual({
      label: 'Complete Waiver',
      route: '/waiver?source=in_app',
    });

    expect(getActivationCta(makeStatus('schedule_first_session', '/dashboard/client/schedule'))).toEqual({
      label: 'Schedule First Session',
      route: '/dashboard/client/schedule',
    });

    expect(getActivationCta(makeStatus('complete_onboarding', '/dashboard/client/onboarding'))).toEqual({
      label: 'Complete Onboarding',
      route: '/dashboard/client/onboarding',
    });
  });

  it('falls back to the client dashboard when status is unavailable', () => {
    expect(getActivationCta(null)).toEqual({
      label: 'Open Dashboard',
      route: '/dashboard/client/overview',
    });
  });

  it('builds sparse order details from activation status when Stripe verification is unavailable', () => {
    const status = makeStatus('complete_waiver', '/waiver?source=in_app');

    expect(buildOrderDataFromActivationStatus(status, 'client@example.com')).toEqual({
      sessionId: 'cs_test_activation',
      amount: 500,
      sessionsAdded: null,
      customerEmail: 'client@example.com',
      orderDate: '2026-05-20T12:00:00.000Z',
      items: [],
    });
  });
});
