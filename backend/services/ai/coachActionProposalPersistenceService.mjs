/**
 * coachActionProposalPersistenceService.mjs
 * =========================================
 * Narrow persistence helpers for Coach proposal approval flows.
 */
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { COACH_PROPOSAL_STATUS } from './coachActionProposalService.mjs';
import logger from '../../utils/logger.mjs';

export function mapProposalRow(row) {
  const summary = row.summary_json || {};
  const appliedResult = row.applied_result_json && typeof row.applied_result_json === 'object'
    ? row.applied_result_json
    : null;
  return {
    id: row.id,
    type: row.proposal_type,
    status: row.status,
    title: summary.title || 'Review Coach proposal',
    summary,
    createdAt: row.created_at,
    ...(appliedResult?.accessHandoff ? { accessHandoff: appliedResult.accessHandoff } : {}),
    ...(appliedResult?.client ? { client: appliedResult.client } : {}),
  };
}

export async function loadOwnedProposal({ id, userId, db, transaction = undefined, lock = false }) {
  if (lock && !transaction) throw new Error('Proposal row lock requires a transaction');
  const rows = await db.query(
    `SELECT id, created_by_user_id, proposal_type, status, schema_version, summary_json,
            conversation_id, source_message_id, applied_result_json,
            proposal_cipher, proposal_iv, proposal_tag, cipher_key_id
       FROM coach_action_proposals
      WHERE id = :id AND created_by_user_id = :userId
      LIMIT 1 ${lock ? 'FOR UPDATE' : ''}`,
    { replacements: { id, userId }, type: QueryTypes.SELECT, transaction },
  );
  return rows[0] || null;
}

export async function claimPendingProposal({ id, userId, db, transaction = undefined }) {
  const rows = await db.query(
    `UPDATE coach_action_proposals
        SET status = :claimedStatus,
            updated_at = NOW()
      WHERE id = :id
        AND created_by_user_id = :userId
        AND status = :pendingStatus
      RETURNING id`,
    {
      replacements: {
        id,
        userId,
        claimedStatus: COACH_PROPOSAL_STATUS.APPLYING,
        pendingStatus: COACH_PROPOSAL_STATUS.PENDING,
      },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  return !!rows[0];
}

export const proposalNotPending = () => ({
  status: 409,
  body: { success: false, code: 'PROPOSAL_NOT_PENDING' },
});

function latestProposalStatusJson(row) {
  return JSON.stringify({
    id: row.id,
    type: row.proposal_type,
    status: row.status,
    title: row.summary_json?.title || 'Review Coach proposal',
    createdAt: row.created_at || null,
  });
}

export async function syncLatestProposalStatusToIntake({ row, db }) {
  const userId = Number(row?.created_by_user_id || 0);
  if (!row?.id || !Number.isInteger(userId) || userId <= 0) {
    return { synced: false, reason: 'missing_inputs' };
  }
  const rows = await db.query(
    `UPDATE coach_intake_items
        SET metadata_json = jsonb_set(
              COALESCE(metadata_json, '{}'::jsonb),
              '{latestProposal}',
              CAST(:latestProposalJson AS jsonb),
              true
            ),
            updated_at = NOW()
      WHERE latest_proposal_id = :proposalId
        AND user_id = :userId
      RETURNING id`,
    {
      replacements: {
        latestProposalJson: latestProposalStatusJson(row),
        proposalId: row.id,
        userId,
      },
      type: QueryTypes.SELECT,
    },
  );
  return rows[0] ? { synced: true, reason: 'synced' } : { synced: false, reason: 'not_latest_or_forbidden' };
}

function proposalEventType(status) {
  if (status === COACH_PROPOSAL_STATUS.APPLIED) return 'proposal_applied';
  if (status === COACH_PROPOSAL_STATUS.APPROVED) return 'proposal_approved';
  if (status === COACH_PROPOSAL_STATUS.REJECTED) return 'proposal_rejected';
  if (status === COACH_PROPOSAL_STATUS.FAILED) return 'proposal_failed';
  return 'proposal_status_changed';
}

function proposalEventJson(row, errorCode = null) {
  return JSON.stringify({
    action: 'proposal_status_changed',
    proposalId: row.id,
    proposalType: row.proposal_type,
    status: row.status,
    errorCode: errorCode || null,
  });
}

export async function appendLatestProposalEventToIntake({ row, errorCode = null, db }) {
  const userId = Number(row?.created_by_user_id || 0);
  if (!row?.id || !Number.isInteger(userId) || userId <= 0) {
    return { appended: false, reason: 'missing_inputs' };
  }

  const eventId = randomUUID();
  const rows = await db.query(
    `INSERT INTO coach_intake_events (
       id, intake_item_id, actor_type, actor_id, event_type, event_json
     )
     SELECT :eventId, id, 'user', :actorId, :eventType, CAST(:eventJson AS jsonb)
       FROM coach_intake_items
      WHERE latest_proposal_id = :proposalId
        AND user_id = :userId
      RETURNING id`,
    {
      replacements: {
        actorId: String(userId),
        eventId,
        eventJson: proposalEventJson(row, errorCode),
        eventType: proposalEventType(row.status),
        proposalId: row.id,
        userId,
      },
      type: QueryTypes.SELECT,
    },
  );

  return rows[0] ? { appended: true, reason: 'appended' } : { appended: false, reason: 'not_latest_or_forbidden' };
}

export async function updateProposalStatus({
  id,
  status,
  result = {},
  errorCode = null,
  userId = null,
  fromStatus = null,
  db,
  transaction = undefined,
}) {
  const rows = await db.query(
    `UPDATE coach_action_proposals
        SET status = :status,
            applied_result_json = CAST(:resultJson AS jsonb),
            error_code = :errorCode,
            updated_at = NOW()
      WHERE id = :id
        ${userId == null ? '' : 'AND created_by_user_id = :userId'}
        ${fromStatus == null ? '' : 'AND status = :fromStatus'}
      RETURNING id, created_by_user_id, proposal_type, status, summary_json, applied_result_json, created_at`,
    {
      replacements: { id, status, resultJson: JSON.stringify(result), errorCode, userId, fromStatus },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  if (!rows[0]) return null;
  // Caller must publish explicitly after its COMMIT returns successfully.
  // Sequelize afterCommit callbacks also run on rejected COMMIT in v6.
  if (!transaction) await notifyProposalStatus(rows[0], errorCode, db);
  return mapProposalRow(rows[0]);
}

async function notifyProposalStatus(row, errorCode, db) {
  for (const action of [syncLatestProposalStatusToIntake, appendLatestProposalEventToIntake]) {
    try { await action({ row, errorCode, db }); }
    catch { logger.warn('[CoachActionProposal] Intake status publication unavailable'); }
  }
}

/** Only call after the domain writer reports successful COMMIT. Never retries effects. */
export async function publishProposalStatus({ id, userId, db }) {
  try {
    const row = await loadOwnedProposal({ id, userId, db });
    if (row) await notifyProposalStatus(row, null, db);
  } catch { logger.warn('[CoachActionProposal] Intake status publication unavailable'); }
}

export default {
  claimPendingProposal,
  appendLatestProposalEventToIntake,
  loadOwnedProposal,
  mapProposalRow,
  proposalNotPending,
  syncLatestProposalStatusToIntake,
  updateProposalStatus,
};
