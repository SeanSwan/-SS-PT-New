import { dispatchCoachProposalAction } from '../../../../services/coachProposalActionEvents';
import { dispatchWorkoutLogged } from '../../../../utils/workoutLoggedEvent';
import type { CoachAccessHandoff } from '../../../../services/coachProposalService';
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

interface AppliedProposalResult {
  applied?: boolean;
  workout?: Record<string, unknown>;
}

const safeEventValue = (value: unknown): number | string | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const firstEventValue = (...values: unknown[]): number | string | null => {
  for (const value of values) {
    const safe = safeEventValue(value);
    if (safe !== null) return safe;
  }
  return null;
};

const firstEventDate = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  return null;
};

export function publishWorkoutLoggedAfterProposalApproval(
  proposal: CoachActionProposal,
  result: AppliedProposalResult,
) {
  if (proposal.type !== 'workout_log' || result.applied !== true) return;
  const workout = result.workout || {};
  dispatchWorkoutLogged({
    clientId: firstEventValue(workout.userId, proposal.summary?.clientId),
    formId: firstEventValue(workout.formId, workout.id),
    date: firstEventDate(workout.date, proposal.summary?.date),
  });
}

export function approvalResultMessage(
  type: CoachActionProposal['type'],
  result: AppliedProposalResult,
): string {
  if (result.applied !== true) return 'Draft approved for deterministic review.';
  if (type === 'workout_log') return 'Applied through the deterministic workout logger.';
  if (type === 'nutrition_log') return 'Nutrition log applied through deterministic approval.';
  if (type === 'client_profile_coverage_update') return 'Client profile coverage update applied through deterministic approval.';
  return 'Draft applied through deterministic approval.';
}

const isResetLinkUnavailable = (handoff: CoachAccessHandoff | null): boolean => (
  handoff?.credentialMode === 'reset_link_unavailable'
  || handoff?.credentialIssue === 'reset_link_unavailable'
);

export const accessHandoffLabel = (handoff: CoachAccessHandoff | null) => {
  if (!handoff) return null;
  if (handoff.credentialMode === 'claim_link_ready') return 'Claim link ready';
  if (handoff.credentialMode === 'reset_link_ready' || handoff.resetUrl) return 'Reset link ready';
  if (handoff.credentialMode === 'reset_link_sent' || handoff.resetEmailSent === true) return 'Reset link sent';
  if (handoff.credentialMode === 'reset_link_needed') return 'Reset link needed';
  if (isResetLinkUnavailable(handoff)) return 'Reset link unavailable';
  return 'Login handoff needs review';
};

export const accessHandoffMessage = (handoff: CoachAccessHandoff | null) => {
  if (handoff?.credentialMode === 'claim_link_ready') return 'Client created and claim link is ready for activation.';
  if (handoff?.credentialMode === 'reset_link_ready' || handoff?.resetUrl) return 'Client created and reset link is ready for activation.';
  if (handoff?.credentialMode === 'reset_link_sent' || handoff?.resetEmailSent === true) return 'Client created and reset link was sent for activation.';
  if (isResetLinkUnavailable(handoff)) return 'Client created; reset-link handoff needs manual review.';
  return 'Client created through deterministic onboarding approval.';
};

export const accessExpiryLabel = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

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

export function createdClientHubRoute(
  client: Record<string, unknown> | undefined,
  currentPathname: string | null | undefined = null,
): string | null {
  const clientId = Number(client?.id);
  if (!Number.isInteger(clientId) || clientId <= 0) return null;

  const baseRoute = String(currentPathname || '').startsWith('/dashboard/trainer')
    ? '/dashboard/trainer/clients'
    : '/dashboard/admin/client-management';

  return `${baseRoute}?clientId=${encodeURIComponent(String(clientId))}`;
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

export function safeSummaryMealCount(count: CoachActionProposal['summary'][string]): string | null {
  if (count == null || String(count).trim() === '') {
    return null;
  }
  const value = Number(count);
  return Number.isInteger(value) && value > 0 ? `${value} meal${value === 1 ? '' : 's'}` : null;
}

export function safeSummaryCalories(value: CoachActionProposal['summary'][string]): string | null {
  if (value == null || String(value).trim() === '') {
    return null;
  }
  const cal = Number(value);
  return Number.isFinite(cal) && cal > 0 ? `~${Math.round(cal)} kcal` : null;
}
