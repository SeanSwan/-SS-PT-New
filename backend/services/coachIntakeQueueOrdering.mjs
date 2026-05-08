/**
 * coachIntakeQueueOrdering.mjs
 * ============================
 * Shared metadata-only ordering for unified Coach/PLAUD review worklists.
 */
const STATUS_PRIORITY = new Map([
  ['ready_review', 0],
  ['needs_client', 1],
  ['unprocessed', 2],
  ['processing', 3],
  ['failed', 4],
]);

export function coachIntakeQueuePriority(item) {
  if (item?.canReview) return -1;
  return STATUS_PRIORITY.get(item?.queueStatus) ?? 99;
}

export function coachIntakeQueueAgeTime(item) {
  const value = item?.recordedAt || item?.timelineAt || item?.createdAt || item?.uploadedAt || null;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function sortCoachIntakeReviewOrder(items = []) {
  return [...items].sort((a, b) => {
    const priority = coachIntakeQueuePriority(a) - coachIntakeQueuePriority(b);
    if (priority !== 0) return priority;
    return coachIntakeQueueAgeTime(a) - coachIntakeQueueAgeTime(b);
  });
}

export function pickNextCoachIntakeItem(items = []) {
  return sortCoachIntakeReviewOrder(
    items.filter((item) => item?.queueStatus && item.queueStatus !== 'archived'),
  )[0] || null;
}
