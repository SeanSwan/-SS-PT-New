/**
 * plaudDispatchers.mjs
 * =====================
 * Read-only Swan Coach command handlers for the PLAUD intake workspace.
 * These return flat, card-friendly metadata only: no transcripts, no parsed
 * workout payloads, and no client names.
 */
import { listPlaudIntakeItems } from '../../plaudIntakeQueueService.mjs';

const DEFAULT_QUEUE_LIMIT = 10;
const REVIEW_NEXT_LIMIT = 20;
const MAX_QUEUE_LIMIT = 20;
const DEFAULT_GAP_THRESHOLD_MINUTES = 45;
const MAX_TIMELINE_CHARS = 900;
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

function resolvePlaudQueueRoute(ctx) {
  const role = String(ctx?.user?.role || '').toLowerCase();
  if (role === 'admin') return '/dashboard/admin/plaud';
  if (role === 'trainer') return '/dashboard/trainer/plaud';
  throw new Error('Access requires an admin or trainer role for PLAUD queue commands.');
}

function normalizeLimit(raw, fallback = DEFAULT_QUEUE_LIMIT) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_QUEUE_LIMIT, Math.max(1, parsed));
}

function normalizeGapThreshold(raw, fallback = DEFAULT_GAP_THRESHOLD_MINUTES) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(240, Math.max(5, parsed));
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

function scalarSummary(result, nextItem, queueRoute) {
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
    reviewRoute: nextItem ? `${queueRoute}?review=next` : null,
    queueRoute,
    commandHint: nextItem
      ? 'Open the PLAUD workspace and continue with the next intake item.'
      : 'No PLAUD intake items need action.',
  };
}

function minutesBetween(previousIso, nextIso) {
  const previous = Date.parse(previousIso || '');
  const next = Date.parse(nextIso || '');
  if (Number.isNaN(previous) || Number.isNaN(next)) return null;
  return Math.max(0, Math.round((next - previous) / 60_000));
}

function summarizeAudioPieces(items, { queueRoute, gapThresholdMinutes }) {
  const pieces = [...(items || [])]
    .filter((item) => item?.kind === 'clip' && item?.queueStatus !== 'archived')
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  const withGaps = pieces.map((piece, index) => {
    const next = pieces[index + 1];
    return {
      ...piece,
      gapAfterMinutes: next ? minutesBetween(piece.createdAt, next.createdAt) : null,
    };
  });
  const gaps = withGaps
    .map((piece) => piece.gapAfterMinutes)
    .filter((gap) => typeof gap === 'number');
  const largeGaps = gaps.filter((gap) => gap >= gapThresholdMinutes);
  const timeline = withGaps.map((piece, index) => {
    const duration = typeof piece.durationSec === 'number' ? `${Math.round(piece.durationSec)}s` : 'duration unknown';
    const gap = typeof piece.gapAfterMinutes === 'number' ? `, gap ${piece.gapAfterMinutes}m` : '';
    return `${index + 1}. ${piece.source} ${piece.createdAt || 'time unknown'} ${duration}${gap}`;
  }).join(' | ');

  return {
    pieceCount: withGaps.length,
    manualUploadCount: withGaps.filter((piece) => piece.source === 'manual_upload').length,
    applaudCount: withGaps.filter((piece) => piece.source === 'applaud_webhook').length,
    suggestedGroupCount: withGaps.length === 0 ? 0 : largeGaps.length + 1,
    largeGapCount: largeGaps.length,
    largestGapMinutes: gaps.length ? Math.max(...gaps) : null,
    gapThresholdMinutes,
    orderedPieceIds: withGaps.map((piece) => piece.id).join(' > '),
    pieceTimeline: timeline.length > MAX_TIMELINE_CHARS ? `${timeline.slice(0, MAX_TIMELINE_CHARS - 3)}...` : timeline,
    targetRoute: `${queueRoute}?pieces=pending`,
    queueRoute,
    commandHint: withGaps.length >= 2
      ? 'Open the PLAUD workspace and select the audio pieces in chronological order; split groups at large gaps.'
      : 'Open the PLAUD workspace to upload or wait for more audio pieces before merging.',
  };
}

async function readQueue(params, ctx, { defaultScope = 'actionable', defaultLimit = DEFAULT_QUEUE_LIMIT } = {}) {
  assertPlaudEnabled();
  const userId = resolveUserId(ctx);
  const queueRoute = resolvePlaudQueueRoute(ctx);
  const scope = params?.scope || defaultScope;
  const limit = normalizeLimit(params?.limit, defaultLimit);
  const result = await listPlaudIntakeItems({
    userId,
    scope,
    limit,
    sequelizeOverride: ctx?.options?.sequelize || ctx?.sequelize || null,
  });
  return { result, nextItem: pickNextItem(result?.items || []), queueRoute };
}

export async function dispatchViewPlaudIntakeQueue(params = {}, ctx = {}) {
  const { result, nextItem, queueRoute } = await readQueue(params, ctx);
  return scalarSummary(result, nextItem, queueRoute);
}

export async function dispatchReviewNextPlaudIntake(params = {}, ctx = {}) {
  const { result, nextItem, queueRoute } = await readQueue(params, ctx, {
    defaultScope: 'actionable',
    defaultLimit: REVIEW_NEXT_LIMIT,
  });
  return scalarSummary(result, nextItem, queueRoute);
}

export async function dispatchInspectPlaudAudioPieces(params = {}, ctx = {}) {
  const gapThresholdMinutes = normalizeGapThreshold(params?.gapThresholdMinutes);
  const { result, queueRoute } = await readQueue(params, ctx, {
    defaultScope: 'unprocessed',
    defaultLimit: REVIEW_NEXT_LIMIT,
  });
  return summarizeAudioPieces(result?.items || [], { queueRoute, gapThresholdMinutes });
}

export const _internal = {
  normalizeGapThreshold,
  normalizeLimit,
  pickNextItem,
  resolvePlaudQueueRoute,
  scalarSummary,
  summarizeAudioPieces,
};
