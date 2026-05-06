/**
 * PLAUD date split approval guard
 * ===============================
 * Keeps unresolved multi-date transcript findings from passing through the
 * one-click merge approval path before a trainer has confirmed the dates.
 */
import type { PlaudDateSplitCandidates } from '../../services/plaudMergeService';

export function getPlaudDateSplitApprovalBlock(candidates?: PlaudDateSplitCandidates | null): string | null {
  const segments = candidates?.segments || [];
  if (segments.length === 0) return null;
  if (segments.length > 1) {
    return `${segments.length} workout segments were detected. Use the multi-workout review flow before logging.`;
  }

  const blockedCount = candidates?.futureDateBlockedCount
    ?? segments.filter((segment) => segment.futureDateBlocked).length;
  if (blockedCount > 0) {
    return `${blockedCount} workout ${blockedCount === 1 ? 'date lands' : 'dates land'} in the future. Confirm the real session date before logging.`;
  }

  const reviewCount = candidates?.needsDateReviewCount
    ?? segments.filter((segment) => segment.needsDateConfirmation).length;
  if (reviewCount > 0) {
    return `${reviewCount} workout ${reviewCount === 1 ? 'date needs' : 'dates need'} confirmation before logging.`;
  }

  return null;
}
