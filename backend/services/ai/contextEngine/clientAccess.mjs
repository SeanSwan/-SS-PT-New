/**
 * Client Access Gate — Canonical trainer/client authorization (Slice A1)
 * ======================================================================
 * THE one way the Coach lanes verify "may this user read this client's data."
 * FAIL-CLOSED: any verification error denies.
 *
 * Matrix:
 *   admin           → any client
 *   trainer         → self, OR active ClientTrainerAssignment row, OR an
 *                     existing session with the client (legacy fallback —
 *                     pre-assignment-table relationships)
 *   client / user   → self only
 *   anything else   → deny
 *
 * `pending` assignments grant NOTHING (locked decision, A1 plan Q2).
 *
 * Slice A1 — Coach Context Engine (2026-06-10)
 */
import logger from '../../../utils/logger.mjs';

export const CLIENT_ACCESS_DENIED_MESSAGE =
  "You don't have access to that client's data. Ask an admin to assign this client to you.";

/**
 * @param {Object} user - { id, role }
 * @param {number|string} targetClientId
 * @param {Object} sequelize - live Sequelize instance (required for trainer checks)
 * @returns {Promise<{ allowed: boolean, via: string|null, reason: string|null }>}
 */
export async function checkClientAccess(user, targetClientId, sequelize) {
  const clientId = Number(targetClientId);
  if (!user?.id || !user?.role || !Number.isSafeInteger(clientId) || clientId <= 0) {
    return { allowed: false, via: null, reason: 'invalid_request' };
  }

  if (user.role === 'admin') {
    return { allowed: true, via: 'admin', reason: null };
  }

  if (user.id === clientId) {
    return { allowed: true, via: 'self', reason: null };
  }

  if (user.role === 'client' || user.role === 'user') {
    return { allowed: false, via: null, reason: 'not_self' };
  }

  if (user.role !== 'trainer') {
    return { allowed: false, via: null, reason: 'role_not_permitted' };
  }

  if (!sequelize?.query) {
    return { allowed: false, via: null, reason: 'verification_error' };
  }

  const selectType = sequelize.QueryTypes?.SELECT || 'SELECT';
  const replacements = { trainerId: user.id, clientId };

  try {
    const assignmentRows = await sequelize.query(
      `SELECT 1 FROM client_trainer_assignments
       WHERE "trainerId" = :trainerId AND "clientId" = :clientId AND status = 'active'
       LIMIT 1`,
      { replacements, type: selectType },
    );
    if (Array.isArray(assignmentRows) && assignmentRows.length > 0) {
      return { allowed: true, via: 'assignment', reason: null };
    }

    const sessionRows = await sequelize.query(
      `SELECT 1 FROM sessions
       WHERE "trainerId" = :trainerId AND "userId" = :clientId
       LIMIT 1`,
      { replacements, type: selectType },
    );
    if (Array.isArray(sessionRows) && sessionRows.length > 0) {
      return { allowed: true, via: 'session_history', reason: null };
    }

    return { allowed: false, via: null, reason: 'not_assigned' };
  } catch (err) {
    logger.error('[ClientAccess] Verification query failed — DENYING (fail-closed)', {
      trainerId: user.id,
      clientId,
      error: err?.message,
    });
    return { allowed: false, via: null, reason: 'verification_error' };
  }
}
