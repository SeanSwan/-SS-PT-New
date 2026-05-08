/**
 * coachIntakeRetentionPolicyService.mjs
 * =====================================
 * Read-only retention classifier for Coach intake raw artifacts. This service
 * reports purge candidates without deleting data or selecting encrypted bodies.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import { coachIntakeTablesExist } from './coachIntakeItemService.mjs';

export const COACH_INTAKE_RETENTION_POLICY = Object.freeze({
  appliedRawArtifactGraceHours: 24,
  failedRawArtifactGraceDays: 7,
  staleReviewQueueDays: 30,
  maxRows: 100,
});

const EMPTY_SUMMARY = Object.freeze({
  totalWithRawArtifacts: 0,
  purgeReady: 0,
  reviewRequired: 0,
  retained: 0,
});

const ARCHIVED_STATUSES = new Set(['APPROVED', 'APPLIED', 'ARCHIVED']);

function emptyReport({
  now,
  schemaReady = false,
  action = { key: 'none', label: 'No retention work' },
} = {}) {
  const generatedAt = new Date(now || Date.now()).toISOString();
  return {
    schemaReady,
    status: schemaReady ? 'healthy' : 'unavailable',
    generatedAt,
    policy: COACH_INTAKE_RETENTION_POLICY,
    summary: { ...EMPTY_SUMMARY },
    items: [],
    nextOperatorAction: action,
  };
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageMs(now, value) {
  const parsed = parseDate(value);
  if (!parsed) return 0;
  return Math.max(0, now.getTime() - parsed.getTime());
}

function hasRawArtifact(row = {}) {
  return !!(row.has_payload_cipher || row.has_payload_iv || row.has_payload_tag);
}

function retentionAnchor(row = {}) {
  return row.archived_at || row.updated_at || row.uploaded_at || row.created_at || null;
}

function classifyRow(row, now) {
  if (!hasRawArtifact(row)) {
    return { classification: 'retained', reason: 'no_raw_artifact' };
  }

  const anchor = retentionAnchor(row);
  const age = ageMs(now, anchor);
  const appliedGraceMs = COACH_INTAKE_RETENTION_POLICY.appliedRawArtifactGraceHours * 60 * 60 * 1000;
  const failedGraceMs = COACH_INTAKE_RETENTION_POLICY.failedRawArtifactGraceDays * 24 * 60 * 60 * 1000;
  const staleReviewMs = COACH_INTAKE_RETENTION_POLICY.staleReviewQueueDays * 24 * 60 * 60 * 1000;

  if (ARCHIVED_STATUSES.has(row.status) && age >= appliedGraceMs) {
    return { classification: 'purge_ready', reason: 'archived_raw_artifact_grace_elapsed' };
  }
  if (row.status === 'FAILED' && age >= failedGraceMs) {
    return { classification: 'purge_ready', reason: 'failed_raw_artifact_grace_elapsed' };
  }
  if (!ARCHIVED_STATUSES.has(row.status) && age >= staleReviewMs) {
    return { classification: 'review_required', reason: 'stale_unapplied_raw_artifact' };
  }
  return { classification: 'retained', reason: 'within_retention_window' };
}

function nextOperatorAction(summary, schemaReady) {
  if (!schemaReady) return { key: 'schema_unavailable', label: 'Run Coach intake migration' };
  if (summary.purgeReady > 0) {
    return { key: 'review_purge_candidates', label: 'Review raw artifact purge candidates' };
  }
  if (summary.reviewRequired > 0) {
    return { key: 'review_stale_intake', label: 'Review stale intake artifacts' };
  }
  return { key: 'none', label: 'No retention work' };
}

function mapRetentionItem(row, now) {
  const classified = classifyRow(row, now);
  return {
    id: row.id,
    status: row.status,
    sourceType: row.source_type,
    hasRawArtifact: hasRawArtifact(row),
    artifactPresence: {
      cipher: !!row.has_payload_cipher,
      iv: !!row.has_payload_iv,
      tag: !!row.has_payload_tag,
    },
    recordedAt: row.recorded_at_start || null,
    uploadedAt: row.uploaded_at || null,
    updatedAt: row.updated_at || null,
    archivedAt: row.archived_at || null,
    classification: classified.classification,
    reason: classified.reason,
  };
}

function summarize(items) {
  return items.reduce((summary, item) => {
    if (item.hasRawArtifact) summary.totalWithRawArtifacts += 1;
    if (item.classification === 'purge_ready') summary.purgeReady += 1;
    if (item.classification === 'review_required') summary.reviewRequired += 1;
    if (item.classification === 'retained') summary.retained += 1;
    return summary;
  }, { ...EMPTY_SUMMARY });
}

export async function getCoachIntakeRetentionReport({
  userId,
  now = new Date(),
  sequelizeOverride = null,
} = {}) {
  const db = sequelizeOverride || sequelize;
  const numericUserId = Number(userId);
  const generatedAt = new Date(now);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return emptyReport({
      now: generatedAt,
      action: { key: 'auth_required', label: 'Sign in again' },
    });
  }

  if (!await coachIntakeTablesExist(db)) {
    return emptyReport({
      now: generatedAt,
      action: { key: 'schema_unavailable', label: 'Run Coach intake migration' },
    });
  }

  const rows = await db.query(
    `SELECT id, status, source_type, recorded_at_start, uploaded_at, updated_at,
            archived_at, created_at,
            payload_cipher IS NOT NULL AS has_payload_cipher,
            payload_iv IS NOT NULL AS has_payload_iv,
            payload_tag IS NOT NULL AS has_payload_tag
       FROM coach_intake_items
      WHERE user_id = :userId
        AND (
          payload_cipher IS NOT NULL
          OR payload_iv IS NOT NULL
          OR payload_tag IS NOT NULL
        )
      ORDER BY updated_at DESC, uploaded_at DESC, created_at DESC
      LIMIT :rowLimit`,
    {
      replacements: {
        userId: numericUserId,
        rowLimit: COACH_INTAKE_RETENTION_POLICY.maxRows,
      },
      type: QueryTypes.SELECT,
    },
  );

  const items = rows.map((row) => mapRetentionItem(row, generatedAt));
  const summary = summarize(items);
  return {
    schemaReady: true,
    status: summary.purgeReady > 0 || summary.reviewRequired > 0 ? 'attention' : 'healthy',
    generatedAt: generatedAt.toISOString(),
    policy: COACH_INTAKE_RETENTION_POLICY,
    summary,
    items,
    nextOperatorAction: nextOperatorAction(summary, true),
  };
}

export default { getCoachIntakeRetentionReport };
