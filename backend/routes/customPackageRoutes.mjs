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
import sequelize from '../database.mjs';
import * as specialOffer from '../services/specialOfferService.mjs';

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
      targetEffectiveRate,        // preferred: admin types the effective $/session
      bonusSessions,              // alternative: explicit bonus-session count
      name = 'SwanStudios Special',
      description,
      adminNote,
      belowThresholdApproved = false,
      overrideReason = null,      // required when effective rate < $100 floor
      validityType = 'one_time',  // one_time | n_times | time_window | ongoing (default OFF)
      maxRedemptions,             // required for validityType 'n_times'
      expiresAt,
    } = req.body;

    if (!clientId || !basePackageType) {
      return res.status(400).json({ success: false, message: 'clientId and basePackageType are required' });
    }

    const baseConfig = BASE_PACKAGES[basePackageType];
    if (!baseConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid basePackageType. Must be one of: ${Object.keys(BASE_PACKAGES).join(', ')}`
      });
    }
    const paidSessions = baseConfig.paidSessions;

    // Compute pricing at the FIXED $175 sticker (never lowered) — discount = bonus sessions —
    // then enforce the effective-rate floor with the audited override policy.
    let pricing;
    try {
      if (targetEffectiveRate !== undefined && targetEffectiveRate !== null && targetEffectiveRate !== '') {
        pricing = specialOffer.computeBonusForTargetRate({ paidSessions, targetEffectiveRate: Number(targetEffectiveRate) });
      } else {
        pricing = specialOffer.computeSpecialPricing({ paidSessions, bonusSessions: Number(bonusSessions || 0) });
      }
      specialOffer.assertRateFloor({
        effectiveHourlyRate: pricing.effectiveHourlyRate,
        belowThresholdApproved,
        overrideReason,
      });
    } catch (e) {
      if (e instanceof specialOffer.SpecialOfferError) {
        return res.status(e.status || 400).json({ success: false, code: e.code, message: e.message, details: e.details });
      }
      throw e;
    }

    // Resolve validity -> starting redemption limit (null = unlimited: ongoing/time_window)
    let remainingRedemptions;
    try {
      remainingRedemptions = specialOffer.resolveRedemptionLimit(validityType, maxRedemptions);
    } catch (e) {
      if (e instanceof specialOffer.SpecialOfferError) {
        return res.status(e.status || 400).json({ success: false, code: e.code, message: e.message });
      }
      throw e;
    }

    // time_window specials must carry a real end date, else they'd be evergreen. (MED-1)
    try {
      specialOffer.assertValidityRules({ validityType, expiresAt });
    } catch (e) {
      if (e instanceof specialOffer.SpecialOfferError) {
        return res.status(e.status || 400).json({ success: false, code: e.code, message: e.message });
      }
      throw e;
    }

    const gate = specialOffer.evaluateRateGate(pricing.effectiveHourlyRate);
    const usedOverride = gate.requiresOverride;

    const { default: User } = await import('../models/User.mjs');
    const { default: CustomPackage } = await import('../models/CustomPackage.mjs');
    const { default: StorefrontItem } = await import('../models/StorefrontItem.mjs');

    // Persist the package + its hidden client-scoped storefront item atomically.
    const created = await sequelize.transaction(async (t) => {
      const client = await User.findByPk(clientId, { transaction: t });
      if (!client) {
        const err = new Error('Client not found');
        err.httpStatus = 404;
        throw err;
      }

      const pkg = await CustomPackage.create({
        clientId,
        createdByAdminId: req.user.id,
        basePackageType,
        name,
        description: description || `${name} — ${pricing.totalSessions} sessions (${paidSessions} paid + ${pricing.bonusSessions} bonus)`,
        paidSessions,
        bonusSessions: pricing.bonusSessions,
        totalSessions: pricing.totalSessions,
        pricePerSession: specialOffer.STICKER_PER_SESSION, // pinned $175 — the sticker is never lowered
        totalPrice: pricing.totalPrice,
        effectiveHourlyRate: pricing.effectiveHourlyRate,
        belowThresholdApproved: !!belowThresholdApproved,
        overrideReason: usedOverride ? (overrideReason || null) : null,
        approvedByAdminId: usedOverride ? req.user.id : null,
        approvedAt: usedOverride ? new Date() : null,
        adminNote,
        status: 'active',
        validityType,
        maxRedemptions: remainingRedemptions,
        remainingRedemptions,
        expiresAt: expiresAt || null,
      }, { transaction: t });

      const item = await specialOffer.createHiddenStorefrontItemForPackage(pkg, { StorefrontItem, transaction: t });
      await pkg.update({ storefrontItemId: item.id }, { transaction: t });

      return { pkg, storefrontItemId: item.id };
    });

    logger.info(`Admin ${req.user.id} created special for client ${clientId}`, {
      packageId: created.pkg.id,
      storefrontItemId: created.storefrontItemId,
      effectiveRate: pricing.effectiveHourlyRate,
      bonusSessions: pricing.bonusSessions,
      validityType,
    });

    return res.status(201).json({
      success: true,
      package: created.pkg,
      storefrontItemId: created.storefrontItemId,
      pricing: {
        paidSessions,
        bonusSessions: pricing.bonusSessions,
        totalSessions: pricing.totalSessions,
        pricePerSession: specialOffer.STICKER_PER_SESSION,
        totalPrice: pricing.totalPrice,
        effectiveHourlyRate: pricing.effectiveHourlyRate,
        gateTier: gate.tier,
      }
    });
  } catch (error) {
    if (error?.httpStatus === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error('Error creating special:', error);
    return res.status(500).json({ success: false, message: 'Failed to create special' });
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
