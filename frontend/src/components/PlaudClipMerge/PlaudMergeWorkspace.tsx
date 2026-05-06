import { useCallback, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PlaudClipMergePanel, type PlaudMergeReadyContext } from './PlaudClipMergePanel';
import { PlaudPendingReviewsList } from './PlaudPendingReviewsList';
import { PlaudMergeBoundaryBanner } from './PlaudMergeBoundaryBanner';
import { getMergeRequest, type MergeResponse, type MergeRequestDetail } from '../../services/plaudMergeService';
import { PlaudApiError } from '../../services/plaudClipService';
import { applyMergeApproval } from './PlaudMergeWorkspace.apply';
import {
  ActionRow,
  BackLink,
  Button,
  ErrorBanner,
  ExerciseList,
  ExerciseRow,
  Header,
  PageWrap,
  ReviewHeading,
  ReviewWrap,
  Section,
  SetList,
  Sub,
  SuccessBanner,
  Title,
  TranscriptBlock,
  TwoColumn,
} from './PlaudMergeWorkspace.styles';

export interface PlaudMergeWorkspaceProps {
  initialClientId?: number;
  initialClientName?: string;
  lockClientId?: boolean;
  embedded?: boolean;
  backLabel?: string;
  onBack?: () => void;
}

export function PlaudMergeWorkspace({
  initialClientId,
  initialClientName,
  lockClientId = false,
  embedded = false,
  backLabel = 'Dashboard',
  onBack,
}: PlaudMergeWorkspaceProps): JSX.Element {
  const [reviewState, setReviewState] = useState<{
    mergeRequestId: string;
    clientId: number;
    clientName?: string | null;
    transcript: string;
    parsedWorkout: MergeResponse['parsedWorkout'];
    clipTimeline: NonNullable<MergeResponse['clipTimeline']>;
    boundaryWarning: MergeResponse['boundaryWarning'];
    source: 'fresh' | 'resume';
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    workoutId?: number | string;
    mergeMarkedApproved?: boolean;
  } | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleMergeReady = useCallback((response: MergeResponse, context: PlaudMergeReadyContext) => {
    setReviewState({
      mergeRequestId: response.mergeRequestId,
      clientId: context.clientId || initialClientId || 0,
      clientName: context.clientName || initialClientName || null,
      transcript: response.transcript,
      parsedWorkout: response.parsedWorkout,
      clipTimeline: response.clipTimeline || [],
      boundaryWarning: response.boundaryWarning,
      source: 'fresh',
    });
  }, [initialClientId, initialClientName]);

  const handleOpenReview = useCallback(async (mergeRequestId: string) => {
    setApplyError(null);
    let detail: MergeRequestDetail | null = null;
    try {
      const { mergeRequest } = await getMergeRequest(mergeRequestId);
      detail = mergeRequest;
    } catch (err) {
      setApplyError(err instanceof PlaudApiError ? `${err.code}: ${err.message}` : 'Failed to load merge details');
      return;
    }
    if (!detail) return;
    setReviewState({
      mergeRequestId: detail.mergeRequestId,
      clientId: detail.clientId,
      clientName: detail.clientName,
      transcript: detail.transcript,
      parsedWorkout: detail.parsedWorkout,
      clipTimeline: detail.clipTimeline || [],
      boundaryWarning: detail.boundaryWarning,
      source: 'resume',
    });
  }, []);

  const handleApprove = useCallback(async () => {
    if (!reviewState) return;
    if (!reviewState.clientId) {
      setApplyError('Client must be resolved before Swan Coach can apply this workout.');
      return;
    }
    setIsApplying(true);
    setApplyError(null);
    try {
      const result = await applyMergeApproval({
        clientId: reviewState.clientId,
        mergeRequestId: reviewState.mergeRequestId,
        parsedWorkout: reviewState.parsedWorkout,
      });
      setConfirmState({
        workoutId: result.workoutId,
        mergeMarkedApproved: result.mergeMarkedApproved,
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string; errorCode?: string } } };
      const code = e.response?.data?.errorCode || 'INTERNAL_ERROR';
      const message = e.response?.data?.message || 'Failed to apply workout';
      setApplyError(`${code}: ${message}`);
    } finally {
      setIsApplying(false);
    }
  }, [reviewState]);

  const handleResetReview = useCallback(() => {
    setReviewState(null);
    setApplyError(null);
    setConfirmState(null);
  }, []);

  if (confirmState) {
    return (
      <PageWrap data-testid="plaud-merge-page" $embedded={embedded}>
        <Header>
          <div>
            <Title>PLAUD merge approved</Title>
            <Sub>Workout logged. The client dashboard will reflect it immediately.</Sub>
          </div>
          {onBack ? (
            <BackLink type="button" onClick={onBack}>
              <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
            </BackLink>
          ) : null}
        </Header>
        <SuccessBanner role="status">
          <CheckCircle2 size={22} aria-hidden="true" />
          <div>
            <strong>Workout logged successfully.</strong>
            {confirmState.workoutId ? <> Workout ID: <code>{confirmState.workoutId}</code>.</> : null}
            {confirmState.mergeMarkedApproved === false ? (
              <p>Merge logged, but the review item could not be marked approved. Refresh the queue before reprocessing.</p>
            ) : null}
            <ActionRow>
              <Button type="button" $primary onClick={handleResetReview}>Process another merge</Button>
            </ActionRow>
          </div>
        </SuccessBanner>
      </PageWrap>
    );
  }

  if (reviewState) {
    const exercises = reviewState.parsedWorkout?.exercises || [];
    return (
      <PageWrap data-testid="plaud-merge-page" $embedded={embedded}>
        <Header>
          <div>
            <Title>Review merged workout</Title>
            <Sub>
              Confirm the parsed exercises before logging
              {reviewState.clientName ? ` to ${reviewState.clientName}` : ' to the selected client'}.
            </Sub>
          </div>
          <BackLink type="button" onClick={handleResetReview}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to merge queue
          </BackLink>
        </Header>
        {reviewState.boundaryWarning?.warning ? (
          <PlaudMergeBoundaryBanner
            boundaryWarning={reviewState.boundaryWarning}
            onContinue={undefined}
            onReSelect={handleResetReview}
          />
        ) : null}
        <ReviewWrap>
          {reviewState.clipTimeline.length > 0 ? (
            <>
              <ReviewHeading>Source clip timeline ({reviewState.clipTimeline.length})</ReviewHeading>
              <ExerciseList>
                {reviewState.clipTimeline.map((clip) => (
                  <ExerciseRow key={clip.clipId}>
                    <strong>Step {clip.mergeStep}: {clip.filename}</strong>
                    <SetList>
                      <li>
                        Uploaded {clip.uploadedAt ? new Date(clip.uploadedAt).toLocaleString() : 'time unavailable'}
                        {typeof clip.durationSec === 'number' ? ` - ${Math.round(clip.durationSec)} sec` : ''}
                        {clip.source ? ` - ${clip.source.replace('_', ' ')}` : ''}
                      </li>
                    </SetList>
                  </ExerciseRow>
                ))}
              </ExerciseList>
            </>
          ) : null}
          <ReviewHeading>Merged transcript</ReviewHeading>
          <TranscriptBlock>{reviewState.transcript}</TranscriptBlock>
          <ReviewHeading>Parsed exercises ({exercises.length})</ReviewHeading>
          {exercises.length === 0 ? (
            <ErrorBanner role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              No exercises parsed from this transcript. Discard and re-record.
            </ErrorBanner>
          ) : (
            <ExerciseList>
              {exercises.map((ex, idx) => (
                <ExerciseRow key={`${ex.exerciseName || ex.name || 'ex'}-${idx}`}>
                  <strong>{ex.exerciseName || ex.name || `Exercise ${idx + 1}`}</strong>
                  {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
                    <SetList>
                      {ex.sets.map((s, si) => (
                        <li key={si}>
                          {s.reps ?? '?'} reps x {s.weight ?? 0} lb
                          {typeof s.rpe === 'number' ? ` - RPE ${s.rpe}` : ''}
                          {s.tempo ? ` - tempo ${s.tempo}` : ''}
                        </li>
                      ))}
                    </SetList>
                  ) : null}
                </ExerciseRow>
              ))}
            </ExerciseList>
          )}
          {applyError ? (
            <ErrorBanner role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              {applyError}
            </ErrorBanner>
          ) : null}
          <ActionRow>
            <Button type="button" $primary onClick={handleApprove} disabled={isApplying || exercises.length === 0 || !reviewState.clientId}>
              {isApplying ? 'Logging...' : 'Confirm and log'}
            </Button>
            <Button type="button" onClick={handleResetReview}>Discard</Button>
          </ActionRow>
        </ReviewWrap>
      </PageWrap>
    );
  }

  return (
    <PageWrap data-testid="plaud-merge-page" $embedded={embedded}>
      <Header>
        <div>
          <Title>PLAUD merge</Title>
          <Sub>
            Upload PLAUD wristband recordings, select the clips for one client session, and merge
            them into a single transcribed workout.
          </Sub>
        </div>
        {onBack ? (
          <BackLink type="button" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
          </BackLink>
        ) : null}
      </Header>
      <TwoColumn>
        <Section>
          <PlaudClipMergePanel
            initialClientId={initialClientId}
            initialClientName={initialClientName}
            lockClientId={lockClientId}
            onMergeReady={handleMergeReady}
          />
        </Section>
        <Section>
          <PlaudPendingReviewsList onOpen={handleOpenReview} />
        </Section>
      </TwoColumn>
    </PageWrap>
  );
}

export default PlaudMergeWorkspace;
