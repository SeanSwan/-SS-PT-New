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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBootcampAPI } from './useBootcampAPI';
import type { ClassLogEntry, GeneratedBootcamp, TaughtLogExecutionSummary } from './useBootcampAPI';
import { getMainBoardExercises } from '../components/BootcampBuilder/BootcampBuilderPlacement';

/**
 * H29 / R-H04 (contract §5 line 218): an ordinary taught log carries `run:<stable-uuid>`,
 * and the CALLER mints it — a server-minted identity cannot recognize the retry it exists
 * to collapse. `crypto.randomUUID` is available in every browser this app targets; the
 * fallback exists so a locked-down context yields a valid key rather than `undefined`,
 * which the endpoint rejects with a 400.
 */
export const newRunOperationKey = (): string => {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  return `run:${uuid}`;
};

export interface TaughtLogExercise {
  exerciseName: string;
  stationIndex: number | null;
  durationSec: number;
}

export interface TaughtLogPayload {
  classDate: string;
  dayType: GeneratedBootcamp['dayType'];
  overflowActivated: boolean;
  exercisesUsed: TaughtLogExercise[];
  /** §5 line 222 — this UI supplies exactly one kind: the trainer-attested prescription. */
  executionSummary: TaughtLogExecutionSummary & { kind: 'trainer_attested_prescription' };
}

