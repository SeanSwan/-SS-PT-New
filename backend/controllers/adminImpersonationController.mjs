/**
 * Admin impersonation controller.
 * Thin HTTP adapter over the auth service so the security contract stays testable.
 */
import {
  AdminImpersonationError,
  listAdminImpersonationTargets,
  startAdminImpersonationSession,
} from '../services/auth/adminImpersonationService.mjs';
import logger from '../utils/logger.mjs';

const sendError = (res, error) => {
  const isKnown = error instanceof AdminImpersonationError || error?.code?.startsWith?.('IMPERSONATION_');
  const statusCode = isKnown ? error.statusCode || 400 : 500;
  return res.status(statusCode).json({
    success: false,
    code: isKnown ? error.code : 'IMPERSONATION_SERVER_ERROR',
    message: isKnown ? error.message : 'Unable to start account testing session.',
  });
};

export const getAdminImpersonationTargets = async (req, res) => {
  try {
    const result = await listAdminImpersonationTargets({ actor: req.user, query: req.query });
    return res.status(200).json(result);
  } catch (error) {
    logger.warn('[adminImpersonation] list_failed', {
      actorId: req.user?.id,
      code: error.code,
      error: error.message,
    });
    return sendError(res, error);
  }
};

export const startAdminImpersonation = async (req, res) => {
  try {
    const result = await startAdminImpersonationSession({
      actor: req.user,
      targetUserId: req.body?.targetUserId,
    });
    logger.info('[adminImpersonation] start_success', {
      actorId: req.user?.id,
      targetUserId: result.impersonation.targetUserId,
      targetRole: result.impersonation.targetRole,
    });
    return res.status(200).json(result);
  } catch (error) {
    logger.warn('[adminImpersonation] start_failed', {
      actorId: req.user?.id,
      targetUserId: req.body?.targetUserId,
      code: error.code,
      error: error.message,
    });
    return sendError(res, error);
  }
};

export default {
  getAdminImpersonationTargets,
  startAdminImpersonation,
};
