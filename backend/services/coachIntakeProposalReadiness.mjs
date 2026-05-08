/**
 * coachIntakeProposalReadiness.mjs
 * ================================
 * Shared metadata-only readiness checks for Coach intake proposal review.
 */
const TERMINAL_PROPOSAL_STATUSES = new Set(['APPLIED', 'REJECTED', 'FAILED']);
const BLOCKED_QUEUE_STATUSES = new Set([
  'archived',
  'duplicate_hold',
  'failed',
  'needs_clarification',
  'processing',
]);

export function hasReviewablePreparedDraft(item) {
  if (!item?.latestProposalId && !item?.latestProposal?.id) return false;
  if (BLOCKED_QUEUE_STATUSES.has(item?.queueStatus)) return false;
  const status = String(item.latestProposal?.status || '').trim().toUpperCase();
  return !TERMINAL_PROPOSAL_STATUSES.has(status);
}

export default { hasReviewablePreparedDraft };
