/**
 * Cortex P0 §5.3 — planner-side acknowledged-review contract regression tests.
 * 409 SWAN_COACH_REVIEW_REQUIRED opens the SafetyGateModal state; confirming
 * with a written reason retries the SAME generation with
 * planningReviewAcknowledged + planningReviewReason.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerGenerationActions } from './useWorkoutPlannerGenerationActions';

const reviewRequired409 = () => ({
  response: {
    status: 409,
    data: {
      success: false,
      code: 'SWAN_COACH_REVIEW_REQUIRED',
      reviewRequiredSignals: ['active_pain_review_required'],
      missingCriticalData: [],
    },
  },
});

const renderGenerationHook = (post: ReturnType<typeof vi.fn>) => {
  const setters = {
    setPlanExercises: vi.fn(),
    setGeneratedPlan: vi.fn(),
    setPhaseNumber: vi.fn(),
    setStatusMsg: vi.fn(),
    resetLoadedPlanState: vi.fn(),
  };
  const hook = renderHook(() => useWorkoutPlannerGenerationActions({
    authAxios: { post },
    category: 'full_body',
    goal: 'general_fitness',
    phaseNumber: 2,
    planDuration: '4',
    sessionsPerWeek: 3,
    trainingIntensityMode: 'base',
    hardcoreMethod: 'standard',
    generationMode: 'auto',
    selectedEquipmentProfileId: null,
    ...setters,
  } as Parameters<typeof useWorkoutPlannerGenerationActions>[0]));
  return { hook, setters };
};

describe('useWorkoutPlannerGenerationActions safety gate (Cortex P0 §5.3)', () => {
  it('opens the review state on 409 SWAN_COACH_REVIEW_REQUIRED instead of a generic error', async () => {
    const post = vi.fn().mockRejectedValue(reviewRequired409());
    const { hook, setters } = renderGenerationHook(post);

    await act(async () => {
      await hook.result.current.handleSwanCoachWorkoutGenerate(42);
    });

    await waitFor(() => {
      expect(hook.result.current.safetyGateReview).toEqual({
        mode: 'workout',
        clientId: 42,
        signals: ['active_pain_review_required'],
        missingData: [],
      });
    });
    // No generic failure banner for a review-required hold
    const errorCalls = setters.setStatusMsg.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg && msg.type === 'error');
    expect(errorCalls).toEqual([]);
  });

  it('confirming with a reason retries with planningReviewAcknowledged + planningReviewReason', async () => {
    const post = vi.fn()
      .mockRejectedValueOnce(reviewRequired409())
      .mockResolvedValue({ data: { success: true, workout: null } });
    const { hook } = renderGenerationHook(post);

    await act(async () => {
      await hook.result.current.handleSwanCoachWorkoutGenerate(42);
    });
    await waitFor(() => expect(hook.result.current.safetyGateReview).not.toBeNull());

    await act(async () => {
      await hook.result.current.confirmSafetyGateReview('Elbow pain reviewed; pressing removed');
    });

    expect(post).toHaveBeenCalledTimes(2);
    const [, retryBody] = post.mock.calls[1];
    expect(retryBody).toEqual(expect.objectContaining({
      planningReviewAcknowledged: true,
      planningReviewReason: 'Elbow pain reviewed; pressing removed',
    }));
    await waitFor(() => expect(hook.result.current.safetyGateReview).toBeNull());
  });

  it('cancelling clears the review state without a retry', async () => {
    const post = vi.fn().mockRejectedValue(reviewRequired409());
    const { hook } = renderGenerationHook(post);

    await act(async () => {
      await hook.result.current.handleSwanCoachWorkoutGenerate(42);
    });
    await waitFor(() => expect(hook.result.current.safetyGateReview).not.toBeNull());

    act(() => hook.result.current.cancelSafetyGateReview());
    expect(hook.result.current.safetyGateReview).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('a re-blocked acknowledged retry keeps the modal OPEN with fresh signals and surfaces a message (never a silent close)', async () => {
    // Review-queue REVISE item (2026-07-12): the retry's 409 was previously
    // discarded — the modal closed, no message appeared, and the trainer's
    // written reason was lost while nothing had been generated.
    const secondBlock = {
      response: {
        status: 409,
        data: {
          success: false,
          code: 'SWAN_COACH_REVIEW_REQUIRED',
          reviewRequiredSignals: ['active_pain_review_required', 'medical_clearance_required'],
          missingCriticalData: ['medical clearance'],
        },
      },
    };
    const post = vi.fn()
      .mockRejectedValueOnce(reviewRequired409())
      .mockRejectedValueOnce(secondBlock);
    const { hook, setters } = renderGenerationHook(post);

    await act(async () => {
      await hook.result.current.handleSwanCoachWorkoutGenerate(42);
    });
    await waitFor(() => expect(hook.result.current.safetyGateReview).not.toBeNull());

    await act(async () => {
      await hook.result.current.confirmSafetyGateReview('Reviewed with client');
    });

    // Modal state stays open, carrying the SECOND block's signals.
    expect(hook.result.current.safetyGateReview).toEqual({
      mode: 'workout',
      clientId: 42,
      signals: ['active_pain_review_required', 'medical_clearance_required'],
      missingData: ['medical clearance'],
    });
    // And the re-block is surfaced, not silent.
    const errorCalls = setters.setStatusMsg.mock.calls
      .map(([msg]) => msg)
      .filter((msg) => msg && msg.type === 'error');
    expect(errorCalls.length).toBeGreaterThan(0);
  });

  it('plan generation opens the review state in plan mode', async () => {
    const post = vi.fn().mockRejectedValue(reviewRequired409());
    const { hook } = renderGenerationHook(post);

    await act(async () => {
      await hook.result.current.handleGeneratePlan(42);
    });
    await waitFor(() => {
      expect(hook.result.current.safetyGateReview).toEqual(
        expect.objectContaining({ mode: 'plan', clientId: 42 }),
      );
    });
  });
});
