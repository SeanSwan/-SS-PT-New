import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { uploadClips } from '../../../../../services/plaudClipService';
import { getLocalIsoDate } from '../../../../../utils/localDate';
import type { CoachMessageData } from '../SwanCoachTypes';
import {
  safeAudioRejectedSummary,
  safeTranscriptFailureReason,
} from '../CoachIntakeOperationalText.logic';
import {
  countTranscriptClassFiles,
  hasOnlyAudioTranscriptFiles,
  hasTranscriptClassFile,
  isTranscriptClassMime,
  type AttachedFile,
  type UseFileAttachmentReturn,
} from './useFileAttachment';
import type { UseTranscriptIntakeReturn } from './useTranscriptIntake.types';
import type { TranscriptProcessingState } from './useSwanCoachTranscriptReview';

type TranscriptReviewData = NonNullable<
  NonNullable<CoachMessageData['metadata']>['transcriptReview']
>;
type TranscriptErrorData = NonNullable<
  NonNullable<CoachMessageData['metadata']>['transcriptError']
>;
type AudioIntakeReceiptData = NonNullable<
  NonNullable<CoachMessageData['metadata']>['audioIntakeReceipt']
>;

type SendRoutingCoachApi = {
  appendAudioIntakeReceipt: (receipt: AudioIntakeReceiptData) => void;
  appendTranscriptError: (
    error: TranscriptErrorData,
  ) => { userMsgId: string; errorMsgId: string };
  appendTranscriptReview: (
    review: TranscriptReviewData,
  ) => { userMsgId: string; reviewMsgId: string };
  clearError: () => void;
  sendMessage: (text: string) => Promise<unknown>;
};

type CoachIntakeQueueApi = {
  refresh: () => void | Promise<unknown>;
};

type SelectedClientLike = {
  id?: number | null;
} | null;

type UseSwanCoachSendRoutingArgs = {
  attachments: UseFileAttachmentReturn;
  coach: SendRoutingCoachApi;
  coachIntakeQueue: CoachIntakeQueueApi;
  injectInputText: (text: string) => void;
  intake: UseTranscriptIntakeReturn;
  registerTranscriptError: (errorMsgId: string, userMsgId: string) => void;
  registerTranscriptReview: (
    reviewMsgId: string,
    userMsgId: string,
    review: TranscriptReviewData,
  ) => void;
  selectedClient: SelectedClientLike;
  setTranscriptProcessing: Dispatch<SetStateAction<TranscriptProcessingState>>;
};

