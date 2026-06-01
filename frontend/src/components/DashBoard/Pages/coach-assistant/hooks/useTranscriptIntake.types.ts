import type { ParsedWorkout } from '../utils/parsedWorkoutToLogPayload';

export interface TranscriptReviewData {
  /** The full transcript text returned by the upload pipeline. */
  transcript: string;
  /** The structured parsed workout returned by the parser service. */
  parsedWorkout: ParsedWorkout;
  /** Source file metadata for display in the review card. */
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  /** The client this transcript was uploaded for. */
  clientId: number;
  /** User-editable target date for the confirmed apply step. */
  targetWorkoutDate?: string;
}

export interface TranscriptApplyResult {
  /** Backend response body from POST /api/admin/clients/:id/workouts. */
  raw: Record<string, unknown> | null;
  /** Convenience: workout-log id if returned. */
  workoutId?: string | number;
  /** Convenience: XP awarded if returned. */
  xpAwarded?: number;
  /** Convenience: streak days if returned. */
  streakDays?: number;
  /** Always the count shipped to the backend, for the result card. */
  exerciseCount: number;
  totalSets: number;
}

export interface UploadFailure {
  error: string;
  kind:
    | 'validation'
    | 'rate_limit'
    | 'network'
    | 'server'
    | 'unknown'
    | 'duplicate_date'
    | 'future_date';
}

export type UploadOutcome =
  | { ok: true; review: TranscriptReviewData }
  | { ok: false; failure: UploadFailure };

export type ApplyOutcome =
  | { ok: true; result: TranscriptApplyResult }
  | { ok: false; failure: UploadFailure };

export interface UseTranscriptIntakeReturn {
  uploadTranscript: (file: File, clientId: number) => Promise<UploadOutcome>;
  applyParsedWorkout: (review: TranscriptReviewData) => Promise<ApplyOutcome>;
}
