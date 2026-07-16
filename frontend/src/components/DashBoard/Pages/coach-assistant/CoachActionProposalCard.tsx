import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, ExternalLink, Eye, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import type { CoachActionProposal } from './SwanCoachTypes';
import {
  answerCoachProposalClarification,
  approveCoachProposal,
  getCoachProposal,
  rejectCoachProposal,
} from '../../../../services/coachProposalService';
import type { CoachAccessHandoff } from '../../../../services/coachProposalService';
import { PlaudApiError } from '../../../../services/plaudClipService';
import { CoachProposalGateRail } from './CoachProposalGateRail';
import {
  buildDetailRows,
  clarificationOptionsFromDetail,
  hasDetailBlockingError,
  safeProposalBlockingErrorMessage,
} from './CoachActionProposalDetailRows';
import { CoachActionProposalSplitPlanPanel } from './CoachActionProposalSplitPlanPanel';
import { ProposalAccessLinkActions } from './CoachClaimLinkActions';
import {
  accessExpiryLabel,
  accessHandoffLabel,
  accessHandoffMessage,
  approvalResultMessage,
  createdClientHubRoute,
  publishProposalAction,
  publishWorkoutLoggedAfterProposalApproval,
  safeProposalStatus,
  safeProposalTitle,
  safeProposalTypeLabel,
  safeSummaryCalories,
  safeSummaryClient,
  safeSummaryDate,
  safeSummaryExerciseCount,
  safeSummaryMealCount,
  terminalStatusMessage,
  type CoachActionProposalCardProps,
} from './CoachActionProposalCard.logic';
import {
  ActionButton,
  ActionLink,
  Actions,
  Card,
  DetailPanel,
  Header,
  Label,
  Row,
  StatusText,
  Value,
} from './CoachActionProposalCard.styles';
const safeProposalActionError = (err: unknown, fallback: string) => (
  err instanceof PlaudApiError ? err.message : fallback
);

