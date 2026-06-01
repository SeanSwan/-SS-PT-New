import { useQuery } from '@tanstack/react-query';
import apiService from '../../../services/api.service';
import { normalizeAvailableSessions } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';

export interface SessionCredits {
  sessionsRemaining: number;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external' | string | null;
  packageName?: string | null;
  expiresAt?: string | null;
}

type RawSessionCredits = Partial<Omit<SessionCredits, 'sessionsRemaining'>> & {
  sessionsRemaining?: number | string | null;
};

export const normalizeSessionCreditsPayload = (payload?: RawSessionCredits | null): SessionCredits => ({
  sessionsRemaining: normalizeAvailableSessions(payload?.sessionsRemaining),
  clientSource: payload?.clientSource ?? null,
  packageName: payload?.packageName ?? null,
  expiresAt: payload?.expiresAt ?? null,
});

const fetchSessionCredits = async (): Promise<SessionCredits> => {
  const response = await apiService.get('/api/user/credits');
  const result = response.data;

  if (result?.success === false) {
    throw new Error(result?.message || 'Failed to fetch session credits');
  }

  return normalizeSessionCreditsPayload(result?.data);
};

export const useSessionCredits = (enabled = true) => {
  return useQuery({
    queryKey: ['sessionCredits'],
    queryFn: fetchSessionCredits,
    enabled
  });
};
