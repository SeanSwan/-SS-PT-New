/**
 * Admin Session Liability Routes (SWA-138 S11)
 * ============================================
 * Base path: /api/admin (mounted alongside the other admin routers)
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ GET /session-liability   Admin   Unredeemed prepaid sessions     │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Clients pre-pay for session packages, so every unredeemed session is money
 * already collected against value not yet delivered — deferred revenue, and the
 * number Sean gets asked about. Nothing surfaced it before.
 *
 * VALUATION HONESTY: sessions do not carry a per-unit price on the user row, so
 * the dollar figure is an ESTIMATE at a configurable rate (default $175, the
 * standard hourly). The response labels it as such and returns the rate used,
 * so the UI can never present it as a booked figure.
 */

import express from 'express';
import { Op } from 'sequelize';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const DEFAULT_SESSION_RATE_USD = 175;
const TOP_HOLDER_LIMIT = 10;

function resolveSessionRate() {
  const configured = Number(process.env.SESSION_LIABILITY_RATE_USD);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SESSION_RATE_USD;
}

router.get('/session-liability', protect, adminOnly, async (req, res) => {
  try {
    const rate = resolveSessionRate();

    const holders = await User.findAll({
      where: { availableSessions: { [Op.gt]: 0 } },
      attributes: ['id', 'firstName', 'role', 'availableSessions'],
      order: [['availableSessions', 'DESC']],
      limit: TOP_HOLDER_LIMIT,
    });

    const [totals] = await User.findAll({
      where: { availableSessions: { [Op.gt]: 0 } },
      attributes: [
        [User.sequelize.fn('SUM', User.sequelize.col('availableSessions')), 'totalSessions'],
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'holderCount'],
      ],
      raw: true,
    });

    const totalSessions = parseInt(totals?.totalSessions || '0', 10);
    const holderCount = parseInt(totals?.holderCount || '0', 10);

    return res.json({
      success: true,
      data: {
        totalSessions,
        holderCount,
        // Explicitly an estimate — see the valuation note above.
        estimatedValueUSD: totalSessions * rate,
        rateUSD: rate,
        valuation: 'estimate',
        topHolders: holders.map((u) => ({
          id: u.id,
          firstName: u.firstName || 'Client',
          role: u.role,
          sessions: u.availableSessions || 0,
        })),
      },
    });
  } catch (error) {
    logger.error('[AdminSessionLiability] Failed to compute liability:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute session liability' });
  }
});

export default router;
