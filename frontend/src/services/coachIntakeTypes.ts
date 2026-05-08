/**
 * coachIntakeTypes.ts
 * ===================
 * Shared frontend types for the canonical Coach intake API.
 */

export type CoachAudioPuzzleConfidence = 'single' | 'high' | 'medium' | 'low';

export type CoachIntakeQueueScope =
  | 'actionable'
  | 'ready_review'
  | 'needs_client'
  | 'unprocessed'
  | 'processing'
  | 'failed';

export interface CoachAudioPuzzleSummary {
  pieceCount: number;
  bundleCount: number;
  autoBundleCount: number;
  needsOrderingReview: boolean;
  confidence: CoachAudioPuzzleConfidence;
}
