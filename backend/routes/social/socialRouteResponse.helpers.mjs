/**
 * Social Route Response Helpers
 * =============================
 * Shared public-response helpers for mounted /api/social route modules.
 * Internal exception text stays in server logs; client JSON receives a stable code.
 */

export const SOCIAL_INTERNAL_ERROR = 'internal_error';

export function sendSocialRouteError(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: SOCIAL_INTERNAL_ERROR
  });
}

export function getSocialPointsFailure() {
  return {
    pointsAwarded: 0,
    success: false,
    error: SOCIAL_INTERNAL_ERROR
  };
}
