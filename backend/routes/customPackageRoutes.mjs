// /backend/routes/customPackageRoutes.mjs
/**
 * Custom Package Routes — "SwanStudios Special"
 *
 * Admin creates per-client custom packages with pricing guardrails.
 * Clients see their custom packages in their store page.
 *
 * Endpoints:
 * POST   /api/custom-packages           — Admin creates custom package for a client
 * GET    /api/custom-packages/client/:id — Get custom packages for a specific client
 * GET    /api/custom-packages/my         — Client gets their own custom packages
 * PATCH  /api/custom-packages/:id        — Admin updates a custom package
 * DELETE /api/custom-packages/:id        — Admin cancels a custom package
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Pricing constants
const RECOMMENDED_MIN_PER_SESSION = 175;
const WARNING_THRESHOLD_PER_HOUR = 120;
const ABSOLUTE_MIN_PER_HOUR = 100;

// Base package configurations
const BASE_PACKAGES = {
  '10-pack': { paidSessions: 10, defaultPrice: 175 },
  '24-pack': { paidSessions: 24, defaultPrice: 175 },
  '3-month': { paidSessions: 52, defaultPrice: 175 },  // ~4 sessions/week × 13 weeks
  '6-month': { paidSessions: 108, defaultPrice: 165 },
  '12-month': { paidSessions: 208, defaultPrice: 155 },
  'express': { paidSessions: 10, defaultPrice: 175 },   // 30-min sessions
};

/**
 * POST /api/custom-packages
 * Admin creates a custom package for a specific client
 */
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      clientId,
      basePackageType,
      bonusSessions = 0,
      pricePerSession,
      name = 'SwanStudios Special',
      description,
      adminNote,
      belowThresholdApproved = false,
      expiresAt,
    } = req.body;

    // Validate required fields
    if (!clientId || !basePackageType || !pricePerSession) {
      return res.status(400).json({
        success: false,
        message: 'clientId, basePackageType, and pricePerSession are required'
      });
    }

    const baseConfig = BASE_PACKAGES[basePackageType];
    if (!baseConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid basePackageType. Must be one of: ${Object.keys(BASE_PACKAGES).join(', ')}`
      });
    }

    const paidSessions = baseConfig.paidSessions;
    const totalSessions = paidSessions + bonusSessions;
    const totalPrice = paidSessions * parseFloat(pricePerSession);
    const effectiveHourlyRate = totalPrice / totalSessions;

    // Pricing guardrails
    if (effectiveHourlyRate < ABSOLUTE_MIN_PER_HOUR) {
      return res.status(400).json({
        success: false,
        message: `Effective hourly rate ($${effectiveHourlyRate.toFixed(2)}) is below the absolute minimum of $${ABSOLUTE_MIN_PER_HOUR}/hr. Reduce bonus sessions or increase price.`,
        effectiveHourlyRate,
        absoluteMinimum: ABSOLUTE_MIN_PER_HOUR,
      });
    }

    if (effectiveHourlyRate < WARNING_THRESHOLD_PER_HOUR && !belowThresholdApproved) {
      return res.status(400).json({
        success: false,
        message: `Effective hourly rate ($${effectiveHourlyRate.toFixed(2)}) is below the recommended $${WARNING_THRESHOLD_PER_HOUR}/hr threshold. Set belowThresholdApproved=true to proceed.`,
        effectiveHourlyRate,
        warningThreshold: WARNING_THRESHOLD_PER_HOUR,
        requiresApproval: true,
      });
    }

    // Verify client exists
    const { default: User } = await import('../models/User.mjs');
    const client = await User.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Create the custom package
    let CustomPackage;
    try {
      const mod = await import('../models/CustomPackage.mjs');
      CustomPackage = mod.default;
    } catch {
      return res.status(503).json({ success: false, message: 'CustomPackage model not available. Run migrations first.' });
    }

    const pkg = await CustomPackage.create({
      clientId,
      createdByAdminId: req.user.id,
      basePackageType,
      name,
      description: description || `${name} — ${totalSessions} sessions (${paidSessions} paid + ${bonusSessions} bonus)`,
      paidSessions,
      bonusSessions,
      totalSessions,
      pricePerSession,
      totalPrice,
      effectiveHourlyRate,
      belowThresholdApproved,
      adminNote,
      status: 'active',
      expiresAt: expiresAt || null,
    });

    logger.info(`Admin ${req.user.id} created custom package for client ${clientId}`, {
      packageId: pkg.id,
      effectiveRate: effectiveHourlyRate,
      bonusSessions,
    });

    res.status(201).json({
      success: true,
      package: pkg,
      pricing: {
        paidSessions,
        bonusSessions,
        totalSessions,
        pricePerSession: parseFloat(pricePerSession),
        totalPrice,
        effectiveHourlyRate: Math.round(effectiveHourlyRate * 100) / 100,
        belowRecommended: effectiveHourlyRate < RECOMMENDED_MIN_PER_SESSION,
        belowWarning: effectiveHourlyRate < WARNING_THRESHOLD_PER_HOUR,
      }
    });
  } catch (error) {
    logger.error('Error creating custom package:', error);
    res.status(500).json({ success: false, message: 'Failed to create custom package' });
  }
});

/**
 * GET /api/custom-packages/client/:clientId
 * Admin gets custom packages for a specific client
 */
router.get('/client/:clientId', protect, adminOnly, async (req, res) => {
  try {
    let CustomPackage;
    try {
      const mod = await import('../models/CustomPackage.mjs');
      CustomPackage = mod.default;
    } catch {
      return res.json({ success: true, packages: [] });
    }

    const packages = await CustomPackage.findAll({
      where: { clientId: req.params.clientId },
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, packages });
  } catch (error) {
    logger.error('Error fetching client custom packages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch custom packages' });
  }
});

/**
 * GET /api/custom-packages/my
 * Client gets their own active custom packages (for store display)
 */
router.get('/my', protect, async (req, res) => {
  try {
    let CustomPackage;
    try {
      const mod = await import('../models/CustomPackage.mjs');
      CustomPackage = mod.default;
    } catch {
      return res.json({ success: true, packages: [] });
    }

    const packages = await CustomPackage.findAll({
      where: {
        clientId: req.user.id,
        status: 'active',
      },
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, packages });
  } catch (error) {
    logger.error('Error fetching my custom packages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch custom packages' });
  }
});

/**
 * PATCH /api/custom-packages/:id
 * Admin updates a custom package
 */
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    let CustomPackage;
    try {
      const mod = await import('../models/CustomPackage.mjs');
      CustomPackage = mod.default;
    } catch {
      return res.status(503).json({ success: false, message: 'CustomPackage model not available' });
    }

    const pkg = await CustomPackage.findByPk(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Custom package not found' });
    }

    const allowed = ['name', 'description', 'adminNote', 'status', 'expiresAt'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await pkg.update(updates);
    res.json({ success: true, package: pkg });
  } catch (error) {
    logger.error('Error updating custom package:', error);
    res.status(500).json({ success: false, message: 'Failed to update custom package' });
  }
});

/**
 * DELETE /api/custom-packages/:id
 * Admin cancels (soft-deletes) a custom package
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    let CustomPackage;
    try {
      const mod = await import('../models/CustomPackage.mjs');
      CustomPackage = mod.default;
    } catch {
      return res.status(503).json({ success: false, message: 'CustomPackage model not available' });
    }

    const pkg = await CustomPackage.findByPk(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Custom package not found' });
    }

    await pkg.update({ status: 'cancelled' });
    res.json({ success: true, message: 'Custom package cancelled' });
  } catch (error) {
    logger.error('Error cancelling custom package:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel custom package' });
  }
});

/**
 * GET /api/custom-packages/pricing-calculator
 * Returns pricing breakdown for a proposed custom package (no DB write)
 */
router.get('/pricing-calculator', protect, adminOnly, async (req, res) => {
  try {
    const { basePackageType, bonusSessions = 0, pricePerSession } = req.query;

    if (!basePackageType || !pricePerSession) {
      return res.status(400).json({ success: false, message: 'basePackageType and pricePerSession required' });
    }

    const baseConfig = BASE_PACKAGES[basePackageType];
    if (!baseConfig) {
      return res.status(400).json({ success: false, message: 'Invalid basePackageType' });
    }

    const paidSessions = baseConfig.paidSessions;
    const bonus = parseInt(bonusSessions) || 0;
    const totalSessions = paidSessions + bonus;
    const price = parseFloat(pricePerSession);
    const totalPrice = paidSessions * price;
    const effectiveHourlyRate = totalPrice / totalSessions;

    res.json({
      success: true,
      pricing: {
        basePackageType,
        paidSessions,
        bonusSessions: bonus,
        totalSessions,
        pricePerSession: price,
        totalPrice: Math.round(totalPrice * 100) / 100,
        effectiveHourlyRate: Math.round(effectiveHourlyRate * 100) / 100,
        belowRecommended: effectiveHourlyRate < RECOMMENDED_MIN_PER_SESSION,
        belowWarning: effectiveHourlyRate < WARNING_THRESHOLD_PER_HOUR,
        belowAbsoluteMin: effectiveHourlyRate < ABSOLUTE_MIN_PER_HOUR,
        recommendedMin: RECOMMENDED_MIN_PER_SESSION,
        warningThreshold: WARNING_THRESHOLD_PER_HOUR,
        absoluteMin: ABSOLUTE_MIN_PER_HOUR,
        savingsVsRecommended: totalSessions > 0 ? Math.round((RECOMMENDED_MIN_PER_SESSION - effectiveHourlyRate) * totalSessions * 100) / 100 : 0,
      }
    });
  } catch (error) {
    logger.error('Error in pricing calculator:', error);
    res.status(500).json({ success: false, message: 'Pricing calculation failed' });
  }
});

export default router;
