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
 *   POST   /api/equipment-profiles/:id/scan-sessions/:sessionId/candidates/:candidateIndex/rescan  Crop re-scan of a `possible` candidate
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
import {
  getEquipmentProfile,
  getEquipmentItem,
  getEquipmentExerciseMap,
  getEquipmentScanSession,
  getEquipmentScanCandidate,
} from '../models/index.mjs';
import sequelize from '../database.mjs';
import { isEquipmentScanConfigured, scanEquipmentImageMulti } from '../services/equipmentScanService.mjs';
import { matchExistingEquipment } from '../services/equipmentScanV2Support.mjs';
import { persistEquipmentScanReviewSession } from '../services/equipmentScanReviewPersistence.mjs';
import { rescanEquipmentRegion } from '../services/equipmentScanCropRescan.mjs';
import {
  recordEquipmentScanCandidateAction,
  recordEquipmentScanCandidateReview,
} from '../services/equipmentScanReviewOutcomeService.mjs';
import { uploadPhoto } from '../services/photoStorageService.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

const router = express.Router();

// Shared validation constants (DRY)
/**
 * Escape LIKE wildcards so an Op.iLike duplicate pre-check is an exact
 * case-insensitive match, never a pattern match ("100% Band" must not match
 * "100x Band"). Postgres default escape char is backslash.
 */