export function useSwanCoachSendRouting({
  attachments,
  coach,
  coachIntakeQueue,
  injectInputText,
  intake,
  registerTranscriptError,
  registerTranscriptReview,
  selectedClient,
  setTranscriptProcessing,
}: UseSwanCoachSendRoutingArgs) {
  const [lastAttempt, setLastAttempt] = useState<string | null>(null);

  const handleSend = useCallback(
    async (text: string) => {
      coach.clearError();
      const files = attachments.files;

      if (files.length > 0 && hasTranscriptClassFile(files)) {
        const routeAudioFilesToPlaudIntake = async (
          audioFiles: AttachedFile[],
          audioLabel: string,
        ) => {
          setTranscriptProcessing({ stage: 'uploading', fileName: audioLabel });
          try {
            const upload = await uploadClips(audioFiles.map((f) => f.file));
            setTranscriptProcessing(null);
            if (upload.clips.length > 0) {
              coach.appendAudioIntakeReceipt({
                fileName: audioLabel,
                acceptedCount: upload.clips.length,
                rejectedCount: upload.rejected.length,
                fileSize: upload.clips.reduce((sum, clip) => sum + clip.size, 0),
                nextActionLabel: 'Review next intake',
                rejectedSummary: safeAudioRejectedSummary(upload.rejected.length),
              });
              attachments.clearFiles();
              void coachIntakeQueue.refresh();
              return;
            }

            const reason = safeTranscriptFailureReason(
              'upload_failed',
              upload.rejected.length > 0
                ? 'The transcript could not be accepted. Check the file format and try again.'
                : 'No audio clips were accepted into PLAUD intake.',
            );
            const { userMsgId, errorMsgId } = coach.appendTranscriptError({
              kind: 'upload_failed',
              fileName: audioLabel,
              fileSize: audioFiles.reduce((sum, f) => sum + f.size, 0),
              reason,
            });
            registerTranscriptError(errorMsgId, userMsgId);
          } catch {
            setTranscriptProcessing(null);
            const reason = safeTranscriptFailureReason(
              'upload_failed',
              'Audio upload failed before it reached PLAUD intake.',
            );
            const { userMsgId, errorMsgId } = coach.appendTranscriptError({
              kind: 'upload_failed',
              fileName: audioLabel,
              fileSize: audioFiles.reduce((sum, f) => sum + f.size, 0),
              reason,
            });
            registerTranscriptError(errorMsgId, userMsgId);
          }
        };

        if (hasOnlyAudioTranscriptFiles(files) && files.length > 1) {
          await routeAudioFilesToPlaudIntake(files, `${files.length} audio pieces`);
          return;
        }

        if (countTranscriptClassFiles(files) > 1) {
          coach.clearError();
          return;
        }

        const transcriptFile = files.find((f) => isTranscriptClassMime(f.type));
        if (!transcriptFile) return;

        const hasSelectedClient = Boolean(selectedClient?.id);
        const isSingleUnresolvedAudio = hasOnlyAudioTranscriptFiles(files)
          && files.length === 1
          && !hasSelectedClient;

        if (isSingleUnresolvedAudio) {
          await routeAudioFilesToPlaudIntake(files, transcriptFile.name);
          return;
        }

        if (!selectedClient?.id) {
          const { userMsgId, errorMsgId } = coach.appendTranscriptError({
            kind: 'no_client',
            fileName: transcriptFile.name,
            fileSize: transcriptFile.size,
            reason: 'Select a client at the top of the page before uploading a transcript.',
          });
          registerTranscriptError(errorMsgId, userMsgId);
          return;
        }

        setTranscriptProcessing({ stage: 'uploading', fileName: transcriptFile.name });
        const upload = await intake.uploadTranscript(transcriptFile.file, selectedClient.id);

        if (upload.ok) {
          setTranscriptProcessing({ stage: 'parsing', fileName: transcriptFile.name });
          const seededDate =
            (upload.review.parsedWorkout.date && upload.review.parsedWorkout.date.trim()) ||
            getLocalIsoDate();
          upload.review.targetWorkoutDate = seededDate;

          const { userMsgId, reviewMsgId } = coach.appendTranscriptReview(upload.review);
          registerTranscriptReview(reviewMsgId, userMsgId, upload.review);
          attachments.clearFiles();
          setTranscriptProcessing(null);
          return;
        }

        setTranscriptProcessing(null);
        const { userMsgId, errorMsgId } = coach.appendTranscriptError({
          kind: 'upload_failed',
          fileName: transcriptFile.name,
          fileSize: transcriptFile.size,
          reason: safeTranscriptFailureReason(upload.failure.kind, upload.failure.error),
        });
        registerTranscriptError(errorMsgId, userMsgId);
        return;
      }

      setLastAttempt(text);
      const result = await coach.sendMessage(text);
      if (result && typeof result === 'object' && 'failed' in result && result.failed) {
        const original = 'originalMessage' in result && typeof result.originalMessage === 'string'
          ? result.originalMessage
          : text;
        injectInputText(original);
        return;
      }
      attachments.clearFiles();
    },
    [
      attachments,
      coach,
      coachIntakeQueue,
      injectInputText,
      intake,
      registerTranscriptError,
      registerTranscriptReview,
      selectedClient,
      setTranscriptProcessing,
    ],
  );

  return { handleSend, lastAttempt };
}

export default useSwanCoachSendRouting;
