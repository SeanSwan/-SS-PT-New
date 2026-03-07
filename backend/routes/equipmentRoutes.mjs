/**
 * Equipment Profile Routes
 * ========================
 * Phase 7: Equipment Profile Manager — full CRUD + AI scan + exercise mapping.
 *
 * PROFILES:
 *   GET    /api/equipment-profiles              List trainer's profiles
 *   POST   /api/equipment-profiles              Create profile
 *   GET    /api/equipment-profiles/:id           Get profile with items
 *   PUT    /api/equipment-profiles/:id           Update profile
 *   DELETE /api/equipment-profiles/:id           Soft-delete profile
 *
 * ITEMS:
 *   GET    /api/equipment-profiles/:id/items     List items in profile
 *   POST   /api/equipment-profiles/:id/items     Add item manually
 *   PUT    /api/equipment-profiles/:id/items/:itemId  Update item
 *   DELETE /api/equipment-profiles/:id/items/:itemId  Soft-delete item
 *
 * AI SCAN:
 *   POST   /api/equipment-profiles/:id/scan      Upload photo + AI scan
 *   PUT    /api/equipment-profiles/:id/items/:itemId/approve  Approve AI scan result
 *   PUT    /api/equipment-profiles/:id/items/:itemId/reject   Reject AI scan result
 *
 * EXERCISE MAPPING:
 *   GET    /api/equipment-profiles/:id/items/:itemId/exercises  List exercise mappings
 *   POST   /api/equipment-profiles/:id/items/:itemId/exercises  Add exercise mapping
 *   DELETE /api/equipment-profiles/:id/items/:itemId/exercises/:mapId  Remove mapping
 *   PUT    /api/equipment-profiles/:id/items/:itemId/exercises/:mapId/confirm  Confirm AI mapping
 *
 * STATS:
 *   GET    /api/equipment-profiles/stats         Admin stats (pending approvals, counts)
 */
import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { getEquipmentProfile, getEquipmentItem, getEquipmentExerciseMap } from '../models/index.mjs';
import { scanEquipmentImage } from '../services/equipmentScanService.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

const router = express.Router();

// Shared validation constants (DRY)
const VALID_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx', 'other'
];
const VALID_RESISTANCE_TYPES = [
  'bodyweight', 'dumbbell', 'barbell', 'cable', 'band', 'machine', 'kettlebell', 'other'
];
const VALID_LOCATION_TYPES = ['gym', 'park', 'home', 'client_home', 'custom'];
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

// Multer for equipment photo upload (memory storage, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: jpg, png, webp`));
    }
  },
});

// All routes require authentication + trainer/admin role
router.use(protect, authorize('admin', 'trainer'));

