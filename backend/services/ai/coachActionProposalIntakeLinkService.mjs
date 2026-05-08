/**
 * coachActionProposalIntakeLinkService.mjs
 * ========================================
 * Links prepared Coach approval proposals back to their source intake item.
 */
import { QueryTypes } from 'sequelize';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCoachIntakeId(value) {
  const clean = String(value || '').trim().replace(/^coach:/, '');
  return UUID_RE.test(clean) ? clean : null;
}

export function getProposalIntakeId(proposal) {
  const meta = proposal?.payload?.proposalMeta || {};
  return normalizeCoachIntakeId(meta.intakeId || meta.intake_id || null);
}

function latestProposalJson(proposal, persisted) {
  return JSON.stringify({
    id: persisted.id,
    type: persisted.type || proposal.type,
    status: persisted.status || 'PENDING',
    title: persisted.title || null,
    createdAt: persisted.createdAt || null,
  });
}

export async function linkCoachActionProposalToIntake({
  proposal,
  persisted,
  user,
  db,
}) {
  const intakeId = getProposalIntakeId(proposal);
  const userId = Number(user?.id);
  if (!intakeId || !persisted?.id || !Number.isInteger(userId) || userId <= 0) {
    return { linked: false, reason: 'missing_link_inputs' };
  }

  const rows = await db.query(
    `UPDATE coach_intake_items
        SET latest_proposal_id = :proposalId,
            metadata_json = jsonb_set(
              COALESCE(metadata_json, '{}'::jsonb),
              '{latestProposal}',
              CAST(:latestProposalJson AS jsonb),
              true
            ),
            updated_at = NOW()
      WHERE id = :intakeId
        AND user_id = :userId
      RETURNING id`,
    {
      replacements: {
        intakeId,
        proposalId: persisted.id,
        userId,
        latestProposalJson: latestProposalJson(proposal, persisted),
      },
      type: QueryTypes.SELECT,
    },
  );

  return { linked: rows.length > 0, reason: rows.length > 0 ? 'linked' : 'not_found_or_forbidden' };
}
