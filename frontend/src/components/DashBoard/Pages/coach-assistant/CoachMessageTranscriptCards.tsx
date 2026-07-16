import type { ChangeEventHandler } from 'react';
import { AlertTriangle, CheckCircle2, FileAudio, ListChecks, Loader2, X } from 'lucide-react';
import type { CoachMessageData } from './SwanCoachTypes';
import { getLocalIsoDate } from '../../../../utils/localDate';
import { safeAudioRejectedSummary, safeAttachmentSourceLabel, safeCommandActionLabel, safeTranscriptFailureReason } from './CoachIntakeOperationalText.logic';
import { CardLabel, CardRow, CardTitle, CardValue, ConfidenceBadge, DateInput, DateRow, PainFlagBadge, PainFlagsWrap, ReceiptActionButton, SuccessCardValue, TranscriptActions, TranscriptBtn, TranscriptCard, TranscriptDetails, TranscriptError, TranscriptErrorCard, SoftErrorCardTitle } from './CoachMessage.styles';
type CoachMessageMetadata = NonNullable<CoachMessageData['metadata']>;
type CoachParsedWorkout = NonNullable<NonNullable<CoachMessageMetadata['transcriptReview']>['parsedWorkout']>;
type CoachTranscriptPainFlag = NonNullable<CoachParsedWorkout['painFlags']>[number];
function confidenceLevel(c?: number): 'high' | 'medium' | 'low' {
  if (typeof c !== 'number') return 'low';
  if (c >= 0.8) return 'high';
  if (c >= 0.6) return 'medium';
  return 'low';
}
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
const coachTranscriptPainFlagKey = (flag: CoachTranscriptPainFlag): string =>
  ['pain', flag.side, flag.bodyRegion, flag.mention].filter(Boolean).join('|');
