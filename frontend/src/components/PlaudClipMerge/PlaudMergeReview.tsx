import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { PlaudMergeBoundaryBanner } from './PlaudMergeBoundaryBanner';
import { PlaudDateSplitCandidatePanel } from './PlaudDateSplitCandidatePanel';
import { PlaudMergeReviewStatusRibbon } from './PlaudMergeReviewStatusRibbon';
import {
  approveMergeRequest,
  parseMergeRequestSegment,
  type PlaudDateSplitSegment,
} from '../../services/plaudMergeService';
import { applyMergeApproval, applyMergeSegmentApproval } from './PlaudMergeWorkspace.apply';
import { getPlaudDateSplitApprovalBlock } from './plaudDateSplitApprovalGuard';
import type { PlaudMergeConfirmState, PlaudMergeReviewState } from './PlaudMergeWorkspace.types';
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
  SetList,
  Sub,
  Title,
  TranscriptBlock,
} from './PlaudMergeWorkspace.styles';
import {
  browserTimeZone,
  buildEffectiveSegment,
  errorMessage,
  isSegmentReadyForApproval,
  isValidSegmentDateOverride,
} from './PlaudMergeReview.helpers';

type SegmentApprovalStatus = 'idle' | 'parsing' | 'logged' | 'error';

interface SegmentApprovalState {
  status: SegmentApprovalStatus;
  workoutId?: number | string;
  error?: string;
}

interface PlaudMergeReviewProps {
  reviewState: PlaudMergeReviewState;
  embedded?: boolean;
  onBack: () => void;
  onApproved: (state: PlaudMergeConfirmState) => void;
}

