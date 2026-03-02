/**
 * Pain Entry Controller
 * =====================
 * CRUD operations for client pain/injury tracking.
 * Follows NASM CES + Squat University protocols.
 *
 * RBAC: Admin → full access; Trainer → assigned clients; Client → read own.
 */
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

// Allowed body regions (front + back views)
const ALLOWED_BODY_REGIONS = new Set([
  // Front view
  'neck_front', 'chest_left', 'chest_right', 'chest',
  'left_shoulder', 'right_shoulder',
  'left_bicep', 'right_bicep',
  'left_forearm', 'right_forearm',
  'left_elbow', 'right_elbow',
  'upper_abs', 'lower_abs', 'left_oblique', 'right_oblique',
  'left_hip_flexor', 'right_hip_flexor',
  'left_quad', 'right_quad',
  'left_inner_thigh', 'right_inner_thigh',
  'left_shin', 'right_shin',
  'left_knee', 'right_knee',
  'left_ankle_front', 'right_ankle_front',
  // Back view
  'neck_back', 'upper_traps_left', 'upper_traps_right',
  'mid_back_left', 'mid_back_right',
  'left_rear_delt', 'right_rear_delt',
  'lower_back_left', 'lower_back_right', 'lower_back',
  'left_tricep', 'right_tricep',
  'left_glute', 'right_glute',
  'left_hamstring', 'right_hamstring',
  'left_calf', 'right_calf',
  'left_achilles', 'right_achilles',
  // Rotator cuff (specific)
  'left_rotator_cuff', 'right_rotator_cuff',
]);

/**
 * GET /api/pain-entries/:userId
 * Fetches all pain entries (active + resolved) for a client.
 */
export const getClientPainEntries = async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry, User } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    // RBAC check
    if (requester.role === 'client' && requester.id !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Clients can only view their own pain entries' });
    }

    const entries = await ClientPainEntry.findAll({
      where: { userId: Number(userId) },
      order: [['isActive', 'DESC'], ['painLevel', 'DESC'], ['createdAt', 'DESC']],
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });

    return res.json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    logger.error('[PainEntry] Error fetching entries:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pain entries' });
  }
};

/**
 * GET /api/pain-entries/:userId/active
 * Fetches only active (unresolved) pain entries.
 */
export const getActivePainEntries = async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    if (requester.role === 'client' && requester.id !== Number(userId)) {
      return res.status(403).json({ success: false, message: 'Clients can only view their own pain entries' });
    }

    const entries = await ClientPainEntry.findAll({
      where: { userId: Number(userId), isActive: true },
      order: [['painLevel', 'DESC'], ['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    logger.error('[PainEntry] Error fetching active entries:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch active pain entries' });
  }
};

/**
 * POST /api/pain-entries/:userId
 * Creates a new pain entry. Admin/trainer only.
 */
export const createPainEntry = async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    const {
      bodyRegion, side, painLevel, painType, description,
      onsetDate, aggravatingMovements, relievingFactors,
      trainerNotes, aiNotes, posturalSyndrome, assessmentFindings,
    } = req.body;

    // Validate required fields
    if (!bodyRegion) {
      return res.status(400).json({ success: false, message: 'bodyRegion is required' });
    }
    if (!ALLOWED_BODY_REGIONS.has(bodyRegion)) {
      return res.status(400).json({
        success: false,
        message: `Invalid bodyRegion: "${bodyRegion}". Use one of the allowed regions.`,
      });
    }
    if (!painLevel || painLevel < 1 || painLevel > 10) {
      return res.status(400).json({ success: false, message: 'painLevel must be between 1 and 10' });
    }

    const entry = await ClientPainEntry.create({
      userId: Number(userId),
      createdById: requester.id,
      bodyRegion,
      side: side || 'center',
      painLevel: Number(painLevel),
      painType: painType || null,
      description: description || null,
      onsetDate: onsetDate || null,
      aggravatingMovements: aggravatingMovements || null,
      relievingFactors: relievingFactors || null,
      trainerNotes: trainerNotes || null,
      aiNotes: aiNotes || null,
      posturalSyndrome: posturalSyndrome || 'none',
      assessmentFindings: assessmentFindings || null,
      isActive: true,
    });

    logger.info(`[PainEntry] Created entry ${entry.id} for user ${userId} by ${requester.id}`);

    return res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('[PainEntry] Error creating entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to create pain entry' });
  }
};

/**
 * PUT /api/pain-entries/:userId/:entryId
 * Updates an existing pain entry. Admin/trainer only.
 */
export const updatePainEntry = async (req, res) => {
  try {
    const { userId, entryId } = req.params;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    const entry = await ClientPainEntry.findOne({
      where: { id: Number(entryId), userId: Number(userId) },
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Pain entry not found' });
    }

    const allowedFields = [
      'painLevel', 'painType', 'description', 'onsetDate',
      'aggravatingMovements', 'relievingFactors', 'trainerNotes',
      'aiNotes', 'posturalSyndrome', 'assessmentFindings', 'side',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.painLevel && (updates.painLevel < 1 || updates.painLevel > 10)) {
      return res.status(400).json({ success: false, message: 'painLevel must be between 1 and 10' });
    }

    await entry.update(updates);

    logger.info(`[PainEntry] Updated entry ${entryId} for user ${userId}`);

    return res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('[PainEntry] Error updating entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to update pain entry' });
  }
};

/**
 * PUT /api/pain-entries/:userId/:entryId/resolve
 * Marks a pain entry as resolved. Admin/trainer only.
 */
export const resolvePainEntry = async (req, res) => {
  try {
    const { userId, entryId } = req.params;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    const entry = await ClientPainEntry.findOne({
      where: { id: Number(entryId), userId: Number(userId) },
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Pain entry not found' });
    }

    await entry.update({
      isActive: false,
      resolvedAt: new Date(),
    });

    logger.info(`[PainEntry] Resolved entry ${entryId} for user ${userId}`);

    return res.json({
      success: true,
      data: entry,
      message: 'Pain entry marked as resolved',
    });
  } catch (error) {
    logger.error('[PainEntry] Error resolving entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve pain entry' });
  }
};

/**
 * DELETE /api/pain-entries/:userId/:entryId
 * Permanently deletes a pain entry. Admin only.
 */
export const deletePainEntry = async (req, res) => {
  try {
    const { userId, entryId } = req.params;
    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    // Admin-only delete
    if (requester.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete pain entries' });
    }

    const entry = await ClientPainEntry.findOne({
      where: { id: Number(entryId), userId: Number(userId) },
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Pain entry not found' });
    }

    await entry.destroy();

    logger.info(`[PainEntry] Deleted entry ${entryId} for user ${userId} by admin ${requester.id}`);

    return res.json({
      success: true,
      message: 'Pain entry deleted',
    });
  } catch (error) {
    logger.error('[PainEntry] Error deleting entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete pain entry' });
  }
};
