/**
 * coachIntakeRetentionPurgeService.mjs
 * ====================================
 * Guarded executor for clearing Coach intake raw artifact columns after the
 * read-only retention policy has classified rows as purge-ready.
 *
 * Safety contract:
 * - dry-run by default
 * - disabled unless explicitly enabled
 * - confirmation token required for live purge
 * - clears encrypted artifact columns only; never deletes intake rows
 */
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import {
  COACH_INTAKE_RETENTION_POLICY,
  getCoachIntakeRetentionReport,
} from './coachIntakeRetentionPolicyService.mjs';

export const COACH_INTAKE_RETENTION_PURGE_CONFIRM_TOKEN = 'PURGE_COACH_INTAKE_RAW_ARTIFACTS';
export const COACH_INTAKE_RETENTION_PURGE_POLICY_ID = 'coach_intake_v1';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CoachIntakeRetentionPurgeBlockedError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CoachIntakeRetentionPurgeBlockedError';
    this.code = code;
    this.details = details;
  }
}

function cleanUserId(userId) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new CoachIntakeRetentionPurgeBlockedError(
      'AUTH_REQUIRED',
      'Authentication required before Coach intake retention purge',
    );
  }
  return numericUserId;
}

function resolveEnabled(explicitEnabled) {
  if (typeof explicitEnabled === 'boolean') return explicitEnabled;
  return String(process.env.COACH_INTAKE_RETENTION_PURGE_ENABLED || '').toLowerCase() === 'true';
}

function purgeCandidateIds(report) {
  return (report.items || [])
    .filter((item) => item.classification === 'purge_ready')
    .map((item) => String(item.id || '').trim())
    .filter((id) => UUID_RE.test(id));
}

function baseResult({ report, enabled, dryRun, candidateIds, purged = 0, skippedReason = null }) {
  return {
    enabled,
    dryRun,
    schemaReady: report.schemaReady,
    generatedAt: report.generatedAt,
    policy: report.policy,
    summary: report.summary,
    purgeReady: candidateIds.length,
    purged,
    candidateIds,
    skippedReason,
  };
}

function retentionCutoffs(now) {
  const appliedMs = COACH_INTAKE_RETENTION_POLICY.appliedRawArtifactGraceHours * 60 * 60 * 1000;
  const failedMs = COACH_INTAKE_RETENTION_POLICY.failedRawArtifactGraceDays * 24 * 60 * 60 * 1000;
  return {
    appliedCutoff: new Date(now.getTime() - appliedMs).toISOString(),
    failedCutoff: new Date(now.getTime() - failedMs).toISOString(),
  };
}

async function runWriteTransaction(db, callback) {
  if (typeof db.transaction === 'function') return db.transaction(callback);
  return callback(undefined);
}

async function writePurgeEvents({ db, purgedIds, userId, purgedAt, transaction }) {
  for (const intakeId of purgedIds) {
    await db.query(
      `INSERT INTO coach_intake_events (
         id, intake_item_id, actor_type, actor_id, event_type, event_json
       ) VALUES (
         :eventId, :intakeId, 'system', :actorId, 'raw_artifact_purged',
         CAST(:eventJson AS jsonb)
       )`,
      {
        replacements: {
          actorId: String(userId),
          eventId: randomUUID(),
          eventJson: JSON.stringify({
            action: 'raw_artifact_purged',
            policy: COACH_INTAKE_RETENTION_PURGE_POLICY_ID,
            purgedAt,
          }),
          intakeId,
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
  }
}

export async function purgeCoachIntakeRawArtifacts({
  userId,
  now = new Date(),
  dryRun = true,
  enabled = undefined,
  confirmToken = null,
  sequelizeOverride = null,
} = {}) {
  const db = sequelizeOverride || sequelize;
  const numericUserId = cleanUserId(userId);
  const enabledFlag = resolveEnabled(enabled);
  const liveRun = dryRun === false;

  if (liveRun && !enabledFlag) {
    throw new CoachIntakeRetentionPurgeBlockedError(
      'COACH_INTAKE_RETENTION_PURGE_DISABLED',
      'Coach intake retention purge is disabled',
    );
  }

  if (liveRun && confirmToken !== COACH_INTAKE_RETENTION_PURGE_CONFIRM_TOKEN) {
    throw new CoachIntakeRetentionPurgeBlockedError(
      'COACH_INTAKE_RETENTION_PURGE_CONFIRMATION_REQUIRED',
      'Explicit confirmation token required before purging Coach intake raw artifacts',
    );
  }

  const generatedAt = new Date(now);
  const report = await getCoachIntakeRetentionReport({
    userId: numericUserId,
    now: generatedAt,
    sequelizeOverride: db,
  });
  const candidateIds = purgeCandidateIds(report);

  if (!liveRun) {
    return baseResult({
      report,
      enabled: enabledFlag,
      dryRun: true,
      candidateIds,
      skippedReason: enabledFlag ? null : 'disabled',
    });
  }

  if (!report.schemaReady) {
    throw new CoachIntakeRetentionPurgeBlockedError(
      'COACH_INTAKE_RETENTION_SCHEMA_UNAVAILABLE',
      'Coach intake tables are not available for retention purge',
    );
  }

  if (candidateIds.length === 0) {
    return baseResult({
      report,
      enabled: enabledFlag,
      dryRun: false,
      candidateIds,
      skippedReason: 'no_purge_candidates',
    });
  }

  const purgedAt = generatedAt.toISOString();
  const cutoffs = retentionCutoffs(generatedAt);
  const purgedIds = await runWriteTransaction(db, async (transaction) => {
    const updatedRows = await db.query(
      `UPDATE coach_intake_items
          SET payload_cipher = NULL,
              payload_iv = NULL,
              payload_tag = NULL,
              metadata_json = COALESCE(metadata_json, '{}'::jsonb) ||
                jsonb_build_object(
                  'rawArtifactPurgedAt', :purgedAt,
                  'rawArtifactPurgedByUserId', :userId,
                  'rawArtifactRetentionPolicy', :policyId
                ),
              updated_at = :purgedAt
        WHERE user_id = :userId
          AND id IN (:candidateIds)
          AND (
            payload_cipher IS NOT NULL
            OR payload_iv IS NOT NULL
            OR payload_tag IS NOT NULL
          )
          AND (
            (
              status IN ('APPROVED', 'APPLIED', 'ARCHIVED')
              AND COALESCE(archived_at, updated_at, uploaded_at, created_at) <= :appliedCutoff
            )
            OR (
              status = 'FAILED'
              AND COALESCE(archived_at, updated_at, uploaded_at, created_at) <= :failedCutoff
            )
          )
        RETURNING id`,
      {
        replacements: {
          appliedCutoff: cutoffs.appliedCutoff,
          candidateIds,
          failedCutoff: cutoffs.failedCutoff,
          policyId: COACH_INTAKE_RETENTION_PURGE_POLICY_ID,
          purgedAt,
          userId: numericUserId,
        },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    const ids = updatedRows.map((row) => String(row.id)).filter((id) => UUID_RE.test(id));
    await writePurgeEvents({ db, purgedIds: ids, userId: numericUserId, purgedAt, transaction });
    return ids;
  });

  return baseResult({
    report,
    enabled: enabledFlag,
    dryRun: false,
    candidateIds: purgedIds,
    purged: purgedIds.length,
    skippedReason: null,
  });
}

export default {
  COACH_INTAKE_RETENTION_PURGE_CONFIRM_TOKEN,
  purgeCoachIntakeRawArtifacts,
};
