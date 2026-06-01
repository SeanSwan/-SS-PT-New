/**
 * ============================================================================
 * FILE: useTranscriptIntake.ts
 * PURPOSE: Coach Assistant transcript-class file intake hook.
 * ============================================================================
 *
 * Upload is review-only through POST /api/workout-logs/upload. Confirm/apply
 * maps the parsed workout to the canonical admin workout logger payload and
 * writes through adminClient.logWorkout.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { createAdminClientService } from '../../../../../services/adminClientService';
import { getLocalIsoDate, isFutureLocalDate } from '../../../../../utils/localDate';
import {
  parsedWorkoutToLogPayload,
  type LogWorkoutPayload,
  type ParsedWorkout,
} from '../utils/parsedWorkoutToLogPayload';
import { safeTranscriptUploadFailure } from '../CoachIntakeOperationalText.logic';
import type {
  ApplyOutcome,
  TranscriptReviewData,
  UploadOutcome,
  UseTranscriptIntakeReturn,
} from './useTranscriptIntake.types';

export function useTranscriptIntake(): UseTranscriptIntakeReturn {
  const { authAxios } = useAuth();
  const adminClient = useMemo(() => createAdminClientService(authAxios), [authAxios]);

  const uploadTranscript = useCallback(
    async (file: File, clientId: number): Promise<UploadOutcome> => {
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
            },
          };
        }

        return {
          ok: false,
          failure: {
            error: 'Upload completed but the response was malformed',
            kind: 'server',
          },
        };
      } catch (err: unknown) {
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

        if (status === 429) {
          return {
            ok: false,
            failure: { error: safeTranscriptUploadFailure('rate_limit'), kind: 'rate_limit' },
          };
        }
        if (status >= 400 && status < 500) {
          return {
            ok: false,
            failure: { error: safeTranscriptUploadFailure('validation'), kind: 'validation' },
          };
        }
        return {
          ok: false,
          failure: { error: safeTranscriptUploadFailure('server'), kind: 'server' },
        };
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

      const effectiveDate =
        (review.targetWorkoutDate && review.targetWorkoutDate.trim()) ||
        (review.parsedWorkout.date && review.parsedWorkout.date.trim()) ||
        getLocalIsoDate();

      if (isFutureLocalDate(effectiveDate)) {
        return {
          ok: false,
          failure: {
            error: 'Workout date cannot be in the future. Pick today or an earlier date and retry.',
            kind: 'future_date',
          },
        };
      }

      const payload: LogWorkoutPayload = parsedWorkoutToLogPayload(review.parsedWorkout, {
        fallbackTitle: 'Voice Memo Workout',
        fallbackDate: review.parsedWorkout.date,
        targetDate: effectiveDate,
      });

      if (payload.exercises.length === 0) {
        return {
          ok: false,
          failure: {
            error: 'Parsed workout had no usable exercises after filtering. Re-upload or edit manually.',
            kind: 'validation',
          },
        };
      }

      const totalSets = payload.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

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
        const e = err as {
          message?: string;
          response?: { status?: number; data?: { error?: string; code?: string } };
        };
        const status = e.response?.status;
        const backendMsg = e.response?.data?.error || e.message || '';
        const looksLikeDuplicate =
          status === 409 ||
          /already exists/i.test(backendMsg) ||
          e.response?.data?.code === 'DUPLICATE_DATE';
        const looksLikeFuture = /cannot be in the future/i.test(backendMsg);

        if (looksLikeDuplicate) {
          return {
            ok: false,
            failure: {
              error:
                'This client already has a workout logged on that date. Change the date above and retry, or discard and edit the existing session.',
              kind: 'duplicate_date',
            },
          };
        }
        if (looksLikeFuture) {
          return {
            ok: false,
            failure: {
              error: 'Workout date cannot be in the future. Pick today or an earlier date and retry.',
              kind: 'future_date',
            },
          };
        }
        return {
          ok: false,
          failure: {
            error: 'Failed to apply workout to the log',
            kind: 'server',
          },
        };
      }
    },
    [adminClient],
  );

  return { uploadTranscript, applyParsedWorkout };
}
