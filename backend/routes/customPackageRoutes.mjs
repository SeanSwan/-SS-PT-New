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
import { Op } from 'sequelize';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';
import {
  STICKER_PER_SESSION,
  computeSpecialPricing,
  computeBonusForTargetRate,
  evaluateRateGate,
  assertRateFloor,
  resolveRedemptionLimit,
  assertValidityRules,
  createHiddenStorefrontItemForPackage,
  SpecialOfferError,
} from '../services/specialOfferService.mjs';

const router = express.Router();

// Sticker anchor for the informational readout ($175 never drops; discount = bonus).
const RECOMMENDED_MIN_PER_SESSION = STICKER_PER_SESSION;

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
      // Admin picks EITHER a target effective $/session (preferred — the admin
      // UX) OR an explicit bonusSessions count. The $175 sticker never drops.
      targetEffectiveRate = null,
      bonusSessions = 0,
      name = 'SwanStudios Special',
      description,
      adminNote,
      expiresAt,
      // Validity / redemption (charter: one_time default). validityType one of
      // one_time | n_times | time_window | ongoing; maxRedemptions for n_times.
      validityType = 'one_time',
      maxRedemptions = null,
      // Optional audit note (NOT a gate — the admin is the final decider).
      overrideReason = null,
    } = req.body;

    if (!clientId || !basePackageType) {
      return res.status(400).json({
        success: false,
        message: 'clientId and basePackageType are required'
      });
    }

    const baseConfig = BASE_PACKAGES[basePackageType];
    if (!baseConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid basePackageType. Must be one of: ${Object.keys(BASE_PACKAGES).join(', ')}`
      });
    }

    // Pure pricing math ($175 sticker anchor; discount = bonus sessions).
    // The SERVER is authoritative: if the admin gave a target effective rate,
    // WE compute the bonus sessions (client math is preview only).
    let pricing;
    try {
      pricing = Number(targetEffectiveRate) > 0
        ? computeBonusForTargetRate({
            paidSessions: baseConfig.paidSessions,
            targetEffectiveRate: Number(targetEffectiveRate),
            pricePerSession: STICKER_PER_SESSION,
          })
        : computeSpecialPricing({
            paidSessions: baseConfig.paidSessions,
            bonusSessions: Number(bonusSessions) || 0,
            pricePerSession: STICKER_PER_SESSION,
          });
      // Data-integrity only — never a floor. Throws just on a non-positive rate.
      assertRateFloor({ effectiveHourlyRate: pricing.effectiveHourlyRate });
      assertValidityRules({ validityType, expiresAt });
    } catch (e) {
      if (e instanceof SpecialOfferError) {
        return res.status(e.status || 400).json({ success: false, message: e.message, code: e.code });
      }
      throw e;
    }
    const redemptionLimit = resolveRedemptionLimit(validityType, maxRedemptions);
    const rateTier = evaluateRateGate(pricing.effectiveHourlyRate).tier;

    // Verify client exists
    const { default: User } = await import('../models/User.mjs');
    const client = await User.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    let CustomPackage;
    let StorefrontItem;
    try {
      CustomPackage = (await import('../models/CustomPackage.mjs')).default;
      StorefrontItem = (await import('../models/StorefrontItem.mjs')).default;
    } catch {
      return res.status(503).json({ success: false, message: 'Models not available. Run migrations first.' });
    }

    // Atomic: the CustomPackage (spine) + its hidden client-scoped StorefrontItem
    // (isSpecialOffer, sessions = paid+bonus) must both persist or neither does.
    const result = await sequelize.transaction(async (transaction) => {
      const pkg = await CustomPackage.create({
        clientId,
        createdByAdminId: req.user.id,
        basePackageType,
        name,
        description: description
          || `${name} — ${pricing.totalSessions} sessions (${pricing.paidSessions} paid + ${pricing.bonusSessions} bonus)`,
        paidSessions: pricing.paidSessions,
        bonusSessions: pricing.bonusSessions,
        totalSessions: pricing.totalSessions,
        pricePerSession: pricing.pricePerSession,
        totalPrice: pricing.totalPrice,
        effectiveHourlyRate: pricing.effectiveHourlyRate,
        adminNote,
        status: 'active',
        expiresAt: expiresAt || null,
        validityType,
        maxRedemptions: redemptionLimit,
        remainingRedemptions: redemptionLimit,
        overrideReason: overrideReason || null,
        approvedByAdminId: req.user.id,
        approvedAt: new Date(),
      }, { transaction });

      // The hidden storefront item is what the client actually adds to cart.
      const hiddenItem = await createHiddenStorefrontItemForPackage(pkg, { StorefrontItem, transaction });
      await pkg.update({ storefrontItemId: hiddenItem.id }, { transaction });
      return { pkg, hiddenItem };
    });

    logger.info(`Admin ${req.user.id} created special for client ${clientId}`, {
      packageId: result.pkg.id,
      storefrontItemId: result.hiddenItem.id,
      effectiveRate: pricing.effectiveHourlyRate,
      rateTier,
      bonusSessions: pricing.bonusSessions,
    });

    res.status(201).json({
      success: true,
      package: result.pkg,
      storefrontItemId: result.hiddenItem.id,
      pricing: {
        ...pricing,
        effectiveHourlyRate: Math.round(pricing.effectiveHourlyRate * 100) / 100,
        rateTier, // informational label only (standard | discounted | deep_deal | custom_deal)
        belowRecommended: pricing.effectiveHourlyRate < RECOMMENDED_MIN_PER_SESSION,
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
      attributes: [
        'id',
        'name',
        'description',
        'paidSessions',
        'bonusSessions',
        'totalSessions',
        'totalPrice',
        'effectiveHourlyRate',
        'status',
        'expiresAt',
        'storefrontItemId',
        'validityType',
        'remainingRedemptions',
      ],
      where: {
        clientId: req.user.id,
        status: 'active',
        [Op.and]: [
          { [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }] },
          { [Op.or]: [{ remainingRedemptions: null }, { remainingRedemptions: { [Op.gt]: 0 } }] },
        ],
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

    assertValidityRules({
      validityType: pkg.validityType,
      expiresAt: Object.prototype.hasOwnProperty.call(updates, 'expiresAt')
        ? updates.expiresAt
        : pkg.expiresAt,
    });

    await pkg.update(updates);
    res.json({ success: true, package: pkg });
  } catch (error) {
    logger.error('Error updating custom package:', error);
    if (error instanceof SpecialOfferError) {
      return res.status(error.status || 400).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
    return res.status(500).json({ success: false, message: 'Failed to update custom package' });
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

    // Cancel the deal AND deactivate its hidden storefront item in one txn, so a
    // cancelled special can never be added to cart or bought.
    await sequelize.transaction(async (transaction) => {
      await pkg.update({ status: 'cancelled' }, { transaction });
      if (pkg.storefrontItemId) {
        const StorefrontItem = (await import('../models/StorefrontItem.mjs')).default;
        await StorefrontItem.update(
          { isActive: false },
          { where: { id: pkg.storefrontItemId }, transaction },
        );
      }
    });
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

    let pricing;
    try {
      pricing = computeSpecialPricing({
        paidSessions: baseConfig.paidSessions,
        bonusSessions: parseInt(bonusSessions, 10) || 0,
        pricePerSession: parseFloat(pricePerSession),
      });
    } catch (e) {
      if (e instanceof SpecialOfferError) {
        return res.status(400).json({ success: false, message: e.message, code: e.code });
      }
      throw e;
    }
    const rateTier = evaluateRateGate(pricing.effectiveHourlyRate).tier;

    res.json({
      success: true,
      pricing: {
        basePackageType,
        ...pricing,
        effectiveHourlyRate: Math.round(pricing.effectiveHourlyRate * 100) / 100,
        rateTier, // informational only: standard | discounted | deep_deal | custom_deal
        recommendedMin: RECOMMENDED_MIN_PER_SESSION,
        savingsVsRecommended: pricing.totalSessions > 0
          ? Math.round((RECOMMENDED_MIN_PER_SESSION - pricing.effectiveHourlyRate) * pricing.totalSessions * 100) / 100
          : 0,
      }
    });
  } catch (error) {
    logger.error('Error in pricing calculator:', error);
    res.status(500).json({ success: false, message: 'Pricing calculation failed' });
  }
});

export default router;