function escapeLikeLiteral(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

const VALID_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  // 4B.1 completion (P0.3e): lacrosse_ball is in the MODEL validate list but
  // was missing here — manual add/update silently coerced it to 'other'.
  'lacrosse_ball',
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
router.use(protect, authorize(['admin', 'trainer']));

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

// Default equipment profiles auto-created for new trainers on first fetch
const DEFAULT_PROFILES = [
  { name: 'Move Fitness', locationType: 'gym', description: 'Primary gym location with full equipment', isDefault: true },
  { name: 'Park / Outdoor', locationType: 'park', description: 'Outdoor training with bodyweight and portable equipment', isDefault: true },
  { name: 'Home Gym', locationType: 'home', description: 'Home training setup with basic equipment', isDefault: true },
  { name: 'Client Home', locationType: 'client_home', description: 'Client home training with minimal equipment', isDefault: true },
];

// GET /api/equipment-profiles — List trainer's profiles
router.get('/', async (req, res) => {
  try {
    const EquipmentProfile = getEquipmentProfile();
    const where = { isActive: true };
    const trainerId = req.user.role !== 'admin'
      ? req.user.id
      : req.query.trainerId ? parseInt(req.query.trainerId, 10) : null;

    if (trainerId) {
      where.trainerId = trainerId;
    }
    if (req.query.locationType) {
      where.locationType = req.query.locationType;
    }

    let profiles = await EquipmentProfile.findAll({
      where,
      order: [['isDefault', 'DESC'], ['name', 'ASC']],
    });

    // Auto-create default profiles for trainers/admins on first fetch.
    // Guard on the trainer's UNFILTERED profile count: `profiles` was queried
    // with request filters (e.g. ?locationType=custom), so an empty filtered
    // result must not re-seed defaults for a trainer who already owns
    // (possibly renamed or archived) profiles.
    if (profiles.length === 0 && trainerId
        && (await EquipmentProfile.count({ where: { trainerId } })) === 0) {
      try {
        const defaults = DEFAULT_PROFILES.map(d => ({ ...d, trainerId }));
        await EquipmentProfile.bulkCreate(defaults);
        profiles = await EquipmentProfile.findAll({
          where,
          order: [['isDefault', 'DESC'], ['name', 'ASC']],
        });
        logger.info('[EquipmentRoutes] Auto-created default profiles for trainer', { trainerId });
      } catch (seedErr) {
        logger.warn('[EquipmentRoutes] Auto-seed failed (non-blocking)', { trainerId, error: seedErr.message });
      }
    }

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

    // P0.3e input hardening: both fields feed .slice — non-string must be a
    // 400, not a TypeError 500.
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'description must be a string or null' });
    }
    if (address !== undefined && address !== null && typeof address !== 'string') {
      return res.status(400).json({ success: false, error: 'address must be a string or null' });
    }

    const EquipmentProfile = getEquipmentProfile();

    // Check for duplicate name — ACTIVE profiles only (archived names must be
    // re-creatable), CASE-INSENSITIVE to match the partial lower(name) index.
    // (Name length is already validated ≤100 above, matching STRING(100).)
    const existing = await EquipmentProfile.findOne({
      where: { trainerId: req.user.id, name: { [Op.iLike]: escapeLikeLiteral(name.trim()) }, isActive: true },
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
    // Race backstop: the partial unique index rejects a concurrent duplicate.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'A profile with this name already exists' });
    }
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
    // P0.3c input hardening: both fields feed .slice — non-string must be a
    // 400, not a TypeError 500.
    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return res.status(400).json({ success: false, error: 'description must be a string or null' });
      }
      updates.description = description?.slice(0, 1000) || null;
    }
    if (address !== undefined) {
      if (address !== null && typeof address !== 'string') {
        return res.status(400).json({ success: false, error: 'address must be a string or null' });
      }
      updates.address = address?.slice(0, 255) || null;
    }

    // Rename duplicate pre-check — ACTIVE siblings only, CASE-INSENSITIVE,
    // matching the partial lower(name) index (P0.3e). Self-rename exempt.
    if (updates.name && updates.name !== profile.name) {
      const EquipmentProfile = getEquipmentProfile();
      const duplicate = await EquipmentProfile.findOne({
        where: { trainerId: profile.trainerId, name: { [Op.iLike]: escapeLikeLiteral(updates.name) }, isActive: true, id: { [Op.ne]: profile.id } },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, error: 'A profile with this name already exists' });
      }
    }

    await profile.update(updates);
    res.json({ success: true, profile });
  } catch (err) {
    // Race backstop: the partial unique index rejects a concurrent duplicate.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'A profile with this name already exists' });
    }
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
    // P0.3c input hardening: description feeds .slice — non-string must be a
    // 400, not a TypeError 500.
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'description must be a string or null' });
    }

    const EquipmentItem = getEquipmentItem();

    // Check duplicate within profile — ACTIVE rows only, CASE-INSENSITIVE to
    // match the scan dedup + the lower(name) partial unique index (P0.3d).
    // Pre-check the TRUNCATED stored form: a >150-char name is persisted as
    // its slice, so checking the raw string would miss the stored duplicate
    // and fall through to the index race path on every re-add.
    const storedItemName = name.trim().slice(0, 150);
    const existing = await EquipmentItem.findOne({
      where: { profileId: profile.id, name: { [Op.iLike]: escapeLikeLiteral(storedItemName) }, isActive: true },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Equipment with this name already exists in this profile' });
    }

    const item = await EquipmentItem.create({
      profileId: profile.id,
      name: storedItemName,
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
    // Race backstop: concurrent add can beat the pre-check; the partial unique
    // index rejects it — surface as a duplicate, not a server error (P0.3b).
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Equipment with this name already exists in this profile' });
    }
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
    // P0.3c input hardening: these fields feed string methods — non-string or
    // empty name must be a 400, not a TypeError 500 / silent empty-name write.
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Equipment name must be a non-empty string' });
      }
      updates.name = name.trim().slice(0, 150);
    }
    if (trainerLabel !== undefined) {
      if (trainerLabel !== null && typeof trainerLabel !== 'string') {
        return res.status(400).json({ success: false, error: 'trainerLabel must be a string or null' });
      }
      updates.trainerLabel = trainerLabel?.trim().slice(0, 150) || null;
    }
    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return res.status(400).json({ success: false, error: 'description must be a string or null' });
      }
      updates.description = description?.slice(0, 500) || null;
    }
    if (quantity !== undefined) updates.quantity = Math.max(1, parseInt(quantity, 10) || 1);

    if (category !== undefined && VALID_CATEGORIES.includes(category)) {
      updates.category = category;
    }
    if (resistanceType !== undefined && VALID_RESISTANCE_TYPES.includes(resistanceType)) {
      updates.resistanceType = resistanceType;
    }

    // Rename duplicate pre-check — ACTIVE siblings only, CASE-INSENSITIVE to
    // match the lower(name) partial unique index (P0.3b/P0.3d). Same-name
    // renames skip the lookup; case-only self-renames pass via the Op.ne guard.
    if (updates.name && updates.name !== item.name) {
      const EquipmentItem = getEquipmentItem();
      const duplicate = await EquipmentItem.findOne({
        where: { profileId: item.profileId, name: { [Op.iLike]: escapeLikeLiteral(updates.name) }, isActive: true, id: { [Op.ne]: item.id } },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, error: 'Equipment with this name already exists in this profile' });
      }
    }

    await item.update(updates);
    res.json({ success: true, item });
  } catch (err) {
    // Race backstop: a concurrent write can beat the pre-check; the partial
    // unique index rejects it — surface as a duplicate, not a server error.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Equipment with this name already exists in this profile' });
    }
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

    // Graceful check: is AI scanning configured? (before rate limiter to avoid burning quota)
    if (!isEquipmentScanConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI scanning is not configured. Please add equipment manually or contact admin.',
        configurable: true,
      });
    }

    // Rate limit: 10 scans/hour per trainer
    if (!checkScanRate(req.user.id)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Maximum 10 scans per hour.',
      });
    }

    const scanSession = await scanEquipmentImageMulti(req.file.buffer, req.file.mimetype);

    // Save the photo to R2/local storage before creating pending review items.
    let photoUrl = null;
    try {
      const photoUpload = await uploadPhoto(req.file.buffer, {
        userId: req.user.id,
        category: 'equipment',
        originalFilename: req.file.originalname || `scan-${Date.now()}.jpg`,
        contentType: req.file.mimetype,
      });
      photoUrl = photoUpload.url;
    } catch (uploadErr) {
      logger.warn('[EquipmentRoutes] Photo upload failed (non-fatal):', uploadErr.message);
    }

    const EquipmentItem = getEquipmentItem();
    const EquipmentExerciseMap = getEquipmentExerciseMap();
    const existingItems = await EquipmentItem.findAll({
      where: { profileId: profile.id, isActive: true },
    });
    const createdItems = [];
    const createdCandidates = [];
    const createdCandidateRecords = [];
    const duplicateCandidates = [];
    const baseReviewItems = Array.isArray(scanSession.items)
      ? scanSession.items.map((candidate, index) => ({ ...candidate, candidateIndex: index }))
      : [];
    const possibleCandidates = (Array.isArray(scanSession.possibleItems) ? scanSession.possibleItems : []).map((candidate, index) => ({
      ...candidate,
      status: 'possible',
      candidateIndex: baseReviewItems.length + index,
    }));
    const reviewCandidates = [...baseReviewItems, ...possibleCandidates];
    const scannedAt = new Date().toISOString();

    // P0.2: item + exercise-mapping writes commit atomically in one transaction,
    // so a partial failure rolls everything back and inventory can't be left
    // half-populated. The best-effort review ledger (persistEquipmentScanReviewSession)
    // stays OUTSIDE this tx below — it never throws and needs the committed item IDs.
    await sequelize.transaction(async (t) => {
    for (const [candidateIndex, candidate] of scanSession.items.entries()) {
      const duplicateMatch = matchExistingEquipment(candidate, existingItems);
      if (duplicateMatch) {
        duplicateCandidates.push({ ...candidate, ...duplicateMatch, status: 'duplicate', candidateIndex });
        continue;
      }

      // In-memory matching can miss a stored duplicate (trainerLabel shadows
      // the raw name at match time; AI category drift defeats the
      // name+category rule) while the lower(name) partial unique index still
      // rejects the insert — aborting the WHOLE scan transaction into a 500
      // and discarding every other detected item. Pre-check the index's own
      // semantics (case-insensitive stored name) before creating.
      const storedNameDuplicate = await EquipmentItem.findOne({
        where: {
          profileId: profile.id,
          name: { [Op.iLike]: escapeLikeLiteral(candidate.suggestedName) },
          isActive: true,
        },
        transaction: t,
      });
      if (storedNameDuplicate) {
        duplicateCandidates.push({
          ...candidate,
          duplicateOfItemId: storedNameDuplicate.id,
          matchType: 'stored_name',
          status: 'duplicate',
          candidateIndex,
        });
        continue;
      }

      const item = await EquipmentItem.create({
        profileId: profile.id,
        photoUrl,
        name: candidate.suggestedName,
        category: candidate.suggestedCategory,
        resistanceType: candidate.resistanceType,
        description: candidate.description,
        quantity: candidate.quantity,
        aiScanData: {
          schemaVersion: scanSession.schemaVersion,
          promptVersion: scanSession.promptVersion,
          imageQuality: scanSession.imageQuality,
          sceneSummary: scanSession.sceneSummary,
          confidence: candidate.confidence,
          visibility: candidate.visibility,
          boundingBox: candidate.boundingBox,
          suggestedName: candidate.suggestedName,
          suggestedCategory: candidate.suggestedCategory,
          equipmentKind: candidate.equipmentKind,
          quantity: candidate.quantity,
          alternateNames: candidate.alternateNames,
          suggestedExercises: candidate.suggestedExercises,
          movementPatterns: candidate.movementPatterns,
          targetMuscles: candidate.targetMuscles,
          safetyNotes: candidate.safetyNotes,
          dedupeKey: candidate.dedupeKey,
          needsHumanReview: candidate.needsHumanReview,
          reasoning: candidate.reasoning,
          candidateIndex,
          rawResponse: scanSession.rawResponse,
          latencyMs: scanSession.latencyMs,
          model: scanSession.model,
          scannedAt,
        },
        approvalStatus: 'pending',
        isActive: true,
      }, { transaction: t });
      createdItems.push(item);
      createdCandidates.push(candidate);
      createdCandidateRecords.push({ candidateIndex, candidate, itemId: item.id });
      existingItems.push(item);

      if (candidate.suggestedExercises?.length > 0) {
        const mappings = candidate.suggestedExercises.map(exercise => ({
          equipmentItemId: item.id,
          exerciseKey: exercise.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          exerciseName: exercise,
          isCustomExercise: false,
          isPrimary: false,
          isAiSuggested: true,
          confirmed: false,
        }));
        await EquipmentExerciseMap.bulkCreate(mappings, { ignoreDuplicates: true, transaction: t });
      }
    }
    });

    const persistedReview = await persistEquipmentScanReviewSession({
      profile,
      trainerId: req.user.id,
      photoUrl,
      scanSession: {
        ...scanSession,
        possibleItems: possibleCandidates,
        candidates: reviewCandidates,
      },
      createdCandidateRecords,
      duplicateCandidates,
    });
    const scanSessionResponse = {
      schemaVersion: scanSession.schemaVersion,
      promptVersion: scanSession.promptVersion,
      imageQuality: scanSession.imageQuality,
      sceneSummary: scanSession.sceneSummary,
      itemCount: createdItems.length,
      candidateCount: reviewCandidates.length,
      possibleItemCount: possibleCandidates.length,
      duplicateCount: duplicateCandidates.length,
      photoUrl,
      latencyMs: scanSession.latencyMs,
      model: scanSession.model,
      reviewSessionId: persistedReview?.sessionId,
      candidateRecordCount: persistedReview?.candidateRecordCount,
    };
    const item = createdItems[0] || null;
    if (!item) {
      const duplicateOnly = duplicateCandidates.length > 0;
      return res.status(duplicateOnly ? 409 : 422).json({
        success: false,
        error: duplicateOnly
          ? 'Detected equipment already exists in this profile. Review duplicate suggestions before adding more.'
          : 'AI could not identify the equipment. Try a clearer photo.',
        candidates: reviewCandidates,
        possibleItems: possibleCandidates,
        duplicates: duplicateCandidates,
        scanSession: scanSessionResponse,
      });
    }

    const scanResult = createdCandidates[0] || scanSession.scanResult;
    const scanResultResponse = {
      confidence: scanResult.confidence,
      suggestedName: scanResult.suggestedName,
      suggestedCategory: scanResult.suggestedCategory,
      suggestedExercises: scanResult.suggestedExercises,
      boundingBox: scanResult.boundingBox,
    };

    res.status(201).json({
      success: true,
      item,
      items: createdItems,
      candidates: reviewCandidates,
      possibleItems: possibleCandidates,
      duplicates: duplicateCandidates,
      scanSession: scanSessionResponse,

      scanResult: scanResultResponse,
    });
  } catch (err) {
    logger.error('[EquipmentRoutes] Scan error:', err);
    // Cross-request race backstop: another request inserted the same
    // lower(name) between our pre-check and create. The transaction rolled
    // back — tell the trainer it's a duplicate, not a server failure.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'A scanned item duplicates equipment that was just added. Re-run the scan to pick up the current inventory.',
      });
    }
    // Two concurrent scans inserting overlapping names in opposite order can
    // deadlock on the unique index (PG 40P01). The tx rolled back cleanly —
    // it's a retry situation, not a server failure.
    if (err?.original?.code === '40P01' || err?.parent?.code === '40P01') {
      return res.status(409).json({
        success: false,
        error: 'Another scan on this profile finished at the same moment. Re-run the scan.',
      });
    }
    const msg = err.message || 'Equipment scan failed';
    // Map service errors to appropriate HTTP status codes
    if (msg.includes('GOOGLE_API_KEY') || msg.includes('GEMINI_API_KEY') || msg.includes('not configured') || msg.includes('SDK not installed')) {
      return res.status(503).json({ success: false, error: 'AI scanning is not available. Please add equipment manually.' });
    }
    if (msg.includes('Invalid image type') || msg.includes('Image too large')) {
      return res.status(400).json({ success: false, error: msg });
    }
    if (msg.includes('invalid JSON') || msg.includes('could not identify')) {
      return res.status(422).json({ success: false, error: 'AI could not identify the equipment. Try a clearer photo.' });
    }
    if (msg.includes('[GoogleGenerativeAI Error]') || msg.includes('Gemini') || msg.includes('generateContent')) {
      return res.status(502).json({ success: false, error: 'AI scanner is temporarily unavailable. Try again or add manually.' });
    }
    res.status(500).json({ success: false, error: 'Equipment scan failed. Try again or add manually.' });
  }
});

