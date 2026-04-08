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

// ── Phase 3: Unlock gate helper ─────────────────────────────────
async function requireUnlockedHome(userId) {
  const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
  const home = await AvatarHome.findOne({ where: { userId } });
  if (!home) return { home: null, error: 'Avatar home not found', status: 404 };
  if (!home.unlocked) return { home: null, error: 'Reach Level 10 to unlock this feature', status: 403 };
  return { home, error: null, status: 200 };
}

// ── Phase 3: Crystalline Marketplace ────────────────────────────

const MARKETPLACE_CATALOG = [
  // Furniture
  { id: 'crystal_bed', type: 'furniture', name: 'Crystalline Bed', room: 'bedroom', slot: 'bed', price: 500, rarity: 'epic' },
  { id: 'aurora_poster', type: 'furniture', name: 'Aurora Borealis Wall', room: 'bedroom', slot: 'decor', price: 300, rarity: 'rare' },
  { id: 'smart_kitchen', type: 'furniture', name: 'Smart Kitchen Island', room: 'kitchen', slot: 'table', price: 400, rarity: 'rare' },
  { id: 'holographic_rack', type: 'furniture', name: 'Holographic Training Rack', room: 'training_room', slot: 'equipment', price: 800, rarity: 'legendary' },
  // Pet Skins
  { id: 'golden_dragon', type: 'pet_skin', name: 'Golden Dragon Skin', species: 'dragon', price: 600, rarity: 'epic' },
  { id: 'arctic_wolf', type: 'pet_skin', name: 'Arctic Wolf Skin', species: 'wolf', price: 400, rarity: 'rare' },
  { id: 'ember_phoenix', type: 'pet_skin', name: 'Ember Phoenix Skin', species: 'phoenix', price: 500, rarity: 'epic' },
  { id: 'shadow_panther', type: 'pet_skin', name: 'Midnight Panther Skin', species: 'panther', price: 350, rarity: 'rare' },
  { id: 'crystal_swan', type: 'pet_skin', name: 'Crystal Swan Skin', species: 'swan', price: 700, rarity: 'legendary' },
  // Outfits
  { id: 'crystalline_suit', type: 'outfit', name: 'Crystalline Training Suit', price: 450, rarity: 'epic' },
  { id: 'obsidian_armor', type: 'outfit', name: 'Obsidian Battle Armor', price: 600, rarity: 'epic' },
  { id: 'golden_tracksuit', type: 'outfit', name: 'Gilded Fern Tracksuit', price: 350, rarity: 'rare' },
  { id: 'legendary_wings', type: 'outfit', name: 'Swan Wing Cape', price: 1000, rarity: 'legendary' },
  { id: 'starter_casual', type: 'outfit', name: 'Casual Workout Tee', price: 100, rarity: 'common' },
];

// GET /api/avatar-home/marketplace
router.get('/marketplace', async (_req, res) => {
  res.json({ success: true, data: MARKETPLACE_CATALOG });
});

// GET /api/avatar-home/crystals
router.get('/crystals', async (req, res) => {
  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });
    res.json({
      success: true,
      data: {
        balance: home.crystalBalance || 0,
        ownedItems: home.ownedItems || [],
      },
    });
  } catch (err) {
    logger.error('Crystal balance error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch balance' });
  }
});

// POST /api/avatar-home/marketplace/purchase
router.post('/marketplace/purchase', async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ success: false, message: 'itemId required' });

  const catalogItem = MARKETPLACE_CATALOG.find(i => i.id === itemId);
  if (!catalogItem) return res.status(404).json({ success: false, message: 'Item not found in catalog' });

  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });

    // Check already owned
    const owned = home.ownedItems || [];
    if (owned.some(i => i.id === itemId)) {
      return res.status(409).json({ success: false, message: 'Already owned' });
    }

    // Check balance
    if (home.crystalBalance < catalogItem.price) {
      return res.status(400).json({
        success: false,
        message: `Not enough crystals. Need ${catalogItem.price}, have ${home.crystalBalance}.`,
      });
    }

    const newItem = { id: catalogItem.id, type: catalogItem.type, name: catalogItem.name, rarity: catalogItem.rarity, equippedIn: null };
    const updatedOwned = [...owned, newItem];
    const newBalance = home.crystalBalance - catalogItem.price;

    await home.update({ ownedItems: updatedOwned, crystalBalance: newBalance });

    logger.info(`[AUDIT] User ${req.user.id} purchased "${catalogItem.name}" for ${catalogItem.price} crystals`);
    res.json({ success: true, data: { item: newItem, crystalBalance: newBalance } });
  } catch (err) {
    logger.error('Marketplace purchase error:', err.message);
    res.status(500).json({ success: false, message: 'Purchase failed' });
  }
});

