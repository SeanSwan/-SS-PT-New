/**
 * ============================================================================
 * FILE: useWorkoutSubmit.confirmedBinding.test.tsx
 * PURPOSE: R60-A containment (plan 60 §8) for requirement R60-R1 — a legacy,
 *          unbound or malformed `AI_SUBMIT_WORKOUT` must not edit the
 *          Logger's live notes/intensity, must not acquire the save lock, must
 *          not queue, must not POST the canonical save, and must not emit a
 *          save receipt. Manual Save keeps its current path.
 * AUTHOR: Astra/xhigh containment slice | CREATED: 2026-09-12
 * ============================================================================
 *
 * THE DEFECT (plan 60 §2, 56 finding 1/3, verified in source before writing)
 * `useWorkoutSubmit.ts:246-283` listened for `AI_SUBMIT_WORKOUT` and, before
 * any guard ran, wrote the event's payload into live form state (`:252-253`
 * setOverallIntensity/setSessionNotes), then called the canonical
 * `handleSubmit` — which acquires the single-flight lock (`:99`), may queue
 * (`:146`), POSTs `/api/workout-forms` (`:165`), toasts a success receipt
 * (`:172`) and clears the draft (`:181`). Nothing in the event carried an
 * origin, a target, a Logger instance or a draft revision, and the bus at
 * `aiWorkoutEvents.ts:127` broadcasts to every mounted listener, so the latest
 * listener wins.
 *
 * WHY THE RECEIVER IS THE CONTAINMENT POINT
 * Four producers can put `AI_SUBMIT_WORKOUT` on the window bus:
 *   - `useCoachCommand.ts` execute  (`:254`), after an awaited POST
 *   - `useCoachCommand.ts` confirm  (`:315`), after the sheet's own POST
 *   - `ClientTrainingCommandBar.tsx` sheet onDone (`:193`), bypassing the hook
 *   - `useAIChat.ts:93` — already refuses to emit it
 * Containing at the receiver covers all of them, including the direct-sheet
 * path the plan calls out as missing a hook-only fix. This slice deliberately
 * leaves bound AI submit unavailable: R60-B1/B2/B3 (server approval binding,
 * owner capture + local permit, exactly-one-receiver delivery) are PENDING and
 * not authorized here, so EVERY submit event reachable today is unbound by
 * construction and must decline.
 *
 * THE POSITIVE CONTROL MATTERS AS MUCH AS THE REFUSAL
 * A blanket deny of the whole hook would pass every refusal assertion above
 * and destroy the money path. `manual Save is unchanged` therefore drives the
 * same mounted hook with no AI event at all and requires the canonical POST,
 * the success receipt and the draft clear to still happen — so this file
 * cannot pass by disabling saving.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const submitWorkoutForm = vi.fn();

vi.mock('../../services/nasmApiService', () => ({
  dailyWorkoutFormService: {
    submitWorkoutForm: (...args: unknown[]) => submitWorkoutForm(...args),
    generateClientSummary: vi.fn(),
  },
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('../../services/api.service', () => ({ ApiService: class {} }));

import { toast } from 'react-toastify';
import { useWorkoutSubmit } from './useWorkoutSubmit';
import {
  AI_SUBMIT_WORKOUT,
  dispatchAISubmitWorkout,
  dispatchAIWorkoutEvent,
} from '../../utils/aiWorkoutEvents';
import { getCoachEventLog, resetCoachIntentLog } from '../../utils/coachIntentRecorder';
import { WORKOUT_SUBMIT_OUTCOME } from './workoutSubmitOutcome';

const completeExercise = () => ({
  exerciseId: 'ex-1',
  exerciseName: 'Back Squat',
  painLevel: 0,
  sets: [{ setNumber: 1, reps: 8, weight: 100, completed: true }],
});

const makeParams = (over: Record<string, unknown> = {}) => ({
  client: { id: 7, availableSessions: 5, clientSource: 'paid' },
  setIsGeneratingSummary: vi.fn(),
  setLastChallengeProgress: vi.fn(),
  setLastSaveResponse: vi.fn(),
  setSubmittedFormId: vi.fn(),
  submittedFormId: null,
  effectiveClientId: 7,
  equipmentProfileId: null,
  exercises: [completeExercise()],
  isSubmittingRef: { current: false },
  offlineQueue: { isOnline: true, queueSubmission: vi.fn() },
  overallIntensity: 7,
  plannedAssignment: null,
  scheduledSessionId: null,
  sessionNotes: '',
  setIsSubmitting: vi.fn(),
  setOverallIntensity: vi.fn(),
  setSessionNotes: vi.fn(),
  userRole: 'trainer',
  workoutDateValue: '2026-09-01',
  workoutDraft: { clear: vi.fn() },
  ...over,
});

/** Mount ONE real Logger submit hook and fire the real bus event at it. */
const mountAndDispatch = (
  payload: unknown,
  over: Record<string, unknown> = {},
) => {
  const params = makeParams(over);
  renderHook(() => useWorkoutSubmit(params as never));
  const handled = dispatchAISubmitWorkout(payload as never);
  return { handled, params };
};

