/**
 * Role Management Routes
 * API endpoints for managing user roles
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { upgradeToClient, hasAccessToDashboard, getAccessibleDashboards } from '../services/roleService.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   POST /api/roles/upgrade-to-client/:userId
 * @desc    Upgrade a user to client role
 * @access  Private (Admin only)
 */
router.post('/upgrade-to-client/:userId', protect, adminOnly, async (req, res) => {
  try {
    // Validate SHAPE, not just presence. `findByPk('abc')` inside upgradeToClient
    // returns falsy, which fell through to a generic 500 — a malformed id is a 400,
    // and a real id that matches nobody is a 404 (GLM-5.3 L1, 2026-08-16).
    const normalizedUserId = Number.parseInt(req.params.userId, 10);

    if (!Number.isSafeInteger(normalizedUserId) || normalizedUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid user ID is required'
      });
    }

    const success = await upgradeToClient(normalizedUserId);
    
    if (success) {
      const user = await User.findByPk(normalizedUserId, {
        attributes: { exclude: ['password', 'refreshTokenHash'] }
      });

      if (!user) {
        // upgradeToClient reported success but the row vanished between the two
        // reads. Rare, but returning `user.id` on null is a 500 with a stack.
        return res.status(404).json({
          success: false,
          message: 'User not found after upgrade'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User upgraded to client role successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } else {
      // upgradeToClient returns false for "no such user" as well as for a genuine
      // failure, and a missing user is a 404, not a server error. It also returns
      // TRUE for "already a client", so a 200 here does not prove a change occurred —
      // that ambiguity is tracked in SWA-168 and needs an API change to resolve.
      res.status(404).json({
        success: false,
        message: 'User not found, or could not be upgraded to client role'
      });
    }
  } catch (error) {
    logger.error('Error upgrading user to client:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    res.status(500).json({
      success: false,
      message: 'Server error upgrading user role'
    });
  }
});

/**
 * @route   GET /api/roles/check-access/:dashboard
 * @desc    Check if current user has access to a specific dashboard
 * @access  Private
 */
router.get('/check-access/:dashboard', protect, async (req, res) => {
  try {
    const { dashboard } = req.params;
    const user = req.user;
    
    const hasAccess = hasAccessToDashboard(user, dashboard);
    
    res.status(200).json({
      success: true,
      hasAccess,
      user: {
        id: user.id,
        role: user.role
      },
      dashboard
    });
  } catch (error) {
    logger.error('Error checking dashboard access:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      dashboard: req.params.dashboard
    });
    res.status(500).json({
      success: false,
      message: 'Server error checking dashboard access'
    });
  }
});

/**
 * @route   GET /api/roles/accessible-dashboards
 * @desc    Get list of dashboards accessible to current user
 * @access  Private
 */
router.get('/accessible-dashboards', protect, async (req, res) => {
  try {
    const user = req.user;
    const accessibleDashboards = getAccessibleDashboards(user);
    
    res.status(200).json({
      success: true,
      dashboards: accessibleDashboards,
      user: {
        id: user.id,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error getting accessible dashboards:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Server error getting accessible dashboards'
    });
  }
});

// REMOVED 2026-08-16: POST /api/roles/test-upgrade.
//
// It sat behind `protect` only, took its subject from `req.user.id`, and called
// upgradeToClient(userId) — so ANY authenticated `user` could promote THEMSELVES
// to `client`, with no payment and no admin involvement. Same class as the
// add-to-cart escalation in GLM audit 2026-08-15 F2, which the audit did not see
// because it was handed a different set of files.
//
// Its only guard was `if (process.env.NODE_ENV === 'production') return 403`.
// That is a BLACKLIST and it fails OPEN on the classic misconfigurations:
// NODE_ENV unset on a PaaS, 'staging', 'prod', 'Production', review apps.
// sessionPackageManualGrantRoutes already replaced this exact blacklist with an
// allowlist + explicit opt-in flag (Kimi audit F3, SWA-129) for the same reason;
// the fix was never propagated here.
//
// It had zero consumers — no frontend caller, no test, no script. Deleted rather
// than hardened: the safest form of "disabled in production" is "does not exist".
// Role promotion belongs on payment-success only (SessionGrantService), or to an
// admin via POST /upgrade-to-client/:userId above (protect + adminOnly).
// Guarded by tests/api/roleSelfUpgradeEndpointRemoved.test.mjs.

export default router;