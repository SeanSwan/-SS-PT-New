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

export const useClientProgress = (userId?: number) => {
  return useQuery({
    queryKey: ['clientProgress', userId],
    queryFn: () => fetchClientProgress(userId as number),
    enabled: Number.isFinite(userId)
  });
};