// Rate limit tracking for AI scans (in-memory, per-trainer)
const scanRateMap = new Map();
const SCAN_LIMIT = 10;
const SCAN_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkScanRate(trainerId) {
  const now = Date.now();
  const entry = scanRateMap.get(trainerId);

  // Clean up expired entries when map grows large
  if (scanRateMap.size > 100) {
    for (const [id, data] of scanRateMap.entries()) {
      if (now - data.windowStart > SCAN_WINDOW_MS * 2) {
        scanRateMap.delete(id);
      }
    }
  }

  if (!entry || now - entry.windowStart > SCAN_WINDOW_MS) {
    scanRateMap.set(trainerId, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= SCAN_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * Check profile ownership. Returns the profile or sends 403/404.
 */
async function getOwnedProfile(req, res) {
  const profileId = parseInt(req.params.id, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ success: false, error: 'Invalid profile ID' });
    return null;
  }
  const EquipmentProfile = getEquipmentProfile();
  const profile = await EquipmentProfile.findByPk(profileId);
  if (!profile) {
    res.status(404).json({ success: false, error: 'Profile not found' });
    return null;
  }
  if (profile.trainerId !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Access denied' });
    return null;
  }
  return profile;
}

/**
 * Check item ownership via profile. Returns the item or sends error.
 */
async function getOwnedItem(req, res) {
  const profile = await getOwnedProfile(req, res);
  if (!profile) return null;
  const itemId = parseInt(req.params.itemId, 10);
  if (isNaN(itemId)) {
    res.status(400).json({ success: false, error: 'Invalid item ID' });
    return null;
  }
  const EquipmentItem = getEquipmentItem();
  const item = await EquipmentItem.findOne({
    where: { id: itemId, profileId: profile.id },
  });
  if (!item) {
    res.status(404).json({ success: false, error: 'Item not found' });
    return null;
  }
  return { profile, item };
}

// ─── PROFILE ROUTES ──────────────────────────────────────────────────

// GET /api/equipment-profiles — List trainer's profiles
router.get('/', async (req, res) => {
  try {
    const EquipmentProfile = getEquipmentProfile();
    const where = { isActive: true };
    if (req.user.role !== 'admin') {
      where.trainerId = req.user.id;
    } else if (req.query.trainerId) {
      where.trainerId = parseInt(req.query.trainerId, 10);
    }
    if (req.query.locationType) {
      where.locationType = req.query.locationType;
    }
    const profiles = await EquipmentProfile.findAll({
      where,
      order: [['isDefault', 'DESC'], ['name', 'ASC']],
    });
    res.json({ success: true, profiles });
  } catch (err) {
    logger.error('[EquipmentRoutes] List profiles error:', err);
    res.status(500).json({ success: false, error: 'Failed to list profiles' });
  }
});

// GET /api/equipment-profiles/stats — Admin stats
router.get('/stats', async (req, res) => {
  try {
    const EquipmentProfile = getEquipmentProfile();
    const EquipmentItem = getEquipmentItem();

    const profileCount = await EquipmentProfile.count({
      where: req.user.role === 'admin' ? { isActive: true } : { trainerId: req.user.id, isActive: true },
    });

    const itemCount = await EquipmentItem.count({
      where: { isActive: true },
      include: [{
        model: EquipmentProfile,
        as: 'profile',
        where: req.user.role === 'admin' ? { isActive: true } : { trainerId: req.user.id, isActive: true },
        attributes: [],
      }],
    });

    const pendingApprovals = await EquipmentItem.count({
      where: { approvalStatus: 'pending', isActive: true },
      include: [{
        model: EquipmentProfile,
        as: 'profile',
        where: req.user.role === 'admin' ? { isActive: true } : { trainerId: req.user.id, isActive: true },
        attributes: [],
      }],
    });

    res.json({
      success: true,
      stats: { profileCount, itemCount, pendingApprovals },
    });
  } catch (err) {
    logger.error('[EquipmentRoutes] Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// POST /api/equipment-profiles — Create profile
router.post('/', async (req, res) => {
  try {
    const { name, locationType, description, address } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Profile name is required' });
    }
    if (name.length > 100) {
      return res.status(400).json({ success: false, error: 'Profile name must be 100 characters or less' });
    }

    const EquipmentProfile = getEquipmentProfile();

    // Check for duplicate name
    const existing = await EquipmentProfile.findOne({
      where: { trainerId: req.user.id, name: name.trim() },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A profile with this name already exists' });
    }

    const profile = await EquipmentProfile.create({
      trainerId: req.user.id,
      name: name.trim(),
      locationType: VALID_LOCATION_TYPES.includes(locationType) ? locationType : 'custom',
      description: description?.slice(0, 1000) || null,
      address: address?.slice(0, 255) || null,
      isDefault: false,
      isActive: true,
    });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    logger.error('[EquipmentRoutes] Create profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to create profile' });
  }
});

// GET /api/equipment-profiles/:id — Get profile with items
router.get('/:id', async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    const EquipmentItem = getEquipmentItem();
    const items = await EquipmentItem.findAll({
      where: { profileId: profile.id, isActive: true },
      order: [['name', 'ASC']],
    });

    res.json({ success: true, profile, items });
  } catch (err) {
    logger.error('[EquipmentRoutes] Get profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// PUT /api/equipment-profiles/:id — Update profile
router.put('/:id', async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    const { name, locationType, description, address } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Profile name cannot be empty' });
      }
      updates.name = name.trim().slice(0, 100);
    }
    if (locationType !== undefined && VALID_LOCATION_TYPES.includes(locationType)) {
      updates.locationType = locationType;
    }
    if (description !== undefined) updates.description = description?.slice(0, 1000) || null;
    if (address !== undefined) updates.address = address?.slice(0, 255) || null;

    await profile.update(updates);
    res.json({ success: true, profile });
  } catch (err) {
    logger.error('[EquipmentRoutes] Update profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// DELETE /api/equipment-profiles/:id — Soft-delete profile
router.delete('/:id', async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    if (profile.isDefault) {
      return res.status(403).json({ success: false, error: 'Cannot delete default profiles' });
    }

    await profile.update({ isActive: false });
    res.json({ success: true, message: 'Profile archived' });
  } catch (err) {
    logger.error('[EquipmentRoutes] Delete profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to archive profile' });
  }
});

// ─── ITEM ROUTES ─────────────────────────────────────────────────────

// GET /api/equipment-profiles/:id/items — List items in profile
router.get('/:id/items', async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    const EquipmentItem = getEquipmentItem();
    const where = { profileId: profile.id, isActive: true };
    if (req.query.category) where.category = req.query.category;
    if (req.query.approvalStatus) where.approvalStatus = req.query.approvalStatus;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const { rows: items, count } = await EquipmentItem.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      items,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    logger.error('[EquipmentRoutes] List items error:', err);
    res.status(500).json({ success: false, error: 'Failed to list items' });
  }
});

// POST /api/equipment-profiles/:id/items — Add item manually
router.post('/:id/items', async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    const { name, category, resistanceType, description, quantity } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Equipment name is required' });
    }

    const EquipmentItem = getEquipmentItem();

    // Check duplicate within profile
    const existing = await EquipmentItem.findOne({
      where: { profileId: profile.id, name: name.trim() },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Equipment with this name already exists in this profile' });
    }

    const item = await EquipmentItem.create({
      profileId: profile.id,
      name: name.trim().slice(0, 150),
      category: VALID_CATEGORIES.includes(category) ? category : 'other',
      resistanceType: VALID_RESISTANCE_TYPES.includes(resistanceType) ? resistanceType : null,
      description: description?.slice(0, 500) || null,
      approvalStatus: 'manual',
      isActive: true,
      quantity: Math.max(1, parseInt(quantity, 10) || 1),
    });

    // Update cached count
    const EquipmentProfile = getEquipmentProfile();
    const count = await EquipmentItem.count({ where: { profileId: profile.id, isActive: true } });
    await profile.update({ equipmentCount: count });

    res.status(201).json({ success: true, item });
  } catch (err) {
    logger.error('[EquipmentRoutes] Add item error:', err);
    res.status(500).json({ success: false, error: 'Failed to add item' });
  }
});

