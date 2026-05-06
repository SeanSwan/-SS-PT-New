import { useCallback, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PlaudClipMergePanel, type PlaudMergeReadyContext } from './PlaudClipMergePanel';
import { PlaudPendingReviewsList } from './PlaudPendingReviewsList';
import { PlaudMergeBoundaryBanner } from './PlaudMergeBoundaryBanner';
import { getMergeRequest, type MergeResponse, type MergeRequestDetail } from '../../services/plaudMergeService';
import { PlaudApiError } from '../../services/plaudClipService';
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

interface ParsedExercise {
  name?: string;
  exerciseName?: string;
  sets?: Array<{ reps?: number | string; weight?: number; rpe?: number; tempo?: string; rest?: number }>;
  notes?: string;
}

export interface PlaudMergeWorkspaceProps {
  initialClientId?: number;
  initialClientName?: string;
  lockClientId?: boolean;
  embedded?: boolean;
  backLabel?: string;
  onBack?: () => void;
}

const API_BASE_URL = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:10000';

async function applyMergeApproval(args: {
  clientId: number;
  mergeRequestId: string;
  parsedWorkout: { date?: string; exercises?: ParsedExercise[]; intensity?: number };
}): Promise<{ success: boolean; workoutId?: number | string }> {
  const exercises = (args.parsedWorkout.exercises || []).map((ex) => ({
    name: ex.exerciseName || ex.name || 'Exercise',
    sets: (ex.sets || []).map((s, i) => ({
      setNumber: i + 1,
      reps: typeof s.reps === 'string' ? Number.parseInt(s.reps, 10) || 0 : s.reps || 0,
      weight: s.weight || 0,
      tempo: s.tempo,
      rest: s.rest,
      rpe: s.rpe,
    })),
  }));
  const today = new Date().toISOString().slice(0, 10);
  const body: Record<string, unknown> = {
    title: `PLAUD merge ${args.parsedWorkout.date || today}`,
    date: args.parsedWorkout.date || today,
    duration: 60,
    exercises,
    source: 'plaud_merge',
    mergeRequestId: args.mergeRequestId,
  };
  if (typeof args.parsedWorkout.intensity === 'number') body.intensity = args.parsedWorkout.intensity;

  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_BASE_URL}/api/admin/clients/${args.clientId}/workouts`, body, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return { success: !!response.data?.success, workoutId: response.data?.workout?.id };
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
    boundaryWarning: MergeResponse['boundaryWarning'];
    source: 'fresh' | 'resume';
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{ workoutId?: number | string } | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleMergeReady = useCallback((response: MergeResponse, context: PlaudMergeReadyContext) => {
    setReviewState({
      mergeRequestId: response.mergeRequestId,
      clientId: context.clientId || initialClientId || 0,
      clientName: context.clientName || initialClientName || null,
      transcript: response.transcript,
      parsedWorkout: response.parsedWorkout,
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
      setConfirmState({ workoutId: result.workoutId });
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