// POST /api/avatar-home/marketplace/equip
router.post('/marketplace/equip', async (req, res) => {
  const { itemId, target } = req.body;
  if (!itemId) return res.status(400).json({ success: false, message: 'itemId required' });

  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });

    const owned = [...(home.ownedItems || [])];
    const idx = owned.findIndex(i => i.id === itemId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not owned' });

    owned[idx] = { ...owned[idx], equippedIn: target || 'active' };
    await home.update({ ownedItems: owned });
    res.json({ success: true, data: { ownedItems: owned } });
  } catch (err) {
    logger.error('Equip error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to equip item' });
  }
});

// ── Phase 3: Corporate Faction Hooks (Architecture Only) ────────

// PATCH /api/avatar-home/faction
router.patch('/faction', async (req, res) => {
  const { factionId } = req.body;

  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });

    await home.update({ factionId: factionId || null });
    logger.info(`[AUDIT] User ${req.user.id} ${factionId ? `joined faction "${factionId}"` : 'left faction'}`);
    res.json({ success: true, data: { factionId: home.factionId } });
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
    res.json({ success: true, data: { factionId: home.factionId || null } });
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

  // Validate Ready Player Me URL format
  if (!avatarUrl.includes('readyplayer.me') && !avatarUrl.includes('models.readyplayer.me')) {
    return res.status(400).json({ success: false, message: 'Invalid Ready Player Me URL' });
  }

  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });

    await home.update({ readyPlayerMeUrl: avatarUrl });
    logger.info(`[AUDIT] User ${req.user.id} linked Ready Player Me avatar`);
    res.json({ success: true, data: { readyPlayerMeUrl: avatarUrl } });
  } catch (err) {
    logger.error('RPM avatar error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save avatar URL' });
  }
});

// ── Phase 3: Wearable Recovery Data (HealthKit/Google Fit) ──────

// POST /api/avatar-home/recovery-sync
router.post('/recovery-sync', async (req, res) => {
  const { sleepHours, hrv, restingHR, steps, source } = req.body;

  const VALID_SOURCES = ['healthkit', 'google_fit'];
  if (!source || !VALID_SOURCES.includes(source)) {
    return res.status(400).json({ success: false, message: `source must be: ${VALID_SOURCES.join(', ')}` });
  }

  try {
    const { home, error, status } = await requireUnlockedHome(req.user.id);
    if (!home) return res.status(status).json({ success: false, message: error });

    const recoveryData = {
      sleepHours: sleepHours || null,
      hrv: hrv || null,
      restingHR: restingHR || null,
      steps: steps || null,
      source,
      syncedAt: new Date().toISOString(),
      recoveryRecommendation: computeRecoveryRecommendation(sleepHours, hrv, restingHR),
    };

    await home.update({ wearableRecoveryData: recoveryData });

    logger.info(`[AUDIT] User ${req.user.id} synced recovery data from ${source}`);
    res.json({ success: true, data: { wearableRecoveryData: recoveryData } });
  } catch (err) {
    logger.error('Recovery sync error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to sync recovery data' });
  }
});

function computeRecoveryRecommendation(sleepHours, hrv, restingHR) {
  let score = 0;
  let factors = 0;

  if (sleepHours != null) {
    score += sleepHours >= 7 ? 100 : sleepHours >= 6 ? 70 : 40;
    factors++;
  }
  if (hrv != null) {
    score += hrv >= 50 ? 100 : hrv >= 30 ? 70 : 40;
    factors++;
  }
  if (restingHR != null) {
    score += restingHR <= 60 ? 100 : restingHR <= 75 ? 70 : 40;
    factors++;
  }

  if (factors === 0) return { score: null, recommendation: 'Sync wearable data for recovery insights' };

  const avg = Math.round(score / factors);
  const recommendation = avg >= 80
    ? 'Great recovery — ready for high-intensity training!'
    : avg >= 60
      ? 'Moderate recovery — consider lighter volume today.'
      : 'Low recovery — prioritize flexibility and rest. Wisdom XP awaits!';

  return { score: avg, recommendation };
}

export default router;
