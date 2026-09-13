import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const submitWorkoutForm = vi.hoisted(() => vi.fn());

vi.mock('../../services/nasmApiService', () => ({
  dailyWorkoutFormService: { submitWorkoutForm },
  generateClientSummary: vi.fn(),
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock('../../services/api.service', () => ({ ApiService: class {} }));

import { useWorkoutSubmit } from './useWorkoutSubmit';
import { WORKOUT_SUBMIT_OUTCOME } from './workoutSubmitOutcome';

const exercise = {
  exerciseId: 'ex-1',
  exerciseName: 'Back Squat',
  sets: [{ setNumber: 1, reps: 5, weight: 100, completed: true }],
};

const makeParams = (queueSubmission: ReturnType<typeof vi.fn>) => ({
  client: { id: 42, firstName: 'Test', lastName: 'Client', email: 'test@example.com', availableSessions: 4, clientSource: 'paid' },
  setIsGeneratingSummary: vi.fn(),
  setLastChallengeProgress: vi.fn(),
  setLastSaveResponse: vi.fn(),
  setSubmittedFormId: vi.fn(),
  submittedFormId: null,
  effectiveClientId: 42,
  equipmentProfileId: null,
  exercises: [exercise],
  isSubmittingRef: { current: false },
  offlineQueue: { isOnline: false, queueSubmission },
  overallIntensity: 7,
  plannedAssignment: null,
  scheduledSessionId: null,
  sessionNotes: '',
  setIsSubmitting: vi.fn(),
  setOverallIntensity: vi.fn(),
  setSessionNotes: vi.fn(),
  userRole: 'trainer',
  workoutDateValue: '2026-09-12',
  workoutDraft: { clear: vi.fn() },
});

describe('useWorkoutSubmit offline persistence truth', () => {
  beforeEach(() => submitWorkoutForm.mockReset());

  it('returns FAILED and keeps the draft when offline persistence refuses the payload', async () => {
    const queueSubmission = vi.fn().mockReturnValue(false);
    const params = makeParams(queueSubmission);
    const acknowledge = vi.fn();
    const { result } = renderHook(() => useWorkoutSubmit(params as never));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await (result.current as any).handleSubmit({ acknowledge });
    });

    expect(outcome).toBe(WORKOUT_SUBMIT_OUTCOME.FAILED);
    expect(acknowledge).toHaveBeenCalledWith(false);
    expect(params.workoutDraft.clear).not.toHaveBeenCalled();
    expect(submitWorkoutForm).not.toHaveBeenCalled();
  });

  it('returns KEPT_LOCAL only after the queue confirms durable persistence', async () => {
    const queueSubmission = vi.fn().mockReturnValue(true);
    const params = makeParams(queueSubmission);
    const acknowledge = vi.fn();
    const { result } = renderHook(() => useWorkoutSubmit(params as never));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await (result.current as any).handleSubmit({ acknowledge });
    });

    expect(outcome).toBe(WORKOUT_SUBMIT_OUTCOME.KEPT_LOCAL);
    expect(acknowledge).toHaveBeenCalledWith(true);
    expect(params.workoutDraft.clear).not.toHaveBeenCalled();
  });

  it('does not convert a failed transport fallback into a local success', async () => {
    submitWorkoutForm.mockRejectedValueOnce(new Error('network down'));
    const queueSubmission = vi.fn().mockReturnValue(false);
    const params = { ...makeParams(queueSubmission), offlineQueue: { isOnline: true, queueSubmission } };
    const { result } = renderHook(() => useWorkoutSubmit(params as never));

    let outcome: string | undefined;
    await act(async () => { outcome = await (result.current as any).handleSubmit(); });

    expect(outcome).toBe(WORKOUT_SUBMIT_OUTCOME.FAILED);
    expect(params.workoutDraft.clear).not.toHaveBeenCalled();
  });
});
