/**
 * FILE: coachCommandClientService.ts
 * PURPOSE: Command Center client capture service for minimal, review-gated client stubs.
 *
 * The service reuses the existing transactional onboarding endpoint. It does not
 * create workout logs, approve PLAUD merges, or perform any AI-driven final write.
 */

import { authAxiosInstance } from '../utils/axiosConfig';

export type CoachCommandClientSource = 'move_fitness' | 'swanstudios';

export type QuickCoachClientRequest = {
  fullName: string;
  clientSource: CoachCommandClientSource;
};

export type QuickCoachClientResponse = {
  client: {
    id: number | string;
    firstName?: string;
    lastName?: string;
    clientSource?: CoachCommandClientSource | string;
  };
  claimCode?: string | null;
  claimUrl?: string | null;
  isMoveFitness?: boolean;
};

type CoachCommandApiClient = {
  post<T = any>(url: string, data?: any): Promise<{ data: T }>;
};

const QUICK_CAPTURE_NOTE =
  'Created from Coach Command Center quick capture. Operator approval still required before workout writes.';

export function splitCoachCommandClientName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    throw new Error('Client name is required');
  }

  const [firstName, ...rest] = parts;
  return {
    firstName,
    lastName: rest.length ? rest.join(' ') : 'TBD',
  };
}

export function createCoachCommandClientService(api: CoachCommandApiClient = authAxiosInstance) {
  return {
    async createQuickClient(request: QuickCoachClientRequest): Promise<QuickCoachClientResponse> {
      const { firstName, lastName } = splitCoachCommandClientName(request.fullName);

      try {
        const response = await api.post('/api/clients/onboard', {
          firstName,
          lastName,
          clientSource: request.clientSource,
          assignToSelf: true,
          generateClaimCode: true,
          availableSessions: 0,
          trainerNotes: QUICK_CAPTURE_NOTE,
        });

        return (response.data?.data || response.data) as QuickCoachClientResponse;
      } catch (error: any) {
        const message = error?.response?.data?.message || error?.message || 'Failed to create quick client';
        throw new Error(message);
      }
    },
  };
}

const coachCommandClientService = createCoachCommandClientService();

export const createQuickCoachCommandClient = (request: QuickCoachClientRequest) =>
  coachCommandClientService.createQuickClient(request);
