/**
 * Session Deduction Routes
 * ========================
 * API endpoints for session deduction and payment application.
 * Shape validation (400) at route level; business validation (4xx) in service.
 * All catch blocks use mapServiceError for consistent envelope.
 */

import express from 'express';
import { authenticateToken, adminOnly, trainerOrAdminOnly } from '../middleware/auth.mjs';
import {
  processSessionDeductions,
  getClientsNeedingPayment,
  applyPaymentCredits,
  getClientLastPackage,
  applyPackagePayment
} from '../services/sessionDeductionService.mjs';
import { mapServiceError } from './sessionDeductionRoute.helpers.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// ── Response helpers ────────────────────────────────────────────

function errorResponse(res, statusCode, message, errorCode, data) {
  const body = { success: false, message, errorCode };
  if (data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

function handleServiceError(res, error, fallbackMessage) {
  const mapped = mapServiceError(error);
  if (mapped) {
    return errorResponse(
      res,
      mapped.statusCode,
      error.message,
      mapped.errorCode,
      error.data
    );
  }
  // Unknown / unmapped → 500, sanitized message
  logger.error(fallbackMessage, {
    domain: 'payment_recovery',
    error: error.message,
    stack: error.stack
  });
  return errorResponse(
    res,
    500,
    fallbackMessage,
    'INTERNAL_ERROR'
  );
}

// ── Routes ──────────────────────────────────────────────────────

/**
 * POST /api/sessions/deductions/process
 * Process automatic session deductions for past sessions
 * Admin only
 */
router.post('/process', authenticateToken, adminOnly, async (req, res) => {
  try {
    const results = await processSessionDeductions();

    return res.status(200).json({
      success: true,
      message: `Processed ${results.processed} sessions, deducted ${results.deducted} credits`,
      data: results
    });
  } catch (error) {
    return handleServiceError(res, error, 'Failed to process session deductions');
  }
});

/**
 * GET /api/sessions/deductions/clients-needing-payment
 * Get list of clients with exhausted credits who have upcoming sessions
 * Admin or Trainer
 */
router.get('/clients-needing-payment', authenticateToken, trainerOrAdminOnly, async (req, res) => {
  try {
    const clients = await getClientsNeedingPayment();

    return res.status(200).json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (error) {
    return handleServiceError(res, error, 'Failed to get clients needing payment');
  }
});

/**
 * POST /api/sessions/deductions/apply-payment
 * Apply payment credits to a client's account
 * Admin only
 */
router.post('/apply-payment', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { clientId, sessionsToAdd, paymentNote } = req.body;

    const cid = Number(clientId);
    const sessions = Number(sessionsToAdd);

    if (!Number.isInteger(cid) || cid <= 0) {
      return errorResponse(res, 400, 'clientId must be a positive integer', 'INVALID_CLIENT_ID');
    }

    if (!Number.isInteger(sessions) || sessions < 1 || sessions > 500) {
      return errorResponse(res, 400, 'sessionsToAdd must be an integer between 1 and 500', 'INVALID_SESSIONS_COUNT');
    }

    const result = await applyPaymentCredits(cid, sessions, paymentNote);

    return res.status(200).json({
      success: true,
      message: `Added ${sessionsToAdd} session credits to client`,
      data: result
    });
  } catch (error) {
    return handleServiceError(res, error, 'Failed to apply payment credits');
  }
});

/**
 * GET /api/sessions/deductions/client-last-package/:clientId
 * Get the last successfully purchased package for a client.
 * Used for auto-preselecting the package in payment recovery.
 * Admin or Trainer
 */
router.get('/client-last-package/:clientId', authenticateToken, trainerOrAdminOnly, async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return errorResponse(res, 400, 'clientId must be a positive integer', 'INVALID_CLIENT_ID');
    }

    const data = await getClientLastPackage(clientId);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return handleServiceError(res, error, 'Failed to get client last package');
  }
});

/**
 * POST /api/sessions/deductions/apply-package-payment
 * Apply a package payment to a client with full Order/Transaction audit trail.
 * Creates recovery cart, Order, OrderItem, FinancialTransaction, and grants sessions.
 * Admin only
 *
 * Shape validation (400):
 *   INVALID_CLIENT_ID, INVALID_STOREFRONT_ITEM_ID,
 *   MISSING_IDEMPOTENCY_TOKEN, MISSING_PAYMENT_METHOD, INVALID_FORCE_TYPE
 *
 * Business validation (4xx) delegated to service via mapServiceError.
 */
router.post('/apply-package-payment', authenticateToken, adminOnly, async (req, res) => {
  try {
    const {
      clientId,
      storefrontItemId,
      paymentMethod,
      paymentReference,
      adminNotes,
      idempotencyToken,
      force,
      forceReason
    } = req.body;

    // ── Shape validation (400) ────────────────────────────────────
    const cid = Number(clientId);
    if (!Number.isInteger(cid) || cid <= 0) {
      return errorResponse(res, 400, 'clientId must be a positive integer', 'INVALID_CLIENT_ID');
    }

    const sid = Number(storefrontItemId);
    if (!Number.isInteger(sid) || sid <= 0) {
      return errorResponse(res, 400, 'storefrontItemId must be a positive integer', 'INVALID_STOREFRONT_ITEM_ID');
    }

    if (!idempotencyToken) {
      return errorResponse(res, 400, 'idempotencyToken is required', 'MISSING_IDEMPOTENCY_TOKEN');
    }

    if (!paymentMethod) {
      return errorResponse(res, 400, 'paymentMethod is required', 'MISSING_PAYMENT_METHOD');
    }

    if (force !== undefined && typeof force !== 'boolean') {
      return errorResponse(res, 400, 'force must be a boolean', 'INVALID_FORCE_TYPE');
    }

    // ── Delegate to service (business validation + execution) ─────
    const result = await applyPackagePayment({
      clientId: cid,
      storefrontItemId: sid,
      paymentMethod,
      paymentReference: paymentReference || '',
      adminNotes: adminNotes || '',
      adminUserId: req.user.id,
      idempotencyToken,
      force: force || false,
      forceReason: forceReason || ''
    });

    return res.status(200).json({
      success: true,
      message: `Applied ${result.sessionsAdded} sessions from ${result.packageName}`,
      data: result
    });
  } catch (error) {
    return handleServiceError(res, error, 'Failed to apply package payment');
  }
});

export default router;