interface CoachMessageTranscriptCardsProps {
  transcriptReview?: CoachMessageMetadata['transcriptReview'];
  transcriptResult?: CoachMessageMetadata['transcriptResult'];
  transcriptError?: CoachMessageMetadata['transcriptError'];
  audioIntakeReceipt?: CoachMessageMetadata['audioIntakeReceipt'];
  localApplying: boolean;
  onTranscriptConfirm: () => Promise<void>;
  onTranscriptCancel: () => void;
  onTranscriptDateChange: ChangeEventHandler<HTMLInputElement>;
  onAudioIntakeReviewNext?: () => void;
  audioIntakeReviewNextPending?: boolean;
}
export const CoachMessageTranscriptCards = ({
  transcriptReview,
  transcriptResult,
  transcriptError,
  audioIntakeReceipt,
  localApplying,
  onTranscriptConfirm,
  onTranscriptCancel,
  onTranscriptDateChange,
  onAudioIntakeReviewNext,
  audioIntakeReviewNextPending,
}: CoachMessageTranscriptCardsProps) => {
  const audioIntakeNextAction = audioIntakeReceipt
    ? safeCommandActionLabel(audioIntakeReceipt.nextActionLabel) || 'Review next intake'
    : null;
  const transcriptErrorReason = transcriptError
    ? safeTranscriptFailureReason(transcriptError.kind, transcriptError.reason)
    : null;
  const audioRejectedSummary = audioIntakeReceipt
    ? safeAudioRejectedSummary(audioIntakeReceipt.rejectedCount)
    : undefined;
  return (
    <>
      {transcriptReview && (
        <TranscriptCard data-testid="transcript-review-card">
          <CardTitle>
            <FileAudio size={16} />
            Transcript parsed - review &amp; apply
            {typeof transcriptReview.parsedWorkout?.confidence === 'number' && (
              <ConfidenceBadge $level={confidenceLevel(transcriptReview.parsedWorkout.confidence)}>
                {Math.round(transcriptReview.parsedWorkout.confidence * 100)}% confidence
              </ConfidenceBadge>
            )}
          </CardTitle>
          <CardRow>
            <CardLabel>File</CardLabel>
            <CardValue>
              {safeAttachmentSourceLabel(transcriptReview.fileName, 'Transcript file')} (
              {formatBytes(transcriptReview.fileSize)})
            </CardValue>
          </CardRow>
          {transcriptReview.clientId && (
            <CardRow>
              <CardLabel>Client</CardLabel>
              <CardValue>Selected client</CardValue>
            </CardRow>
          )}
          <CardRow>
            <CardLabel>Exercises</CardLabel>
            <CardValue>{transcriptReview.parsedWorkout?.exercises?.length ?? 0} parsed</CardValue>
          </CardRow>
          {typeof transcriptReview.parsedWorkout?.overallIntensity === 'number' && (
            <CardRow>
              <CardLabel>Intensity</CardLabel>
              <CardValue>{transcriptReview.parsedWorkout.overallIntensity}/10</CardValue>
            </CardRow>
          )}
          <DateRow data-testid="transcript-date-row">
            <CardLabel>Workout date</CardLabel>
            <DateInput
              data-testid="transcript-date-input"
              value={
                transcriptReview.targetWorkoutDate ||
                transcriptReview.parsedWorkout?.date ||
                getLocalIsoDate()
              }
              max={getLocalIsoDate()}
              disabled={transcriptReview.applying || localApplying}
              onChange={onTranscriptDateChange}
              aria-label="Workout date (required)"
            />
          </DateRow>
          {transcriptReview.parsedWorkout?.painFlags &&
            transcriptReview.parsedWorkout.painFlags.length > 0 && (
              <PainFlagsWrap>
                {transcriptReview.parsedWorkout.painFlags.map((flag) => (
                  <PainFlagBadge key={coachTranscriptPainFlagKey(flag)}>
                    <AlertTriangle size={11} />
                    {flag.side ? `${flag.side} ` : ''}{flag.bodyRegion}
                  </PainFlagBadge>
                ))}
              </PainFlagsWrap>
            )}
          <TranscriptDetails>
            <summary>View transcript</summary>
            <pre>{transcriptReview.transcript}</pre>
          </TranscriptDetails>

          {transcriptReview.applyError && (
            <TranscriptError
              data-testid="transcript-apply-error"
              $kind={
                transcriptReview.applyErrorKind === 'duplicate_date'
                  ? 'duplicate_date'
                  : transcriptReview.applyErrorKind === 'future_date'
                    ? 'future_date'
                    : 'other'
              }
            >
              <AlertTriangle size={14} />
              <span>{transcriptReview.applyError}</span>
            </TranscriptError>
          )}

          <TranscriptActions>
            <TranscriptBtn
              type="button"
              $danger
              onClick={onTranscriptCancel}
              disabled={transcriptReview.applying || localApplying}
              data-testid="transcript-cancel-btn"
            >
              <X size={14} /> Discard
            </TranscriptBtn>
            <TranscriptBtn
              type="button"
              $primary
              onClick={() => { void onTranscriptConfirm(); }}
              disabled={transcriptReview.applying || localApplying}
              data-testid="transcript-confirm-btn"
            >
              {transcriptReview.applying || localApplying ? (
                <>
                  <Loader2 size={14} /> Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Apply to workout log
                </>
              )}
            </TranscriptBtn>
          </TranscriptActions>
        </TranscriptCard>
      )}

      {transcriptError && (
        <TranscriptErrorCard data-testid="transcript-error-card">
          <SoftErrorCardTitle>
            <AlertTriangle size={16} />
            {transcriptError.kind === 'no_client'
              ? 'Client required'
              : 'Upload failed'}
          </SoftErrorCardTitle>
          <CardRow>
            <CardLabel>File</CardLabel>
            <CardValue>
              {safeAttachmentSourceLabel(transcriptError.fileName, 'Transcript file')}
              {typeof transcriptError.fileSize === 'number'
                ? ` (${formatBytes(transcriptError.fileSize)})`
                : ''}
            </CardValue>
          </CardRow>
          <TranscriptError>
            <AlertTriangle size={14} />
            {transcriptErrorReason}
          </TranscriptError>
          <TranscriptActions>
            <TranscriptBtn
              type="button"
              $danger
              onClick={onTranscriptCancel}
              data-testid="transcript-error-dismiss-btn"
            >
              <X size={14} /> Dismiss
            </TranscriptBtn>
          </TranscriptActions>
        </TranscriptErrorCard>
      )}

      {audioIntakeReceipt && (
        <TranscriptCard data-testid="audio-intake-receipt-card">
          <CardTitle>
            <CheckCircle2 size={16} />
            Audio pieces queued
          </CardTitle>
          <CardRow>
            <CardLabel>Source</CardLabel>
            <CardValue>
              {safeAttachmentSourceLabel(audioIntakeReceipt.fileName, 'Audio intake')}
            </CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Accepted</CardLabel>
            <CardValue>
              {audioIntakeReceipt.acceptedCount} piece{audioIntakeReceipt.acceptedCount !== 1 ? 's' : ''}
              {typeof audioIntakeReceipt.fileSize === 'number'
                ? ` (${formatBytes(audioIntakeReceipt.fileSize)})`
                : ''}
            </CardValue>
          </CardRow>
          {audioIntakeReceipt.rejectedCount > 0 && (
            <CardRow>
              <CardLabel>Rejected</CardLabel>
              <CardValue>{audioIntakeReceipt.rejectedCount} file{audioIntakeReceipt.rejectedCount !== 1 ? 's' : ''}</CardValue>
            </CardRow>
          )}
          {audioRejectedSummary && (
            <TranscriptError $kind="warning">
              <AlertTriangle size={14} />
              {audioRejectedSummary}
            </TranscriptError>
          )}
          <CardRow>
            <CardLabel>Next</CardLabel>
            <CardValue>{audioIntakeNextAction}</CardValue>
          </CardRow>
          {audioIntakeReceipt && onAudioIntakeReviewNext && (
            <TranscriptActions>
              <ReceiptActionButton
                type="button"
                onClick={onAudioIntakeReviewNext}
                disabled={audioIntakeReviewNextPending}
                aria-busy={audioIntakeReviewNextPending ? 'true' : undefined}
              >
                {audioIntakeReviewNextPending ? <Loader2 size={15} /> : <ListChecks size={15} />}
                {audioIntakeReviewNextPending ? 'Opening intake...' : 'Review next intake'}
              </ReceiptActionButton>
            </TranscriptActions>
          )}
        </TranscriptCard>
      )}

      {transcriptResult && (
        <TranscriptCard data-testid="transcript-result-card">
          <CardTitle>
            <CheckCircle2 size={16} />
            Workout logged
          </CardTitle>
          <CardRow>
            <CardLabel>Source</CardLabel>
            <CardValue>
              {safeAttachmentSourceLabel(transcriptResult.fileName, 'Transcript file')}
            </CardValue>
          </CardRow>
          {transcriptResult.clientId && (
            <CardRow>
              <CardLabel>Client</CardLabel>
              <CardValue>Selected client</CardValue>
            </CardRow>
          )}
          <CardRow>
            <CardLabel>Logged</CardLabel>
            <CardValue>
              {transcriptResult.exerciseCount} exercise{transcriptResult.exerciseCount !== 1 ? 's' : ''} -{' '}
              {transcriptResult.totalSets} set{transcriptResult.totalSets !== 1 ? 's' : ''}
            </CardValue>
          </CardRow>
          {typeof transcriptResult.xpAwarded === 'number' && (
            <CardRow>
              <CardLabel>XP awarded</CardLabel>
              <SuccessCardValue>+{transcriptResult.xpAwarded} XP</SuccessCardValue>
            </CardRow>
          )}
          {typeof transcriptResult.streakDays === 'number' && (
            <CardRow>
              <CardLabel>Streak</CardLabel>
              <CardValue>{transcriptResult.streakDays} day{transcriptResult.streakDays !== 1 ? 's' : ''}</CardValue>
            </CardRow>
          )}
        </TranscriptCard>
      )}
    </>
  );
};
