/**
 * Client Access Gate — Canonical trainer/client authorization (Slice A1)
 * ======================================================================
 * THE one way the Coach lanes verify "may this user read this client's data."
 * FAIL-CLOSED: any verification error denies.
 *
 * Matrix:
 *   admin           → any client
 *   trainer         → self, OR active ClientTrainerAssignment row, OR a REAL
 *                     session with the client inside the recency window (bounded
 *                     legacy fallback — see REAL_RELATIONSHIP_STATUSES and
 *                     SESSION_HISTORY_WINDOW_DAYS below; cancelled/available/
 *                     blocked/requested sessions grant NOTHING)
 *   client / user   → self only
 *   anything else   → deny
 *
 * `pending` assignments grant NOTHING (locked decision, A1 plan Q2).
 *
 * Slice A1 — Coach Context Engine (2026-06-10)
 */
import logger from '../../../utils/logger.mjs';

/**
 * ── The session-history fallback is BOUNDED (Sean's ruling, 2026-07-30) ──
 *
 * This fallback used to be `SELECT 1 FROM sessions WHERE trainerId=? AND userId=?`
 * with no status filter and no date bound. One row — including a CANCELLED session
 * from any date — granted a trainer permanent Swan Coach context access to that
 * client. The practical consequence: unassigning a trainer (including removing one
 * for cause) revoked their photos, notes and nutrition via utils/clientAccess.mjs,
 * but NOT their Coach access. Unassignment was not a complete revocation.
 *
 * Sean's decision was to keep the fallback — it exists for genuine
 * pre-assignment-table relationships and dropping it would cut those trainers off —
 * but to bound it to "a real session in the last few months".
 *
 * ALLOWLIST, not a denylist. Only statuses that evidence an actual working
 * relationship grant access. Verified against the live `enum_sessions_status`:
 * available · requested · scheduled · completed · cancelled · confirmed · blocked ·
 * booked · assigned. Deliberately excluded:
 *   cancelled — Sean's specific concern; a session that never happened
 *   available — an open slot, no client relationship at all
 *   blocked   — a trainer blocking their own time, not client work
 *   requested — a client asking is not yet a relationship
 * A grant is the thing being decided, so the safe default is to enumerate what
 * counts rather than guess at what does not.
 */
export const REAL_RELATIONSHIP_STATUSES = Object.freeze([
  'completed',
  'confirmed',
  'scheduled',
  'booked',
  'assigned',
]);

/** "The last few months" — tunable without a code change. */
export const SESSION_HISTORY_WINDOW_DAYS = (() => {
  const raw = Number.parseInt(process.env.COACH_SESSION_HISTORY_WINDOW_DAYS ?? '', 10);
  return Number.isSafeInteger(raw) && raw > 0 ? raw : 90;
})();

/** Cutoff instant for the recency bound. Computed per call so a long-lived process
 *  does not freeze the window at boot time. */
export const sessionHistoryCutoff = (now = Date.now()) =>
  new Date(now - SESSION_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

export const CLIENT_ACCESS_DENIED_MESSAGE =
  "You don't have access to that client's data. Ask an admin to assign this client to you.";

export function parseContextClientId(targetClientId) {
  if (typeof targetClientId === 'number') {
    return Number.isSafeInteger(targetClientId) && targetClientId > 0 ? targetClientId : null;
  }

  if (typeof targetClientId !== 'string' || !/^[1-9]\d*$/.test(targetClientId)) {
    return null;
  }

  const parsed = Number(targetClientId);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * @param {Object} user - { id, role }
 * @param {number|string} targetClientId
 * @param {Object} sequelize - live Sequelize instance (required for trainer checks)
 * @returns {Promise<{ allowed: boolean, via: string|null, reason: string|null }>}
 */
export async function checkClientAccess(user, targetClientId, sequelize) {
  const clientId = parseContextClientId(targetClientId);
  if (!user?.id || !user?.role || clientId === null) {
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
         AND status IN (:realStatuses)
         AND "sessionDate" IS NOT NULL
         AND "sessionDate" >= :sessionHistoryCutoff
       LIMIT 1`,
      {
        replacements: {
          ...replacements,
          realStatuses: REAL_RELATIONSHIP_STATUSES,
          sessionHistoryCutoff: sessionHistoryCutoff(),
        },
        type: selectType,
      },
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
