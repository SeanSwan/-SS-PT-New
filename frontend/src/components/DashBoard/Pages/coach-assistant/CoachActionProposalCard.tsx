/**
 * CoachActionProposalCard.tsx
 * ===========================
 * Approval card for structured Swan Coach proposals. Coach can prepare drafts;
 * server-side deterministic code owns final record writes.
 */
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
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
  displayValue,
  hasDetailBlockingError,
  proposalTypeLabel,
} from './CoachActionProposalDetailRows';
import { CoachActionProposalSplitPlanPanel } from './CoachActionProposalSplitPlanPanel';

const Card = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 92%, var(--accent-primary, #60C0F0));
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 10px;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  padding: 4px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
`;

const Label = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.52));
  min-width: 104px;
`;

const Value = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 650;
  word-break: break-word;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
`;

const ClarificationOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
`;

const DetailPanel = styled.div`
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 58%, var(--accent-secondary, #8B5CF6));
`;

const ActionButton = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid ${({ $danger }) => (
    $danger
      ? 'color-mix(in srgb, var(--error, #C92A54) 42%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
  )};
  background: ${({ $danger }) => (
    $danger
      ? 'color-mix(in srgb, var(--error, #C92A54) 16%, var(--bg-surface, #1A1A24))'
      : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--primary, #002060))'
  )};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }
`;

const StatusText = styled.div<{ $error?: boolean }>`
  margin-top: 10px;
  color: ${({ $error }) => ($error ? 'var(--error, #C92A54)' : 'var(--accent-primary, #60C0F0)')};
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
`;

function clarificationOptionsFromDetail(detail: Record<string, unknown> | null) {
  const clarification = detail?.clarification;
  if (!clarification || typeof clarification !== 'object' || Array.isArray(clarification)) return [];
  const options = (clarification as Record<string, unknown>).options;
  return Array.isArray(options)
    ? options.map((option) => String(option || '').trim()).filter(Boolean)
    : [];
}

export function CoachActionProposalCard({ proposal }: { proposal: CoachActionProposal }) {
  const [status, setStatus] = useState(proposal.status);
  const [busy, setBusy] = useState<'approve' | 'clarification' | 'detail' | 'reject' | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(proposal.detail || null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = proposal.summary || {};
  const pending = status === 'PENDING';
  const approveLabel = proposal.type === 'workout_log'
    ? 'Approve and log'
    : proposal.type === 'split_plan' ? 'Approve split plan' : 'Approve draft';
  const requiresDetailBeforeApprove = proposal.type === 'client_onboarding' || proposal.type === 'split_plan';
  const clarificationOptions = useMemo(() => clarificationOptionsFromDetail(detail), [detail]);
  const isClarification = proposal.type === 'clarification';
  const detailHasBlockingError = hasDetailBlockingError(detail);
  const canApprove = pending && !isClarification && (!requiresDetailBeforeApprove || (!!detail && !detailHasBlockingError));
  const detailRows = useMemo(() => buildDetailRows(detail), [detail]);
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
      setDetail(loadedDetail);
      if (hasDetailBlockingError(loadedDetail)) {
        setError(displayValue(loadedDetail?.error) || 'Draft details need correction before approval.');
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
      const result = await approveCoachProposal(proposal.id);
      setStatus(result.proposal?.status || (result.applied ? 'APPLIED' : 'APPROVED'));
      if (result.client) {
        setMessage('Client created through deterministic onboarding approval.');
      } else if (proposal.type === 'client_data_update' && result.partial) {
        setMessage('Some client updates applied; review the remaining errors.');
      } else if (proposal.type === 'client_data_update' && result.applied) {
        setMessage('Client updates applied through deterministic approval.');
      } else if (proposal.type === 'split_plan') {
        const count = Number(result.splitPlan?.splitCount || 0);
        setMessage(count > 0
          ? `${count} workout split candidates approved for deterministic workout-card preparation.`
          : 'Split plan approved for deterministic workout-card preparation.');
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
      setStatus(result.proposal?.status || 'APPROVED');
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
      setStatus(result.proposal?.status || 'REJECTED');
      setMessage('Proposal rejected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  return (
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
        <ClarificationOptions aria-label="Clarification answer options">
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
        </ClarificationOptions>
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
      {message && <StatusText><CheckCircle2 size={14} /> {message}</StatusText>}
      {error && <StatusText $error>{error}</StatusText>}
    </Card>
  );
}

export default CoachActionProposalCard;