// PUT /api/equipment-profiles/:id/scan-candidates/:candidateIndex/review - Mark possible/duplicate candidate outcomes
router.put('/:id/scan-candidates/:candidateIndex/review', async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    const candidateIndex = Number(req.params.candidateIndex);
    const {
      reviewSessionId,
      candidateStatus,
      outcome,
      status,
      equipmentItemId,
      duplicateOfItemId,
      trainerCorrection,
    } = req.body || {};

    const result = await recordEquipmentScanCandidateAction({
      profileId: profile.id,
      reviewSessionId,
      candidateIndex,
      candidateStatus,
      reviewedBy: req.user.id,
      status: outcome || status,
      equipmentItemId,
      duplicateOfItemId,
      trainerCorrection: trainerCorrection || {},
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Scan candidate review row was not found' });
    }

    res.json({ success: true, review: result });
  } catch (err) {
    logger.error('[EquipmentRoutes] Scan candidate review error:', err);
    res.status(500).json({ success: false, error: 'Failed to record scan candidate review' });
  }
});
// POST /api/equipment-profiles/:id/scan-sessions/:sessionId/candidates/:candidateIndex/rescan
// "Scan this spot closer" — crop re-scan of a `possible` candidate's region.
// The trainer re-uploads the ORIGINAL photo as multipart `photo`; the server
// NEVER fetches remote URLs (SSRF forbidden). Counts against the same 10/hr
// scan rate limiter as /scan.
router.post('/:id/scan-sessions/:sessionId/candidates/:candidateIndex/rescan', upload.single('photo'), async (req, res) => {
  try {
    const profile = await getOwnedProfile(req, res);
    if (!profile) return;

    const sessionId = parseInt(req.params.sessionId, 10);
    const candidateIndex = parseInt(req.params.candidateIndex, 10);
    if (isNaN(sessionId) || isNaN(candidateIndex) || candidateIndex < 0) {
      return res.status(400).json({ success: false, error: 'Invalid session or candidate reference' });
    }

    if (!req.file) {
      return res.status(422).json({
        success: false,
        error: 'Original scan photo is required — attach it as the multipart "photo" field. Remote URLs are not fetched.',
      });
    }

    // Graceful check before burning rate-limit quota (same as /scan).
    if (!isEquipmentScanConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI scanning is not configured. Please add equipment manually or contact admin.',
        configurable: true,
      });
    }

    const EquipmentScanSession = getEquipmentScanSession();
    const EquipmentScanCandidate = getEquipmentScanCandidate();
    const session = await EquipmentScanSession.findOne({
      where: { id: sessionId, profileId: profile.id },
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Scan session not found' });
    }

    const candidate = await EquipmentScanCandidate.findOne({
      where: { sessionId: session.id, profileId: profile.id, candidateIndex },
      order: [['createdAt', 'DESC']],
    });
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Scan candidate not found' });
    }

    if (candidate.status !== 'possible') {
      return res.status(409).json({
        success: false,
        error: `Only 'possible' candidates can be re-scanned (current status: ${candidate.status})`,
      });
    }

    // Shares the /scan budget: 10 AI scans per hour per trainer.
    if (!checkScanRate(req.user.id)) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Maximum 10 scans per hour.',
      });
    }

    const rescan = await rescanEquipmentRegion({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      boundingBox: candidate.boundingBox,
    });

    if (rescan.outcome !== 'identified') {
      return res.json({ success: true, outcome: 'still_uncertain', candidate });
    }

    const best = rescan.candidate;
    const EquipmentItem = getEquipmentItem();
    // Same stored-name duplicate guard as /scan (lower(name) partial index semantics).
    const storedNameDuplicate = await EquipmentItem.findOne({
      where: {
        profileId: profile.id,
        name: { [Op.iLike]: escapeLikeLiteral(best.suggestedName) },
        isActive: true,
      },
    });
    if (storedNameDuplicate) {
      return res.status(409).json({
        success: false,
        error: 'Identified equipment already exists in this profile',
        duplicateOfItemId: storedNameDuplicate.id,
        candidate,
      });
    }

    const scannedAt = new Date().toISOString();
    // Same aiScanData field mapping as /scan; photo reuses the session's saved URL.
    const item = await EquipmentItem.create({
      profileId: profile.id,
      photoUrl: session.photoUrl || null,
      name: best.suggestedName,
      category: best.suggestedCategory,
      resistanceType: best.resistanceType,
      description: best.description,
      quantity: best.quantity,
      aiScanData: {
        schemaVersion: rescan.schemaVersion,
        promptVersion: rescan.promptVersion,
        imageQuality: rescan.imageQuality,
        sceneSummary: rescan.sceneSummary,
        confidence: best.confidence,
        visibility: best.visibility,
        boundingBox: best.boundingBox,
        suggestedName: best.suggestedName,
        suggestedCategory: best.suggestedCategory,
        equipmentKind: best.equipmentKind,
        quantity: best.quantity,
        alternateNames: best.alternateNames,
        suggestedExercises: best.suggestedExercises,
        movementPatterns: best.movementPatterns,
        targetMuscles: best.targetMuscles,
        safetyNotes: best.safetyNotes,
        dedupeKey: best.dedupeKey,
        needsHumanReview: best.needsHumanReview,
        reasoning: best.reasoning,
        candidateIndex,
        rawResponse: rescan.rawResponse,
        latencyMs: rescan.latencyMs,
        model: rescan.model,
        scannedAt,
        rescan: {
          sessionId: session.id,
          sourceStatus: 'possible',
          regionBox: rescan.regionBox,
          croppedToRegion: rescan.croppedToRegion,
        },
      },
      approvalStatus: 'pending',
      isActive: true,
    });

    // Census-only re-scans normally carry no exercise suggestions; mirror the
    // /scan mapping when the model returns them anyway.
    if (best.suggestedExercises?.length > 0) {
      const EquipmentExerciseMap = getEquipmentExerciseMap();
      const mappings = best.suggestedExercises.map(exercise => ({
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

    // Flip the ledger candidate possible → approved via the existing
    // best-effort review-outcome service (returns null if the ledger is out).
    const review = await recordEquipmentScanCandidateAction({
      profileId: profile.id,
      reviewSessionId: session.id,
      candidateIndex,
      candidateStatus: 'possible',
      reviewedBy: req.user.id,
      status: 'approved',
      equipmentItemId: item.id,
      trainerCorrection: { name: best.suggestedName, category: best.suggestedCategory },
    });

    res.status(201).json({
      success: true,
      outcome: 'identified',
      item,
      candidate: review || {
        candidateId: candidate.id,
        sessionId: session.id,
        status: candidate.status,
        ledgerUpdated: false,
      },
    });
  } catch (err) {
    logger.error('[EquipmentRoutes] Crop re-scan error:', err);
    // Race backstop: the lower(name) partial unique index rejects a concurrent duplicate.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'Identified equipment duplicates an item that was just added. Refresh the inventory.',
      });
    }
    const msg = err.message || 'Equipment re-scan failed';
    if (msg.includes('GOOGLE_API_KEY') || msg.includes('GEMINI_API_KEY') || msg.includes('not configured') || msg.includes('SDK not installed')) {
      return res.status(503).json({ success: false, error: 'AI scanning is not available. Please add equipment manually.' });
    }
    if (msg.includes('Invalid image type') || msg.includes('Image too large')) {
      return res.status(400).json({ success: false, error: msg });
    }
    if (msg.includes('[GoogleGenerativeAI Error]') || msg.includes('Gemini') || msg.includes('generateContent')) {
      return res.status(502).json({ success: false, error: 'AI scanner is temporarily unavailable. Try again or add manually.' });
    }
    res.status(500).json({ success: false, error: 'Equipment re-scan failed. Try again or add manually.' });
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
    // P0.3e input hardening: overrides feed string methods — non-string → 400.
    if (name !== undefined && name !== null && typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'name must be a string' });
    }
    if (trainerLabel !== undefined && trainerLabel !== null && typeof trainerLabel !== 'string') {
      return res.status(400).json({ success: false, error: 'trainerLabel must be a string' });
    }
    if (name) updates.name = name.trim().slice(0, 150);
    if (trainerLabel) updates.trainerLabel = trainerLabel.trim().slice(0, 150);

    if (category && VALID_CATEGORIES.includes(category)) updates.category = category;
    if (resistanceType && VALID_RESISTANCE_TYPES.includes(resistanceType)) updates.resistanceType = resistanceType;

    // Name override duplicate pre-check — ACTIVE siblings, case-insensitive,
    // matching the partial lower(name) index (P0.3e). Same-name exempt.
    if (updates.name && updates.name !== item.name) {
      const duplicate = await getEquipmentItem().findOne({
        where: { profileId: item.profileId, name: { [Op.iLike]: escapeLikeLiteral(updates.name) }, isActive: true, id: { [Op.ne]: item.id } },
      });
      if (duplicate) {
        return res.status(409).json({ success: false, error: 'Equipment with this name already exists in this profile' });
      }
    }

    await item.update(updates);

    await recordEquipmentScanCandidateReview({
      profileId: profile.id,
      equipmentItemId: item.id,
      reviewedBy: req.user.id,
      status: 'approved',
      trainerCorrection: {
        name: item.name,
        trainerLabel: item.trainerLabel,
        category: item.category,
        resistanceType: item.resistanceType,
      },
    });

    // Update cached count
    const EquipmentItem = getEquipmentItem();
    const count = await EquipmentItem.count({ where: { profileId: profile.id, isActive: true } });
    await profile.update({ equipmentCount: count });

    res.json({ success: true, item });
  } catch (err) {
    // Race backstop: the partial unique index rejects a concurrent duplicate.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Equipment with this name already exists in this profile' });
    }
    logger.error('[EquipmentRoutes] Approve error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve item' });
  }
});

