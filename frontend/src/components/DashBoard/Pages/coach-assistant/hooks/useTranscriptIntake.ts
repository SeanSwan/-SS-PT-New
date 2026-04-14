/**
 * ============================================================================
 * FILE: useTranscriptIntake.ts
 * PURPOSE: Coach Assistant transcript-class file intake hook
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-14
 * AI VILLAGE VALIDATED: pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Owns the upload + apply async lifecycle for transcript-class files
 * (audio + text + pdf) dropped into the Coach Assistant chat. Exposes two
 * thin async functions that the page wires into its message lifecycle:
 *
 *   - uploadTranscript(file, clientId)
 *       Posts the file to POST /api/workout-logs/upload, returns the parsed
 *       review data (transcript + parsed workout + metadata). Does NOT
 *       write to the database yet — this is the review step.
 *
 *   - applyParsedWorkout(reviewData)
 *       Maps the parsed workout into the canonical logWorkout payload via
 *       parsedWorkoutToLogPayload, then posts to
 *       POST /api/admin/clients/:clientId/workouts via adminClientService.
 *       This is the confirm/apply step.
 *
 * HOW IT FITS IN THE APP:
 *   SwanCoachAssistantPage → handleSend → (transcript-class branch)
 *     → useTranscriptIntake.uploadTranscript()
 *     → coach.appendTranscriptReview(reviewData)
 *     → CoachMessage renders TranscriptReviewCard
 *     → user clicks Confirm
 *     → useTranscriptIntake.applyParsedWorkout(reviewData)
 *     → coach.transcriptReviewToResult(msgId, resultData)
 *     → CoachMessage renders TranscriptResultCard
 *
 * WHY ASYNC FUNCTIONS, NOT STATE-OWNING HOOK:
 * The page already owns message lifecycle via useCoachAssistant. Layering
 * separate state in this hook would create two sources of truth for the
 * review status. Pure async functions keep the hook small and let the page
 * encode lifecycle in the message metadata instead.
 *
 * BACKEND CONTRACT: see backend/routes/workoutLogUploadRoutes.mjs:81-149
 * BACKEND CONTRACT: see frontend/src/services/adminClientService.ts:497
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { createAdminClientService } from '../../../../../services/adminClientService';
import {
  parsedWorkoutToLogPayload,
  type ParsedWorkout,
  type LogWorkoutPayload,
} from '../utils/parsedWorkoutToLogPayload';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
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
  clientName?: string;
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
  /** Always the count we shipped to the backend, for the result card. */
  exerciseCount: number;
  totalSets: number;
}

export interface UploadFailure {
  error: string;
  /** Distinguish 4xx (bad file/no client) from 5xx (server) for UX. */
  kind: 'validation' | 'rate_limit' | 'network' | 'server' | 'unknown';
}

export type UploadOutcome =
  | { ok: true; review: TranscriptReviewData }
  | { ok: false; failure: UploadFailure };

export type ApplyOutcome =
  | { ok: true; result: TranscriptApplyResult }
  | { ok: false; failure: UploadFailure };

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export interface UseTranscriptIntakeReturn {
  /**
   * Upload a transcript-class file to /api/workout-logs/upload. Does not
   * write to the workout log — returns parsed review data for the user
   * to confirm.
   */
  uploadTranscript: (file: File, clientId: number, clientName?: string) => Promise<UploadOutcome>;

  /**
   * Apply a previously-reviewed parsed workout to the canonical workout
   * log via POST /api/admin/clients/:clientId/workouts.
   */
  applyParsedWorkout: (review: TranscriptReviewData) => Promise<ApplyOutcome>;
}

