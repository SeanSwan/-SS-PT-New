/**
 * clientActivationQueue.ts
 * ========================
 * Frontend adapter for Sean's admin paid-client activation queue.
 * The backend owns status truth; this file only fetches the queue and maps
 * canonical next steps to existing admin routes.
 */

import { normalizeClientOptionId } from './clients-team/clientOptionMappers';

export interface ClientActivationState {
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

export interface ClientActivationQueueRow {
  cartId: number;
  sessionId: string;
  client: {
    id: number | string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    availableSessions: number;
  };
  cart: {
    id: number;
    status: string | null;
    paymentStatus: string | null;
    sessionsGranted: boolean;
    total: number;
    completedAt: string | null;
    updatedAt: string | null;
  };
  activation: ClientActivationState;
  nextSession: {
    id: number;
    sessionDate: string | null;
    status: string | null;
    trainerId: number | null;
  } | null;
  updatedAt: string | null;
}

export interface ClientActivationQueueSummary {
  total: number;
  needsWaiver: number;
  needsOnboarding: number;
  awaitingSessionAllocation: number;
  readyToSchedule: number;
  byNextStep: Record<string, number>;
}

export interface ClientActivationQueueResponse {
  queue: ClientActivationQueueRow[];
  summary: ClientActivationQueueSummary;
}

interface AuthAxios {
  get: (path: string, config?: { params?: Record<string, string | number> }) => Promise<{
    data: {
      success?: boolean;
      data?: ClientActivationQueueResponse;
      message?: string;
    };
  }>;
}

export async function fetchClientActivationQueue(
  authAxios: AuthAxios,
  params: { limit?: number; nextStep?: string } = {},
): Promise<ClientActivationQueueResponse> {
  const response = await authAxios.get('/api/admin/clients/activation-queue', { params });

  if (!response.data?.success || !response.data.data) {
    throw new Error(response.data?.message || 'Client activation queue unavailable');
  }

  return response.data.data;
}

function buildAdminCoachOnboardingRoute(clientId: number): string {
  const returnTo = `/dashboard/admin/client-management?clientId=${clientId}`;
  const params = new URLSearchParams({
    clientId: String(clientId),
    source: 'clients-team',
    returnTo,
    intent: 'client_onboarding',
  });

  return `/dashboard/admin/coach-assistant?${params.toString()}`;
}

export function getAdminActivationCta(row: ClientActivationQueueRow): { label: string; route: string } | null {
  const clientId = normalizeClientOptionId(row.client.id);
  if (!clientId) return null;

  const routes: Record<string, { label: string; route: string }> = {
    complete_waiver: {
      label: 'Review Waiver',
      route: `/dashboard/admin/waivers?clientId=${clientId}`,
    },
    complete_onboarding: {
      label: 'Complete Onboarding',
      route: buildAdminCoachOnboardingRoute(clientId),
    },
    await_session_allocation: {
      label: 'Allocate Sessions',
      route: `/dashboard/admin/session-allocation?clientId=${clientId}`,
    },
    schedule_first_session: {
      label: 'Schedule Session',
      route: `/dashboard/admin/admin-sessions?clientId=${clientId}`,
    },
    dashboard: {
      label: 'View Client',
      route: `/dashboard/admin/client-management/view-as/${clientId}`,
    },
  };

  return routes[row.activation.nextStep] || {
    label: 'Open Client',
    route: `/dashboard/admin/client-management?clientId=${clientId}`,
  };
}
