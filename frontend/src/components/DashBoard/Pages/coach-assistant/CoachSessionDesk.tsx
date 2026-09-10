/**
 * FILE: CoachSessionDesk.tsx
 * PURPOSE: Session Desk B presentation surface (S6). Hosts the current shell-owner task:
 *          editable workout draft (CoachWorkoutDraft), context sources (CoachContextStatus),
 *          receipts timeline (CoachIntentTimeline), target-switch choices, and Floor Mode.
 *
 *          The desk owns no draft state — every mutation routes through the G04a shell owner
 *          (useCoachSessionDraft) with the current scope token + expected revision, and every
 *          submit routes through the G04b transport (useCoachWorkoutDraftSubmit). "Open in
 *          Logger" emits only the allowlisted bridge payload and the acknowledged revision.
 *
 *          State table (S6): empty / draft / unavailable / review / executing / committed /
 *          unknown / verified / rolled-back / offline / access-revoked. Terminal receipts are
 *          never erased by closing the view; they remain on the timeline.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCoachSessionDraft } from './useCoachSessionDraft';
import { useCoachWorkoutDraftSubmit } from './useCoachWorkoutDraftSubmit';
import { useCoachSurfaceContext } from './useCoachSurfaceContext';
import CoachContextStatus, { type CoachContextSource } from './CoachContextStatus';
import CoachIntentTimeline, { type CoachTimelineEntry } from './CoachIntentTimeline';
import CoachWorkoutDraft, { validateDraftForDesk } from './CoachWorkoutDraft';
import type { CoachWorkoutDraftContent, CoachWorkoutUnit } from './coachWorkoutDraftContract';
import type { CoachSessionDraft } from './coachSessionDraftState';

export type CoachDeskState =
  | 'empty'
  | 'draft'
  | 'unavailable'
  | 'review'
  | 'executing'
  | 'committed'
  | 'unknown'
  | 'verified'
  | 'rolled_back'
  | 'offline'
  | 'access_revoked';

export interface CoachLoggerBridgePayload {
  taskId: string;
  requestKey: string;
  revision: number;
  targetUserId: number;
  content: CoachWorkoutDraftContent;
}

export interface CoachSessionDeskProps {
  /** Permission-filtered context sources (caller filters by actor permissions). */
  contextSources?: ReadonlyArray<CoachContextSource>;
  /** Server receipts for the timeline (read/check/open only). */
  receipts?: ReadonlyArray<CoachTimelineEntry>;
  /** Logger bridge — receives the allowlisted payload + acknowledged revision. */
  onOpenLogger?: (payload: CoachLoggerBridgePayload) => void;
  /** Check-result outcome from the desk's receipt polling (caller owns the API call). */
  lastCheckOutcome?: 'verified' | 'unknown' | 'rolled_back' | null;
  onCheckResult?: (entry: CoachTimelineEntry) => void;
  onOpenRecord?: (entry: CoachTimelineEntry) => void;
  offline?: boolean;
  accessRevoked?: boolean;
  floorMode?: boolean;
  activeFloorExerciseId?: string | null;
  onFloorExerciseSelect?: (exerciseInstanceId: string) => void;
  /** Called when the desk begins a new task for the current target. */
  onBeginTask?: (targetUserId: number, origin: string) => void;
}

const STATE_COPY: Record<CoachDeskState, string> = {
  empty: 'What are we working on?',
  draft: 'Draft — not saved',
  unavailable: 'Current context is unavailable.',
  review: 'Review this workout',
  executing: 'Saving…',
  committed: 'Saved; checking result.',
  unknown: 'Checking whether it saved.',
  verified: 'Saved and checked.',
  rolled_back: 'Nothing was saved.',
  offline: 'Offline. This draft is open in this tab only.',
  access_revoked: 'This record is no longer available.',
};

const EMPTY_CONTENT = (): CoachWorkoutDraftContent => ({
  date: new Date().toISOString().slice(0, 10),
  title: null,
  notes: null,
  exercises: [],
});