// PUT /api/equipment-profiles/:id/items/:itemId — Update item
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;
    const { item } = result;

    const { name, trainerLabel, category, resistanceType, description, quantity } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim().slice(0, 150);
    if (trainerLabel !== undefined) updates.trainerLabel = trainerLabel?.trim().slice(0, 150) || null;
    if (description !== undefined) updates.description = description?.slice(0, 500) || null;
    if (quantity !== undefined) updates.quantity = Math.max(1, parseInt(quantity, 10) || 1);

    if (category !== undefined && VALID_CATEGORIES.includes(category)) {
      updates.category = category;
    }
    if (resistanceType !== undefined && VALID_RESISTANCE_TYPES.includes(resistanceType)) {
      updates.resistanceType = resistanceType;
    }

    await item.update(updates);
    res.json({ success: true, item });
  } catch (err) {
    logger.error('[EquipmentRoutes] Update item error:', err);
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
});

// DELETE /api/equipment-profiles/:id/items/:itemId — Soft-delete item
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;
    const { profile, item } = result;

    await item.update({ isActive: false });

    // Update cached count
    const EquipmentItem = getEquipmentItem();
    const count = await EquipmentItem.count({ where: { profileId: profile.id, isActive: true } });
    await profile.update({ equipmentCount: count });

    res.json({ success: true, message: 'Item archived' });
  } catch (err) {
    logger.error('[EquipmentRoutes] Delete item error:', err);
    res.status(500).json({ success: false, error: 'Failed to archive item' });
  }
});

