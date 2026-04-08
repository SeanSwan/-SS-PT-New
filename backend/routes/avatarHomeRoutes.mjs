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

const router = express.Router();
router.use(protect);

// Furniture upgrade paths — each room has tiered items
const FURNITURE_TIERS = {
  bedroom: {
    bed: ['starter_bed', 'comfort_bed', 'premium_bed', 'luxury_bed'],
    decor: ['basic_poster', 'framed_art', 'trophy_wall', 'crystalline_display'],
  },
  kitchen: {
    fridge: ['starter_fridge', 'mid_fridge', 'smart_fridge', 'luxury_fridge'],
    table: ['basic_table', 'dining_table', 'premium_table', 'crystalline_table'],
  },
  training_room: {
    equipment: ['starter_rack', 'mid_rack', 'full_gym', 'elite_gym'],
    mat: ['basic_mat', 'premium_mat', 'pro_mat', 'crystalline_mat'],
  },
};

// Level thresholds for home tier upgrades
const HOME_TIER_LEVELS = { starter: 10, mid: 25, premium: 50, luxury: 100 };

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
  const { bodyType, skinTone, hairStyle, hairColor, outfit } = req.body;

  try {
    const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
    const home = await AvatarHome.findOne({ where: { userId: req.user.id } });

    if (!home) {
      return res.status(404).json({ success: false, message: 'Avatar home not found' });
    }
    if (!home.unlocked) {
      return res.status(403).json({ success: false, message: 'Reach Level 10 to unlock your avatar home' });
    }

    const updates = {};
    if (bodyType) updates.avatarBodyType = bodyType;
    if (skinTone) updates.avatarSkinTone = skinTone;
    if (hairStyle) updates.avatarHairStyle = hairStyle;
    if (hairColor) updates.avatarHairColor = hairColor;
    if (outfit) updates.avatarOutfit = outfit;

    await home.update(updates);
    res.json({ success: true, data: home });
  } catch (err) {
    logger.error('Failed to update avatar:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update avatar' });
  }
});

// ── Update Home / Furniture ──────────────────────────────────
// PATCH /api/avatar-home/furniture
router.patch('/furniture', async (req, res) => {
  const { room, slot, item } = req.body;

  if (!room || !slot || !item) {
    return res.status(400).json({ success: false, message: 'room, slot, and item are required' });
  }

  try {
    const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
    const home = await AvatarHome.findOne({ where: { userId: req.user.id } });

    if (!home || !home.unlocked) {
      return res.status(403).json({ success: false, message: 'Avatar home not unlocked' });
    }

    // Validate room/slot/item exists in tier system
    const roomTiers = FURNITURE_TIERS[room];
    if (!roomTiers || !roomTiers[slot]) {
      return res.status(400).json({ success: false, message: `Invalid room/slot: ${room}/${slot}` });
    }
    const slotItems = roomTiers[slot];
    if (!slotItems.includes(item)) {
      return res.status(400).json({ success: false, message: `Invalid item: ${item}` });
    }

    // Enforce tier ceiling — user can only equip items up to their homeTier index
    const tierOrder = ['starter', 'mid', 'premium', 'luxury'];
    const maxTierIdx = tierOrder.indexOf(home.homeTier);
    const itemTierIdx = slotItems.indexOf(item);
    if (itemTierIdx > maxTierIdx) {
      return res.status(403).json({
        success: false,
        message: `"${item}" requires ${tierOrder[itemTierIdx]} tier. Your home is ${home.homeTier}.`,
      });
    }

    const furniture = { ...home.furniture };
    if (!furniture[room]) furniture[room] = {};
    furniture[room][slot] = item;

    await home.update({ furniture });
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

export default router;
