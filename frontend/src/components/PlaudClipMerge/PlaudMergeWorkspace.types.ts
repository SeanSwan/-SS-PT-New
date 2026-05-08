import type { MergeRequestDetail, MergeResponse } from '../../services/plaudMergeService';

export interface PlaudMergeReviewState {
  mergeRequestId: string;
  clientId: number | null;
  clientName?: string | null;
  transcript: string;
  parsedWorkout: MergeResponse['parsedWorkout'];
  dateSplitCandidates?: MergeRequestDetail['dateSplitCandidates'];
  clipTimeline: NonNullable<MergeResponse['clipTimeline']>;
  boundaryWarning: MergeResponse['boundaryWarning'];
  source: 'fresh' | 'resume';
}

export interface PlaudMergeConfirmState {
  workoutId?: number | string;
  workoutIds?: Array<number | string>;
  segmentCount?: number;
  mergeMarkedApproved?: boolean;
}