export function CoachActionProposalCard({ proposal, onProposalAction }: CoachActionProposalCardProps) {
  const [status, setStatus] = useState(proposal.status);
  const [busy, setBusy] = useState<'approve' | 'clarification' | 'detail' | 'reject' | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(proposal.detail || null);
  const [generatedProposals, setGeneratedProposals] = useState<CoachActionProposal[]>([]);
  const [reviewToken, setReviewToken] = useState<string | null>(proposal.reviewToken || null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdClientRoute, setCreatedClientRoute] = useState<string | null>(() => (
    proposal.client
      ? createdClientHubRoute(proposal.client, typeof window === 'undefined' ? null : window.location.pathname)
      : null
  ));
  const summary = useMemo(() => proposal.summary || {}, [proposal.summary]);
  const [accessHandoff, setAccessHandoff] = useState<CoachAccessHandoff | null>(proposal.accessHandoff ?? null);
  const pending = status === 'PENDING';
  const approveLabel = (proposal.type === 'workout_log' || proposal.type === 'nutrition_log')
    ? 'Approve and log'
    : proposal.type === 'split_plan' ? 'Approve split plan' : 'Approve draft';
  const clarificationOptions = useMemo(() => clarificationOptionsFromDetail(detail), [detail]);
  const isClarification = proposal.type === 'clarification';
  const detailHasBlockingError = hasDetailBlockingError(detail);
  const canApprove = pending && !isClarification && !!detail && !!reviewToken && !detailHasBlockingError;
  const detailRows = useMemo(() => buildDetailRows(detail), [detail]);
  const terminalMessage = terminalStatusMessage(status, proposal.type);
  const headerTitle = safeProposalTitle(proposal.type);
  const visibleStatus = safeProposalStatus(status);
  const rows = useMemo(() => [
    ['Type', safeProposalTypeLabel(proposal.type)],
    ['Client', safeSummaryClient(summary)],
    ['Date', safeSummaryDate(summary.date)],
    ['Exercises', safeSummaryExerciseCount(summary.exerciseCount)],
    ['Meals', safeSummaryMealCount(summary.mealCount)],
    ['Calories', safeSummaryCalories(summary.totalCalories)],
  ].filter((row) => row[1] != null), [proposal.type, summary]);

  const accessLabel = accessHandoffLabel(accessHandoff);
  const accessExpires = accessExpiryLabel(accessHandoff?.claimExpiresAt ?? accessHandoff?.resetExpiresAt);
  const runLoadDetails = async () => {
    setBusy('detail');
    setError(null);
    setMessage(null);
    try {
      const result = await getCoachProposal(proposal.id);
      const loadedDetail = result.proposal?.detail || null;
      const loadedReviewToken = result.proposal?.reviewToken || null;
      setDetail(loadedDetail);
      setReviewToken(loadedReviewToken);
      if (hasDetailBlockingError(loadedDetail)) {
        setError(safeProposalBlockingErrorMessage(loadedDetail));
      } else if (!isClarification && !loadedReviewToken) {
        setError('Review token is missing. Review details again or prepare an updated draft before approval.');
      } else {
        setMessage('Draft details loaded for review.');
      }
    } catch (err) {
      setError(safeProposalActionError(err, 'Detail load failed'));
    } finally {
      setBusy(null);
    }
  };

  const runApprove = async () => {
    setBusy('approve');
    setError(null);
    setCreatedClientRoute(null);
    setAccessHandoff(null);
    try {
      const result = await approveCoachProposal(proposal.id, reviewToken);
      const nextProposal = result.proposal || { ...proposal, status: result.applied ? 'APPLIED' : 'APPROVED' };
      setStatus(nextProposal.status);
      publishProposalAction(nextProposal, onProposalAction);
      publishWorkoutLoggedAfterProposalApproval(proposal, result);
      if (result.client) {
        const nextAccessHandoff = result.accessHandoff || null;
        setCreatedClientRoute(createdClientHubRoute(
          result.client,
          typeof window === 'undefined' ? null : window.location.pathname,
        ));
        setAccessHandoff(nextAccessHandoff);
        setMessage(accessHandoffMessage(nextAccessHandoff));
      } else if (proposal.type === 'client_data_update' && result.partial) {
        setMessage('Some client updates applied; review the remaining errors.');
      } else if (proposal.type === 'client_data_update' && result.applied) {
        setMessage('Client updates applied through deterministic approval.');
      } else if (proposal.type === 'split_plan') {
        const workoutDraftCount = Number(result.splitPlan?.workoutProposalCount || 0);
        const splitCount = Number(result.splitPlan?.splitCount || 0);
        setGeneratedProposals(Array.isArray(result.splitPlan?.workoutProposals) ? result.splitPlan.workoutProposals : []);
        setMessage(workoutDraftCount > 0
          ? `${workoutDraftCount} workout log draft${workoutDraftCount === 1 ? '' : 's'} prepared for approval.`
          : `${splitCount || 'Split plan'} workout split candidates approved for deterministic workout-card preparation.`);
      } else {
        setMessage(approvalResultMessage(proposal.type, result));
      }
    } catch (err) {
      setError(safeProposalActionError(err, 'Approval failed'));
    } finally {
      setBusy(null);
    }
  };

  const runClarificationAnswer = async (answer: string) => {
    setBusy('clarification');
    setError(null);
    try {
      const result = await answerCoachProposalClarification(proposal.id, answer);
      const nextProposal = result.proposal || { ...proposal, status: 'APPROVED' as const };
      setStatus(nextProposal.status);
      publishProposalAction(nextProposal, onProposalAction);
      setMessage('Clarification answer recorded for deterministic review.');
    } catch (err) {
      setError(safeProposalActionError(err, 'Clarification answer failed'));
    } finally {
      setBusy(null);
    }
  };

  const runReject = async () => {
    setBusy('reject');
    setError(null);
    try {
      const result = await rejectCoachProposal(proposal.id);
      const nextProposal = result.proposal || { ...proposal, status: 'REJECTED' as const };
      setStatus(nextProposal.status);
      publishProposalAction(nextProposal, onProposalAction);
      setMessage('Proposal rejected.');
    } catch (err) {
      setError(safeProposalActionError(err, 'Reject failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
    <Card>
      <Header><ShieldCheck size={16} /> {headerTitle}</Header>
      {rows.map(([label, value]) => (
        <Row key={label}>
          <Label>{label}</Label>
          <Value>{value}</Value>
        </Row>
      ))}
      <Row>
        <Label>Status</Label>
        <Value>{visibleStatus}</Value>
      </Row>
      <CoachProposalGateRail summary={summary} />
      {detailRows.length > 0 && (
        <DetailPanel>
          {detailRows.map(([label, value]) => (
            <Row key={label}>
              <Label>{label}</Label>
              <Value>{value}</Value>
            </Row>
          ))}
        </DetailPanel>
      )}
      <CoachActionProposalSplitPlanPanel detail={detail} />
      {pending && isClarification && clarificationOptions.length > 0 && (
        <Actions aria-label="Clarification answer options">
          {clarificationOptions.map((option) => (
            <ActionButton
              type="button"
              key={option.value}
              onClick={() => runClarificationAnswer(option.value)}
              disabled={!!busy}
            >
              {busy === 'clarification' ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
              {option.label}
            </ActionButton>
          ))}
        </Actions>
      )}
      {pending && (
        <Actions>
          <ActionButton type="button" onClick={runLoadDetails} disabled={!!busy}>
            {busy === 'detail' ? <Loader2 size={16} /> : <Eye size={16} />}
            Review details
          </ActionButton>
          {!isClarification && (
            <ActionButton type="button" onClick={runApprove} disabled={!!busy || !canApprove}>
              {busy === 'approve' ? <Loader2 size={16} /> : <ClipboardCheck size={16} />}
              {approveLabel}
            </ActionButton>
          )}
          <ActionButton type="button" $danger onClick={runReject} disabled={!!busy}>
            {busy === 'reject' ? <Loader2 size={16} /> : <XCircle size={16} />}
            Reject
          </ActionButton>
        </Actions>
      )}
      {!pending && !message && !error && terminalMessage && (
        <StatusText><CheckCircle2 size={14} /> {terminalMessage}</StatusText>
      )}
      {message && <StatusText><CheckCircle2 size={14} /> {message}</StatusText>}
      {accessLabel && (
        <DetailPanel aria-label="Client access handoff">
          <Row>
            <Label>Access</Label>
            <Value>{accessLabel}</Value>
          </Row>
          {accessHandoff?.claimCode && (
            <Row>
              <Label>Claim code</Label>
              <Value>{accessHandoff.claimCode}</Value>
            </Row>
          )}
          {accessExpires && (
            <Row>
              <Label>Expires</Label>
              <Value>{accessExpires}</Value>
            </Row>
          )}
        </DetailPanel>
      )}
      {accessHandoff?.claimUrl && (
        <ProposalAccessLinkActions url={accessHandoff.claimUrl} label="claim link" />
      )}
      {accessHandoff?.resetUrl && (
        <ProposalAccessLinkActions url={accessHandoff.resetUrl} label="reset link" />
      )}
      {createdClientRoute && (
        <Actions aria-label="Onboarding next steps">
          <ActionLink to={createdClientRoute}>
            <ExternalLink size={16} />
            Open Client Hub
          </ActionLink>
        </Actions>
      )}
      {error && <StatusText $error>{error}</StatusText>}
    </Card>
    {generatedProposals.map((generatedProposal) => (
      <CoachActionProposalCard key={generatedProposal.id} proposal={generatedProposal} onProposalAction={onProposalAction} />
    ))}
    </>
  );
}

export default CoachActionProposalCard;
