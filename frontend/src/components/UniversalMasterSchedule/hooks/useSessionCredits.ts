import { useQuery } from '@tanstack/react-query';

export interface SessionCredits {
  sessionsRemaining: number;
  packageName?: string | null;
  expiresAt?: string | null;
}

const fetchSessionCredits = async (): Promise<SessionCredits> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Missing auth token');
  }

  const response = await fetch('/api/user/credits', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
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
