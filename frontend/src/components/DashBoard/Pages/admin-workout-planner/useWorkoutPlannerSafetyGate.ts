/**
 * Hook: useWorkoutPlannerSafetyGate
 * Purpose: Own the Cortex acknowledged-review contract for the Workout Planner
 * (409 SWAN_COACH_REVIEW_REQUIRED → SafetyGateModal → retry with
 * planningReviewAcknowledged + written reason). Directive §5.3 / §13.5.9.
 */
import { useCallback, useState } from 'react';

export type SafetyGateGenerationMode = 'workout' | 'plan';

export interface SafetyGateReviewState {
  mode: SafetyGateGenerationMode;
  clientId: number;
  signals: string[];
  missingData: string[];
}

interface AxiosLikeReviewError {
  response?: {
    status?: number;
    data?: {
      code?: string;
      reviewRequiredSignals?: unknown;
      missingCriticalData?: unknown;
    };
  };
}

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** Parse a generation error into review-required details, or null. */
export function parseSafetyGateReviewError(err: unknown): { signals: string[]; missingData: string[] } | null {
  const response = (err as AxiosLikeReviewError)?.response;
  if (response?.status !== 409 || response?.data?.code !== 'SWAN_COACH_REVIEW_REQUIRED') return null;
  return {
    signals: stringList(response.data?.reviewRequiredSignals),
    missingData: stringList(response.data?.missingCriticalData),
  };
}

interface UseWorkoutPlannerSafetyGateInput {
  /**
   * Runs the acknowledged retry. Returns the NEW review state when the gate
   * blocked the retry AGAIN (modal must stay open with fresh signals — a
   * silent close would read as success), or null/void when it went through.
   */
  onAcknowledged: (
    review: SafetyGateReviewState,
    reason: string,
  ) => Promise<SafetyGateReviewState | null | void> | SafetyGateReviewState | null | void;
}

export const useWorkoutPlannerSafetyGate = ({ onAcknowledged }: UseWorkoutPlannerSafetyGateInput) => {
  const [safetyGateReview, setSafetyGateReview] = useState<SafetyGateReviewState | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const openSafetyGateReview = useCallback((review: SafetyGateReviewState) => {
    setSafetyGateReview(review);
  }, []);

  const cancelSafetyGateReview = useCallback(() => {
    setSafetyGateReview(null);
  }, []);

  const confirmSafetyGateReview = useCallback(async (reason: string) => {
    if (!safetyGateReview || !reason.trim()) return;
    setAcknowledging(true);
    try {
      const reblocked = await onAcknowledged(safetyGateReview, reason.trim());
      // Re-blocked retry keeps the modal open with the fresh review state;
      // only a successful pass closes it.
      setSafetyGateReview(reblocked ?? null);
    } finally {
      setAcknowledging(false);
    }
  }, [safetyGateReview, onAcknowledged]);

  return {
    safetyGateReview,
    acknowledging,
    openSafetyGateReview,
    cancelSafetyGateReview,
    confirmSafetyGateReview,
  };
};
