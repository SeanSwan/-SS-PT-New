/**
 * ============================================================================
 * FILE: claimRoutes.mjs
 * PURPOSE: REST API for client account claiming (Crystalline Link Protocol)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28 (11-Brain Consensus Applied)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Provides endpoints for generating invite tokens (admin) and claiming
 *   accounts (public). Move Fitness clients scan QR or enter SWAN-XXXXXXXX code
 *   to set their password and activate their account.
 *
 * HOW IT FITS IN THE APP:
 *   Admin dashboard → POST /generate-token → QR/code displayed
 *   Client scans QR → GET /verify/:token → shows claim form
 *   Client submits → POST /activate → sets password, status=active
 *
 * AI VILLAGE FIXES APPLIED:
 *   Finding 1: accountStatus filter includes BOTH 'stub' and 'invited'
 *   Finding 3: SHA-256 direct lookup replaces bcrypt O(n) loop
 *   Finding 4: State-based email authorization (stub only)
 */
import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../middleware/authMiddleware.mjs';
import { generateClaimToken, hashToken, isTokenExpired } from '../services/claimTokenService.mjs';
import { normalizeClientOnboardEmailInput } from '../services/clientOnboardIdentityService.mjs';
import { getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Admin-Only Token Generation
// PURPOSE: Create invite codes for STUB clients
// ────────���──────────────────────────────────────────────���─────

/**
 * POST /api/claim/generate-token
 * Admin generates a claim token for a client
 * Body: { clientId: number }
 */
router.post('/generate-token', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'clientId is required' });
    }

    const User = getUser();
    const client = await User.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (client.accountStatus === 'active' && !client.forcePasswordChange) {
      return res.status(400).json({
        success: false,
        message: 'Client already has an active account'
      });
    }

    const { plainToken, hash, expires } = generateClaimToken();

    await client.update({
      accountStatus: 'invited',
      claimTokenHash: hash,
      claimTokenExpires: expires,
    });

    logger.info('[ClaimRoutes] Token generated for client %d by admin %d', clientId, req.user.id);

    return res.json({
      success: true,
      data: {
        token: plainToken,
        expiresAt: expires.toISOString(),
        claimUrl: `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/claim/${plainToken}`,
        clientName: `${client.firstName} ${client.lastName}`,
      }
    });
  } catch (error) {
    logger.error('[ClaimRoutes] Token generation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate token' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Public Token Verification
// PURPOSE: Check if a claim token is valid (no auth required)
// WHY O(1): SHA-256 hash allows direct WHERE lookup (AI Village Finding 3)
// ──────────────────────────────���──────────────────────────────

/**
 * GET /api/claim/verify/:token
 * Public endpoint — validates a token without consuming it
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid token format' });
    }

    const User = getUser();
    const tokenHash = hashToken(token);

    // O(1) direct lookup by SHA-256 hash (AI Village Finding 3: replaces bcrypt loop)
    const candidate = await User.findOne({
      where: {
        claimTokenHash: tokenHash,
        accountStatus: { [Op.in]: ['invited', 'stub'] }, // AI Village Finding 1
      },
      attributes: ['id', 'firstName', 'claimTokenExpires', 'clientSource'],
    });

    if (candidate && !isTokenExpired(candidate.claimTokenExpires)) {
      return res.json({
        success: true,
        data: {
          valid: true,
          firstName: candidate.firstName,
          clientSource: candidate.clientSource,
          expiresAt: candidate.claimTokenExpires,
        }
      });
    }

    return res.json({ success: true, data: { valid: false } });
  } catch (error) {
    logger.error('[ClaimRoutes] Token verification failed:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ────────────────────────────────────────────────────��────────
// SECTION: Account Activation
// PURPOSE: Client sets password and activates their account
// ───���──────────────────────────────���──────────────────────────

/**
 * POST /api/claim/activate
 * Public endpoint — claims an account with token + new password
 * Body: { token: string, password: string, email?: string }
 */
router.post('/activate', async (req, res) => {
  try {
    const { token, password, email } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const User = getUser();
    const tokenHash = hashToken(token);

    // O(1) direct lookup by SHA-256 hash (AI Village Finding 3)
    const matchedUser = await User.findOne({
      where: {
        claimTokenHash: tokenHash,
        accountStatus: { [Op.in]: ['invited', 'stub'] }, // AI Village Finding 1
      },
    });

    if (!matchedUser || isTokenExpired(matchedUser.claimTokenExpires)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invite code. Please contact your trainer for a new code.'
      });
    }

    // Update password and activate account
    const updates = {
      password,
      accountStatus: 'active',
      forcePasswordChange: false,
      claimTokenHash: null,
      claimTokenExpires: null,
    };

    const normalizedEmail = normalizeClientOnboardEmailInput(email);

    // AI Village Finding 4: State-based email authorization (stub accounts only)
    if (normalizedEmail && normalizedEmail !== matchedUser.email) {
      if (matchedUser.accountStatus !== 'stub') {
        return res.status(403).json({
          success: false,
          message: 'Email changes require verification. Please update via account settings.'
        });
      }

      // Basic email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }

      // Check email isn't taken
      const existing = await User.findOne({ where: { email: normalizedEmail, id: { [Op.ne]: matchedUser.id } } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      updates.email = normalizedEmail;
    }

    await matchedUser.update(updates, { individualHooks: true });

    logger.info('[ClaimRoutes] Account activated for user %d (%s)', matchedUser.id, matchedUser.clientSource);

    return res.json({
      success: true,
      message: 'Account activated! You can now log in.',
      data: {
        username: matchedUser.username,
        firstName: matchedUser.firstName,
      }
    });
  } catch (error) {
    logger.error('[ClaimRoutes] Account activation failed:', error);
    return res.status(500).json({ success: false, message: 'Activation failed' });
  }
});

export default router;
