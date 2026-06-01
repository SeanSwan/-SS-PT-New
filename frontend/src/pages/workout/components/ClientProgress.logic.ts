import type { ClientProgressData, WorkoutStatistics } from '../types/progress.types';

interface ApiErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
}

type UserId = number | string | null | undefined;

const isStaffRole = (role?: string | null): boolean => (
  role === 'admin' || role === 'trainer'
);

const isSelectedStaffClient = (
  targetUserId: UserId,
  userRole?: string | null,
  currentUserId?: UserId
): boolean => (
  Boolean(targetUserId)
  && isStaffRole(userRole)
  && String(targetUserId) !== String(currentUserId ?? '')
);

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const apiError = error as ApiErrorLike;

  return apiError.response?.data?.message
    ?? (error instanceof Error ? error.message : fallback);
};

export const getProgressDateRange = (timeRange: string): { startDate: string; endDate: string } => {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];

  if (timeRange === 'all') {
    return { startDate: '', endDate };
  }

  const start = new Date(now);

  if (timeRange === '7days') {
    start.setDate(now.getDate() - 7);
  } else if (timeRange === '90days') {
    start.setDate(now.getDate() - 90);
  } else if (timeRange === 'year') {
    start.setFullYear(now.getFullYear() - 1);
  } else {
    start.setDate(now.getDate() - 30);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate,
  };
};

export const getClientProgressUrl = (
  targetUserId: UserId,
  userRole?: string | null,
  currentUserId?: UserId
): string => {
  if (isSelectedStaffClient(targetUserId, userRole, currentUserId)) {
    return `/api/client-progress/${targetUserId}`;
  }

  return '/api/client-progress';
};

export const getWorkoutStatisticsUrl = (
  targetUserId: UserId,
  userRole?: string | null,
  currentUserId?: UserId
): string => {
  if (isSelectedStaffClient(targetUserId, userRole, currentUserId)) {
    return `/api/workout/statistics/${targetUserId}`;
  }

  return '/api/workout/statistics';
};

export const extractClientProgress = (payload: any): ClientProgressData | null => (
  payload?.progress ?? payload?.data?.progress ?? null
);

export const extractWorkoutStatistics = (payload: any): WorkoutStatistics | null => (
  payload?.data?.statistics ?? payload?.statistics ?? null
);

export const getTopExercises = (statistics: WorkoutStatistics | null) => {
  if (!statistics?.exerciseBreakdown) return [];

  return [...statistics.exerciseBreakdown]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};
