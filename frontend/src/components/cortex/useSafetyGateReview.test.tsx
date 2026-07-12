/**
 * Cortex Phase 2D — generic acknowledged-review hook contract tests
 * (post-ship hostile-review lock: the shared hook shipped without its own
 * unit coverage; the planner path was tested, this path only transitively).
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseSafetyGateReviewError, useSafetyGateReview } from './useSafetyGateReview';

const review409 = {
  response: {
    status: 409,
    data: {
      code: 'SWAN_COACH_REVIEW_REQUIRED',
      reviewRequiredSignals: ['active_pain_review_required'],
      missingCriticalData: ['pain/injury context'],
    },
  },
};

describe('parseSafetyGateReviewError', () => {
  it('parses only the exact 409 review contract', () => {
    expect(parseSafetyGateReviewError(review409)).toEqual({
      signals: ['active_pain_review_required'],
      missingData: ['pain/injury context'],
    });
    expect(parseSafetyGateReviewError({ response: { status: 500, data: {} } })).toBeNull();
    expect(parseSafetyGateReviewError({ response: { status: 409, data: { code: 'OTHER' } } })).toBeNull();
    expect(parseSafetyGateReviewError(new Error('plain'))).toBeNull();
    expect(parseSafetyGateReviewError(undefined)).toBeNull();
  });

  it('drops non-string junk from the signal lists', () => {
    const parsed = parseSafetyGateReviewError({
      response: { status: 409, data: { code: 'SWAN_COACH_REVIEW_REQUIRED', reviewRequiredSignals: ['ok', 7, null], missingCriticalData: 'not-an-array' } },
    });
    expect(parsed).toEqual({ signals: ['ok'], missingData: [] });
  });
});

describe('useSafetyGateReview', () => {
  it('confirm calls the retry closure with the trimmed-reason ack, then clears', async () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(() => useSafetyGateReview());

    act(() => hook.result.current.requestSafetyGateReview({ signals: ['s'], missingData: [] }, retry));
    expect(hook.result.current.review?.signals).toEqual(['s']);

    await act(async () => { await hook.result.current.confirmSafetyGateReview('  reviewed with client  '); });
    expect(retry).toHaveBeenCalledWith({
      planningReviewAcknowledged: true,
      planningReviewReason: 'reviewed with client',
    });
    expect(hook.result.current.review).toBeNull();
  });

  it('empty/whitespace reason is a no-op (a charming no needs a real why)', async () => {
    const retry = vi.fn();
    const hook = renderHook(() => useSafetyGateReview());
    act(() => hook.result.current.requestSafetyGateReview({ signals: [], missingData: [] }, retry));
    await act(async () => { await hook.result.current.confirmSafetyGateReview('   '); });
    expect(retry).not.toHaveBeenCalled();
    expect(hook.result.current.review).not.toBeNull();
  });

  it('a FAILING retry keeps acknowledging=false afterward and leaves the dialog dismissible', async () => {
    const retry = vi.fn().mockRejectedValue(new Error('server down'));
    const hook = renderHook(() => useSafetyGateReview());
    act(() => hook.result.current.requestSafetyGateReview({ signals: [], missingData: [] }, retry));
    await act(async () => {
      await hook.result.current.confirmSafetyGateReview('reason').catch(() => {});
    });
    expect(hook.result.current.acknowledging).toBe(false);
    act(() => hook.result.current.cancelSafetyGateReview());
    expect(hook.result.current.review).toBeNull();
  });
});
