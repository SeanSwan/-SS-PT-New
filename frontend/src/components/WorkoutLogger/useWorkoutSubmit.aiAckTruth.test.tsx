/**
 * ============================================================================
 * FILE: useWorkoutSubmit.aiAckTruth.test.tsx
 * PURPOSE: Prove the AI command bridge stops reporting a workout as applied
 *          before the save has been attempted.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S3 · F4)
 * ============================================================================
 *
 * THE DEFECT
 * The AI_SUBMIT_WORKOUT listener ran:
 *
 *     detail.acknowledgeAIWorkoutEvent?.();
 *     void handleSubmit({ ... });
 *
 * Two faults in two lines. The ack takes `(didHandle = true)`, so a
 * no-argument call reports TRUE. And it fires BEFORE an unawaited save whose
 * result is discarded. `dispatchWithAcknowledgement` reads `handled` on the
 * line after `window.dispatchEvent` and `resolveOutcome(true, true)` maps it to
 * `applied` — so the coach intent log recorded every submit as applied,
 * including ones refused by validation that never left the browser.
 *
 * WHY THIS DRIVES THE REAL DISPATCHER
 * The bug lives in the seam between the hook and `dispatchAISubmitWorkout`, so
 * the test uses the real dispatcher and asserts on its real return value.
 * Asserting on a hand-rolled fake detail would have tested the fake.
 *
 * THE LIMIT OF THIS FIX, ASSERTED BELOW RATHER THAN LEFT IMPLICIT
 * The seam is synchronous and its answer is a single boolean, so it cannot
 * express "accepted, outcome pending". An ATTEMPTED save is therefore still
 * acked `true` at request time and a later server rejection cannot revise it.
 * What is fixed here is the class that was always a lie: refusals that never
 * reached the network. The residual gap is pinned by an explicit test so it
 * cannot be mistaken for coverage.
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

import { useWorkoutSubmit } from './useWorkoutSubmit';
import { dispatchAISubmitWorkout } from '../../utils/aiWorkoutEvents';
import { WORKOUT_SUBMIT_OUTCOME } from './workoutSubmitOutcome';

const completeExercise = () => ({
  exerciseId: 'ex-1',
  name: 'Back Squat',
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
  userRole: 'client',
  workoutDateValue: '2026-09-01',
  workoutDraft: { clear: vi.fn() },
  ...over,
});

/** Mount the hook, then fire the real AI event and return the dispatcher's verdict. */
const dispatchThroughHook = (over: Record<string, unknown> = {}) => {
  const params = makeParams(over);
  renderHook(() => useWorkoutSubmit(params as never));
  const handled = dispatchAISubmitWorkout({ overallIntensity: 8, sessionNotes: 'ok' } as never);
  return { handled, params };
};

beforeEach(() => {
  vi.clearAllMocks();
  submitWorkoutForm.mockResolvedValue({ success: true, data: { id: 'form-1', clientId: 7 } });
});
afterEach(() => vi.restoreAllMocks());

describe('AI_SUBMIT_WORKOUT acknowledgement truth (F4)', () => {
  it('does NOT report handled when there are no exercises', () => {
    // Nothing reaches the network here — this is the class that was pure fiction.
    const { handled } = dispatchThroughHook({ exercises: [] });

    expect(handled).toBe(false);
  });

  it('does NOT report handled when the client is not loaded', () => {
    const { handled } = dispatchThroughHook({ client: null });

    expect(handled).toBe(false);
  });

  it('does NOT report handled when sets are incomplete', () => {
    const incomplete = {
      exerciseId: 'ex-1',
      name: 'Back Squat',
      sets: [{ setNumber: 1, reps: 0, weight: 0, completed: false }],
    };

    const { handled } = dispatchThroughHook({ exercises: [incomplete] });

    expect(handled).toBe(false);
  });

  it('does NOT report handled when there is no client context', () => {
    const { handled } = dispatchThroughHook({ effectiveClientId: undefined });

    expect(handled).toBe(false);
  });

  it('does NOT report handled when a save is already in flight', () => {
    const { handled } = dispatchThroughHook({ isSubmittingRef: { current: true } });

    expect(handled).toBe(false);
  });

  it('never issues a network request for any refused submit', () => {
    dispatchThroughHook({ exercises: [] });

    expect(submitWorkoutForm).not.toHaveBeenCalled();
  });

  it('DOES report handled when the workout is kept locally offline', () => {
    // An effector genuinely took the command; the workout is on the device.
    const queueSubmission = vi.fn();
    const { handled } = dispatchThroughHook({
      offlineQueue: { isOnline: false, queueSubmission },
    });

    expect(handled).toBe(true);
    expect(queueSubmission).toHaveBeenCalledTimes(1);
  });

  it('DOES report handled when the save is actually attempted', () => {
    const { handled } = dispatchThroughHook();

    expect(handled).toBe(true);
    expect(submitWorkoutForm).toHaveBeenCalledTimes(1);
  });
});

