import { useQuery } from '@tanstack/react-query';

export interface ProgressGoal {
  name: string;
  target: number | null;
  current: number | null;
  unit?: string;
}

export interface ProgressMeasurement {
  date: string;
  weight: number | null;
  bodyFat?: number | null;
}

export interface ClientProgressSummary {
  currentWeight: number | null;
  startingWeight: number | null;
  weightChange: number | null;
  nasmScore: number | null;
  sessionsCompleted: number;
  lastSessionDate: string | null;
  goals: ProgressGoal[];
  recentMeasurements: ProgressMeasurement[];
}

const fetchClientProgress = async (userId: number): Promise<ClientProgressSummary> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Missing auth token');
  }

  const response = await fetch(`/api/client/${userId}/progress`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || 'Failed to fetch client progress');
  }

  return result?.data;
};

/**
 * @param userId - The user ID to fetch progress for
 * @param isClient - Optional flag to indicate if the target user is a client.
 *                   If explicitly false, skips API call (prevents 404 for non-client users).
 */
export const useClientProgress = (userId?: number, isClient?: boolean) => {
  return useQuery({
    queryKey: ['clientProgress', userId],
    queryFn: () => fetchClientProgress(userId as number),
    // Only fetch if userId is valid and user is not explicitly marked as non-client
    enabled: Number.isFinite(userId) && isClient !== false
  });
};