export function PlaudMergeReview({
  reviewState,
  embedded = false,
  onBack,
  onApproved,
}: PlaudMergeReviewProps): JSX.Element {
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [segmentApprovals, setSegmentApprovals] = useState<Record<string, SegmentApprovalState>>({});
  const [segmentDateOverrides, setSegmentDateOverrides] = useState<Record<string, string>>({});
  const segmentApprovalsRef = useRef<Record<string, SegmentApprovalState>>({});
  const reviewPanelRef = useRef<HTMLDivElement | null>(null);
  const exercises = reviewState.parsedWorkout?.exercises || [];
  const segments = useMemo(
    () => reviewState.dateSplitCandidates?.segments || [],
    [reviewState.dateSplitCandidates],
  );
  const dateSplitApprovalBlock = getPlaudDateSplitApprovalBlock(reviewState.dateSplitCandidates);
  const shouldRenderSegmentApproval = segments.length > 1 || Boolean(dateSplitApprovalBlock);
  const approveDisabled = isApplying || exercises.length === 0 || !reviewState.clientId || Boolean(dateSplitApprovalBlock);

  useEffect(() => {
    const panel = reviewPanelRef.current;
    if (!panel) return undefined;
    const timer = window.setTimeout(() => {
      if (typeof panel.scrollIntoView === 'function') {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (typeof panel.focus === 'function') {
        panel.focus({ preventScroll: true });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [reviewState.mergeRequestId]);

  const loggedWorkoutIds = useMemo(() => (
    segments
      .map((segment) => segmentApprovals[segment.segmentId]?.workoutId)
      .filter((id): id is number | string => id != null)
  ), [segmentApprovals, segments]);

  const handleApprove = useCallback(async () => {
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
      onApproved({
        workoutId: result.workoutId,
        mergeMarkedApproved: result.mergeMarkedApproved,
      });
    } catch (err) {
      setApplyError(errorMessage(err, 'Failed to apply workout'));
    } finally {
      setIsApplying(false);
    }
  }, [onApproved, reviewState]);

  const canApproveSegment = useCallback((segment: PlaudDateSplitSegment) => (
    isSegmentReadyForApproval(segment, segmentDateOverrides[segment.segmentId])
  ), [segmentDateOverrides]);

  const handleDateOverrideChange = useCallback((segmentId: string, value: string) => {
    setSegmentDateOverrides((prev) => ({ ...prev, [segmentId]: value }));
  }, []);

  const handleApproveSegment = useCallback(async (segment: PlaudDateSplitSegment) => {
    const dateOverride = segmentDateOverrides[segment.segmentId];
    if (!reviewState.clientId || !canApproveSegment(segment)) {
      setApplyError('Confirm a valid non-future date before approving this split workout.');
      return;
    }
    const currentApproval = segmentApprovalsRef.current[segment.segmentId];
    if (currentApproval?.status === 'parsing' || currentApproval?.status === 'logged') {
      return;
    }
    const effectiveSegment = buildEffectiveSegment(segment, dateOverride);
    const nextParsingState = {
      ...segmentApprovalsRef.current,
      [segment.segmentId]: { status: 'parsing' as const },
    };
    segmentApprovalsRef.current = nextParsingState;
    setSegmentApprovals(nextParsingState);
    setApplyError(null);
    try {
      const parsed = await parseMergeRequestSegment({
        mergeRequestId: reviewState.mergeRequestId,
        segmentId: segment.segmentId,
        dateOverride: isValidSegmentDateOverride(dateOverride) ? dateOverride : undefined,
        timeZone: reviewState.dateSplitCandidates?.timeZone || browserTimeZone(),
      });
      const result = await applyMergeSegmentApproval({
        clientId: reviewState.clientId,
        mergeRequestId: reviewState.mergeRequestId,
        segment: effectiveSegment,
        parsedWorkout: parsed.parsedWorkout,
      });
      const next = {
        ...segmentApprovalsRef.current,
        [segment.segmentId]: { status: 'logged' as const, workoutId: result.workoutId },
      };
      segmentApprovalsRef.current = next;
      setSegmentApprovals(next);

      const allLogged = segments.every((item) => next[item.segmentId]?.status === 'logged');
      if (allLogged) {
        const mergeMarkedApproved = await approveMergeRequest(reviewState.mergeRequestId)
          .then(() => true)
          .catch(() => false);
        onApproved({
          workoutIds: segments.map((item) => next[item.segmentId]?.workoutId).filter((id): id is number | string => id != null),
          segmentCount: segments.length,
          mergeMarkedApproved,
        });
      }
    } catch (err) {
      setSegmentApprovals((prev) => {
        const next = {
          ...prev,
          [segment.segmentId]: {
            status: 'error',
            error: errorMessage(err, 'Failed to approve segment'),
          },
        };
        segmentApprovalsRef.current = next;
        return next;
      });
    }
  }, [canApproveSegment, onApproved, reviewState, segmentDateOverrides, segments]);

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
        <BackLink type="button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to merge queue
        </BackLink>
      </Header>
      {reviewState.boundaryWarning?.warning ? (
        <PlaudMergeBoundaryBanner
          boundaryWarning={reviewState.boundaryWarning}
          onContinue={undefined}
          onReSelect={onBack}
        />
      ) : null}
      <ReviewWrap
        ref={reviewPanelRef}
        data-testid="plaud-merge-review-panel"
        aria-label="PLAUD merge review panel"
        tabIndex={-1}
      >
        <PlaudMergeReviewStatusRibbon reviewState={reviewState} exerciseCount={exercises.length} dateSplitApprovalBlock={dateSplitApprovalBlock} />
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
        <PlaudDateSplitCandidatePanel
          candidates={reviewState.dateSplitCandidates}
          approvalStates={segmentApprovals}
          canApproveSegment={canApproveSegment}
          dateOverrides={segmentDateOverrides}
          onDateOverrideChange={handleDateOverrideChange}
          onApproveSegment={shouldRenderSegmentApproval ? handleApproveSegment : undefined}
        />
        {loggedWorkoutIds.length > 0 ? (
          <Sub>{loggedWorkoutIds.length} split workout log {loggedWorkoutIds.length === 1 ? 'is' : 'are'} complete.</Sub>
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
        {dateSplitApprovalBlock ? (
          <ErrorBanner role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            {dateSplitApprovalBlock}
          </ErrorBanner>
        ) : null}
        <ActionRow>
          <Button type="button" $primary onClick={handleApprove} disabled={approveDisabled}>
            {isApplying ? 'Logging...' : 'Confirm and log'}
          </Button>
          <Button type="button" onClick={onBack}>Discard</Button>
        </ActionRow>
      </ReviewWrap>
    </PageWrap>
  );
}

export default PlaudMergeReview;
