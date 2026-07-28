/**
 * Blueprint: ChallengeSubmissionsPanel
 * Purpose: Staff challenge-submission gate, policy receipt, and moderation action surface.
 * Owner: Codex
 * Last validated: 2026-06-30 focused vitest slice
 *
 * Wireframe:
 * [status banner + retry/action feedback]
 * [policy tiles: creation | moderation | roles | publish model]
 * [submission card: client/title/status + visibility badges]
 * [review notes textarea] [start review] [request changes] [approve draft] [reject]
 *
 * Data flow:
 * Props: governance fallback, queue state from useChallengeSubmissions
 * State: per-card review notes only
 * API calls: delegated to queue.moderateSubmission and queue.reload
 * Children: ChallengeSubmissionCard
 *
 * Architecture:
 * ChallengeSubmissionsPanel -> ChallengeSubmissionCard -> queue.moderateSubmission
 *
 * Click outcomes:
 * Retry -> queue.reload -> GET /api/v1/gamification/challenge-submissions/manage
 * Start review -> PATCH moderation action=start_review -> queue reload
 * Approve draft -> PATCH moderation action=approve_as_draft -> private draft + managed deck refresh
 * Request changes -> PATCH moderation action=request_changes with notes -> queue reload
 * Reject -> PATCH moderation action=reject with notes -> queue reload
 *
 * Gamification hooks: none directly; this surface never publishes to discovery.
 */

import React, { useState } from 'react';
import { CheckCircle2, FileCheck2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import type { ChallengeGovernancePolicy } from './useChallengeTemplates';
import type { ChallengeSubmissionModerationAction, ChallengeSubmissionQueueState, ChallengeSubmissionRecord } from './useChallengeSubmissions';
import * as S from './ChallengeCommandWorkspace.styles';
import * as L from './ChallengeList.styles';

interface ChallengeSubmissionsPanelProps {
  governance: ChallengeGovernancePolicy | null;
  queue?: ChallengeSubmissionQueueState;
  onDraftApproved?: () => void;
}

interface ChallengeSubmissionCardProps {
  submission: ChallengeSubmissionRecord;
  queue: ChallengeSubmissionQueueState;
  onDraftApproved?: () => void;
}

const CLOSED_QUEUE_COPY = 'Client-created challenges stay closed until entitlement, moderation, and real review records are connected.';
const EMPTY_QUEUE_COPY = 'This space is reserved for entitlement-approved client submissions after moderation storage starts returning review records.';
const EMPTY_QUEUE_GATES = ['Entitlement required', 'Moderation storage pending', 'Review records pending'];
const REVIEWABLE_STATUSES = new Set(['pending', 'under_review']);

const labelize = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const toDomIdSegment = (value: string) => value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'submission';

const governanceLabel = (value?: string) => {
  if (!value) return 'Policy pending';
  if (value === 'disabled_by_default') return 'Off until entitlement';
  return labelize(value);
};

const decisionLabel = (value?: string) => {
  if (!value || value === 'pending') return 'Decision Pending';
  return labelize(value);
};

const statusLabel = (queue?: ChallengeSubmissionQueueState) => {
  if (queue?.loading) return 'Loading review queue';
  const submissionCount = queue?.submissions.length ?? 0;
  if (submissionCount > 0) return `${submissionCount} submissions awaiting review`;
  return 'Review queue empty by policy';
};

const ChallengeSubmissionCard: React.FC<ChallengeSubmissionCardProps> = ({ submission, queue, onDraftApproved }) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const submissionId = String(submission.id);
  const title = submission.title;
  const status = submission.status;
  const description = submission.description?.trim();
  const challengeType = submission.challengeType ? labelize(submission.challengeType) : null;
  const archetype = submission.archetype ? labelize(submission.archetype) : null;
  const isBusy = queue.moderatingId === submissionId;
  const isAnySubmissionBusy = Boolean(queue.moderatingId);
  const canStartReview = status === 'pending';
  const canModerate = REVIEWABLE_STATUSES.has(status);
  const reviewNotesRequired = canModerate && reviewNotes.trim().length === 0;
  const notesRequirementId = `challenge-submission-${toDomIdSegment(submissionId)}-notes-required`;
  const handleModeration = async (action: ChallengeSubmissionModerationAction, notes?: string) => {
    const success = await queue.moderateSubmission(submission.id, action, notes);
    if (success && action === 'approve_as_draft') onDraftApproved?.();
  };

  return (
    <S.ChallengeItem>
      <S.ChallengeItemHeader>
        <S.ChallengeTitleGroup>
          <S.CardMeta>{submission.submittedBy ?? 'Client submission'}</S.CardMeta>
          <S.CardTitle>{title}</S.CardTitle>
        </S.ChallengeTitleGroup>
        <S.ChallengeStatusBadge $status={status}>{labelize(status)}</S.ChallengeStatusBadge>
      </S.ChallengeItemHeader>
      {description ? <S.CardDescription>{description}</S.CardDescription> : null}
      {submission.submittedAt ? <S.CardDescription>Submitted {submission.submittedAt}</S.CardDescription> : null}
      <S.BadgeRow aria-label={`${title} moderation metadata`}>
        {challengeType ? <S.Badge>{challengeType}</S.Badge> : null}
        {archetype ? <S.Badge>{archetype}</S.Badge> : null}
        <S.Badge>{decisionLabel(submission.moderationStatus)}</S.Badge>
        <S.Badge>{labelize(submission.requestedVisibility ?? 'trainer_visible')}</S.Badge>
      </S.BadgeRow>
      {canModerate ? (
        <L.ChallengeModerationPanel>
          <L.ChallengeNotesField>
            <span>Review notes</span>
            <textarea
              aria-label={`Review notes for ${title}`}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Decision notes for the client-facing review record"
              disabled={isBusy}
            />
          </L.ChallengeNotesField>
          {reviewNotesRequired ? <L.ChallengeInlineNotice id={notesRequirementId}>Review notes required before request changes or rejection</L.ChallengeInlineNotice> : null}
          <L.ChallengeActionRow aria-label={`${title} moderation actions`}>
            {canStartReview ? (
              <S.IconButton
                type="button"
                aria-label={`Start review ${title}`}
                disabled={isAnySubmissionBusy}
                onClick={() => void handleModeration('start_review')}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                Start review
              </S.IconButton>
            ) : null}
            <S.IconButton
              type="button"
              aria-label={`Approve draft ${title}`}
              disabled={isAnySubmissionBusy}
              onClick={() => void handleModeration('approve_as_draft', reviewNotes)}
            >
              <FileCheck2 size={16} aria-hidden="true" />
              Approve draft
            </S.IconButton>
            <S.IconButton
              type="button"
              aria-label={`Request changes ${title}`}
              aria-describedby={reviewNotesRequired ? notesRequirementId : undefined}
              disabled={isAnySubmissionBusy || reviewNotesRequired}
              onClick={() => void handleModeration('request_changes', reviewNotes)}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Request changes
            </S.IconButton>
            <S.IconButton
              type="button"
              aria-label={`Reject ${title}`}
              aria-describedby={reviewNotesRequired ? notesRequirementId : undefined}
              disabled={isAnySubmissionBusy || reviewNotesRequired}
              onClick={() => void handleModeration('reject', reviewNotes)}
            >
              <XCircle size={16} aria-hidden="true" />
              Reject
            </S.IconButton>
          </L.ChallengeActionRow>
        </L.ChallengeModerationPanel>
      ) : null}
    </S.ChallengeItem>
  );
};

