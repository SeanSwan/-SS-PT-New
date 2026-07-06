/**
 * useBootcampTaughtLog
 * ====================
 * Slice 0.2 (Fable Vision arc): state + payload mapping for the bootcamp
 * "Mark as Taught" action. Logging a taught class writes BootcampClassLog
 * rows — the ONLY food for the exercise-freshness engine (the generator
 * excludes exercises taught in the last 14 days). Until this slice, no UI
 * ever called POST /api/bootcamp/log, so the engine was starved.
 *
 * Design notes:
 * - `buildTaughtLogPayload` is a pure, unit-testable mapper from builder
 *   state → POST /log body. Main-board exercises only; each entry carries
 *   `exerciseName` (the field the freshness engine reads).
 * - classDate uses LOCAL date parts, never toISOString(): the column is
 *   DATEONLY and UTC would log tomorrow's date for evening classes.
 * - The `loggedId` latch is the client-side double-log guard (the backend
 *   has no dedup — named residual on the slice).
 * - History refetches after a successful log (server truth over optimism).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBootcampAPI } from './useBootcampAPI';
import type { ClassLogEntry, GeneratedBootcamp } from './useBootcampAPI';
import { getMainBoardExercises } from '../components/BootcampBuilder/BootcampBuilderPlacement';

export interface TaughtLogExercise {
  exerciseName: string;
  stationIndex: number | null;
  durationSec: number;
}

export interface TaughtLogPayload {
  classDate: string;
  dayType: GeneratedBootcamp['dayType'];
  actualParticipants: number;
  overflowActivated: boolean;
  exercisesUsed: TaughtLogExercise[];
}

export const localDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const buildTaughtLogPayload = (bootcamp: GeneratedBootcamp | null): TaughtLogPayload | null => {
  if (!bootcamp) return null;
  const mainExercises = getMainBoardExercises(bootcamp.exercises ?? []);
  if (mainExercises.length === 0) return null;
  return {
    classDate: localDateString(new Date()),
    dayType: bootcamp.dayType,
    actualParticipants: bootcamp.expectedParticipants,
    overflowActivated: false,
    exercisesUsed: mainExercises.map((exercise) => ({
      exerciseName: exercise.exerciseName,
      stationIndex: exercise.stationIndex ?? null,
      durationSec: exercise.durationSec,
    })),
  };
};

const HISTORY_LIMIT = 5;

export const useBootcampTaughtLog = (bootcamp: GeneratedBootcamp | null) => {
  const { logClass, getHistory } = useBootcampAPI();
  const [logging, setLogging] = useState(false);
  const [loggedId, setLoggedId] = useState<number | null>(null);
  const [logError, setLogError] = useState<string | null>(null);
  const [history, setHistory] = useState<ClassLogEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const payload = useMemo(() => buildTaughtLogPayload(bootcamp), [bootcamp]);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getHistory({ limit: HISTORY_LIMIT });
      setHistory(Array.isArray(data?.logs) ? data.logs : []);
      setHistoryTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to load class history');
    } finally {
      setHistoryLoading(false);
    }
  }, [getHistory]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // A new generated class is a new teachable unit — release the latch.
  useEffect(() => {
    setLoggedId(null);
    setLogError(null);
  }, [bootcamp]);

  const markTaught = useCallback(async () => {
    if (!payload || logging || loggedId !== null) return;
    setLogging(true);
    setLogError(null);
    try {
      const logId = await logClass(payload);
      setLoggedId(logId);
      await refreshHistory();
    } catch (error) {
      setLogError(error instanceof Error ? error.message : 'Failed to log the class');
    } finally {
      setLogging(false);
    }
  }, [payload, logging, loggedId, logClass, refreshHistory]);

  return {
    payload,
    logging,
    loggedId,
    logError,
    history,
    historyTotal,
    historyLoading,
    historyError,
    markTaught,
    refreshHistory,
  };
};

export default useBootcampTaughtLog;