// ─── AI SCAN ROUTES ──────────────────────────────────────────────────

// POST /api/equipment-profiles/:id/scan — Upload photo + AI scan
router.post('/:id/scan', upload.single('photo'), async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Photo is required' });
    }

    // Rate limit: 10 scans/hour per trainer
    if (!checkScanRate(req.user.id)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Maximum 10 scans per hour.',
      });
    }

    const scanResult = await scanEquipmentImage(req.file.buffer, req.file.mimetype);

    // Create pending equipment item with AI scan data
    const EquipmentItem = getEquipmentItem();
    const item = await EquipmentItem.create({
      profileId: profile.id,
      name: scanResult.suggestedName,
      category: scanResult.suggestedCategory,
      resistanceType: scanResult.resistanceType,
      description: scanResult.description,
      aiScanData: {
        confidence: scanResult.confidence,
        boundingBox: scanResult.boundingBox,
        suggestedName: scanResult.suggestedName,
        suggestedCategory: scanResult.suggestedCategory,
        suggestedExercises: scanResult.suggestedExercises,
        rawResponse: scanResult.rawResponse,
        latencyMs: scanResult.latencyMs,
        model: scanResult.model,
        scannedAt: new Date().toISOString(),
      },
      approvalStatus: 'pending',
      isActive: true,
    });

    // Auto-create exercise mappings from AI suggestions (unconfirmed)
    if (scanResult.suggestedExercises?.length > 0) {
      const EquipmentExerciseMap = getEquipmentExerciseMap();
      const mappings = scanResult.suggestedExercises.map(exercise => ({
        equipmentItemId: item.id,
        exerciseKey: exercise.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        exerciseName: exercise,
        isCustomExercise: false,
        isPrimary: false,
        isAiSuggested: true,
        confirmed: false,
      }));
      await EquipmentExerciseMap.bulkCreate(mappings, { ignoreDuplicates: true });
    }

    res.status(201).json({
      success: true,
      item,
      scanResult: {
        confidence: scanResult.confidence,
        suggestedName: scanResult.suggestedName,
        suggestedCategory: scanResult.suggestedCategory,
        suggestedExercises: scanResult.suggestedExercises,
        boundingBox: scanResult.boundingBox,
      },
    });
  } catch (err) {
    logger.error('[EquipmentRoutes] Scan error:', err);
    const message = err.message?.includes('GOOGLE_API_KEY')
      ? 'AI scanning is not configured'
      : 'Equipment scan failed';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/equipment-profiles/:id/items/:itemId/approve — Approve AI scan
router.put('/:id/items/:itemId/approve', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;
    const { profile, item } = result;

    if (item.approvalStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Item is not pending approval' });
    }

    // Allow trainer to override name/category during approval
    const { name, trainerLabel, category, resistanceType } = req.body;
    const updates = {
      approvalStatus: 'approved',
      approvedAt: new Date(),
    };
    if (name) updates.name = name.trim().slice(0, 150);
    if (trainerLabel) updates.trainerLabel = trainerLabel.trim().slice(0, 150);

    if (category && VALID_CATEGORIES.includes(category)) updates.category = category;
    if (resistanceType && VALID_RESISTANCE_TYPES.includes(resistanceType)) updates.resistanceType = resistanceType;

    await item.update(updates);

    // Update cached count
    const EquipmentItem = getEquipmentItem();
    const count = await EquipmentItem.count({ where: { profileId: profile.id, isActive: true } });
    await profile.update({ equipmentCount: count });

    res.json({ success: true, item });
  } catch (err) {
    logger.error('[EquipmentRoutes] Approve error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve item' });
  }
});

