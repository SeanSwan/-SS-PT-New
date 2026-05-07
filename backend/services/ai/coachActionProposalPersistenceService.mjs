/**
 * coachActionProposalPersistenceService.mjs
 * =========================================
 * Narrow persistence helpers for Coach proposal approval flows.
 */
import { QueryTypes } from 'sequelize';
import { COACH_PROPOSAL_STATUS } from './coachActionProposalService.mjs';

export function mapProposalRow(row) {
  const summary = row.summary_json || {};
  return {
    id: row.id,
    type: row.proposal_type,
    status: row.status,
    title: summary.title || 'Review Coach proposal',
    summary,
    createdAt: row.created_at,
  };
}

export async function loadOwnedProposal({ id, userId, db }) {
  const rows = await db.query(
    `SELECT id, created_by_user_id, proposal_type, status, summary_json,
            conversation_id, source_message_id,
            proposal_cipher, proposal_iv, proposal_tag, cipher_key_id
       FROM coach_action_proposals
      WHERE id = :id AND created_by_user_id = :userId
      LIMIT 1`,
    { replacements: { id, userId }, type: QueryTypes.SELECT },
  );
  return rows[0] || null;
}

export async function claimPendingProposal({ id, userId, db }) {
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
    },
  );
  return !!rows[0];
}

export const proposalNotPending = () => ({
  status: 409,
  body: { success: false, code: 'PROPOSAL_NOT_PENDING' },
});

export async function updateProposalStatus({
  id,
  status,
  result = {},
  errorCode = null,
  userId = null,
  fromStatus = null,
  db,
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
      RETURNING id, proposal_type, status, summary_json, created_at`,
    {
      replacements: { id, status, resultJson: JSON.stringify(result), errorCode, userId, fromStatus },
      type: QueryTypes.SELECT,
    },
  );
  return rows[0] ? mapProposalRow(rows[0]) : null;
}

export default {
  claimPendingProposal,
  loadOwnedProposal,
  mapProposalRow,
  proposalNotPending,
  updateProposalStatus,
};