export function useTranscriptIntake(): UseTranscriptIntakeReturn {
  const { authAxios } = useAuth();
  // Memoize service so repeated calls don't reconstruct the axios wrapper.
  const adminClient = useMemo(() => createAdminClientService(authAxios), [authAxios]);

  const uploadTranscript = useCallback(
    async (file: File, clientId: number, clientName?: string): Promise<UploadOutcome> => {
      // Defensive client-side validation — the route enforces these too,
      // but failing fast saves a network round-trip and gives clearer UX.
      if (!file) {
        return { ok: false, failure: { error: 'No file provided', kind: 'validation' } };
      }
      if (!clientId) {
        return {
          ok: false,
          failure: {
            error: 'A client must be selected before uploading a transcript',
            kind: 'validation',
          },
        };
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('clientId', String(clientId));

        const response = await authAxios.post('/api/workout-logs/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          // 2 minutes — large audio files can take a while at AssemblyAI.
          timeout: 120_000,
        });

        const data = response?.data;
        if (data?.success && data.parsedWorkout && typeof data.transcript === 'string') {
          return {
            ok: true,
            review: {
              transcript: data.transcript,
              parsedWorkout: data.parsedWorkout as ParsedWorkout,
              fileName: file.name,
              fileSize: file.size,
              fileMimeType: file.type,
              clientId,
              clientName,
            },
          };
        }

        return {
          ok: false,
          failure: {
            error: data?.error || 'Upload completed but the response was malformed',
            kind: 'server',
          },
        };
      } catch (err: unknown) {
        // Type-narrow without casting to any
        const e = err as {
          code?: string;
          response?: { status?: number; data?: { error?: string } };
          message?: string;
        };

        if (e.code === 'ECONNABORTED') {
          return {
            ok: false,
            failure: {
              error: 'Upload timed out. The file may be too large or the server is busy.',
              kind: 'network',
            },
          };
        }
        if (!e.response) {
          return {
            ok: false,
            failure: {
              error: 'Network error. Please check your connection and try again.',
              kind: 'network',
            },
          };
        }

        const status = e.response.status ?? 0;
        const message = e.response.data?.error || e.message || 'Upload failed';

        if (status === 429) {
          return { ok: false, failure: { error: message, kind: 'rate_limit' } };
        }
        if (status >= 400 && status < 500) {
          return { ok: false, failure: { error: message, kind: 'validation' } };
        }
        return { ok: false, failure: { error: message, kind: 'server' } };
      }
    },
    [authAxios],
  );

  const applyParsedWorkout = useCallback(
    async (review: TranscriptReviewData): Promise<ApplyOutcome> => {
      if (!review || !review.parsedWorkout) {
        return {
          ok: false,
          failure: { error: 'No review data to apply', kind: 'validation' },
        };
      }
      if (!review.clientId) {
        return {
          ok: false,
          failure: { error: 'Cannot apply: no client id on review', kind: 'validation' },
        };
      }

      const payload: LogWorkoutPayload = parsedWorkoutToLogPayload(review.parsedWorkout, {
        fallbackTitle: 'Voice Memo Workout',
        fallbackDate: review.parsedWorkout.date,
      });

      // The backend rejects empty exercise arrays — surface this as a
      // validation failure so the review card can offer re-upload.
      if (payload.exercises.length === 0) {
        return {
          ok: false,
          failure: {
            error: 'Parsed workout had no usable exercises after filtering. Re-upload or edit manually.',
            kind: 'validation',
          },
        };
      }

      const totalSets = payload.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

      try {
        const response = await adminClient.logWorkout(review.clientId, payload);
        const raw = (response ?? null) as Record<string, unknown> | null;
        const xp = (raw?.xp ?? null) as { pointsAwarded?: number; streakDays?: number } | null;
        return {
          ok: true,
          result: {
            raw,
            workoutId: (raw?.workoutId ?? raw?.id) as string | number | undefined,
            xpAwarded: xp?.pointsAwarded,
            streakDays: xp?.streakDays,
            exerciseCount: payload.exercises.length,
            totalSets,
          },
        };
      } catch (err: unknown) {
        const e = err as { message?: string };
        return {
          ok: false,
          failure: {
            error: e.message || 'Failed to apply workout to the log',
            kind: 'server',
          },
        };
      }
    },
    [adminClient],
  );

  return { uploadTranscript, applyParsedWorkout };
}
