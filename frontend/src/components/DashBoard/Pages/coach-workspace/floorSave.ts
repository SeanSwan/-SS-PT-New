/**
 * FILE: floorSave.ts
 * PURPOSE: Floor mode's one save, held to the Workout Logger's own contract.
 *
 * - Identity: a session started from Today carries the booked session's id
 *   (scheduledSessionId), so the backend applies that booking's credit rules
 *   (no second charge for an already-deducted session, the session type's
 *   credit cost) and marks it complete. A plan-seeded session carries today's
 *   plan assignment ONLY when the logger's own helpers prove it is still today's
 *   loggable assignment for the same week/day — never one invented from a
 *   client and a date. The backend re-verifies both and refuses a mismatch.
 * - Ownership: one save per client at a time, held in a module registry so a
 *   Floor remount (a view switch mid-save) still knows a save is out and gets
 *   its result. Success removes exactly the submitted sets; sets saved on the
 *   floor while it was out stay for the next save.
 * - Truth: every outcome says what happened to the sets. A save that did not
 *   answer in 30 s is reported as unknown, not failed-for-sure.
 */
import apiService from '../../../../services/api.service';
import { dailyWorkoutFormService } from '../../../../services/nasmApiService';
import { buildWorkoutFormSubmitBody } from '../../../WorkoutLogger/workoutLoggerSubmitPayload';
import { buildWorkoutSubmitSuccessMessage } from '../../../WorkoutLogger/WorkoutLogger.submitReceipt';
import {
  currentWorkoutAssignmentMatchesRouteIntent, getCurrentWorkoutPlanId, getCurrentWorkoutTodayAssignment,
  isCurrentWorkoutAssignmentLoggable,
} from '../../../WorkoutLogger/WorkoutLogger.helpers';
import type { CurrentWorkoutPlanResponse, PlannedAssignment } from '../../../WorkoutLogger/WorkoutLogger.localTypes';
import { dispatchWorkoutLogged } from '../../../../utils/workoutLoggedEvent';
import {
  type FloorExercise, type FloorLink, type FloorPlanDay, floorExerciseEntries, localDateISO, reconcileAfterSave,
} from './floorSession';

export type FloorSaveResult =
  | { kind: 'saved'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'failed'; message: string };

export type FloorSaveInput = {
  key: string; clientId: number; day: string; exercises: FloorExercise[];
  link: FloorLink | null; planDay: FloorPlanDay | null;
};

type Stored = { day: string; exercises: FloorExercise[]; index: number; link?: FloorLink | null; planDay?: FloorPlanDay | null };
export type FloorSaveTransaction = { sent: FloorExercise[]; done: Promise<FloorSaveResult> };

const inflight = new Map<string, FloorSaveTransaction>();
/** A result nobody was mounted to see (the coach left Floor mid-save) waits here for the next Floor, briefly. */
const unseen = new Map<string, { result: FloorSaveResult; at: number }>();
const UNSEEN_FOR = 30 * 60_000;
const KEPT = 'Your sets are kept here';
const UNKNOWN = `The save did not get a clear answer — it may still have landed. ${KEPT}; check the workout log before saving again.`;

/** The result of a save that finished while no Floor was mounted (taken once; stale after 30 minutes). */
export function takeUnseenFloorSave(key: string | null): FloorSaveResult | null {
  const entry = key ? unseen.get(key) : undefined;
  if (!key || !entry) return null;
  unseen.delete(key);
  return Date.now() - entry.at < UNSEEN_FOR ? entry.result : null;
}

/** A mounted Floor saw this key's result: nothing left to replay. */
export function markFloorSaveSeen(key: string | null) {
  if (key) unseen.delete(key);
}

/** The save currently out for this client's Floor session, if any. */
export function inflightFloorSave(key: string | null): FloorSaveTransaction | null {
  return key ? inflight.get(key) ?? null : null;
}

/**
 * Today's plan assignment for the save — the logger's "Load Today's Plan"
 * rules: same intent (a booked session is a trainer session), loggable, and the
 * same week/day Floor was seeded from. Only for a session on today's date.
 * Throws when the plan cannot be read, so an unreadable plan never turns a
 * homework day into a charged one by omission.
 */
