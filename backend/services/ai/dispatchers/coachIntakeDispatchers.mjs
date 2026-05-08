/**
 * coachIntakeDispatchers.mjs
 * ==========================
 * Read-only command handlers for the unified Swan Coach intake queue. Result
 * cards stay PII-safe: no transcript bodies, parsed payloads, or client names.
 */
import { listUnifiedCoachIntakeItems } from '../../coachIntakeItemService.mjs';
import {
  coachIntakeQueueAgeTime,
  pickNextCoachIntakeItem,
} from '../../coachIntakeQueueOrdering.mjs';

const DEFAULT_QUEUE_LIMIT = 10;
const REVIEW_NEXT_LIMIT = 20;
const MAX_QUEUE_LIMIT = 20;

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

function isAudioPuzzleItem(item) {
  if (!item || item.queueStatus === 'archived') return false;
  if (item.kind === 'merge_request') return false;
  if (item.audioPuzzle?.pieceCount > 0) return true;
  if (Number(item.clipCount || 0) > 0) return true;
  return item.kind === 'clip' || item.source === 'audio_upload' || item.source === 'voice_note' || item.source === 'plaud_clip';
}

function normalizeIntakeId(raw) {
  const value = String(raw || '').trim();
  return value || null;
}

function itemIdCandidates(item) {
  const candidates = new Set();
  for (const raw of [item?.id, item?.entityId]) {
    const value = normalizeIntakeId(raw);
    if (!value) continue;
    candidates.add(value);
    const colonIndex = value.indexOf(':');
    if (colonIndex >= 0 && colonIndex + 1 < value.length) {
      candidates.add(value.slice(colonIndex + 1));
    }
  }
  return candidates;
}

function matchesIntakeId(item, targetIntakeId) {
  if (!targetIntakeId) return true;
  return itemIdCandidates(item).has(targetIntakeId);
}

function audioPuzzleForItem(item) {
  const puzzle = item?.audioPuzzle || {};
  const clipCount = Number(item?.clipCount || 0);
  const pieceCount = Number(puzzle.pieceCount || clipCount || (isAudioPuzzleItem(item) ? 1 : 0));
  return {
    pieceCount,
    bundleCount: Number(puzzle.bundleCount || (pieceCount > 0 ? 1 : 0)),
    autoBundleCount: Number(puzzle.autoBundleCount || 0),
    needsOrderingReview: puzzle.needsOrderingReview === true,
    confidence: ['single', 'high', 'medium', 'low'].includes(puzzle.confidence)
      ? puzzle.confidence
      : (pieceCount > 1 ? 'medium' : 'single'),
  };
}

function reviewPlanForAudioInspection({ targetIntakeId, items }) {
  if (!targetIntakeId) {
    return {
      mode: 'queue',
      primaryAction: items.length > 0 ? 'choose_audio_intake' : 'wait_for_audio',
      primaryLabel: items.length > 0 ? 'Choose an intake to review' : 'No audio intake to review',
      rationale: items.length > 0
        ? 'Open the Coach intake workspace, choose one audio item, then confirm order before draft generation.'
        : 'No actionable audio pieces are currently available in this queue.',
      route: items[0]?.reviewRoute || null,
    };
  }

  if (items.length === 0) {
    return {
      mode: 'active_intake',
      primaryAction: 'refresh_or_reselect_intake',
      primaryLabel: 'Refresh intake list',
      rationale: 'The selected intake was not found in the current actionable audio queue.',
      route: null,
    };
  }

  const item = items[0];
  const needsOrder = item.needsOrderingReview || item.audioPieces > 1 || item.audioConfidence === 'low';
  return {
    mode: 'active_intake',
    primaryAction: needsOrder ? 'confirm_audio_order' : 'prepare_draft_review',
    primaryLabel: needsOrder ? 'Confirm this intake order' : 'Prepare Coach draft review',
    rationale: needsOrder
      ? `${item.audioPieces} pieces across ${item.audioBundles} bundles need order review before Swan Coach drafts a workout log.`
      : `${item.audioPieces} audio piece is ready for Swan Coach draft preparation after client and date checks.`,
    route: item.reviewRoute || null,
  };
}

function audioInspectionSummary(result, ctx, params = {}) {
  const targetIntakeId = normalizeIntakeId(params?.intakeId);
  const allAudioItems = (result?.items || []).filter(isAudioPuzzleItem);
  const audioItems = allAudioItems
    .filter((item) => matchesIntakeId(item, targetIntakeId))
    .slice(0, 6);
  const items = audioItems.map((item) => {
    const puzzle = audioPuzzleForItem(item);
    return {
      id: item.id || null,
      kind: item.kind || null,
      queueStatus: item.queueStatus || null,
      canReview: item.canReview === true,
      audioPieces: puzzle.pieceCount,
      audioBundles: puzzle.bundleCount,
      autoAudioBundles: puzzle.autoBundleCount,
      audioConfidence: puzzle.confidence,
      needsOrderingReview: puzzle.needsOrderingReview,
      reviewRoute: reviewRouteForItem(item, ctx),
    };
  });

  return {
    totalAudioItems: items.length,
    needsOrderingReview: items.filter((item) => item.needsOrderingReview).length,
    lowConfidence: items.filter((item) => item.audioConfidence === 'low').length,
    items,
    queueRoute: resolveCoachQueueRoute(ctx),
    reviewRoute: targetIntakeId && items[0]?.reviewRoute ? items[0].reviewRoute : null,
    targetIntakeId,
    targetMatched: targetIntakeId ? audioItems.length > 0 : null,
    reviewPlan: reviewPlanForAudioInspection({ targetIntakeId, items }),
    commandHint: targetIntakeId && audioItems.length === 0
      ? 'That intake is not in the current actionable audio queue. Open the Coach workspace and refresh the intake list.'
      : 'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
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
  return { result, nextItem: pickNextCoachIntakeItem(result?.items || []) };
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

export async function dispatchInspectCoachAudioPieces(params = {}, ctx = {}) {
  const { result } = await readQueue(params, ctx, {
    defaultScope: 'actionable',
    defaultLimit: REVIEW_NEXT_LIMIT,
  });
  return audioInspectionSummary(result, ctx, params);
}

export const dispatchInspectPlaudAudioPieces = dispatchInspectCoachAudioPieces;

export const _internal = {
  audioInspectionSummary,
  audioPuzzleForItem,
  matchesIntakeId,
  normalizeLimit,
  pickNextItem: pickNextCoachIntakeItem,
  queueAgeTime: coachIntakeQueueAgeTime,
  reviewRouteForItem,
  scalarSummary,
};
