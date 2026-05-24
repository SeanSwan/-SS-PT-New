import { useQuery } from '@tanstack/react-query';
import apiService from '../../../services/api.service';

export interface SessionCredits {
  sessionsRemaining: number;
  packageName?: string | null;
  expiresAt?: string | null;
}

const fetchSessionCredits = async (): Promise<SessionCredits> => {
  const response = await apiService.get('/api/user/credits');
  const result = response.data;

  if (result?.success === false) {
    throw new Error(result?.message || 'Failed to fetch session credits');
  }

  return result?.data || {
    sessionsRemaining: 0,
    packageName: null,
    expiresAt: null
  };
};

export const useSessionCredits = (enabled = true) => {
  return useQuery({
    queryKey: ['sessionCredits'],
    queryFn: fetchSessionCredits,
    enabled
  });
};
