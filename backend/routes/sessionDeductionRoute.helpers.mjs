/**
 * Session Deduction Route Helpers
 * ================================
 * Error mapper and shared route utilities for payment recovery endpoints.
 * Imports from utils/paymentRecovery.constants.mjs (no layering inversion).
 */

import { ERROR_CODE_MAP, isIdempotencyViolation } from '../utils/paymentRecovery.constants.mjs';

const DEFAULT_PUBLIC_MESSAGE = 'Payment recovery request could not be completed.';

const PUBLIC_ERROR_MESSAGES = {
  DUPLICATE_PAYMENT_WINDOW: 'This payment recovery request is too close to a recent payment.',
  DUPLICATE_IDEMPOTENCY_KEY: 'This payment recovery request was already processed.',
  CLIENT_NOT_FOUND: 'Client was not found.',
  PACKAGE_NOT_FOUND: 'Session package was not found.',
  NON_BILLABLE_CLIENT_SOURCE: 'This client source is not billable through SwanStudios sessions.',
  PACKAGE_INACTIVE: 'Selected session package is not active.',
  INVALID_ROLE: 'Your role cannot complete this payment recovery action.',
  NO_SESSIONS_IN_PACKAGE: 'Selected package does not include sessions.',
  INVALID_PAYMENT_METHOD: 'Payment method is invalid.',
  MISSING_PAYMENT_REFERENCE: 'A payment reference is required for this payment method.',
  INVALID_IDEMPOTENCY_TOKEN: 'Payment recovery request token is invalid.',
  MISSING_FORCE_REASON: 'A force reason is required.',
  PAYMENT_REFERENCE_TOO_LONG: 'Payment reference is too long.',
  ADMIN_NOTES_TOO_LONG: 'Admin notes are too long.',
  FORCE_REASON_TOO_LONG: 'Force reason is too long.',
  INVALID_CLIENT_ID: 'Client id is invalid.',
  INVALID_STOREFRONT_ITEM_ID: 'Storefront item id is invalid.',
  MODELS_UNAVAILABLE: 'Payment recovery is temporarily unavailable.',
  INTERNAL_ERROR: 'Payment recovery request failed.',
  STRIPE_CHARGE_FAILED: 'Stripe charge could not be completed.',
  STRIPE_NO_PAYMENT_METHODS: 'No Stripe payment method is available for this client.',
  STRIPE_CUSTOMER_NOT_FOUND: 'Stripe customer was not found.',
  STRIPE_OWNERSHIP_MISMATCH: 'Stripe customer does not belong to this client.',
  STRIPE_REFUND_FAILED: 'Stripe refund could not be completed.'
};

function getPublicMessage(errorCode) {
  return PUBLIC_ERROR_MESSAGES[errorCode] || DEFAULT_PUBLIC_MESSAGE;
}

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
      errorCode: error.code,
      message: getPublicMessage(error.code)
    };
  }

  // 2. Check Sequelize unique constraint — only for idempotency key
  if (isIdempotencyViolation(error)) {
    return {
      statusCode: 409,
      errorCode: 'DUPLICATE_IDEMPOTENCY_KEY',
      message: getPublicMessage('DUPLICATE_IDEMPOTENCY_KEY')
    };
  }

  // 3. Unknown error — caller uses 500
  return null;
}
