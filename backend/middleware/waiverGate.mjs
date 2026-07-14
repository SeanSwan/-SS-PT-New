/**
 * Waiver access gate
 * ==================
 *
 * Enforces that client-facing training, dashboard, and AI APIs only run for
 * users with a waiver record linked to their account.
 */
import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

export const LINKED_WAIVER_STATUS = 'linked';

const WAIVER_REQUIRED_ROLES = new Set(['client', 'user']);

const GATED_API_PREFIXES = [
  '/api/dashboard',
  '/api/client',
  '/api/workouts',
  '/api/workout',
  '/api/workout-forms',
  '/api/workout-logs',
  '/api/workout-plans',
  '/api/workout-builder',
  '/api/workout-summaries',
  '/api/client-progress',
  '/api/analytics',
  '/api/nutrition',
  '/api/macros',
  '/api/hydration',
  '/api/meal-plans',
  '/api/photos',
  '/api/notes',
  '/api/stats',
  '/api/measurements',
  '/api/wearable-data',
  '/api/pain-entries',
  '/api/food-scanner',
  '/api/movement-analysis',
  '/api/form-analysis',
  '/api/recommendations',
  '/api/coach',
  '/api/ai',
  '/api/ai-chat',
  '/api/ai-command',
  '/api/oracle',
  '/api/master-prompt',
  '/api/plaud',
  '/api/sessions',
  '/api/schedule',
  '/api/social',
  '/api/goals',
  '/api/streaks',
  '/api/gamification',
  '/api/v1/gamification',
  '/api/gallery',
  '/api/avatar-home',
  '/api/live-streams',
];

function pathnameFromUrl(url = '') {
  try {
    return new URL(url, 'https://swanstudios.local').pathname;
  } catch {
    return String(url).split('?')[0] || '';
  }
}

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function numericUserId(user) {
  const id = Number.parseInt(String(user?.id ?? ''), 10);
  return Number.isFinite(id) ? id : null;
}

function waiverRequiredResponse(req) {
  const returnUrl = encodeURIComponent(req.originalUrl || req.path || '/dashboard');
  return {
    success: false,
    code: 'WAIVER_REQUIRED',
    message: 'Signed SwanStudios waiver required before accessing training, dashboard, or AI features.',
    waiverUrl: `/waiver?returnUrl=${returnUrl}`,
  };
}

export function shouldGateWaiverAccess(user, originalUrl) {
  if (!WAIVER_REQUIRED_ROLES.has(user?.role)) return false;
  const pathname = pathnameFromUrl(originalUrl);
  return GATED_API_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export async function getWaiverAccessStatus(user) {
  const userId = numericUserId(user);
  const required = WAIVER_REQUIRED_ROLES.has(user?.role);

  if (!required) {
    return { required: false, hasLinkedWaiver: true, waiverStatus: 'not_required' };
  }

  if (!userId) {
    return { required: true, hasLinkedWaiver: false, waiverStatus: 'invalid_user' };
  }

  const WaiverRecord = getModel('WaiverRecord');
  const record = await WaiverRecord.findOne({
    where: { userId, status: LINKED_WAIVER_STATUS },
    attributes: ['id', 'status', 'signedAt'],
    order: [['signedAt', 'DESC'], ['id', 'DESC']],
  });

  return {
    required: true,
    hasLinkedWaiver: Boolean(record),
    waiverStatus: record?.status || 'missing',
    waiverRecordId: record?.id || null,
    waiverSignedAt: record?.signedAt || null,
  };
}

export async function requireLinkedWaiver(req, res, next) {
  if (!shouldGateWaiverAccess(req.user, req.originalUrl || req.path)) {
    return next();
  }

  // Admin impersonation bypass (Sean 2026-07-14): an owner-admin reviewing a
  // client's account must not be blocked by the client's unsigned waiver.
  // req.impersonation is derived from signed JWT claims (authMiddleware sets
  // it before this gate runs), so a normal client cannot forge it. The real
  // client's own login still hits the gate.
  if (req.impersonation?.actorId) {
    return next();
  }

  try {
    const status = await getWaiverAccessStatus(req.user);

    if (!status.hasLinkedWaiver) {
      logger.warn('Waiver gate blocked unsigned user', {
        userId: req.user?.id,
        role: req.user?.role,
        path: req.originalUrl || req.path,
        waiverStatus: status.waiverStatus,
      });
      return res.status(403).json(waiverRequiredResponse(req));
    }

    req.waiverRecord = {
      id: status.waiverRecordId,
      status: status.waiverStatus,
      signedAt: status.waiverSignedAt,
    };
    return next();
  } catch (error) {
    logger.error('Waiver gate verification failed', {
      error: error.message,
      userId: req.user?.id,
      path: req.originalUrl || req.path,
    });
    return res.status(503).json({
      success: false,
      code: 'WAIVER_VERIFICATION_FAILED',
      message: 'Unable to verify waiver status. Please try again shortly.',
    });
  }
}
