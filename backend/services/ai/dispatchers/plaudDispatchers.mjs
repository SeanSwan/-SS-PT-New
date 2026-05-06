/**
 * plaudDispatchers.mjs
 * =====================
 * Read-only Swan Coach command handlers for the PLAUD intake workspace.
 * These return flat, card-friendly metadata only: no transcripts, no parsed
 * workout payloads, and no client names.
 */
import { listPlaudIntakeItems } from '../../plaudIntakeQueueService.mjs';

const QUEUE_ROUTE = '/dashboard/training/plaud';
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

function assertPlaudEnabled() {
  if (process.env.PLAUD_MERGE_ENABLED !== 'true') {
    throw new Error('PLAUD merge feature is not enabled in this environment.');
  }
}

function resolveUserId(ctx) {
  const userId = Number(ctx?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Authenticated user is required for PLAUD commands.');
  }
  return userId;
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

function pickNextItem(items = []) {
  return [...items]
    .filter((item) => item?.queueStatus && item.queueStatus !== 'archived')
    .sort((a, b) => {
      const priority = queuePriority(a) - queuePriority(b);
      if (priority !== 0) return priority;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })[0] || null;
}

function scalarSummary(result, nextItem) {
  const summary = result?.summary || {};
  return {
    total: Number(summary.total || 0),
    actionable: Number(summary.actionable || 0),
    today: Number(summary.today || 0),
    unprocessed: Number(summary.unprocessed || 0),
    processing: Number(summary.processing || 0),
    readyReview: Number(summary.readyReview || 0),
    failed: Number(summary.failed || 0),
    needsClient: Number(summary.needsClient || 0),
    nextIntakeId: nextItem?.id || null,
    nextEntityId: nextItem?.entityId || null,
    nextKind: nextItem?.kind || null,
    nextQueueStatus: nextItem?.queueStatus || null,
    nextCanReview: Boolean(nextItem?.canReview),
    queueRoute: QUEUE_ROUTE,
    commandHint: nextItem
      ? 'Open the PLAUD workspace and continue with the next intake item.'
      : 'No PLAUD intake items need action.',
  };
}

async function readQueue(params, ctx, { defaultScope = 'actionable', defaultLimit = DEFAULT_QUEUE_LIMIT } = {}) {
  assertPlaudEnabled();
  const userId = resolveUserId(ctx);
  const scope = params?.scope || defaultScope;
  const limit = normalizeLimit(params?.limit, defaultLimit);
  const result = await listPlaudIntakeItems({
    userId,
    scope,
    limit,
    sequelizeOverride: ctx?.options?.sequelize || ctx?.sequelize || null,
  });
  return { result, nextItem: pickNextItem(result?.items || []) };
}

export async function dispatchViewPlaudIntakeQueue(params = {}, ctx = {}) {
  const { result, nextItem } = await readQueue(params, ctx);
  return scalarSummary(result, nextItem);
}

export async function dispatchReviewNextPlaudIntake(params = {}, ctx = {}) {
  const { result, nextItem } = await readQueue(params, ctx, {
    defaultScope: 'actionable',
    defaultLimit: REVIEW_NEXT_LIMIT,
  });
  return scalarSummary(result, nextItem);
}

export const _internal = {
  normalizeLimit,
  pickNextItem,
  scalarSummary,
};
