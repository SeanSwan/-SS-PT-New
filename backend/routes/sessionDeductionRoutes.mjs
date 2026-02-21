/**
 * Session Deduction Routes
 * ========================
 * API endpoints for session deduction and payment application
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

const router = express.Router();

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
    console.error('Error processing session deductions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process session deductions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    console.error('Error getting clients needing payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get clients needing payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      return res.status(400).json({
        success: false,
        message: 'clientId must be a positive integer'
      });
    }

    if (!Number.isInteger(sessions) || sessions < 1 || sessions > 500) {
      return res.status(400).json({
        success: false,
        message: 'sessionsToAdd must be an integer between 1 and 500'
      });
    }

    const result = await applyPaymentCredits(cid, sessions, paymentNote);

    return res.status(200).json({
      success: true,
      message: `Added ${sessionsToAdd} session credits to client`,
      data: result
    });
  } catch (error) {
    console.error('Error applying payment credits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to apply payment credits',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      return res.status(400).json({
        success: false,
        message: 'clientId must be a positive integer'
      });
    }

    const data = await getClientLastPackage(clientId);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting client last package:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get client last package',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/sessions/deductions/apply-package-payment
 * Apply a package payment to a client with full Order/Transaction audit trail.
 * Creates recovery cart, Order, OrderItem, FinancialTransaction, and grants sessions.
 * Admin only
 */
router.post('/apply-package-payment', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { clientId, storefrontItemId, paymentMethod, paymentReference, adminNotes } = req.body;

    const cid = Number(clientId);
    const sid = Number(storefrontItemId);

    if (!Number.isInteger(cid) || cid <= 0 || !Number.isInteger(sid) || sid <= 0) {
      return res.status(400).json({
        success: false,
        message: 'clientId and storefrontItemId must be positive integers'
      });
    }

    const validMethods = ['cash', 'venmo', 'zelle', 'check'];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `paymentMethod must be one of: ${validMethods.join(', ')}`
      });
    }

    const result = await applyPackagePayment({
      clientId: cid,
      storefrontItemId: sid,
      paymentMethod,
      paymentReference: paymentReference || '',
      adminNotes: adminNotes || '',
      adminUserId: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: `Applied ${result.sessionsAdded} sessions from ${result.packageName}`,
      data: result
    });
  } catch (error) {
    console.error('Error applying package payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to apply package payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
