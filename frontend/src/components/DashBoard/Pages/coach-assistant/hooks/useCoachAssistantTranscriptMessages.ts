import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { safeAttachmentSourceLabel } from '../CoachIntakeOperationalText.logic';
import type { CoachMessageData } from '../SwanCoachTypes';
import { createCoachMessageId } from '../utils/coachMessageIds';

type CommandMessageSetter = Dispatch<SetStateAction<CoachMessageData[]>>;

export function useCoachAssistantTranscriptMessages(setCommandMessages: CommandMessageSetter) {
  // shows "uploaded <filename>" from the user before the assistant card.

  const appendTranscriptReview = useCallback(
    (review: NonNullable<CoachMessageData['metadata']>['transcriptReview']): { userMsgId: string; reviewMsgId: string } => {
      if (!review) {
        return { userMsgId: '', reviewMsgId: '' };
      }
      const ts = new Date().toISOString();
      const userMsgId = createCoachMessageId('transcript-user');
      const reviewMsgId = createCoachMessageId('transcript-review');
      const sourceLabel = safeAttachmentSourceLabel(review.fileName, 'Transcript file');

      const userMsg: CoachMessageData = {
        id: userMsgId,
        role: 'user',
        content: `Uploaded ${sourceLabel} for review`,
        timestamp: ts,
      };

      const reviewMsg: CoachMessageData = {
        id: reviewMsgId,
        role: 'assistant',
        // Empty content — the card body is rendered from metadata.transcriptReview
        content: '',
        timestamp: ts,
        metadata: { transcriptReview: review },
      };

      setCommandMessages(prev => [...prev, userMsg, reviewMsg]);
      return { userMsgId, reviewMsgId };
    },
    [],
  );

  /**
   * Update an existing review-card message in place. Used to flip the
   * `applying` flag during the apply call, and to attach an `applyError`
   * if the apply failed (so the review stays visible and the user can retry).
   */
  const updateTranscriptReview = useCallback(
    (
      reviewMsgId: string,
      patch: Partial<NonNullable<NonNullable<CoachMessageData['metadata']>['transcriptReview']>>,
    ) => {
      setCommandMessages(prev =>
        prev.map(msg => {
          if (msg.id !== reviewMsgId) return msg;
          const existing = msg.metadata?.transcriptReview;
          if (!existing) return msg;
          return {
            ...msg,
            metadata: {
              ...msg.metadata,
              transcriptReview: { ...existing, ...patch },
            },
          };
        }),
      );
    },
    [],
  );

  /**
   * Replace a review card in place with a result card on successful apply.
   * Drops the transcriptReview metadata and adds transcriptResult so
   * CoachMessage renders the success state.
   */
  const transcriptReviewToResult = useCallback(
    (
      reviewMsgId: string,
      result: NonNullable<NonNullable<CoachMessageData['metadata']>['transcriptResult']>,
    ) => {
      setCommandMessages(prev =>
        prev.map(msg => {
          if (msg.id !== reviewMsgId) return msg;
          const clientCopy = result.clientId ? ' for selected client' : '';
          return {
            ...msg,
            content: `Workout logged${clientCopy}.`,
            metadata: {
              ...msg.metadata,
              transcriptReview: undefined,
              transcriptResult: result,
            },
          };
        }),
      );
    },
    [],
  );

  /**
   * Remove a transcript message (both the user upload bubble and the
   * assistant review/result card) from the conversation. Used by the
   * Cancel button on the review card.
   */
  const removeTranscriptMessages = useCallback(
    (userMsgId: string, reviewMsgId: string) => {
      setCommandMessages(prev =>
        prev.filter(msg => msg.id !== userMsgId && msg.id !== reviewMsgId),
      );
    },
    [],
  );

  /**
   * Append a transcript-intake error card. Used for PRE-upload validation
   * failures (no client) and upload-stage failures (network / 4xx / 5xx).
   *
   * Returns the pair of message ids so the page can track them in the
   * same ref map used for review cards, enabling Dismiss via
   * removeTranscriptMessages.
   *
   * Phase 9.1 hotfix 2026-04-14 — previously these states were injected
   * as fake review cards with applyError set, which rendered a misleading
   * "0 parsed" card with a live (but broken) Apply button.
   */
  const appendTranscriptError = useCallback(
    (
      error: NonNullable<CoachMessageData['metadata']>['transcriptError'],
    ): { userMsgId: string; errorMsgId: string } => {
      if (!error) {
        return { userMsgId: '', errorMsgId: '' };
      }
      const ts = new Date().toISOString();
      const userMsgId = createCoachMessageId('transcript-user');
      const errorMsgId = createCoachMessageId('transcript-error');

      // Phase 9.1.1 polish 2026-04-14:
      // Truthful user-bubble copy per failure kind. The previous string
      // ("Uploaded X for review") was inaccurate for both error kinds:
      //   - no_client: no upload happened, the send was blocked before
      //     the file touched the network
      //   - upload_failed: a request was made but the file never reached
      //     the review step — it failed during upload/transcription/parse
      // The success path (appendTranscriptReview) still uses
      // "Uploaded X for review" because there the file actually reached
      // review state.
      const sourceLabel = safeAttachmentSourceLabel(error.fileName, 'Transcript file');
      const userBubbleContent =
        error.kind === 'upload_failed'
          ? `Tried to upload ${sourceLabel}`
          : `Attached ${sourceLabel}`;

      const userMsg: CoachMessageData = {
        id: userMsgId,
        role: 'user',
        content: userBubbleContent,
        timestamp: ts,
      };

      const errorMsg: CoachMessageData = {
        id: errorMsgId,
        role: 'assistant',
        content: '',
        timestamp: ts,
        metadata: { transcriptError: error },
      };

      setCommandMessages(prev => [...prev, userMsg, errorMsg]);
      return { userMsgId, errorMsgId };
    },
    [],
  );

  const appendAudioIntakeReceipt = useCallback(
    (
      receipt: NonNullable<CoachMessageData['metadata']>['audioIntakeReceipt'],
    ): { userMsgId: string; receiptMsgId: string } => {
      if (!receipt) {
        return { userMsgId: '', receiptMsgId: '' };
      }
      const ts = new Date().toISOString();
      const userMsgId = createCoachMessageId('audio-intake-user');
      const receiptMsgId = createCoachMessageId('audio-intake-receipt');
      const pieceCopy = `${receipt.acceptedCount} audio piece${receipt.acceptedCount !== 1 ? 's' : ''}`;

      const userMsg: CoachMessageData = {
        id: userMsgId,
        role: 'user',
        content: `Uploaded ${pieceCopy} to PLAUD intake`,
        timestamp: ts,
      };

      const receiptMsg: CoachMessageData = {
        id: receiptMsgId,
        role: 'assistant',
        content: '',
        timestamp: ts,
        metadata: { audioIntakeReceipt: receipt },
      };

      setCommandMessages(prev => [...prev, userMsg, receiptMsg]);
      return { userMsgId, receiptMsgId };
    },
    [],
  );

  return {
    appendTranscriptReview,
    updateTranscriptReview,
    transcriptReviewToResult,
    removeTranscriptMessages,
    appendTranscriptError,
    appendAudioIntakeReceipt,
  };
}
