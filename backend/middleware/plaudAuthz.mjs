/**
 * plaudAuthz.mjs
 * ===============
 * Authorization helpers for PLAUD endpoints:
 *   - assertClipOwnership(clipRow, userId, role) — clip belongs to caller
 *   - assertTrainerAssignedToClient(trainerId, clientId) — for merge
 *
 * Phase 3 Slice 3.5 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §6.
 * Codex Round 1 gap #10: trainer/admin role alone is INSUFFICIENT for merge;
 * trainer must have an active ClientTrainerAssignment to the target client.
 *
 * Schema preflight (Rule 58, 2026-05-04): ClientTrainerAssignment uses
 * camelCase columns (clientId, trainerId, status). isActive() checks
 * status === 'active'.
 */
import sequelize from '../database.mjs';

export class PlaudAuthzError extends Error {
  constructor(code, message, status = 403) {
    super(message);
    this.name = 'PlaudAuthzError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Verify the calling user owns the clip (or is admin).
 */
export function assertClipOwnership(clip, userId, role) {
  if (!clip) {
    throw new PlaudAuthzError('CLIP_NOT_FOUND', 'Clip not found', 404);
  }
  if (role === 'admin') return;
  if (Number(clip.user_id ?? clip.userId) !== Number(userId)) {
    throw new PlaudAuthzError('CLIP_NOT_OWNED', 'Clip does not belong to caller', 403);
  }
}

/**
 * Verify trainer has an active ClientTrainerAssignment to clientId, or
 * caller is admin (admin bypasses assignment check).
 *
 * Returns true on success; throws PlaudAuthzError NOT_ASSIGNED_TO_CLIENT
 * with status 403 on failure.
 */
export async function assertTrainerAssignedToClient({ trainerId, clientId, role }) {
  if (role === 'admin') return true;
  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    throw new PlaudAuthzError('NOT_ASSIGNED_TO_CLIENT', 'Invalid trainer id', 403);
  }
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw new PlaudAuthzError('NOT_ASSIGNED_TO_CLIENT', 'Invalid client id', 403);
  }

  const [rows] = await sequelize.query(
    `SELECT 1
     FROM client_trainer_assignments
     WHERE "trainerId" = :trainerId
       AND "clientId"  = :clientId
       AND status      = 'active'
     LIMIT 1`,
    { replacements: { trainerId, clientId } },
  );
  if (!rows || rows.length === 0) {
    throw new PlaudAuthzError('NOT_ASSIGNED_TO_CLIENT', 'Trainer not assigned to client', 403);
  }
  return true;
}

/**
 * Express error handler wrapper for PLAUD authz errors.
 */
export function handlePlaudAuthzError(err, req, res, next) {
  if (err instanceof PlaudAuthzError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }
  return next(err);
}