export const localDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const buildTaughtLogPayload = (bootcamp: GeneratedBootcamp | null): TaughtLogPayload | null => {
  if (!bootcamp) return null;
  const mainExercises = getMainBoardExercises(bootcamp.exercises ?? []);
  if (mainExercises.length === 0) return null;
  const exercisesUsed = mainExercises.map((exercise) => ({
    exerciseName: exercise.exerciseName,
    stationIndex: exercise.stationIndex ?? null,
    durationSec: exercise.durationSec,
  }));
  const positiveOrNull = (value: unknown): number | null => (
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
  );
  return {
    classDate: localDateString(new Date()),
    dayType: bootcamp.dayType,
    overflowActivated: false,
    exercisesUsed,
    // §5 line 222: "Prescribed work seconds/rounds are not measured elapsed time;
    // expectedParticipants is not actual attendance." `actualParticipants` is therefore NOT
    // sent — nothing observed who attended — and the expectation is recorded as part of the
    // PRESCRIPTION it actually is. Nothing in the UI read the old value; it only ever
    // restated the class plan inside a column that means observed attendance.
    executionSummary: {
      kind: 'trainer_attested_prescription',
      prescribed: {
        workSec: positiveOrNull(bootcamp.exerciseDurationSec),
        rounds: positiveOrNull(bootcamp.rounds),
        targetDurationMin: positiveOrNull(bootcamp.targetDuration),
      },
      expectedParticipants: positiveOrNull(bootcamp.expectedParticipants),
      performedCount: exercisesUsed.length,
    },
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

  /**
   * The IDENTITY of the teachable unit, as content rather than as an object reference.
   *
   * `bootcamp` is a new object after ANY slot action — delete, duplicate, move
   * (`useBootcampSlotActions` returns a fresh object each time) — and so is `payload`, because
   * `buildTaughtLogPayload` always builds a new one. Keying the latch below on either reference
   * therefore released it after an edit that changed nothing about the class, re-armed the
   * button, and minted a second `run:` key: a DUPLICATE class log, with the client latch being
   * the only duplicate guard on this path (hostile review, round 114 F3). The signature changes
   * only when the class content actually changes, which is the point at which a new teachable
   * unit legitimately exists.
   */
  const payloadSignature = useMemo(() => {
    if (!payload) return null;
    // `classDate` is EXCLUDED (hostile review, round 115 F9): it is `localDateString(new Date())`,
    // so a session that crosses local midnight would change the signature although the class did
    // not — releasing the latch and nulling the run key, which is the duplicate-log path this
    // signature exists to close. Everything that describes the CLASS stays in.
    //
    // Destructured directly from the payload type rather than through a cast: the first version of
    // this line cast to `Record<string, unknown> & {...}`, which `tsc` correctly rejected
    // (TS2352 — an index signature cannot be asserted onto a known interface). The test files are
    // excluded from `tsc` in this repo, so only the source-level check caught it.
    const { classDate: excludedClassDate, ...contentSignature } = payload;
    void excludedClassDate;
    return JSON.stringify(contentSignature);
  }, [payload]);

  /**
   * H29: one operation identity per teachable unit. It is minted once per generated class
   * and REUSED across retries of that attempt, so a retry after a lost response collapses
   * onto the same class log instead of appending a duplicate — which is what used to starve
   * the freshness engine and defeat attendance deduplication.
   *
   * NOT durable across a page reload: the key lives in memory for the attempt. The
   * `loggedId` latch already guards in-session double-submits, and a reload mid-attempt
   * would lose the key (a server-side constraint, not a client one, is what makes that
   * safe today). Disclosed rather than implied.
   */
  const runKeyRef = useRef<string | null>(null);

  /**
   * The BODY that the run key identifies, frozen at the moment the key is minted (hostile review,
   * round 127 HIGH).
   *
   * A key alone is not an identity. The server hashes the whole body — `bootcampCrud.mjs:101` feeds
   * the normalized `classDate` into `hashTaughtPayload`, which hashes every field except
   * `operationKey`/`payloadHash` — and refuses a used key carrying a different hash with a 409
   * (`bootcampCrud.mjs:131-141`), whose trainer-visible wording now reads "This class was already
   * logged with different details".
   *
   * So re-sending `payload` on the retry was wrong, because `payload` is rebuilt from the CURRENT
   * clock (`classDate: localDateString(new Date())`, and `buildTaughtLogPayload` always returns a
   * fresh object), while the key deliberately survives changes that do not alter the class content —
   * including the date rollover, which is exactly why `classDate` is excluded from the signature
   * below. A lost response just before local midnight therefore produced the one request the key
   * exists to prevent: one key, two bodies, and a PERMANENT 409 on the retry, because nothing
   * re-mints the key while the content signature holds. The row was already logged; the trainer saw
   * an internal error and the button stayed armed.
   *
   * Freezing the body makes the retry byte-identical, which is what "retry" has to mean for an
   * idempotent write. `classDate` stays OUT of the signature — the alternative (letting the rollover
   * change the signature) would release the latch and mint a second key, i.e. a duplicate class log,
   * which is the failure this whole mechanism was built to close.
   */
  const runBodyRef = useRef<TaughtLogPayload | null>(null);

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

  // A new generated class is a new teachable unit — release the latch AND mint a fresh
  // operation identity, so two different classes can never share one key. Keyed on the CONTENT
  // signature, not the `bootcamp` object: see `payloadSignature` above (round 114 F3).
  useEffect(() => {
    setLoggedId(null);
    setLogError(null);
    runKeyRef.current = null;
    runBodyRef.current = null;
  }, [payloadSignature]);

  const markTaught = useCallback(async () => {
    if (!payload || logging || loggedId !== null) return;
    // Minted on the FIRST attempt, and kept for the retry that follows a lost response — together
    // with the body it identifies, so the retry is byte-identical rather than merely same-keyed
    // (round 127 HIGH: a same-keyed retry that re-read the clock was a permanent 409).
    if (!runKeyRef.current || !runBodyRef.current) {
      runKeyRef.current = newRunOperationKey();
      runBodyRef.current = payload;
    }
    setLogging(true);
    setLogError(null);
    try {
      const logId = await logClass({ ...runBodyRef.current, operationKey: runKeyRef.current });
      // Latch ONLY on a real id (hostile review, round 115 F5). The guard above is
      // `loggedId !== null`, so an `undefined` from a malformed 200 would latch FOREVER — a dead
      // button with no message — while a `null` would leave the latch OPEN and allow a second
      // minted run key, i.e. a duplicate class log. The server's refusal now throws in
      // `useBootcampAPI.logClass`; this is the belt to that pair of braces.
      if (!Number.isInteger(logId)) {
        throw new Error('The server did not confirm a class-log id.');
      }
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
