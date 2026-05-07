import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PlaudClipMergePanel, type PlaudMergeReadyContext } from './PlaudClipMergePanel';
import { PlaudPendingReviewsList } from './PlaudPendingReviewsList';
import { getMergeRequest, type MergeResponse, type MergeRequestDetail } from '../../services/plaudMergeService';
import { PlaudApiError } from '../../services/plaudClipService';
import { PlaudMergeReview } from './PlaudMergeReview';
import type { PlaudMergeConfirmState, PlaudMergeReviewState } from './PlaudMergeWorkspace.types';
import {
  ActionRow,
  BackLink,
  Button,
  ErrorBanner,
  Header,
  PageWrap,
  Section,
  Sub,
  SuccessBanner,
  Title,
  TwoColumn,
} from './PlaudMergeWorkspace.styles';

export interface PlaudMergeWorkspaceProps {
  initialClientId?: number;
  initialClientName?: string;
  lockClientId?: boolean;
  embedded?: boolean;
  backLabel?: string;
  initialReviewMergeRequestId?: string | null;
  onBack?: () => void;
}

export function PlaudMergeWorkspace({
  initialClientId,
  initialClientName,
  lockClientId = false,
  embedded = false,
  backLabel = 'Dashboard',
  initialReviewMergeRequestId = null,
  onBack,
}: PlaudMergeWorkspaceProps): JSX.Element {
  const [reviewState, setReviewState] = useState<PlaudMergeReviewState | null>(null);
  const [confirmState, setConfirmState] = useState<PlaudMergeConfirmState | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const autoOpenedReviewRef = useRef<string | null>(null);

  const openDetailReview = useCallback((detail: MergeRequestDetail) => {
    setReviewState({
      mergeRequestId: detail.mergeRequestId,
      clientId: detail.clientId,
      clientName: detail.clientName,
      transcript: detail.transcript,
      parsedWorkout: detail.parsedWorkout,
      dateSplitCandidates: detail.dateSplitCandidates,
      clipTimeline: detail.clipTimeline || [],
      boundaryWarning: detail.boundaryWarning,
      source: 'resume',
    });
  }, []);

  const handleMergeReady = useCallback(async (response: MergeResponse, _context: PlaudMergeReadyContext) => {
    setApplyError(null);
    try {
      const { mergeRequest } = await getMergeRequest(response.mergeRequestId);
      openDetailReview(mergeRequest);
    } catch (err) {
      setApplyError(
        err instanceof PlaudApiError
          ? `${err.code}: ${err.message}`
          : 'Merge completed, but split review could not be loaded. Open it from pending reviews before logging.',
      );
    }
  }, [openDetailReview]);

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
    openDetailReview(detail);
  }, [openDetailReview]);

  useEffect(() => {
    const id = initialReviewMergeRequestId?.trim();
    if (!id || autoOpenedReviewRef.current === id) return;
    autoOpenedReviewRef.current = id;
    void handleOpenReview(id);
  }, [handleOpenReview, initialReviewMergeRequestId]);

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
            {confirmState.workoutIds?.length ? (
              <> Logged {confirmState.workoutIds.length} split workouts.</>
            ) : null}
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
    return (
      <PlaudMergeReview
        key={reviewState.mergeRequestId}
        reviewState={reviewState}
        embedded={embedded}
        onBack={handleResetReview}
        onApproved={setConfirmState}
      />
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
          {applyError ? (
            <ErrorBanner role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              {applyError}
            </ErrorBanner>
          ) : null}
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