const contentFromDraft = (draft: CoachSessionDraft | null): CoachWorkoutDraftContent => {
  if (!draft) return EMPTY_CONTENT();
  const raw = (draft.content ?? {}) as Partial<CoachWorkoutDraftContent>;
  return {
    date: typeof raw.date === 'string' ? raw.date : EMPTY_CONTENT().date,
    title: typeof raw.title === 'string' || raw.title === null ? raw.title : null,
    notes: typeof raw.notes === 'string' || raw.notes === null ? raw.notes : null,
    exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
  };
};

const CoachSessionDesk: React.FC<CoachSessionDeskProps> = ({
  contextSources = [],
  receipts = [],
  onOpenLogger,
  lastCheckOutcome = null,
  onCheckResult,
  onOpenRecord,
  offline = false,
  accessRevoked = false,
  floorMode = false,
  activeFloorExerciseId = null,
  onFloorExerciseSelect,
  onBeginTask,
}) => {
  const { draft, submitted, pendingTargetChange, begin, edit, freezeForSubmit, resolveTargetChange, discard, actorId, generation } =
    useCoachSessionDraft();
  const surface = useCoachSurfaceContext();
  const { submitting, error, lastResponse, submit } = useCoachWorkoutDraftSubmit();
  const [view, setView] = useState<'work' | 'review'>('work');
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

  const deskState = useMemo<CoachDeskState>(() => {
    if (accessRevoked) return 'access_revoked';
    if (offline) return 'offline';
    if (surface.generation !== generation && !draft && !submitted) return 'empty';
    if (submitting) return 'executing';
    if (lastCheckOutcome === 'verified') return 'verified';
    if (lastCheckOutcome === 'rolled_back') return 'rolled_back';
    if (lastResponse) {
      if (lastResponse.success && lastResponse.intentId) return 'committed';
      if (error) return 'unknown';
      return 'unknown';
    }
    if (submitted) return 'review';
    if (draft) {
      const content = contentFromDraft(draft);
      const hasWork =
        (content.exercises.length > 0 && content.exercises.some((exercise) => exercise.sets.length > 0)) ||
        Boolean(content.title) ||
        Boolean(content.notes) ||
        draft.dirty;
      return hasWork ? 'draft' : 'empty';
    }
    return 'empty';
  }, [accessRevoked, offline, surface.generation, generation, draft, submitted, submitting, lastResponse, error, lastCheckOutcome]);

  const content = useMemo(() => contentFromDraft(draft), [draft]);
  const frozenContent = useMemo(() => (submitted ? contentFromDraft(submitted.snapshot) : null), [submitted]);

  const ensureDraft = useCallback(
    (targetUserId: number | null, origin: string): boolean => {
      if (draft) return true;
      const target = targetUserId ?? actorId;
      if (target == null) return false;
      const token = begin(target, origin);
      onBeginTask?.(target, origin);
      return token !== null;
    },
    [draft, actorId, begin, onBeginTask],
  );

  const handleContentChange = useCallback(
    (next: CoachWorkoutDraftContent) => {
      if (!draft) return;
      const result = edit(draft.scopeToken, draft.revision, { content: next as unknown as Record<string, unknown> });
      if (!result.ok && result.code === 'STALE_REVISION') setView('work');
    },
    [draft, edit],
  );

  const handleOpenLogger = useCallback(() => {
    if (!draft || !onOpenLogger) return;
    onOpenLogger({
      taskId: draft.taskId,
      requestKey: draft.requestKey,
      revision: draft.revision,
      targetUserId: draft.targetUserId,
      content: contentFromDraft(draft),
    });
  }, [draft, onOpenLogger]);

  const handleReviewAndSave = useCallback(() => {
    if (!draft) return;
    const validated = validateDraftForDesk(contentFromDraft(draft), 'review');
    if (!validated.ok) {
      setView('work');
      return;
    }
    const frozen = freezeForSubmit(draft.scopeToken, draft.revision);
    if (frozen) setView('review');
  }, [draft, freezeForSubmit]);

  const handleConfirm = useCallback(async () => {
    await submit();
  }, [submit]);

  const handleTargetDecision = useCallback(
    (decision: 'return' | 'discard') => {
      if (!pendingTargetChange) return;
      const intent = resolveTargetChange(pendingTargetChange.scopeToken, decision);
      if (intent.kind === 'none' && intent.reason === 'STALE_SCOPE') discard(pendingTargetChange.scopeToken);
    },
    [pendingTargetChange, resolveTargetChange, discard],
  );

  const handleBeginWork = useCallback(
    (origin: string) => {
      ensureDraft(draft?.targetUserId ?? surface.targetUserId ?? actorId, origin);
      setView('work');
    },
    [ensureDraft, draft, surface.targetUserId, actorId],
  );

  const unavailableSources = contextSources.filter((source) => source.quality === 'unavailable');
  const showWork = deskState === 'draft' || deskState === 'empty' || deskState === 'offline';
  const showReview = deskState === 'review' || deskState === 'executing' || deskState === 'committed' || deskState === 'unknown' || deskState === 'verified' || deskState === 'rolled_back';
  const stateCopy = STATE_COPY[deskState];

  const beginWorkAction = () => {
    if (deskState === 'empty' || deskState === 'offline') handleBeginWork('desk');
  };

  const terminal = deskState === 'verified' || deskState === 'rolled_back';

  return (
    <section
      className={`coach-session-desk coach-session-desk--${deskState}${floorMode ? ' coach-session-desk--floor' : ''}`}
      data-testid="coach-session-desk"
      data-desk-state={deskState}
      data-surface-token={surface.surfaceToken}
      aria-busy={deskState === 'executing' || undefined}
    >
      <header className="coach-session-desk-header">
        <p className="coach-session-desk-state" data-testid="coach-session-desk-state" aria-live="polite">
          {stateCopy}
        </p>
        {draft ? (
          <span className="coach-session-desk-task" data-testid="coach-session-desk-task">
            Task {draft.taskId.slice(0, 8)} · revision {draft.revision}
          </span>
        ) : null}
        {offline ? (
          <span className="coach-session-desk-offline" data-testid="coach-session-desk-offline">
            open in this tab only
          </span>
        ) : null}
      </header>

      <CoachContextStatus
        sources={contextSources}
        onRetry={(source) => undefined}
        onManualReview={(source) => undefined}
      />

      {unavailableSources.length > 0 && deskState === 'empty' ? (
        <div className="coach-session-desk-unavailable" data-testid="coach-session-desk-unavailable">
          <p>Some context sources are unavailable.</p>
          {unavailableSources.slice(0, 4).map((source) => (
            <button
              key={source.source}
              type="button"
              className="coach-session-desk-unavailable-action"
              data-testid={`coach-session-desk-retry-${source.source}`}
              onClick={beginWorkAction}
            >
              Manual review: {source.label}
            </button>
          ))}
        </div>
      ) : null}

      {showWork ? (
        draft ? (
          <CoachWorkoutDraft
            content={content}
            disabled={deskState === 'offline' ? false : false}
            floorMode={floorMode}
            activeFloorExerciseId={activeFloorExerciseId}
            onFloorExerciseSelect={onFloorExerciseSelect}
            onContentChange={handleContentChange}
            validationMode="draft"
          />
        ) : (
          <div className="coach-session-desk-empty" data-testid="coach-session-desk-empty">
            <p className="coach-session-desk-empty-title">{stateCopy}</p>
            <div className="coach-session-desk-empty-actions">
              <button type="button" data-testid="coach-session-desk-log" onClick={() => handleBeginWork('log')}>
                Log workout
              </button>
              <button type="button" data-testid="coach-session-desk-review-progress" onClick={() => handleBeginWork('review')}>
                Review progress
              </button>
              <button type="button" data-testid="coach-session-desk-ask" onClick={() => handleBeginWork('ask')}>
                Ask
              </button>
            </div>
          </div>
        )
      ) : null}

      {showReview ? (
        <div className="coach-session-desk-review" data-testid="coach-session-desk-review">
          {frozenContent ? (
            <CoachWorkoutDraft
              content={frozenContent}
              disabled={view !== 'work' || deskState !== 'review'}
              floorMode={floorMode}
              onContentChange={handleContentChange}
              validationMode="review"
            />
          ) : (
            <p data-testid="coach-session-desk-no-draft">No submitted draft preview.</p>
          )}
          <div className="coach-session-desk-review-actions" data-testid="coach-session-desk-review-actions">
            {deskState === 'review' ? (
              <>
                <button type="button" data-testid="coach-session-desk-edit-draft" onClick={() => setView('work')}>
                  Edit draft
                </button>
                <button type="button" data-testid="coach-session-desk-cancel-preview" onClick={() => setView('work')}>
                  Cancel preview
                </button>
                <button type="button" data-testid="coach-session-desk-confirm" onClick={handleConfirm}>
                  Confirm
                </button>
              </>
            ) : null}
            {deskState === 'executing' ? (
              <>
                <span data-testid="coach-session-desk-saving">Saving…</span>
                <button type="button" data-testid="coach-session-desk-stop-response" disabled>
                  Stop response
                </button>
                <button type="button" data-testid="coach-session-desk-inspect-task">
                  Inspect task
                </button>
              </>
            ) : null}
            {deskState === 'committed' ? (
              <>
                <button type="button" data-testid="coach-session-desk-check-result">
                  Check result
                </button>
                <button type="button" data-testid="coach-session-desk-open-record">
                  Open record
                </button>
              </>
            ) : null}
            {deskState === 'unknown' ? (
              <>
                <button type="button" data-testid="coach-session-desk-check-result-unknown">
                  Check result
                </button>
                <button type="button" data-testid="coach-session-desk-close-unknown" onClick={() => setView('work')}>
                  Close
                </button>
              </>
            ) : null}
            {deskState === 'verified' ? (
              <>
                <button type="button" data-testid="coach-session-desk-open-verified">
                  Open record
                </button>
                <button type="button" data-testid="coach-session-desk-approved-correction">
                  Approved correction
                </button>
              </>
            ) : null}
            {deskState === 'rolled_back' ? (
              <button type="button" data-testid="coach-session-desk-review-retry" onClick={() => setView('work')}>
                Review retry
              </button>
            ) : null}
            {error ? (
              <p className="coach-session-desk-submit-error" data-testid="coach-session-desk-submit-error">
                {error.message}
              </p>
            ) : null}
            {draft && deskState === 'review' && onOpenLogger ? (
              <button type="button" data-testid="coach-session-desk-open-logger" onClick={handleOpenLogger}>
                Open in Logger
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showWork && draft && onOpenLogger ? (
        <div className="coach-session-desk-draft-actions" data-testid="coach-session-desk-draft-actions">
          <button type="button" data-testid="coach-session-desk-edit-draft-primary" onClick={() => setView('work')}>
            Edit
          </button>
          <button type="button" data-testid="coach-session-desk-review-save" onClick={handleReviewAndSave}>
            Review and save
          </button>
          <button type="button" data-testid="coach-session-desk-open-logger-draft" onClick={handleOpenLogger}>
            Open in Logger
          </button>
        </div>
      ) : null}

      {pendingTargetChange ? (
        <div
          className="coach-session-desk-target-choice"
          role="dialog"
          aria-modal="true"
          data-testid="coach-session-desk-target-choice"
          data-from-target={pendingTargetChange.fromTargetUserId}
          data-next-target={pendingTargetChange.nextTargetUserId}
        >
          <p>Switch coaching target?</p>
          <button type="button" data-testid="coach-session-desk-target-return" onClick={() => handleTargetDecision('return')}>
            Return to original
          </button>
          <button type="button" data-testid="coach-session-desk-target-discard" onClick={() => handleTargetDecision('discard')}>
            Discard draft
          </button>
        </div>
      ) : null}

      <CoachIntentTimeline
        entries={receipts}
        onCheckResult={onCheckResult}
        onOpenRecord={onOpenRecord}
        openEntryId={activeReceiptId}
        onOpenEntryChange={setActiveReceiptId}
      />

      {terminal ? (
        <span className="coach-session-desk-terminal-note" data-testid="coach-session-desk-terminal-note">
          Terminal receipt retained on the timeline.
        </span>
      ) : null}
    </section>
  );
};

export default CoachSessionDesk;
