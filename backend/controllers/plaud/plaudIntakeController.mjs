/**
 * plaudIntakeController.mjs
 * ==========================
 * Handler for GET /api/plaud/intake. Returns list-safe queue metadata for
 * the top-level PLAUD Intelligence Workspace.
 */
import logger from '../../utils/logger.mjs';
import { listPlaudIntakeItems } from '../../services/plaudIntakeQueueService.mjs';
import { listPlaudClipGroupCandidates } from '../../services/plaudClipGroupService.mjs';

function jsonError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

export async function listPlaudIntakeHandler(req, res) {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
    }

    const result = await listPlaudIntakeItems({
      userId,
      scope: req.query.scope,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    logger.error('[plaudIntake.listPlaudIntakeHandler] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to list PLAUD intake queue');
  }
}

export async function listPlaudIntakeGroupsHandler(req, res) {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
    }

    const result = await listPlaudClipGroupCandidates({
      userId,
      limit: req.query.limit,
      maxGapMinutes: req.query.maxGapMinutes,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    logger.error('[plaudIntake.listPlaudIntakeGroupsHandler] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to list PLAUD group candidates');
  }
}

export default { listPlaudIntakeHandler, listPlaudIntakeGroupsHandler };
