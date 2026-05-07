/**
 * coachIntakeDispatchers.mjs
 * ==========================
 * Read-only command handlers for the unified Swan Coach intake queue. Result
 * cards stay scalar-only: no transcript bodies, parsed payloads, or client names.
 */
import { listUnifiedCoachIntakeItems } from '../../coachIntakeItemService.mjs';

const DEFAULT_QUEUE_LIMIT = 10;
const REVIEW_NEXT_LIMIT = 20;
const MAX_QUEUE_LIMIT = 20;
const STATUS_PRIORITY = new Map([
  ['ready_review', 0],
  ['needs_client', 1],
  ['unprocessed', 2],
  ['processing', 3],
  ['failed', 4],
]);

function resolveUserId(ctx) {
  const userId = Number(ctx?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Authenticated user is required for Coach intake commands.');
  }
  return userId;
}

function resolveRole(ctx) {
  const role = String(ctx?.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'trainer') return role;
  throw new Error('Access requires an admin or trainer role for Coach intake commands.');
}

function resolveCoachQueueRoute(ctx) {
  return `/dashboard/${resolveRole(ctx)}/coach-assistant`;
}

function resolvePlaudReviewRoute(ctx) {
  return `/dashboard/${resolveRole(ctx)}/plaud?review=next`;
}

function normalizeLimit(raw, fallback = DEFAULT_QUEUE_LIMIT) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_QUEUE_LIMIT, Math.max(1, parsed));
}

function queuePriority(item) {
  if (item?.canReview) return -1;
  return STATUS_PRIORITY.get(item?.queueStatus) ?? 99;
}

function queueAgeTime(item) {
  const value = item?.recordedAt || item?.timelineAt || item?.createdAt || item?.uploadedAt || null;
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function pickNextItem(items = []) {
  return [...items]
    .filter((item) => item?.queueStatus && item.queueStatus !== 'archived')
    .sort((a, b) => {
      const priority = queuePriority(a) - queuePriority(b);
      if (priority !== 0) return priority;
      return queueAgeTime(a) - queueAgeTime(b);
    })[0] || null;
}

function reviewRouteForItem(item, ctx) {
  if (!item) return null;
  if (item.kind === 'merge_request' && item.canReview) {
    return resolvePlaudReviewRoute(ctx);
  }
  const queueRoute = resolveCoachQueueRoute(ctx);
  const entityId = item.entityId || item.id || '';
  return entityId ? `${queueRoute}?intake=${encodeURIComponent(entityId)}` : queueRoute;
}

function scalarSummary(result, nextItem, ctx) {
  const summary = result?.summary || {};
  const queueRoute = resolveCoachQueueRoute(ctx);
  return {
    total: Number(summary.total || 0),
    actionable: Number(summary.actionable || 0),
    today: Number(summary.today || 0),
    unprocessed: Number(summary.unprocessed || 0),
    processing: Number(summary.processing || 0),
    readyReview: Number(summary.readyReview || 0),
    failed: Number(summary.failed || 0),
    needsClient: Number(summary.needsClient || 0),
    schemaReady: result?.schemaReady !== false,
    nextIntakeId: nextItem?.id || null,
    nextEntityId: nextItem?.entityId || null,
    nextKind: nextItem?.kind || null,
    nextQueueStatus: nextItem?.queueStatus || null,
    nextCanReview: Boolean(nextItem?.canReview),
    reviewRoute: reviewRouteForItem(nextItem, ctx),
    queueRoute,
    commandHint: nextItem
      ? 'Continue from the Swan Coach intake workspace; PLAUD reviewable merges open in the PLAUD review workspace.'
      : 'No Coach or PLAUD intake items need action.',
  };
}

async function readQueue(params, ctx, { defaultScope = 'actionable', defaultLimit = DEFAULT_QUEUE_LIMIT } = {}) {
  const userId = resolveUserId(ctx);
  resolveRole(ctx);
  const scope = params?.scope || defaultScope;
  const limit = normalizeLimit(params?.limit, defaultLimit);
  const result = await listUnifiedCoachIntakeItems({
    userId,
    scope,
    limit,
    sequelizeOverride: ctx?.options?.sequelize || ctx?.sequelize || null,
  });
  return { result, nextItem: pickNextItem(result?.items || []) };
}

export async function dispatchViewCoachIntakeQueue(params = {}, ctx = {}) {
  const { result, nextItem } = await readQueue(params, ctx);
  return scalarSummary(result, nextItem, ctx);
}

export async function dispatchReviewNextCoachIntake(params = {}, ctx = {}) {
  const { result, nextItem } = await readQueue(params, ctx, {
    defaultScope: 'actionable',
    defaultLimit: REVIEW_NEXT_LIMIT,
  });
  return scalarSummary(result, nextItem, ctx);
}

export const _internal = {
  normalizeLimit,
  pickNextItem,
  queueAgeTime,
  reviewRouteForItem,
  scalarSummary,
};
