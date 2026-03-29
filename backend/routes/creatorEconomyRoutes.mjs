/**
 * ============================================================================
 * FILE: creatorEconomyRoutes.mjs
 * PURPOSE: REST API routes for Creator Economy feature
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides endpoints for creator profiles, subscriptions,
 * and brand partnerships. Full monetization integration is Phase 2.
 */
import { Router } from 'express';
import authenticateToken from '../middleware/auth.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers — dynamic model import
// ─────────────────────────────────────────────────────────────

async function getModels() {
  const mod = await import('../models/social/enhanced/CreatorEconomy.mjs');
  return {
    CreatorProfile: mod.CreatorProfile,
    BrandPartnership: mod.BrandPartnership,
    CreatorSubscription: mod.CreatorSubscription,
    CreatorAnalytics: mod.CreatorAnalytics,
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Creator Profile Routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/creators
 * List top creators
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { CreatorProfile } = await getModels();
    const creators = await CreatorProfile.getTopCreators?.() || [];
    res.json({ creators });
  } catch (err) {
    logger.error('Error fetching creators', { error: err.message });
    res.json({ creators: [], status: 'coming_soon', message: 'Creator economy coming soon' });
  }
});

/**
 * GET /api/creators/config
 * Feature configuration
 */
router.get('/config', authenticateToken, (_req, res) => {
  res.json({
    enabled: false,
    status: 'coming_soon',
    categories: ['fitness_trainer', 'nutritionist', 'wellness_coach', 'content_creator'],
    subscriptionTiers: ['basic', 'premium', 'vip', 'exclusive'],
    minFollowersForCreator: 10,
  });
});

/**
 * GET /api/creators/my-profile
 * Get current user's creator profile
 */
router.get('/my-profile', authenticateToken, async (req, res) => {
  try {
    const { CreatorProfile } = await getModels();
    const profile = await CreatorProfile.findOne({ where: { userId: req.user.id } });
    res.json({ profile: profile || null, isCreator: !!profile });
  } catch (err) {
    logger.error('Error fetching creator profile', { error: err.message });
    res.json({ profile: null, isCreator: false, status: 'coming_soon' });
  }
});

/**
 * POST /api/creators/apply
 * Apply to become a creator
 */
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { CreatorProfile } = await getModels();
    const existing = await CreatorProfile.findOne({ where: { userId: req.user.id } });
    if (existing) {
      return res.status(409).json({ message: 'Creator profile already exists', profile: existing });
    }

    const profile = await CreatorProfile.applyToJoin?.({
      userId: req.user.id,
      displayName: req.body.displayName,
      bio: req.body.bio,
      primaryCategory: req.body.primaryCategory || 'fitness_trainer',
    }) || await CreatorProfile.create({
      userId: req.user.id,
      displayName: req.body.displayName,
      bio: req.body.bio,
      primaryCategory: req.body.primaryCategory || 'fitness_trainer',
      creatorStatus: 'pending',
    });

    res.status(201).json({ profile });
  } catch (err) {
    logger.error('Error applying as creator', { error: err.message });
    res.status(500).json({ message: 'Error creating creator profile' });
  }
});

/**
 * GET /api/creators/:id
 * Get a creator's public profile
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { CreatorProfile } = await getModels();
    const profile = await CreatorProfile.findByPk(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Creator not found' });
    res.json({ profile });
  } catch (err) {
    logger.error('Error fetching creator', { error: err.message });
    res.status(500).json({ message: 'Error fetching creator profile' });
  }
});

export default router;
