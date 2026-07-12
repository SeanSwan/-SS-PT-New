/**
 * Hook: useSafetyGateReview (generic)
 * PURPOSE: Cortex Phase 2D — ONE acknowledged-review flow for every generation
 * surface (409 SWAN_COACH_REVIEW_REQUIRED → SafetyGateModal → retry with
 * planningReviewAcknowledged + written reason). The Workout Planner shipped
 * the first wiring; WorkoutBuilderPage and WorkoutPlanBuilder use this
 * surface-agnostic version (directive §5.3 / §13.5.9).
 */
import { useCallback, useState } from 'react';

export interface PlanningReviewAck {
  planningReviewAcknowledged: true;
  planningReviewReason: string;
}

export interface SafetyGateReviewDetails {
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
export function parseSafetyGateReviewError(err: unknown): SafetyGateReviewDetails | null {
  const response = (err as AxiosLikeReviewError)?.response;
  if (response?.status !== 409 || response?.data?.code !== 'SWAN_COACH_REVIEW_REQUIRED') return null;
  return {
    signals: stringList(response.data?.reviewRequiredSignals),
    missingData: stringList(response.data?.missingCriticalData),
  };
}

interface PendingReview extends SafetyGateReviewDetails {
  retry: (ack: PlanningReviewAck) => Promise<void>;
}

/**
 * Generic acknowledged-review state. The surface hands in a retry closure at
 * request time, so any call shape can adopt the contract.
 */
export function useSafetyGateReview() {
  const [review, setReview] = useState<PendingReview | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const requestSafetyGateReview = useCallback((
    details: SafetyGateReviewDetails,
    retry: (ack: PlanningReviewAck) => Promise<void>,
  ) => {
    setReview({ ...details, retry });
  }, []);

  const cancelSafetyGateReview = useCallback(() => setReview(null), []);

  const confirmSafetyGateReview = useCallback(async (reason: string) => {
    if (!review || !reason.trim()) return;
    setAcknowledging(true);
    try {
      await review.retry({ planningReviewAcknowledged: true, planningReviewReason: reason.trim() });
      setReview(null);
    } finally {
      setAcknowledging(false);
    }
  }, [review]);

  return { review, acknowledging, requestSafetyGateReview, cancelSafetyGateReview, confirmSafetyGateReview };
}
