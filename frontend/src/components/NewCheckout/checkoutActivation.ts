/**
 * checkoutActivation.ts
 * =====================
 * Small client-side adapter for the backend-owned checkout activation status.
 * The backend decides the next required action; this file only maps that
 * contract to a primary CTA on the checkout success page.
 */

export interface CheckoutActivation {
  paid: boolean;
  accountLinked: boolean;
  waiverComplete: boolean;
  onboardingComplete: boolean;
  sessionCreditsAllocated: boolean;
  orderRecorded: boolean;
  sessionsAvailable: number;
  scheduledSessionCount: number;
  forcePasswordChange: boolean;
  nextStep: string;
  nextRoute: string;
  nextAction: string;
}

export interface CheckoutActivationStatus {
  sessionId: string;
  userId: number;
  cart?: {
    id: number;
    status: string | null;
    paymentStatus: string | null;
    sessionsGranted: boolean;
    total: number;
    completedAt: string | null;
    updatedAt: string | null;
  };
  activation: CheckoutActivation;
  nextSession: {
    id: number;
    sessionDate: string | null;
    status: string | null;
    trainerId: number | null;
  } | null;
}

export interface ActivationCta {
  label: string;
  route: string;
}

export interface CheckoutSuccessOrderData {
  sessionId: string;
  amount: number;
  sessionsAdded: number | null;
  alreadyProcessed?: boolean;
  customerName?: string;
  customerEmail?: string;
  orderDate: string;
  items: unknown[];
}

interface ApiClient {
  get: (path: string, config?: { params?: Record<string, string> }) => Promise<{
    data: {
      success?: boolean;
      data?: CheckoutActivationStatus;
      message?: string;
    };
  }>;
}

const FALLBACK_CTA: ActivationCta = {
  label: 'Open Dashboard',
  route: '/dashboard/client/overview',
};

const STEP_LABELS: Record<string, string> = {
  complete_waiver: 'Complete Waiver',
  complete_onboarding: 'Complete Onboarding',
  schedule_first_session: 'Schedule First Session',
  await_session_allocation: 'Open Dashboard',
  dashboard: 'Open Dashboard',
};

export async function fetchCheckoutActivationStatus(
  apiClient: ApiClient,
  sessionId: string,
): Promise<CheckoutActivationStatus> {
  const response = await apiClient.get('/api/v2/payments/activation-status', {
    params: { sessionId },
  });

  if (!response.data?.success || !response.data.data) {
    throw new Error(response.data?.message || 'Activation status unavailable');
  }

  return response.data.data;
}

export function getActivationCta(status: CheckoutActivationStatus | null): ActivationCta {
  const activation = status?.activation;
  if (!activation?.nextRoute) return FALLBACK_CTA;

  return {
    label: STEP_LABELS[activation.nextStep] || 'Continue',
    route: activation.nextRoute,
  };
}

export function buildOrderDataFromActivationStatus(
  status: CheckoutActivationStatus,
  customerEmail?: string,
): CheckoutSuccessOrderData {
  return {
    sessionId: status.sessionId,
    amount: Number(status.cart?.total || 0),
    sessionsAdded: null,
    customerEmail: customerEmail || undefined,
    orderDate: status.cart?.completedAt || status.cart?.updatedAt || new Date().toISOString(),
    items: [],
  };
}
