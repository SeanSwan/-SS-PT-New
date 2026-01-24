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
  applyPaymentCredits
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
      error: error.message
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
      error: error.message
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

    if (!clientId || !sessionsToAdd) {
      return res.status(400).json({
        success: false,
        message: 'clientId and sessionsToAdd are required'
      });
    }

    if (sessionsToAdd < 1) {
      return res.status(400).json({
        success: false,
        message: 'sessionsToAdd must be at least 1'
      });
    }

    const result = await applyPaymentCredits(clientId, sessionsToAdd, paymentNote);

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
      error: error.message
    });
  }
});

export default router;