const ChallengeSubmissionsPanel: React.FC<ChallengeSubmissionsPanelProps> = ({ governance, queue, onDraftApproved }) => {
  const activeGovernance = queue?.governance ?? governance;
  const creatorRoles = activeGovernance?.creatorRoles.map(labelize).join(' + ') ?? 'Admin + Trainer';
  const moderation = activeGovernance?.requiresModerationForClientPublish ? 'Required before publish' : 'Not required';
  const publishModel = labelize(activeGovernance?.publishModel ?? 'admin_full_control_trainer_scoped');
  const submissions = queue?.submissions ?? [];

  return (
    <section aria-labelledby="challenge-submissions-title">
      <S.StatusPanel>
        <S.StatusStack>
          <S.StatusTitle id="challenge-submissions-title">Client submission gate</S.StatusTitle>
          <S.StatusCopy>{queue?.message ?? CLOSED_QUEUE_COPY}</S.StatusCopy>
          {queue?.error ? (
            <S.ChallengeInlineNotice role="alert">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>{queue.error}</span>
              <S.IconButton type="button" aria-label="Retry submissions queue" onClick={() => void queue.reload()}>
                <RefreshCw size={16} />
                Retry
              </S.IconButton>
            </S.ChallengeInlineNotice>
          ) : (
            <S.ChallengeInlineNotice role="status">
              <ShieldCheck size={16} aria-hidden="true" />
              {statusLabel(queue)}
            </S.ChallengeInlineNotice>
          )}
        </S.StatusStack>
      </S.StatusPanel>

      {queue?.actionError ? <S.ChallengeInlineAlert role="alert">{queue.actionError}</S.ChallengeInlineAlert> : null}
      {queue?.actionMessage ? <S.ChallengeInlineNotice role="status">{queue.actionMessage}</S.ChallengeInlineNotice> : null}

      <S.PolicyGrid aria-label="Client challenge submission policy">
        <S.PolicyTile><span>Client Creation</span><strong>{governanceLabel(activeGovernance?.clientCreation)}</strong></S.PolicyTile>
        <S.PolicyTile><span>Moderation</span><strong>{moderation}</strong></S.PolicyTile>
        <S.PolicyTile><span>Creator Roles</span><strong>{creatorRoles}</strong></S.PolicyTile>
        <S.PolicyTile><span>Publish Model</span><strong>{publishModel}</strong></S.PolicyTile>
      </S.PolicyGrid>

      <S.ChallengeList aria-label="Client-created challenge submissions">
        {queue && submissions.length > 0 ? submissions.map((submission) => (
          <ChallengeSubmissionCard key={String(submission.id)} submission={submission} queue={queue} onDraftApproved={onDraftApproved} />
        )) : (
          <S.ChallengeItem>
            <S.ChallengeItemHeader>
              <S.ChallengeTitleGroup>
                <S.CardMeta>Moderation Queue</S.CardMeta>
                <S.CardTitle>No client-created challenge submissions are connected yet.</S.CardTitle>
              </S.ChallengeTitleGroup>
              <S.ChallengeStatusBadge $status="draft">Gated</S.ChallengeStatusBadge>
            </S.ChallengeItemHeader>
            <S.CardDescription>{EMPTY_QUEUE_COPY}</S.CardDescription>
            <S.BadgeRow aria-label="Client submission activation gates">
              {EMPTY_QUEUE_GATES.map((gate) => <S.Badge key={gate}>{gate}</S.Badge>)}
            </S.BadgeRow>
          </S.ChallengeItem>
        )}
      </S.ChallengeList>
    </section>
  );
};

export default ChallengeSubmissionsPanel;