async function todaysPlanAssignment(input: FloorSaveInput & { planDay: FloorPlanDay }): Promise<{ assignment: PlannedAssignment | null; note: string }> {
  const response = await apiService.get(`/api/workouts/${input.clientId}/current`);
  const data = ((response as { data?: unknown })?.data ?? response) as CurrentWorkoutPlanResponse;
  const assignment = getCurrentWorkoutTodayAssignment(data);
  const planId = getCurrentWorkoutPlanId(data);
  const hasScheduledSession = Boolean(input.link);
  const none = (note: string) => ({ assignment: null, note });
  if (!assignment || planId == null) return none('');
  if (!currentWorkoutAssignmentMatchesRouteIntent(assignment, { assignmentType: hasScheduledSession ? 'trainer_session' : null })) return none('');
  if (!isCurrentWorkoutAssignmentLoggable(assignment, { hasScheduledSession })) return none('');
  // Floor followed the calendar's day; the plan's own cursor may be elsewhere. Disclose, never guess (planDayResolver).
  if (Number(assignment.weekNumber) !== input.planDay.weekNumber || Number(assignment.dayNumber) !== input.planDay.dayNumber) {
    return none(`Not counted toward the plan: its current day is Week ${assignment.weekNumber ?? '?'} · Day ${assignment.dayNumber ?? '?'}, not the day Floor used (Week ${input.planDay.weekNumber} · Day ${input.planDay.dayNumber}).`);
  }
  return { assignment: { ...assignment, planId }, note: '' };
}

async function submit(input: FloorSaveInput): Promise<FloorSaveResult> {
  const entries = floorExerciseEntries(input.exercises);
  let plannedAssignment: PlannedAssignment | null = null;
  let planNote = '';
  // Only a plan-seeded session for today reads the plan; everything else sends at once (no extra tick).
  if (input.planDay && input.day === localDateISO()) {
    try {
      ({ assignment: plannedAssignment, note: planNote } = await todaysPlanAssignment({ ...input, planDay: input.planDay }));
    } catch {
      return { kind: 'failed', message: `Today's plan could not be checked, so nothing was saved (a homework day must not be charged by mistake). ${KEPT} — try again.` };
    }
  }
  const body = buildWorkoutFormSubmitBody({
    clientId: input.clientId, date: input.link?.date ?? input.day, exercises: entries,
    sessionNotes: 'Logged in Swan Coach Floor mode.', overallIntensity: null,
    scheduledSessionId: input.link?.scheduledSessionId ?? null, plannedAssignment,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await dailyWorkoutFormService.submitWorkoutForm(body, { signal: controller.signal });
    if (response.success && response.data) {
      dispatchWorkoutLogged({ clientId: input.clientId, formId: response.data.id ?? response.data.formId ?? null, date: response.data.date || body.date });
      // The logger's own receipt copy: what the save did to the client's session credits.
      const receipt = response.data.billing ? buildWorkoutSubmitSuccessMessage(response.data) : '';
      return { kind: 'saved', message: [receipt, planNote].filter(Boolean).join(' ') };
    }
    if (response.data?.id || response.data?.formId) {
      return { kind: 'conflict', message: `${response.message || 'A workout is already saved for this day.'} ${KEPT} — add them in the workout logger.` };
    }
    return { kind: 'failed', message: `${response.message || 'The workout was not saved.'} ${KEPT} — try again.` };
  } catch (error) {
    // A 4xx refusal is a sure "not saved"; a timeout, gateway error or dropped connection is not.
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    return !controller.signal.aborted && status && status >= 400 && status < 500
      ? { kind: 'failed', message: `The workout was not saved. ${KEPT} — try again.` }
      : { kind: 'failed', message: UNKNOWN };
  } finally {
    clearTimeout(timer);
  }
}

/** Storage mirrors the live list; after a save it must lose the submitted sets even if no Floor is mounted. */
function reconcileStored(key: string, sent: FloorExercise[]) {
  try {
    const raw = window.sessionStorage.getItem(key);
    const stored = raw ? (JSON.parse(raw) as Stored) : null;
    if (!stored || !Array.isArray(stored.exercises)) return;
    const exercises = reconcileAfterSave(stored.exercises, sent);
    if (exercises.some((exercise) => exercise.sets.length > 0)) {
      window.sessionStorage.setItem(key, JSON.stringify({ ...stored, exercises, day: localDateISO(), link: null, planDay: null }));
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch { /* storage refused: the mounted session reconciles in memory */ }
}

/**
 * Start the one save for this client. Returns null when a save is already out
 * (the synchronous guard: double taps and remounts cannot send twice).
 */
export function beginFloorSave(input: FloorSaveInput): FloorSaveTransaction | null {
  if (inflight.has(input.key)) return null;
  const sent = input.exercises.map((exercise) => ({ ...exercise, sets: [...exercise.sets] }));
  const done = submit({ ...input, exercises: sent }).catch((): FloorSaveResult => (
    { kind: 'failed', message: `The workout was not saved. ${KEPT} — try again.` }
  )).then((result) => {
    if (result.kind === 'saved') reconcileStored(input.key, sent);
    inflight.delete(input.key);
    unseen.set(input.key, { result, at: Date.now() }); // cleared as soon as a mounted Floor applies it
    return result;
  });
  const transaction = { sent, done };
  inflight.set(input.key, transaction);
  return transaction;
}