// PUT /api/equipment-profiles/:id/items/:itemId/reject — Reject AI scan
router.put('/:id/items/:itemId/reject', async (req, res) => {
  try {
    const result = await getOwnedItem(req, res);
    if (!result) return;
    const { profile, item } = result;

    if (item.approvalStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Item is not pending approval' });
    }

    await item.update({ approvalStatus: 'rejected', isActive: false });

    await recordEquipmentScanCandidateReview({
      profileId: profile.id,
      equipmentItemId: item.id,
      reviewedBy: req.user.id,
      status: 'rejected',
      trainerCorrection: { rejectionReason: 'trainer_rejected_scan' },
    });

    // Clean up AI-suggested exercise mappings
    const EquipmentExerciseMap = getEquipmentExerciseMap();
    await EquipmentExerciseMap.destroy({
      where: { equipmentItemId: item.id, isAiSuggested: true, confirmed: false },
    });

    // Refresh cached count — reject soft-deletes an active item (P0.3e; the
    // add/delete/approve paths already refresh, reject was the stale one).
    const count = await getEquipmentItem().count({ where: { profileId: profile.id, isActive: true } });
    await profile.update({ equipmentCount: count });

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
    // P0.3e input hardening: both feed .slice — require non-empty strings.
    if (!exerciseKey || typeof exerciseKey !== 'string' || !exerciseName || typeof exerciseName !== 'string') {
      return res.status(400).json({ success: false, error: 'exerciseKey and exerciseName are required strings' });
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

    const mapId = parseInt(req.params.mapId, 10);
    if (isNaN(mapId)) {
      return res.status(400).json({ success: false, error: 'Invalid mapping ID' });
    }
    const EquipmentExerciseMap = getEquipmentExerciseMap();
    const mapping = await EquipmentExerciseMap.findOne({
      where: { id: mapId, equipmentItemId: result.item.id },
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

    const mapId = parseInt(req.params.mapId, 10);
    if (isNaN(mapId)) {
      return res.status(400).json({ success: false, error: 'Invalid mapping ID' });
    }
    const EquipmentExerciseMap = getEquipmentExerciseMap();
    const mapping = await EquipmentExerciseMap.findOne({
      where: { id: mapId, equipmentItemId: result.item.id },
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
