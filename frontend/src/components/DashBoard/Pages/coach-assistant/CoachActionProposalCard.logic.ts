import { dispatchCoachProposalAction } from '../../../../services/coachProposalActionEvents';
import type { CoachActionProposal } from './SwanCoachTypes';
import { proposalTypeLabel } from './CoachActionProposalDetailRows';

export interface CoachActionProposalCardProps {
  proposal: CoachActionProposal;
  onProposalAction?: (proposal: CoachActionProposal) => void;
}

export function publishProposalAction(
  nextProposal: CoachActionProposal,
  onProposalAction?: (proposal: CoachActionProposal) => void,
) {
  if (onProposalAction) {
    onProposalAction(nextProposal);
    return;
  }
  dispatchCoachProposalAction(nextProposal);
}

export function terminalStatusMessage(
  status: CoachActionProposal['status'],
  type: CoachActionProposal['type'],
): string | null {
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

const VALID_PROPOSAL_STATUSES = new Set(['PENDING', 'APPLYING', 'APPROVED', 'APPLIED', 'REJECTED', 'FAILED']);

export function createdClientHubRoute(client: Record<string, unknown> | undefined): string | null {
  const clientId = Number(client?.id);
  return Number.isInteger(clientId) && clientId > 0
    ? `/dashboard/admin/client-management?clientId=${encodeURIComponent(String(clientId))}`
    : null;
}

export function safeProposalTypeLabel(type: CoachActionProposal['type']): string {
  return proposalTypeLabel(type);
}

export function safeProposalTitle(type: CoachActionProposal['type']): string {
  return `${safeProposalTypeLabel(type)} proposal`;
}

export function safeSummaryClient(summary: CoachActionProposal['summary']): string {
  const clientId = Number(summary.clientId);
  return Number.isInteger(clientId) && clientId > 0 ? `#${clientId}` : 'Needs review';
}

export function safeSummaryDate(date: CoachActionProposal['summary'][string]): string {
  const value = String(date || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : 'Needs review';
}

export function safeSummaryExerciseCount(count: CoachActionProposal['summary'][string]): string | null {
  if (count == null || String(count).trim() === '') {
    return null;
  }
  const value = Number(count);
  return Number.isInteger(value) && value >= 0 ? String(value) : null;
}

export function safeProposalStatus(value: CoachActionProposal['status']): string {
  return VALID_PROPOSAL_STATUSES.has(value) ? value : 'Needs review';
}
