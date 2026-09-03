/**
 * useClientProgressPanels — the two retryable fetches behind the client progress
 * page's weekly recap and personal-records cards.
 *
 * Extracted from ClientProgressDashboardPage so that page stays under the
 * 300-line cap it is subject to (Rule 4). Behaviour is unchanged by the move.
 *
 * Two things this owns that a caller must not have to remember:
 *  - a retry NONCE per panel, so the button never re-implements the fetch; and
 *  - a per-attempt `isMounted` flag, so a slow earlier attempt cannot resolve
 *    last and overwrite a newer result or resurrect a cleared error. React runs
 *    an effect's cleanup before the next effect body, so bumping the nonce
 *    supersedes the request in flight.
 *
 * @module components/DashBoard/Pages/client-dashboard/useClientProgressPanels
 */
import { useCallback, useEffect, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { getSafeGamificationIdSegment } from '../../../../hooks/gamification/useGamificationData';
import { loadClientWeeklyRecap } from './ClientProgressDashboardPage.recap';
import {
  normalizeClientPersonalRecords,
  type PersonalRecordView,
} from './ClientProgressDashboardPage.records';
import type { WeeklyRecap } from './ClientProgressDashboardPage.metrics';

export interface ClientProgressPanels {
  weeklyRecap: WeeklyRecap | null;
  weeklyRecapSettled: boolean;
  weeklyRecapError: boolean;
  retryWeeklyRecap: () => void;
  personalRecords: PersonalRecordView[];
  personalRecordsError: boolean;
  retryPersonalRecords: () => void;
}

export function useClientProgressPanels(
  authAxios: AxiosInstance | null | undefined,
  userId: string | number | null | undefined,
): ClientProgressPanels {
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [weeklyRecapSettled, setWeeklyRecapSettled] = useState(false);
  const [weeklyRecapError, setWeeklyRecapError] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecordView[]>([]);
  const [personalRecordsError, setPersonalRecordsError] = useState(false);

  const [weeklyRecapAttempt, setWeeklyRecapAttempt] = useState(0);
  const [personalRecordsAttempt, setPersonalRecordsAttempt] = useState(0);
  const retryWeeklyRecap = useCallback(() => setWeeklyRecapAttempt((n) => n + 1), []);
  const retryPersonalRecords = useCallback(() => setPersonalRecordsAttempt((n) => n + 1), []);

  useEffect(() => {
    let isMounted = true;
    const cleanup = () => { isMounted = false; };
    setWeeklyRecapSettled(false);
    setWeeklyRecapError(false);

    if (!authAxios || !userId) {
      setWeeklyRecap(null);
      setWeeklyRecapSettled(true);
      return cleanup;
    }

    const segment = getSafeGamificationIdSegment(userId);
    if (!segment) {
      setWeeklyRecap(null);
      setWeeklyRecapSettled(true);
      return cleanup;
    }

    loadClientWeeklyRecap(authAxios, segment)
      .then((recap) => {
        if (!isMounted) return;
        setWeeklyRecap(recap ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setWeeklyRecap(null);
        setWeeklyRecapError(true);
      })
      .finally(() => {
        if (isMounted) setWeeklyRecapSettled(true);
      });

    return cleanup;
  }, [authAxios, userId, weeklyRecapAttempt]);

  useEffect(() => {
    // Clear FIRST. The early return below used to leave the previous member's
    // records on screen when the page swapped user without unmounting.
    setPersonalRecords([]);
    setPersonalRecordsError(false);
    if (!authAxios || !userId) return undefined;
    let isMounted = true;
    // Client-safe namespace: userId is derived from JWT, never from the URL.
    authAxios.get('/api/client/analytics/personal-records')
      .then((res) => {
        if (!isMounted) return;
        const payload = res.data as { data?: unknown; records?: unknown };
        setPersonalRecords(normalizeClientPersonalRecords(payload.data ?? payload.records ?? []));
      })
      .catch(() => {
        if (!isMounted) return;
        setPersonalRecords([]);
        setPersonalRecordsError(true);
      });
    return () => { isMounted = false; };
  }, [authAxios, userId, personalRecordsAttempt]);

  return {
    weeklyRecap,
    weeklyRecapSettled,
    weeklyRecapError,
    retryWeeklyRecap,
    personalRecords,
    personalRecordsError,
    retryPersonalRecords,
  };
}

export default useClientProgressPanels;
