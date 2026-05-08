/**
 * coachIntakeHealthService.mjs
 * ============================
 * PII-safe Coach intake queue health snapshots for operator visibility.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import { coachIntakeTablesExist } from './coachIntakeItemService.mjs';

const PROCESSING_STUCK_MINUTES = 30;
const ARCHIVED_STATUSES = ['APPROVED', 'APPLIED', 'ARCHIVED'];

const EMPTY_COUNTS = Object.freeze({
  total: 0,
  actionable: 0,
  today: 0,
  unprocessed: 0,
  processing: 0,
  readyReview: 0,
  needsClarification: 0,
  duplicateHold: 0,
  failed: 0,
  needsClient: 0,
  stuckProcessing: 0,
});

function asCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfLocalDay(now) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date;
}

function nextLocalDayStart(now) {
  const date = startOfLocalDay(now);
  date.setDate(date.getDate() + 1);
  return date;
}

function statusForCounts(counts) {
  if (counts.stuckProcessing > 0) return 'degraded';
  if (counts.failed > 0) return 'attention';
  return 'healthy';
}

function nextOperatorAction(counts, schemaReady) {
  if (!schemaReady) {
    return { key: 'schema_unavailable', label: 'Run Coach intake migration' };
  }
  if (counts.stuckProcessing > 0) {
    return { key: 'inspect_stuck_processing', label: 'Inspect stuck processing intake' };
  }
  if (counts.failed > 0) {
    return { key: 'inspect_failed_intake', label: 'Inspect failed intake' };
  }
  if (counts.readyReview > 0) {
    return { key: 'review_ready_drafts', label: 'Review ready drafts' };
  }
  if (counts.needsClient > 0) {
    return { key: 'resolve_clients', label: 'Resolve client confirmations' };
  }
  if (counts.needsClarification > 0) {
    return { key: 'answer_clarifications', label: 'Answer Coach clarifications' };
  }
  if (counts.duplicateHold > 0) {
    return { key: 'review_duplicate_holds', label: 'Review duplicate-risk holds' };
  }
  if (counts.actionable > 0) {
    return { key: 'review_next', label: 'Review next intake' };
  }
  return { key: 'none', label: 'No active intake work' };
}

function mapHealthRow(row = {}) {
  return {
    total: asCount(row.total),
    actionable: asCount(row.actionable),
    today: asCount(row.today),
    unprocessed: asCount(row.unprocessed),
    processing: asCount(row.processing),
    readyReview: asCount(row.ready_review),
    needsClarification: asCount(row.needs_clarification),
    duplicateHold: asCount(row.duplicate_hold),
    failed: asCount(row.failed),
    needsClient: asCount(row.needs_client),
    stuckProcessing: asCount(row.stuck_processing),
  };
}

export async function getCoachIntakeHealth({
  userId,
  now = new Date(),
  sequelizeOverride = null,
} = {}) {
  const db = sequelizeOverride || sequelize;
  const numericUserId = Number(userId);
  const generatedAt = new Date(now);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return {
      schemaReady: false,
      status: 'unavailable',
      generatedAt: generatedAt.toISOString(),
      counts: { ...EMPTY_COUNTS },
      thresholds: { processingStuckMinutes: PROCESSING_STUCK_MINUTES },
      nextOperatorAction: { key: 'auth_required', label: 'Sign in again' },
    };
  }

  if (!await coachIntakeTablesExist(db)) {
    return {
      schemaReady: false,
      status: 'unavailable',
      generatedAt: generatedAt.toISOString(),
      counts: { ...EMPTY_COUNTS },
      thresholds: { processingStuckMinutes: PROCESSING_STUCK_MINUTES },
      nextOperatorAction: nextOperatorAction(EMPTY_COUNTS, false),
    };
  }

  const stuckBefore = new Date(generatedAt.getTime() - PROCESSING_STUCK_MINUTES * 60 * 1000);
  const [row] = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status NOT IN (:archivedStatuses))::int AS actionable,
       COUNT(*) FILTER (WHERE created_at >= :dayStart AND created_at < :dayEnd)::int AS today,
       COUNT(*) FILTER (
         WHERE status NOT IN (
           'READY_FOR_REVIEW','NEEDS_CLARIFICATION','DUPLICATE_HOLD',
           'TRANSCRIBING','FAILED','APPROVED','APPLIED','ARCHIVED'
         )
       )::int AS unprocessed,
       COUNT(*) FILTER (WHERE status = 'TRANSCRIBING')::int AS processing,
       COUNT(*) FILTER (WHERE status = 'READY_FOR_REVIEW')::int AS ready_review,
       COUNT(*) FILTER (WHERE status = 'NEEDS_CLARIFICATION')::int AS needs_clarification,
       COUNT(*) FILTER (WHERE status = 'DUPLICATE_HOLD')::int AS duplicate_hold,
       COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
       COUNT(*) FILTER (
         WHERE resolved_client_id IS NULL AND status NOT IN (:archivedStatuses)
       )::int AS needs_client,
       COUNT(*) FILTER (WHERE status = 'TRANSCRIBING' AND updated_at < :stuckBefore)::int AS stuck_processing,
       MIN(COALESCE(recorded_at_start, uploaded_at, created_at)) FILTER (
         WHERE status NOT IN (:archivedStatuses)
       ) AS oldest_actionable_at,
       MIN(COALESCE(recorded_at_start, uploaded_at, created_at)) FILTER (
         WHERE status = 'TRANSCRIBING'
       ) AS oldest_processing_at
     FROM coach_intake_items
     WHERE user_id = :userId`,
    {
      replacements: {
        userId: numericUserId,
        archivedStatuses: ARCHIVED_STATUSES,
        dayStart: startOfLocalDay(generatedAt).toISOString(),
        dayEnd: nextLocalDayStart(generatedAt).toISOString(),
        stuckBefore: stuckBefore.toISOString(),
      },
      type: QueryTypes.SELECT,
    },
  );

  const counts = mapHealthRow(row);
  return {
    schemaReady: true,
    status: statusForCounts(counts),
    generatedAt: generatedAt.toISOString(),
    counts,
    oldestActionableAt: row?.oldest_actionable_at || null,
    oldestProcessingAt: row?.oldest_processing_at || null,
    thresholds: { processingStuckMinutes: PROCESSING_STUCK_MINUTES },
    nextOperatorAction: nextOperatorAction(counts, true),
  };
}

export default { getCoachIntakeHealth };
