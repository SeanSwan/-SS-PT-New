import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';
import { asyncHandler } from './errorMiddleware.mjs';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const READ_METHODS = new Set(['GET', 'HEAD']);
const CLIENT_ROLES = new Set(['client', 'user']);

const sendViewAsError = (res, status, code, message) => res.status(status).json({
  success: false,
  code,
  message,
});

const hasViewAsParam = (req) => typeof req.query?.viewAs !== 'undefined';

const parseViewAsUserId = (viewAs) => {
  if (Array.isArray(viewAs)) {
    return {
      ok: false,
      message: 'Only one viewAs parameter allowed.',
    };
  }

  if (typeof viewAs !== 'string') {
    return {
      ok: false,
      message: 'Invalid viewAs shape.',
    };
  }

  if (viewAs.length === 0) {
    return {
      ok: false,
      message: 'viewAs cannot be empty.',
    };
  }

  if (!/^[1-9][0-9]*$/.test(viewAs)) {
    return {
      ok: false,
      message: 'viewAs must be a positive integer.',
    };
  }

  const parsed = Number(viewAs);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return {
      ok: false,
      message: 'viewAs must be a positive integer.',
    };
  }

  return {
    ok: true,
    userId: parsed,
  };
};

export const viewAsWriteBlocker = (req, res, next) => {
  if (MUTATION_METHODS.has(req.method) && hasViewAsParam(req)) {
    return sendViewAsError(
      res,
      403,
      'IMPERSONATION_READ_ONLY',
      'Writes are not permitted while impersonating.'
    );
  }

  return next();
};

// Wrapped with asyncHandler so any awaited rejection (e.g. User.findOne
// failing on a DB error) is routed to next(error) → Express error handler.
// Codex Gate #3 HIGH — Express 4 does not auto-catch async middleware
// rejections. errorMiddleware.mjs:438 is the canonical repo pattern.
export const viewAsGuard = asyncHandler(async (req, res, next) => {
  if (!hasViewAsParam(req)) {
    return next();
  }

  if (MUTATION_METHODS.has(req.method) || !READ_METHODS.has(req.method)) {
    return sendViewAsError(
      res,
      403,
      'IMPERSONATION_READ_ONLY',
      'Writes are not permitted while impersonating.'
    );
  }

  const parsed = parseViewAsUserId(req.query.viewAs);

  if (!parsed.ok) {
    return sendViewAsError(
      res,
      400,
      'IMPERSONATION_INVALID_PARAM',
      parsed.message
    );
  }

  if (req.user?.role !== 'admin') {
    return sendViewAsError(
      res,
      403,
      'IMPERSONATION_ADMIN_ONLY',
      'Only admin users may use viewAs.'
    );
  }

  const target = await User.findOne({ where: { id: parsed.userId } });

  if (!target || target.isActive !== true || target.accountStatus !== 'active') {
    return sendViewAsError(
      res,
      404,
      'IMPERSONATION_TARGET_NOT_FOUND',
      'Target user not found.'
    );
  }

  if (!CLIENT_ROLES.has(target.role)) {
    return sendViewAsError(
      res,
      400,
      'IMPERSONATION_TARGET_INVALID_ROLE',
      'viewAs targets must be client-scope users.'
    );
  }

  req.viewAsUserId = parsed.userId;

  if (typeof res.on === 'function') {
    res.on('finish', () => {
      logger.info(
        `[viewAs] actor=${req.user?.id} target=${parsed.userId} method=${req.method} route=${req.originalUrl || req.url} status=${res.statusCode}`
      );
    });
  }

  return next();
});

export default viewAsGuard;