// PUT /api/equipment-profiles/:id/items/:itemId/reject — Reject AI scan
router.put('/:id/items/:itemId/reject', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;
    const { item } = result;

    if (item.approvalStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Item is not pending approval' });
    }

    await item.update({ approvalStatus: 'rejected', isActive: false });

    // Clean up AI-suggested exercise mappings
    const EquipmentExerciseMap = getEquipmentExerciseMap();
    await EquipmentExerciseMap.destroy({
      where: { equipmentItemId: item.id, isAiSuggested: true, confirmed: false },
    });

    res.json({ success: true, message: 'Scan rejected and item archived' });
  } catch (err) {
    logger.error('[EquipmentRoutes] Reject error:', err);
    res.status(500).json({ success: false, error: 'Failed to reject item' });
  }
});

// ─── EXERCISE MAPPING ROUTES ─────────────────────────────────────────

// GET /api/equipment-profiles/:id/items/:itemId/exercises — List mappings
router.get('/:id/items/:itemId/exercises', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;

    const EquipmentExerciseMap = getEquipmentExerciseMap();
    const mappings = await EquipmentExerciseMap.findAll({
      where: { equipmentItemId: result.item.id },
      order: [['exerciseName', 'ASC']],
    });

    res.json({ success: true, mappings });
  } catch (err) {
    logger.error('[EquipmentRoutes] List mappings error:', err);
    res.status(500).json({ success: false, error: 'Failed to list mappings' });
  }
});

// POST /api/equipment-profiles/:id/items/:itemId/exercises — Add mapping
router.post('/:id/items/:itemId/exercises', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;

    const { exerciseKey, exerciseName, isCustomExercise, customExerciseId, isPrimary } = req.body;
    if (!exerciseKey || !exerciseName) {
      return res.status(400).json({ success: false, error: 'exerciseKey and exerciseName are required' });
    }

    const EquipmentExerciseMap = getEquipmentExerciseMap();

    // Check duplicate
    const existing = await EquipmentExerciseMap.findOne({
      where: { equipmentItemId: result.item.id, exerciseKey },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'This exercise mapping already exists' });
    }

    const mapping = await EquipmentExerciseMap.create({
      equipmentItemId: result.item.id,
      exerciseKey: exerciseKey.slice(0, 100),
      exerciseName: exerciseName.slice(0, 150),
      isCustomExercise: !!isCustomExercise,
      customExerciseId: isCustomExercise ? customExerciseId : null,
      isPrimary: !!isPrimary,
      isAiSuggested: false,
      confirmed: true,
    });

    res.status(201).json({ success: true, mapping });
  } catch (err) {
    logger.error('[EquipmentRoutes] Add mapping error:', err);
    res.status(500).json({ success: false, error: 'Failed to add mapping' });
  }
});

// DELETE /api/equipment-profiles/:id/items/:itemId/exercises/:mapId — Remove mapping
router.delete('/:id/items/:itemId/exercises/:mapId', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;

    const EquipmentExerciseMap = getEquipmentExerciseMap();
    const mapping = await EquipmentExerciseMap.findOne({
      where: { id: req.params.mapId, equipmentItemId: result.item.id },
    });
    if (!mapping) {
      return res.status(404).json({ success: false, error: 'Mapping not found' });
    }

    await mapping.destroy();
    res.json({ success: true, message: 'Mapping removed' });
  } catch (err) {
    logger.error('[EquipmentRoutes] Remove mapping error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove mapping' });
  }
});

// PUT /api/equipment-profiles/:id/items/:itemId/exercises/:mapId/confirm — Confirm AI mapping
router.put('/:id/items/:itemId/exercises/:mapId/confirm', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;

    const EquipmentExerciseMap = getEquipmentExerciseMap();
    const mapping = await EquipmentExerciseMap.findOne({
      where: { id: req.params.mapId, equipmentItemId: result.item.id },
    });
    if (!mapping) {
      return res.status(404).json({ success: false, error: 'Mapping not found' });
    }

    await mapping.update({ confirmed: true });
    res.json({ success: true, mapping });
  } catch (err) {
    logger.error('[EquipmentRoutes] Confirm mapping error:', err);
    res.status(500).json({ success: false, error: 'Failed to confirm mapping' });
  }
});

export default router;
