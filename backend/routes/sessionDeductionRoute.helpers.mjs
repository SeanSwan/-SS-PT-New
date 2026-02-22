/**
 * Session Deduction Route Helpers
 * ================================
 * Error mapper and shared route utilities for payment recovery endpoints.
 * Imports from utils/paymentRecovery.constants.mjs (no layering inversion).
 */

import { ERROR_CODE_MAP, isIdempotencyViolation } from '../utils/paymentRecovery.constants.mjs';

/**
 * Map a service-layer error to an HTTP status code and error code.
 * Checks error.code (stable, set at throw-site) first, then SequelizeUniqueConstraintError.
 *
 * @param {Error} error
 * @returns {{ statusCode: number, errorCode: string } | null} Mapped info, or null for unknown (500)
 */
export function mapServiceError(error) {
  // 1. Check coded service errors (primary path)
  if (error.code && ERROR_CODE_MAP[error.code] !== undefined) {
    return {
      statusCode: ERROR_CODE_MAP[error.code],
      errorCode: error.code
    };
  }

  // 2. Check Sequelize unique constraint — only for idempotency key
  if (isIdempotencyViolation(error)) {
    return {
      statusCode: 409,
      errorCode: 'DUPLICATE_IDEMPOTENCY_KEY'
    };
  }

  // 3. Unknown error — caller uses 500
  return null;
}
