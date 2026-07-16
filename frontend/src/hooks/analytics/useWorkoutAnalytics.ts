/**
 * ============================================================================
 * FILE: useWorkoutAnalytics.ts
 * PURPOSE: Data hook for workout analytics — connects Victory charts to real data
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches aggregated workout data from the analytics API
 * for a specific user. Returns typed data ready for Victory chart components.
 *
 * HOW IT FITS: EnhancedWorkoutsModal → useWorkoutAnalytics → /api/analytics/:userId/*
 *
 * KEY DECISIONS: Uses multiple parallel API calls with Promise.allSettled for
 * resilience — individual chart failures don't block the whole modal.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  buildAnalyticsData,
  buildPersonalRecordsFromApi,
  buildWeeklyVolumeFromApi,
  derivePersonalRecordsFromSessions,
  deriveWeeklyVolumeFromSessions,
  mapWorkoutSessions,
  withEstimatedOneRepMaxes,
} from './workoutAnalyticsData';
import { WORKOUT_ANALYTICS_DEFAULT_LIMIT } from './useWorkoutAnalytics.types';
import type { AnalyticsData, UseWorkoutAnalyticsReturn, WorkoutSession } from './useWorkoutAnalytics.types';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export type {
  AnalyticsData,
  PersonalRecord,
  WorkoutLogEntry,
  WorkoutSession,
} from './useWorkoutAnalytics.types';

type AuthAxiosClient = {
  get: (url: string, config?: any) => Promise<any>;
};

const POSITIVE_INTEGER_TEXT = /^[1-9]\d*$/;

const parseSafePositiveInteger = (value: number | null): number | null => (
  value !== null && Number.isSafeInteger(value) && value > 0 ? value : null
);

const parsePositiveIntegerText = (value: string): number | null => {
  const trimmed = value.trim();
  return POSITIVE_INTEGER_TEXT.test(trimmed) ? Number(trimmed) : null;
};

const getNumericAnalyticsUserId = (userId: number | string | null): number | null => {
  if (userId === null) return null;
  const parsed = typeof userId === 'number' ? userId : parsePositiveIntegerText(userId);
  return parseSafePositiveInteger(parsed);
};

const fetchAnalyticsResources = (
  authAxios: AuthAxiosClient,
  analyticsUserId: string,
) => Promise.allSettled([
  authAxios.get(`/api/admin/clients/${analyticsUserId}/workouts`, {
    params: { limit: WORKOUT_ANALYTICS_DEFAULT_LIMIT, offset: 0 }
  }),
  authAxios.get(`/api/analytics/${analyticsUserId}/volume-progression`, {
    params: { groupBy: 'week' }
  }),
  authAxios.get(`/api/analytics/${analyticsUserId}/personal-records`),
]);

const sessionsFromResponse = (workoutsRes: PromiseSettledResult<any>): WorkoutSession[] => (
  workoutsRes.status === 'fulfilled' && workoutsRes.value.data?.success
    ? mapWorkoutSessions(workoutsRes.value.data.workouts)
    : []
);

const weeklyVolumeFor = (
  volumeRes: PromiseSettledResult<any>,
  sessions: WorkoutSession[],
) => {
  const apiWeeklyVolume = buildWeeklyVolumeFromApi(volumeRes);
  return apiWeeklyVolume.length > 0 ? apiWeeklyVolume : deriveWeeklyVolumeFromSessions(sessions);
};

const personalRecordsFor = (
  prsRes: PromiseSettledResult<any>,
  sessions: WorkoutSession[],
) => {
  const apiPersonalRecords = buildPersonalRecordsFromApi(prsRes);
  return withEstimatedOneRepMaxes(
    apiPersonalRecords.length > 0
      ? apiPersonalRecords
      : derivePersonalRecordsFromSessions(sessions),
  );
};

const loadWorkoutAnalyticsData = async (
  authAxios: AuthAxiosClient,
  analyticsUserId: string,
): Promise<AnalyticsData> => {
  const [workoutsRes, volumeRes, prsRes] = await fetchAnalyticsResources(authAxios, analyticsUserId);
  const sessions = sessionsFromResponse(workoutsRes);

  return buildAnalyticsData(
    sessions,
    weeklyVolumeFor(volumeRes, sessions),
    personalRecordsFor(prsRes, sessions),
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useWorkoutAnalytics(userId: number | string | null): UseWorkoutAnalyticsReturn {
  const { authAxios } = useAuth();
  const numericUserId = useMemo(() => getNumericAnalyticsUserId(userId), [userId]);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fallow-ignore-next-line complexity
  const fetchAnalytics = useCallback(async () => {
    if (!authAxios || userId === null) return;
    if (numericUserId === null) {
      setData(null);
      setIsLoading(false);
      setError('Select a valid client before loading workout analytics.');
      return;
    }

    const analyticsUserId = String(numericUserId);

    setIsLoading(true);
    setError(null);

    try {
      setData(await loadWorkoutAnalyticsData(authAxios, analyticsUserId));
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, numericUserId, userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return useMemo(() => ({
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  }), [data, isLoading, error, fetchAnalytics]);
}
