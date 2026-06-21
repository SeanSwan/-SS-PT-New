/**
 * ┌─── ROUTES: Avatar Home (3D World) ─────────────────────────┐
 * │ PREFIX: /api/avatar-home                                    │
 * │ AUTH: protect (all routes)                                  │
 * │ PURPOSE: Manage avatar customization and virtual home state.│
 * │ Level 10 gate enforced on unlock.                          │
 * └────────────────────────────────────────────────────────────┘
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import { FURNITURE_TIERS, HOME_TIER_LEVELS } from '../utils/avatarHomeCatalog.mjs';
import { requireUnlockedHome } from '../services/avatarHomeAccessService.mjs';
import { normalizeAvatarHomeFactionId } from '../utils/avatarHomeFactionId.mjs';
import { registerAvatarHomeMarketplaceRoutes } from '../utils/avatarHomeMarketplaceRoutes.mjs';
import { registerAvatarHomeRecoveryRoutes } from '../utils/avatarHomeRecovery.mjs';
import { normalizeReadyPlayerMeUrl } from '../utils/readyPlayerMeUrl.mjs';
import { buildAvatarHomeCustomizationUpdates } from '../utils/avatarHomeCustomization.mjs';
import { buildAvatarHomeFurnitureUpdate } from '../utils/avatarHomeFurniture.mjs';

const router = express.Router();
router.use(protect);

// ── Get or Create Avatar Home ────────────────────────────────
// GET /api/avatar-home
router.get('/', async (req, res) => {
  try {
    const { default: AvatarHome } = await import('../models/AvatarHome.mjs');

    // Always fetch current level to recompute unlock/tier
    const { default: Gamification } = await import('../models/Gamification.mjs');
    const gam = await Gamification.findOne({ where: { userId: req.user.id } });
    const level = gam?.level || 1;
    const shouldUnlock = level >= 10;
    const resolvedTier = level >= 100 ? 'luxury' : level >= 50 ? 'premium' : level >= 25 ? 'mid' : 'starter';

    let home = await AvatarHome.findOne({ where: { userId: req.user.id } });

    if (!home) {
      home = await AvatarHome.create({
        userId: req.user.id,
        unlocked: shouldUnlock,
        unlockedAt: shouldUnlock ? new Date() : null,
        homeTier: resolvedTier,
      });
    } else {
      // Recompute unlock and tier on every access
      const updates = {};
      if (shouldUnlock && !home.unlocked) {
        updates.unlocked = true;
        updates.unlockedAt = new Date();
      }
      if (home.homeTier !== resolvedTier) {
        updates.homeTier = resolvedTier;
      }
      if (Object.keys(updates).length > 0) {
        await home.update(updates);
      }
    }

    res.json({
      success: true,
      data: home,
      meta: {
        furnitureTiers: FURNITURE_TIERS,
        homeTierLevels: HOME_TIER_LEVELS,
        currentLevel: level,
      },
    });
  } catch (err) {
    logger.error('Failed to get avatar home:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load avatar home' });
  }
});

// ── Update Avatar Customization ──────────────────────────────
// PATCH /api/avatar-home/avatar
router.patch('/avatar', async (req, res) => {
  try {
    const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
    const home = await AvatarHome.findOne({ where: { userId: req.user.id } });

    if (!home) {
      return res.status(404).json({ success: false, message: 'Avatar home not found' });
    }
    if (!home.unlocked) {
      return res.status(403).json({ success: false, message: 'Reach Level 10 to unlock your avatar home' });
    }

    const { updates, error } = buildAvatarHomeCustomizationUpdates(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    if (Object.keys(updates).length > 0) {
      await home.update(updates);
    }
    res.json({ success: true, data: home });
  } catch (err) {
    logger.error('Failed to update avatar:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update avatar' });
  }
});

// ── Update Home / Furniture ──────────────────────────────────
// PATCH /api/avatar-home/furniture
router.patch('/furniture', async (req, res) => {
  try {
    const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
    const home = await AvatarHome.findOne({ where: { userId: req.user.id } });

    if (!home || !home.unlocked) {
      return res.status(403).json({ success: false, message: 'Avatar home not unlocked' });
    }

    const { updates, error, status } = buildAvatarHomeFurnitureUpdate({
      payload: req.body,
      homeTier: home.homeTier,
      currentFurniture: home.furniture,
    });
    if (error) {
      return res.status(status).json({ success: false, message: error });
    }

    await home.update(updates);
    res.json({ success: true, data: home });
  } catch (err) {
    logger.error('Failed to update furniture:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update furniture' });
  }
});

// ── Toggle Minimalist Mode ───────────────────────────────────
// PATCH /api/avatar-home/minimalist-mode
router.patch('/minimalist-mode', async (req, res) => {
  try {
    const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
    const home = await AvatarHome.findOne({ where: { userId: req.user.id } });

    if (!home) {
      return res.status(404).json({ success: false, message: 'Avatar home not found' });
    }

    await home.update({ minimalistMode: !home.minimalistMode });
    res.json({ success: true, data: { minimalistMode: home.minimalistMode } });
  } catch (err) {
    logger.error('Failed to toggle minimalist mode:', err.message);
    res.status(500).json({ success: false, message: 'Failed to toggle mode' });
  }
});

// ── Switch Active Room ───────────────────────────────────────
// PATCH /api/avatar-home/room
router.patch('/room', async (req, res) => {
  const { room } = req.body;
  const validRooms = ['bedroom', 'kitchen', 'training_room'];

  if (!validRooms.includes(room)) {
    return res.status(400).json({ success: false, message: `Invalid room. Use: ${validRooms.join(', ')}` });
  }

  try {
    const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
    const home = await AvatarHome.findOne({ where: { userId: req.user.id } });

    if (!home || !home.unlocked) {
      return res.status(403).json({ success: false, message: 'Avatar home not unlocked' });
    }

    await home.update({ activeRoom: room });
    res.json({ success: true, data: { activeRoom: room } });
  } catch (err) {
    logger.error('Failed to switch room:', err.message);
    res.status(500).json({ success: false, message: 'Failed to switch room' });
  }
});

// ── Phase 3: Crystalline Marketplace ────────────────────────────
registerAvatarHomeMarketplaceRoutes(router, { requireUnlockedHome, logger });

// ── Phase 3: Corporate Faction Hooks (Architecture Only) ────────

// PATCH /api/avatar-home/faction
router.patch('/faction', async (req, res) => {
  const { factionId } = req.body;
  const safeFactionId = normalizeAvatarHomeFactionId(factionId);

  if (safeFactionId === undefined) {
    return res.status(400).json({ success: false, message: 'Invalid faction ID' });
  }

  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });

    await home.update({ factionId: safeFactionId });
    logger.info(`[AUDIT] User ${req.user.id} ${safeFactionId ? 'joined a faction' : 'left faction'}`);
    res.json({ success: true, data: { factionId: safeFactionId } });
  } catch (err) {
    logger.error('Faction update error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update faction' });
  }
});

// GET /api/avatar-home/faction
router.get('/faction', async (req, res) => {
  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });
    const safeFactionId = normalizeAvatarHomeFactionId(home.factionId);
    res.json({ success: true, data: { factionId: safeFactionId === undefined ? null : safeFactionId } });
  } catch (err) {
    logger.error('Faction fetch error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch faction' });
  }
});

// ── Phase 3: Ready Player Me Avatar ────────────────────────────

// PATCH /api/avatar-home/ready-player-me
router.patch('/ready-player-me', async (req, res) => {
  const { avatarUrl } = req.body;
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return res.status(400).json({ success: false, message: 'avatarUrl is required' });
  }

  const safeAvatarUrl = normalizeReadyPlayerMeUrl(avatarUrl);
  if (!safeAvatarUrl) {
    return res.status(400).json({ success: false, message: 'Invalid Ready Player Me URL' });
  }

  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });

    await home.update({ readyPlayerMeUrl: safeAvatarUrl });
    logger.info(`[AUDIT] User ${req.user.id} linked Ready Player Me avatar`);
    res.json({ success: true, data: { readyPlayerMeUrl: safeAvatarUrl } });
  } catch (err) {
    logger.error('RPM avatar error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save avatar URL' });
  }
});

// ── Phase 3: Wearable Recovery Data (HealthKit/Google Fit) ──────

registerAvatarHomeRecoveryRoutes(router, { requireUnlockedHome, logger });

export default router;
