/**
 * plaudDispatchers.mjs
 * =====================
 * Read-only Swan Coach command handlers for the PLAUD intake workspace.
 * These return flat, card-friendly metadata only: no transcripts, no parsed
 * workout payloads, and no client names.
 */
import { listPlaudIntakeItems } from '../../plaudIntakeQueueService.mjs';
import { isPlaudUuid } from '../../../utils/plaudUuidRegex.mjs';

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

function reviewRouteForItem(item, queueRoute) {
  if (!item) return null;
  if (item.kind === 'merge_request' && item.canReview && isPlaudUuid(item.entityId)) {
    return `${queueRoute}?mergeRequestId=${encodeURIComponent(item.entityId)}`;
  }
  return `${queueRoute}?review=next`;
}

function summaryEntityIdForItem(item) {
  return isPlaudUuid(item?.entityId) ? item.entityId : null;
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
    nextEntityId: summaryEntityIdForItem(nextItem),
    nextKind: nextItem?.kind || null,
    nextQueueStatus: nextItem?.queueStatus || null,
    nextCanReview: Boolean(nextItem?.canReview),
    reviewRoute: reviewRouteForItem(nextItem, queueRoute),
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

function timelineInfo(piece) {
  if (piece?.recordedAt) {
    return {
      at: piece.recordedAt,
      source: 'recorded_at',
      confidence: 'exact',
    };
  }
  if (piece?.timelineAt) {
    return {
      at: piece.timelineAt,
      source: piece.timelineAtSource || 'best_available',
      confidence: piece.timelineAtSource === 'recorded_at' ? 'exact' : 'best_available',
    };
  }
  return {
    at: piece?.createdAt || null,
    source: piece?.kind === 'clip' ? 'uploaded_at' : 'created_at',
    confidence: 'best_available',
  };
}

function summarizeAudioPieces(items, { queueRoute, gapThresholdMinutes }) {
  const pieces = [...(items || [])]
    .filter((item) => item?.kind === 'clip' && item?.queueStatus !== 'archived')
    .sort((a, b) => new Date(timelineInfo(a).at || 0).getTime() - new Date(timelineInfo(b).at || 0).getTime());

  const withGaps = pieces.map((piece, index) => {
    const next = pieces[index + 1];
    const currentTimeline = timelineInfo(piece);
    const nextTimeline = next ? timelineInfo(next) : null;
    return {
      ...piece,
      timelineAt: currentTimeline.at,
      timelineSource: currentTimeline.source,
      timelineConfidence: currentTimeline.confidence,
      gapAfterMinutes: next ? minutesBetween(currentTimeline.at, nextTimeline?.at) : null,
    };
  });
  const gaps = withGaps
    .map((piece) => piece.gapAfterMinutes)
    .filter((gap) => typeof gap === 'number');
  const largeGaps = gaps.filter((gap) => gap >= gapThresholdMinutes);
  const sources = new Set(withGaps.map((piece) => piece.timelineSource).filter(Boolean));
  const confidences = new Set(withGaps.map((piece) => piece.timelineConfidence).filter(Boolean));
  const timeline = withGaps.map((piece, index) => {
    const duration = typeof piece.durationSec === 'number' ? `${Math.round(piece.durationSec)}s` : 'duration unknown';
    const gap = typeof piece.gapAfterMinutes === 'number' ? `, gap ${piece.gapAfterMinutes}m` : '';
    return `${index + 1}. ${piece.source} ${piece.timelineSource || 'time'}=${piece.timelineAt || 'unknown'} ${duration}${gap}`;
  }).join(' | ');
  const suggestedGroupCount = withGaps.length === 0 ? 0 : largeGaps.length + 1;
  const targetRoute = `${queueRoute}?pieces=pending`;
  const needsOrderingReview = withGaps.length > 1;
  const audioConfidence = withGaps.length <= 1
    ? 'single'
    : (confidences.has('best_available') ? 'medium' : 'high');

  return {
    pieceCount: withGaps.length,
    totalAudioItems: withGaps.length,
    needsOrderingReview: needsOrderingReview ? 1 : 0,
    lowConfidence: confidences.has('best_available') && withGaps.length > 0 ? 1 : 0,
    manualUploadCount: withGaps.filter((piece) => piece.source === 'manual_upload').length,
    applaudCount: withGaps.filter((piece) => piece.source === 'applaud_webhook').length,
    recordedAtAvailableCount: withGaps.filter((piece) => piece.timelineSource === 'recorded_at').length,
    timelineTimeSource: sources.size === 1 ? [...sources][0] : (sources.size > 1 ? 'mixed' : null),
    timelineConfidence: confidences.has('best_available') ? 'best_available' : (confidences.has('exact') ? 'exact' : null),
    suggestedGroupCount,
    largeGapCount: largeGaps.length,
    largestGapMinutes: gaps.length ? Math.max(...gaps) : null,
    gapThresholdMinutes,
    orderedPieceIds: withGaps.map((piece) => piece.id).join(' > '),
    pieceTimeline: timeline.length > MAX_TIMELINE_CHARS ? `${timeline.slice(0, MAX_TIMELINE_CHARS - 3)}...` : timeline,
    targetRoute,
    items: withGaps.length > 0 ? [{
      id: 'plaud:pending-pieces',
      kind: 'clip_bundle',
      queueStatus: 'unprocessed',
      canReview: false,
      audioPieces: withGaps.length,
      audioBundles: suggestedGroupCount,
      audioConfidence,
      needsOrderingReview,
      reviewRoute: targetRoute,
    }] : [],
    queueRoute,
    commandHint: withGaps.length >= 2
      ? 'Open the PLAUD workspace and select the audio pieces in chronological order; this uses upload/ingest timestamps until recorded_at metadata is available.'
      : 'Open the PLAUD workspace to upload or wait for more audio pieces before merging; timeline uses upload/ingest timestamps until recorded_at metadata is available.',
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
  queueAgeTime,
  reviewRouteForItem,
  resolvePlaudQueueRoute,
  scalarSummary,
  summaryEntityIdForItem,
  summarizeAudioPieces,
  timelineInfo,
};
