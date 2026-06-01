import { useCallback, useRef, useState } from 'react';
import type { CoachMessageData } from '../SwanCoachTypes';
import { useTranscriptIntake } from './useTranscriptIntake';

type TranscriptReviewData = NonNullable<
  NonNullable<CoachMessageData['metadata']>['transcriptReview']
>;
type TranscriptResultData = NonNullable<
  NonNullable<CoachMessageData['metadata']>['transcriptResult']
>;
type TranscriptErrorData = NonNullable<
  NonNullable<CoachMessageData['metadata']>['transcriptError']
>;
export type TranscriptProcessingState =
  | { stage: 'uploading' | 'parsing'; fileName: string }
  | null;

type TranscriptReviewEntry = {
  userMsgId: string;
  review: TranscriptReviewData | null;
};

type TranscriptReviewCoachApi = {
  appendTranscriptError: (
    error: TranscriptErrorData,
  ) => { userMsgId: string; errorMsgId: string };
  appendTranscriptReview: (
    review: TranscriptReviewData,
  ) => { userMsgId: string; reviewMsgId: string };
  removeTranscriptMessages: (userMsgId: string, reviewMsgId: string) => void;
  transcriptReviewToResult: (reviewMsgId: string, result: TranscriptResultData) => void;
  updateTranscriptReview: (
    reviewMsgId: string,
    patch: Partial<TranscriptReviewData>,
  ) => void;
};

export function useSwanCoachTranscriptReview({ coach }: { coach: TranscriptReviewCoachApi }) {
  const intake = useTranscriptIntake();
  const [transcriptProcessing, setTranscriptProcessing] =
    useState<TranscriptProcessingState>(null);
  const transcriptReviewsRef = useRef<Map<string, TranscriptReviewEntry>>(new Map());

  const registerTranscriptError = useCallback((errorMsgId: string, userMsgId: string) => {
    if (!errorMsgId) return;
    transcriptReviewsRef.current.set(errorMsgId, { userMsgId, review: null });
  }, []);

  const registerTranscriptReview = useCallback(
    (reviewMsgId: string, userMsgId: string, review: TranscriptReviewData) => {
      if (!reviewMsgId) return;
      transcriptReviewsRef.current.set(reviewMsgId, { userMsgId, review });
    },
    [],
  );

  const handleConfirmTranscript = useCallback(
    async (reviewMsgId: string) => {
      const entry = transcriptReviewsRef.current.get(reviewMsgId);
      if (!entry || !entry.review) return;

      coach.updateTranscriptReview(reviewMsgId, { applying: true, applyError: undefined });
      const apply = await intake.applyParsedWorkout(entry.review);

      if (apply.ok) {
        coach.transcriptReviewToResult(reviewMsgId, {
          clientId: entry.review.clientId,
          exerciseCount: apply.result.exerciseCount,
          totalSets: apply.result.totalSets,
          workoutId: apply.result.workoutId,
          xpAwarded: apply.result.xpAwarded,
          streakDays: apply.result.streakDays,
          fileName: entry.review.fileName,
        });
        transcriptReviewsRef.current.delete(reviewMsgId);
        return;
      }

      const failure = apply.failure;
      coach.updateTranscriptReview(reviewMsgId, {
        applying: false,
        applyError: failure.error,
        applyErrorKind:
          failure.kind === 'duplicate_date'
            ? 'duplicate_date'
            : failure.kind === 'future_date'
              ? 'future_date'
              : failure.kind === 'validation'
                ? 'validation'
                : failure.kind === 'network'
                  ? 'network'
                  : failure.kind === 'server'
                    ? 'server'
                    : 'other',
      });
    },
    [coach, intake],
  );

  const handleTranscriptDateChange = useCallback(
    (reviewMsgId: string, nextDate: string) => {
      const entry = transcriptReviewsRef.current.get(reviewMsgId);
      if (entry && entry.review) {
        entry.review.targetWorkoutDate = nextDate;
      }
      coach.updateTranscriptReview(reviewMsgId, {
        targetWorkoutDate: nextDate,
        applyError: undefined,
        applyErrorKind: undefined,
      });
    },
    [coach],
  );

  const handleCancelTranscript = useCallback(
    (reviewMsgId: string) => {
      const entry = transcriptReviewsRef.current.get(reviewMsgId);
      if (!entry) return;
      coach.removeTranscriptMessages(entry.userMsgId, reviewMsgId);
      transcriptReviewsRef.current.delete(reviewMsgId);
    },
    [coach],
  );

  return {
    handleCancelTranscript,
    handleConfirmTranscript,
    handleTranscriptDateChange,
    intake,
    registerTranscriptError,
    registerTranscriptReview,
    setTranscriptProcessing,
    transcriptProcessing,
  };
}

export default useSwanCoachTranscriptReview;
