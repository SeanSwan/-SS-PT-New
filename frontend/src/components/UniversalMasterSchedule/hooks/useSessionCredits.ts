import { useQuery } from '@tanstack/react-query';
import apiService from '../../../services/api.service';
import { useAuth } from '../../../context/AuthContext';

export interface SessionCredits {
  sessionsRemaining: number;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external' | string | null;
  packageName?: string | null;
  expiresAt?: string | null;
}

type RawSessionCredits = Partial<Omit<SessionCredits, 'sessionsRemaining'>> & {
  sessionsRemaining?: number | string | null;
};

export const normalizeSessionCreditsPayload = (payload?: RawSessionCredits | null): SessionCredits => {
  const raw = payload?.sessionsRemaining;
  const count = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  if (!payload || Array.isArray(payload) || !Number.isSafeInteger(count) || count < 0 ||
      [payload.clientSource, payload.packageName, payload.expiresAt].some(value => value != null && typeof value !== 'string')) {
    throw new Error('Session balance could not be verified');
  }
  return { sessionsRemaining: count, clientSource: payload.clientSource ?? null, packageName: payload.packageName ?? null, expiresAt: payload.expiresAt ?? null };
};

const fetchSessionCredits = async (signal: AbortSignal): Promise<SessionCredits> => {
  const response = await apiService.get('/api/user/credits', { signal });
  const result = response.data;

  if (result?.success === false) {
    throw new Error(result?.message || 'Failed to fetch session credits');
  }

  return normalizeSessionCreditsPayload(result?.data);
};

export const useSessionCredits = (enabled = true) => {
  const { user } = useAuth();
  const owner = user?.id == null ? null : String(user.id).trim() || null;
  return useQuery({
    queryKey: ['sessionCredits', owner],
    queryFn: ({ signal }) => fetchSessionCredits(signal),
    enabled: enabled && !!owner,
  });
};