/** Every side effect R60-R1 forbids, asserted from one place. */
const expectNoSubmitSideEffects = (params: ReturnType<typeof makeParams>) => {
  expect(params.setOverallIntensity).not.toHaveBeenCalled();
  expect(params.setSessionNotes).not.toHaveBeenCalled();
  expect(params.setIsSubmitting).not.toHaveBeenCalled();
  expect(params.isSubmittingRef.current).toBe(false);
  expect(params.offlineQueue.queueSubmission).not.toHaveBeenCalled();
  expect(params.workoutDraft.clear).not.toHaveBeenCalled();
  expect(params.setLastSaveResponse).not.toHaveBeenCalled();
  expect(params.setSubmittedFormId).not.toHaveBeenCalled();
  expect(submitWorkoutForm).not.toHaveBeenCalled();
  expect(vi.mocked(toast.success)).not.toHaveBeenCalled();
  expect(vi.mocked(toast.warning)).not.toHaveBeenCalled();
  expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  resetCoachIntentLog();
  submitWorkoutForm.mockResolvedValue({
    success: true,
    data: { id: 'form-1', clientId: 7, date: '2026-09-01' },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  resetCoachIntentLog();
});

describe('R60-R1 — unbound AI_SUBMIT_WORKOUT is refused before any side effect', () => {
  it('refuses the legacy payload: no notes/intensity edit, lock, queue, POST or receipt', () => {
    const { handled, params } = mountAndDispatch({ intensity: 8, notes: 'Strong finish' });

    expect(handled).toBe(false);
    expectNoSubmitSideEffects(params);
  });

  it('refuses malformed payloads — empty, wrong-typed, null and detail-less', () => {
    const cases: unknown[] = [
      {},
      { intensity: '8', notes: 42 },
      { intensity: 8, notes: null },
      null,
      [],
    ];

    for (const payload of cases) {
      const { handled, params } = mountAndDispatch(payload);
      expect(handled).toBe(false);
      expectNoSubmitSideEffects(params);
    }

    // The raw-CustomEvent lane: no typed detail object at all.
    const params = makeParams();
    renderHook(() => useWorkoutSubmit(params as never));
    window.dispatchEvent(new CustomEvent(AI_SUBMIT_WORKOUT));
    window.dispatchEvent(new CustomEvent(AI_SUBMIT_WORKOUT, { detail: undefined }));
    expectNoSubmitSideEffects(params);
  });

  it('refuses the generic dispatcher entry point used by the command hook', () => {
    const params = makeParams();
    renderHook(() => useWorkoutSubmit(params as never));

    expect(dispatchAIWorkoutEvent(AI_SUBMIT_WORKOUT, { intensity: 9, notes: 'Must not submit' })).toBe(false);
    expect(dispatchAIWorkoutEvent(AI_SUBMIT_WORKOUT, {})).toBe(false);
    expect(dispatchAIWorkoutEvent(AI_SUBMIT_WORKOUT, null)).toBe(false);

    expectNoSubmitSideEffects(params);
  });

  it('does not admit a forged binding-shaped payload (no local permit exists in R60-A)', () => {
    // Shape alone must not buy admission: these are the field names R60-B2/B3
    // will introduce. Until the owning Logger mints a real permit, a payload
    // that merely looks bound is unbound.
    const { handled, params } = mountAndDispatch({
      intensity: 10,
      notes: 'forged',
      operationId: 'op-12345678-1234-1234-1234-123456789abc',
      instanceId: 'aaaaaaaa-1111-4111-8111-111111111111',
      draftEpoch: 'bbbbbbbb-2222-4222-8222-222222222222',
      revision: 3,
      clientId: 7,
      actorId: 7,
      baseBodyDigest: 'c'.repeat(64),
      permit: { consumed: false, owner: 'workout-logger' },
    });

    expect(handled).toBe(false);
    expectNoSubmitSideEffects(params);
  });

  it('declines from every mounted receiver — two Loggers, zero saves', () => {
    const first = makeParams();
    const second = makeParams();
    renderHook(() => useWorkoutSubmit(first as never));
    renderHook(() => useWorkoutSubmit(second as never));

    const handled = dispatchAISubmitWorkout({ intensity: 6, notes: 'duplicate delivery' } as never);

    expect(handled).toBe(false);
    expectNoSubmitSideEffects(first);
    expectNoSubmitSideEffects(second);
    expect(submitWorkoutForm).not.toHaveBeenCalled();
  });

  it('records the refusal as a declined intent, never as applied', () => {
    mountAndDispatch({ intensity: 8, notes: 'Strong finish' });

    const recorded = getCoachEventLog().all().filter(e => e.name === AI_SUBMIT_WORKOUT);

    expect(recorded).toHaveLength(1);
    // 'noop' === an effector saw the event and declined. Anything believable
    // ('applied') would be a fabricated save record for a workout that never
    // left the browser.
    expect(recorded[0].outcome).toBe('noop');
  });
});

describe('R60-R1 — Manual Save keeps its current path (positive control)', () => {
  it('still saves through the canonical authenticated POST', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useWorkoutSubmit(params as never));

    const outcome = await (result.current as {
      handleSubmit: (o?: unknown) => Promise<string>;
    }).handleSubmit();

    expect(outcome).toBe(WORKOUT_SUBMIT_OUTCOME.SAVED);
    expect(submitWorkoutForm).toHaveBeenCalledTimes(1);
    expect(submitWorkoutForm.mock.calls[0][0]).toMatchObject({
      clientId: 7,
      date: '2026-09-01',
      sessionNotes: '',
      overallIntensity: 7,
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledTimes(1);
    expect(params.workoutDraft.clear).toHaveBeenCalledTimes(1);
    expect(params.setSubmittedFormId).toHaveBeenCalledWith('form-1');
    expect(params.setIsSubmitting).toHaveBeenCalledWith(true);
  });

  it('still saves immediately after a refused AI submit leaves no lock behind', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useWorkoutSubmit(params as never));

    expect(dispatchAISubmitWorkout({ intensity: 3, notes: 'refused' } as never)).toBe(false);

    const outcome = await (result.current as {
      handleSubmit: (o?: unknown) => Promise<string>;
    }).handleSubmit();

    expect(outcome).toBe(WORKOUT_SUBMIT_OUTCOME.SAVED);
    expect(submitWorkoutForm).toHaveBeenCalledTimes(1);
    expect(params.isSubmittingRef.current).toBe(false);
  });

  it('keeps the existing manual offline queue path', async () => {
    const params = makeParams({ offlineQueue: { isOnline: false, queueSubmission: vi.fn() } });
    const { result } = renderHook(() => useWorkoutSubmit(params as never));

    const outcome = await (result.current as {
      handleSubmit: (o?: unknown) => Promise<string>;
    }).handleSubmit();

    expect(outcome).toBe(WORKOUT_SUBMIT_OUTCOME.KEPT_LOCAL);
    expect(params.offlineQueue.queueSubmission).toHaveBeenCalledTimes(1);
    expect(submitWorkoutForm).not.toHaveBeenCalled();
  });
});
