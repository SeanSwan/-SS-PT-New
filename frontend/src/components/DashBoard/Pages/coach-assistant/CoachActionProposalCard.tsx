/**
 * CoachActionProposalCard.tsx
 * ===========================
 * Approval card for structured Swan Coach proposals. Coach can prepare drafts;
 * server-side deterministic code owns final record writes.
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Eye, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import type { CoachActionProposal } from './SwanCoachTypes';
import {
  answerCoachProposalClarification,
  approveCoachProposal,
  getCoachProposal,
  rejectCoachProposal,
} from '../../../../services/coachProposalService';
import { CoachProposalGateRail } from './CoachProposalGateRail';
import {
  buildDetailRows,
  clarificationOptionsFromDetail,
  displayValue,
  hasDetailBlockingError,
  proposalTypeLabel,
} from './CoachActionProposalDetailRows';
import { CoachActionProposalSplitPlanPanel } from './CoachActionProposalSplitPlanPanel';
import {
  ActionButton,
  Actions,
  Card,
  DetailPanel,
  Header,
  Label,
  Row,
  StatusText,
  Value,
} from './CoachActionProposalCard.styles';

interface CoachActionProposalCardProps { proposal: CoachActionProposal; onProposalAction?: (proposal: CoachActionProposal) => void; }

function terminalStatusMessage(status: CoachActionProposal['status'], type: CoachActionProposal['type']): string | null {
  if (status === 'APPLIED') {
    return 'This draft has already been applied through deterministic approval.';
  }
  if (status === 'REJECTED') {
    return 'This proposal has already been rejected. Prepare a new draft if this intake still needs work.';
  }
  if (status === 'APPROVED' && type === 'split_plan') {
    return 'Split plan approved. Review the generated workout drafts before any workout is logged.';
  }
  if (status === 'APPROVED' && type === 'clarification') {
    return 'Clarification recorded. Coach can prepare the next deterministic draft.';
  }
  if (status === 'APPROVED') {
    return 'Draft approved. Deterministic follow-up may still be pending.';
  }
  return null;
}

export function CoachActionProposalCard({ proposal, onProposalAction }: CoachActionProposalCardProps) {
  const [status, setStatus] = useState(proposal.status);
  const [busy, setBusy] = useState<'approve' | 'clarification' | 'detail' | 'reject' | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(proposal.detail || null);
  const [generatedProposals, setGeneratedProposals] = useState<CoachActionProposal[]>([]);
  const [reviewToken, setReviewToken] = useState<string | null>(proposal.reviewToken || null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = proposal.summary || {};
  const pending = status === 'PENDING';
  const approveLabel = proposal.type === 'workout_log'
    ? 'Approve and log'
    : proposal.type === 'split_plan' ? 'Approve split plan' : 'Approve draft';
  const clarificationOptions = useMemo(() => clarificationOptionsFromDetail(detail), [detail]);
  const isClarification = proposal.type === 'clarification';
  const detailHasBlockingError = hasDetailBlockingError(detail);
  const canApprove = pending && !isClarification && !!detail && !!reviewToken && !detailHasBlockingError;
  const detailRows = useMemo(() => buildDetailRows(detail), [detail]);
  const terminalMessage = terminalStatusMessage(status, proposal.type);
  const rows = useMemo(() => [
    ['Type', proposalTypeLabel(proposal.type)],
    ['Client', summary.clientId ? `#${summary.clientId}` : String(summary.displayName || 'Needs review')],
    ['Date', String(summary.date || 'Needs review')],
    ['Exercises', summary.exerciseCount != null ? String(summary.exerciseCount) : null],
  ].filter((row) => row[1] != null), [proposal.type, summary]);

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
        setError(displayValue(loadedDetail?.error) || 'Draft details need correction before approval.');
      } else if (!isClarification && !loadedReviewToken) {
        setError('Review token is missing. Review details again or prepare an updated draft before approval.');
      } else {
        setMessage('Draft details loaded for review.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detail load failed');
    } finally {
      setBusy(null);
    }
  };

  const runApprove = async () => {
    setBusy('approve');
    setError(null);
    try {
      const result = await approveCoachProposal(proposal.id, reviewToken);
      const nextProposal = result.proposal || { ...proposal, status: result.applied ? 'APPLIED' : 'APPROVED' };
      setStatus(nextProposal.status);
      onProposalAction?.(nextProposal);
      if (result.client) {
        setMessage('Client created through deterministic onboarding approval.');
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
        setMessage(result.applied
          ? 'Applied through the deterministic workout logger.'
          : 'Draft approved for deterministic review.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
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
      onProposalAction?.(nextProposal);
      setMessage('Clarification answer recorded for deterministic review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clarification answer failed');
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
      onProposalAction?.(nextProposal);
      setMessage('Proposal rejected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
    <Card>
      <Header><ShieldCheck size={16} /> {proposal.title}</Header>
      {rows.map(([label, value]) => (
        <Row key={label}>
          <Label>{label}</Label>
          <Value>{value}</Value>
        </Row>
      ))}
      <Row>
        <Label>Status</Label>
        <Value>{status}</Value>
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
              key={option}
              onClick={() => runClarificationAnswer(option)}
              disabled={!!busy}
            >
              {busy === 'clarification' ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
              {option}
            </ActionButton>
          ))}
        </Actions>
      )}
      {pending && (
        <Actions>
          <ActionButton onClick={runLoadDetails} disabled={!!busy}>
            {busy === 'detail' ? <Loader2 size={16} /> : <Eye size={16} />}
            Review details
          </ActionButton>
          {!isClarification && (
            <ActionButton onClick={runApprove} disabled={!!busy || !canApprove}>
              {busy === 'approve' ? <Loader2 size={16} /> : <ClipboardCheck size={16} />}
              {approveLabel}
            </ActionButton>
          )}
          <ActionButton $danger onClick={runReject} disabled={!!busy}>
            {busy === 'reject' ? <Loader2 size={16} /> : <XCircle size={16} />}
            Reject
          </ActionButton>
        </Actions>
      )}
      {!pending && !message && !error && terminalMessage && (
        <StatusText><CheckCircle2 size={14} /> {terminalMessage}</StatusText>
      )}
      {message && <StatusText><CheckCircle2 size={14} /> {message}</StatusText>}
      {error && <StatusText $error>{error}</StatusText>}
    </Card>
    {generatedProposals.map((generatedProposal) => (
      <CoachActionProposalCard key={generatedProposal.id} proposal={generatedProposal} onProposalAction={onProposalAction} />
    ))}
    </>
  );
}

export default CoachActionProposalCard;
