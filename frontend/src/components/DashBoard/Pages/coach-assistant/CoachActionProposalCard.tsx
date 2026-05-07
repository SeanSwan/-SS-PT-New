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
import { approveCoachProposal, getCoachProposal, rejectCoachProposal } from '../../../../services/coachProposalService';
import { CoachProposalGateRail } from './CoachProposalGateRail';

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

type DetailRow = [string, string];

function proposalTypeLabel(type: string) {
  const labels: Record<string, string> = {
    client_onboarding: 'Client onboarding',
    workout_log: 'Workout log',
    client_data_update: 'Client data update',
    frontend_dispatch: 'Workout form action',
  };
  return labels[type] || 'Coach proposal';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function displayValue(value: unknown) {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return 'Review structured fields';
  return String(value);
}

function compactRows(rows: Array<[string, unknown]>): DetailRow[] {
  return rows
    .map(([label, value]) => [label, displayValue(value)] as [string, string | null])
    .filter((row): row is DetailRow => Boolean(row[1]));
}

function hasDetailBlockingError(detail: Record<string, unknown> | null) {
  return Boolean(detail && (detail.errorCode || detail.error));
}

function buildDetailRows(detail: Record<string, unknown> | null): DetailRow[] {
  if (!detail) return [];
  if (hasDetailBlockingError(detail)) {
    return compactRows([
      ['Issue', detail.error],
      ['Code', detail.errorCode],
    ]);
  }
  const client = asRecord(detail.client);
  if (client) {
    return compactRows([
      ['First', client.firstName],
      ['Last', client.lastName],
      ['Email', client.email],
      ['Source', client.clientSource],
      ['Goal', client.fitnessGoal],
      ['Health', client.healthConcerns],
      ['Experience', client.trainingExperience],
      ['Notes', client.trainerNotes],
    ]);
  }
  const workout = asRecord(detail.workout);
  if (workout) {
    return compactRows([
      ['Title', workout.title],
      ['Date', workout.date],
      ['Client', workout.clientId ? `#${workout.clientId}` : null],
      ['Exercises', workout.exercises],
      ['Notes', workout.notes],
    ]);
  }
  return compactRows(Object.entries(detail));
}

export function CoachActionProposalCard({ proposal }: { proposal: CoachActionProposal }) {
  const [status, setStatus] = useState(proposal.status);
  const [busy, setBusy] = useState<'approve' | 'detail' | 'reject' | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(proposal.detail || null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = proposal.summary || {};
  const pending = status === 'PENDING';
  const approveLabel = proposal.type === 'workout_log' ? 'Approve and log' : 'Approve draft';
  const requiresDetailBeforeApprove = proposal.type === 'client_onboarding';
  const detailHasBlockingError = hasDetailBlockingError(detail);
  const canApprove = pending && (!requiresDetailBeforeApprove || (!!detail && !detailHasBlockingError));
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
      {pending && (
        <Actions>
          <ActionButton onClick={runLoadDetails} disabled={!!busy}>
            {busy === 'detail' ? <Loader2 size={16} /> : <Eye size={16} />}
            Review details
          </ActionButton>
          <ActionButton onClick={runApprove} disabled={!!busy || !canApprove}>
            {busy === 'approve' ? <Loader2 size={16} /> : <ClipboardCheck size={16} />}
            {approveLabel}
          </ActionButton>
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
