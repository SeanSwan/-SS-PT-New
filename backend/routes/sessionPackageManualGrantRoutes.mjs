/**
 * sessionPackageManualGrantRoutes.mjs
 * ===================================
 * Blueprint:
 * - Owns manual session credit grant endpoints mounted under /api/session-packages.
 * - Keeps checkout/catalog/webhook routing separate from admin/dev grant mutations.
 * - Applies admin auth, production test-route gating, and client-source billing rules.
 */
import express from 'express';
import User from '../models/User.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';

const router = express.Router();

function normalizeSessionGrantCount(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

/**
 * @route   POST /api/session-packages/add-sessions
 * @desc    Manually add sessions to a user (admin only)
 * @access  Private/Admin
 */
router.post('/add-sessions', protect, adminOnly, async (req, res) => {
  try {
    const { clientId, sessions, notes } = req.body;
    const sessionCount = normalizeSessionGrantCount(sessions);

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID is required'
      });
    }

    if (sessionCount === null) {
      return res.status(400).json({
        success: false,
        message: 'Valid number of sessions is required'
      });
    }

    const user = await User.findByPk(clientId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (isNonDeductingClient(user)) {
      return res.status(409).json({
        success: false,
        message: 'Manual paid-session grants are disabled for free-tracking clients'
      });
    }

    const currentSessions = user.availableSessions || 0;
    user.availableSessions = currentSessions + sessionCount;
    await user.save();

    logger.info(`Admin ${req.user.id} added ${sessionCount} sessions to user ${clientId}. Notes: ${notes || 'None'}`);

    res.status(200).json({
      success: true,
      message: `Successfully added ${sessionCount} sessions to user`,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        availableSessions: user.availableSessions
      }
    });
  } catch (error) {
    logger.error(`Error adding sessions to user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding sessions'
    });
  }
});

/**
 * @route   POST /api/session-packages/add-test-sessions
 * @desc    Add sessions to user account for development testing
 * @access  Private/Admin
 */
router.post('/add-test-sessions', protect, adminOnly, async (req, res) => {
  try {
    // ALLOWLIST guard (Kimi security audit F3, SWA-129): this endpoint mints
    // paid sessions to the caller with a body-supplied amount and can upgrade
    // their role — it must NOT exist outside a deliberately-enabled dev box.
    // The old `NODE_ENV === 'production'` blacklist FAILED OPEN on the classic
    // misconfigs (NODE_ENV unset on a PaaS, 'staging', 'prod', review apps).
    // Require an explicit development env AND an opt-in flag — default deny.
    const isDevEnv = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const testGrantsEnabled = process.env.ENABLE_TEST_SESSION_GRANTS === 'true';
    if (!isDevEnv || !testGrantsEnabled) {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is disabled. Enable only in development with ENABLE_TEST_SESSION_GRANTS=true.'
      });
    }

    const { sessions, packageType, amount, packageId } = req.body;
    const userId = req.user.id;
    const sessionCount = normalizeSessionGrantCount(sessions);

    if (sessionCount === null) {
      return res.status(400).json({
        success: false,
        message: 'Valid number of sessions is required'
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (isNonDeductingClient(user)) {
      return res.status(409).json({
        success: false,
        message: 'Test session grants are disabled for free-tracking clients'
      });
    }

    const currentSessions = user.availableSessions || 0;
    user.availableSessions = currentSessions + sessionCount;

    if (user.role === 'user') {
      user.role = 'client';
      logger.info(`Upgraded user ${userId} from 'user' to 'client' role after purchasing sessions`);
    }

    await user.save();

    logger.info(`Added ${sessionCount} sessions to user ${userId}. Package: ${packageType || packageId || 'unknown'}, Amount: ${amount || 'N/A'}`);

    res.status(200).json({
      success: true,
      message: `Added ${sessionCount} sessions to your account`,
      availableSessions: user.availableSessions,
      role: user.role,
      packageInfo: {
        type: packageType || 'Training Package',
        sessions: sessionCount,
        amount: amount || 0,
        purchaseDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error adding sessions: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding sessions'
    });
  }
});

export default router;