describe('the acknowledgement fires exactly once per submit', () => {
  // The fix introduced an ack call at every decision point in handleSubmit.
  // Two firing on one path would double-record the coach intent log, and the
  // second would overwrite the first's verdict. Proven, not assumed.
  const countAcks = async (over: Record<string, unknown> = {}) => {
    const ack = vi.fn();
    const params = makeParams(over);
    const { result } = renderHook(() => useWorkoutSubmit(params as never));
    await (result.current as {
      handleSubmit: (o?: unknown) => Promise<string>;
    }).handleSubmit({ acknowledge: ack });
    return ack;
  };

  it.each([
    ['a successful save', {}],
    ['a validation refusal', { exercises: [] }],
    ['a busy lock', { isSubmittingRef: { current: true } }],
    ['an offline queue', { offlineQueue: { isOnline: false, queueSubmission: vi.fn() } }],
  ])('acks once for %s', async (_label, over) => {
    const ack = await countAcks(over);

    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('acks once even when the request throws', async () => {
    submitWorkoutForm.mockRejectedValue(new Error('network down'));
    const ack = await countAcks();

    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('acks once when the server rejects the save', async () => {
    submitWorkoutForm.mockResolvedValue({ success: false, message: 'nope' });
    const ack = await countAcks();

    expect(ack).toHaveBeenCalledTimes(1);
  });
});

describe('handleSubmit outcome contract', () => {
  const runDirect = async (over: Record<string, unknown> = {}) => {
    const params = makeParams(over);
    const { result } = renderHook(() => useWorkoutSubmit(params as never));
    return (result.current as { handleSubmit: (o?: unknown) => Promise<string> }).handleSubmit();
  };

  it('returns saved on a durable server response', async () => {
    await expect(runDirect()).resolves.toBe(WORKOUT_SUBMIT_OUTCOME.SAVED);
  });

  it('returns failed when the server rejects', async () => {
    submitWorkoutForm.mockResolvedValue({ success: false, message: 'nope' });

    await expect(runDirect()).resolves.toBe(WORKOUT_SUBMIT_OUTCOME.FAILED);
  });

  it('returns needs_review when another save already owns the date', async () => {
    // A DIFFERENT save owns the day. None of THIS workout is on the server, so
    // it is a review item — it must never be counted as a success.
    submitWorkoutForm.mockResolvedValue({ success: false, data: { id: 'other-form' } });

    await expect(runDirect()).resolves.toBe(WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW);
  });

  it('returns failed on a 4xx rejection', async () => {
    submitWorkoutForm.mockRejectedValue({ response: { status: 422, data: { message: 'bad' } } });

    await expect(runDirect()).resolves.toBe(WORKOUT_SUBMIT_OUTCOME.FAILED);
  });

  it('returns kept_local when a transport error queues the workout', async () => {
    submitWorkoutForm.mockRejectedValue(new Error('network down'));

    await expect(runDirect()).resolves.toBe(WORKOUT_SUBMIT_OUTCOME.KEPT_LOCAL);
  });

  it('returns needs_review rather than throwing when validation refuses', async () => {
    await expect(runDirect({ exercises: [] })).resolves.toBe(
      WORKOUT_SUBMIT_OUTCOME.NEEDS_REVIEW,
    );
  });

  it('returns busy when a save is already in flight', async () => {
    await expect(runDirect({ isSubmittingRef: { current: true } })).resolves.toBe(
      WORKOUT_SUBMIT_OUTCOME.BUSY,
    );
  });
});

describe('KNOWN RESIDUAL GAP — the seam cannot revise an attempted save', () => {
  it('still reports handled for a save the server later rejects', async () => {
    // NOT a passing grade. This documents the boundary of the S3 containment:
    // dispatchWithAcknowledgement reads `handled` synchronously and carries one
    // boolean, so "accepted, outcome pending" is unrepresentable. Closing this
    // requires changing the coach seam itself, which is shared by the planner,
    // bootcamp and pain-chart command families — an architecture decision, not
    // a Logger fix. Asserted so the gap cannot be mistaken for coverage.
    submitWorkoutForm.mockResolvedValue({ success: false, message: 'server said no' });

    const { handled } = dispatchThroughHook();

    expect(handled).toBe(true);
  });
});
