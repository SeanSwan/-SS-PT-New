/**
 * Pain Entry Controller
 * =====================
 * CRUD operations for client pain/injury tracking.
 * Follows NASM CES + Squat University protocols.
 *
 * RBAC: Admin → full access; Trainer → assigned clients; Client → read/write own.
 */
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
// Slice 1 (C11): the region allowlist is single-sourced in the ontology —
// this file and painWriteService previously carried hand-duplicated copies.
import { PAIN_INTAKE_REGION_SET as ALLOWED_BODY_REGIONS } from '../services/training-cortex/ontology/regionMuscleMap.mjs';

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePainLevel = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
};

// Slice 1 (F14): onsetDate is client-reported HISTORY — the future is
// rejected (24h grace absorbs timezone skew). Exclusion windows key on
// createdAt (system trust); trends display onsetDate.
const isFutureDate = (value) => {
  if (!value) return false;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) && parsed > Date.now() + 24 * 60 * 60 * 1000;
};

// Slice 1 (F5): rest pain is a contraindication signal, load pain a
// modification signal — validated here, escalated in clientIntelligence.
const PAIN_CONTEXTS = new Set(['rest', 'daily_activity', 'loaded_movement']);

// Slice 0 (F2): at/above this severity, resolution and severity-reduction are
// trainer decisions. Without this gate a client could resolve their own 8/10
// and silently switch off the fail-closed planning safety gate.
const PAIN_TRAINER_REVIEW_SEVERITY = 7;
const TRAINER_REVIEW_REQUIRED_MESSAGE =
  'This entry is 7/10 or higher, so it gets reviewed together with your trainer. '
  + 'Ask your trainer to confirm the change — they can update or resolve it in seconds.';

const sanitizePainEntryForRequester = (entry, requester) => {
  const data = entry?.toJSON ? entry.toJSON() : { ...entry };
  if (requester?.role !== 'client') {
    return data;
  }

  delete data.trainerNotes;
  delete data.aiNotes;
  delete data.posturalSyndrome;
  delete data.assessmentFindings;
  return data;
};

/**
 * GET /api/pain-entries/:userId
 * Fetches all pain entries (active + resolved) for a client.
 */
export const getClientPainEntries = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry, User } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    // RBAC check
    if (requester.role === 'client' && Number(requester.id) !== userId) {
      return res.status(403).json({ success: false, message: 'Clients can only view their own pain entries' });
    }

    const entries = await ClientPainEntry.findAll({
      where: { userId },
      order: [['isActive', 'DESC'], ['painLevel', 'DESC'], ['createdAt', 'DESC']],
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });

    return res.json({
      success: true,
      data: entries.map((entry) => sanitizePainEntryForRequester(entry, requester)),
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
    const userId = parsePositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    if (requester.role === 'client' && Number(requester.id) !== userId) {
      return res.status(403).json({ success: false, message: 'Clients can only view their own pain entries' });
    }

    const entries = await ClientPainEntry.findAll({
      where: { userId, isActive: true },
      order: [['painLevel', 'DESC'], ['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: entries.map((entry) => sanitizePainEntryForRequester(entry, requester)),
      count: entries.length,
    });
  } catch (error) {
    logger.error('[PainEntry] Error fetching active entries:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch active pain entries' });
  }
};

/**
 * POST /api/pain-entries/:userId
 * Creates a new pain entry. Admin/trainer or own client.
 */
export const createPainEntry = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    // Clients can only create entries for themselves
    if (requester.role === 'client' && Number(requester.id) !== userId) {
      return res.status(403).json({ success: false, message: 'Clients can only create pain entries for themselves' });
    }

    const {
      bodyRegion, side, painLevel, painType, description,
      onsetDate, aggravatingMovements, relievingFactors, painContext,
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
    const parsedPainLevel = parsePainLevel(painLevel);
    if (!parsedPainLevel) {
      return res.status(400).json({ success: false, message: 'painLevel must be between 1 and 10' });
    }
    if (isFutureDate(onsetDate)) {
      return res.status(400).json({ success: false, message: 'onsetDate cannot be in the future' });
    }
    if (painContext !== undefined && !PAIN_CONTEXTS.has(painContext)) {
      return res.status(400).json({ success: false, message: 'painContext must be rest, daily_activity, or loaded_movement' });
    }

    // Clients cannot set trainer-only fields
    const isClient = requester.role === 'client';

    const entry = await ClientPainEntry.create({
      userId,
      createdById: requester.id,
      bodyRegion,
      side: side || 'center',
      painLevel: parsedPainLevel,
      painType: painType || null,
      description: description || null,
      onsetDate: onsetDate || null,
      aggravatingMovements: aggravatingMovements || null,
      relievingFactors: relievingFactors || null,
      painContext: painContext || 'loaded_movement',
      lastConfirmedAt: new Date(),
      trainerNotes: isClient ? null : (trainerNotes || null),
      aiNotes: isClient ? null : (aiNotes || null),
      posturalSyndrome: isClient ? 'none' : (posturalSyndrome || 'none'),
      assessmentFindings: isClient ? null : (assessmentFindings || null),
      isActive: true,
    });

    logger.info(`[PainEntry] Created entry ${entry.id} for user ${userId} by ${requester.id}`);

    return res.status(201).json({
      success: true,
      data: sanitizePainEntryForRequester(entry, requester),
    });
  } catch (error) {
    logger.error('[PainEntry] Error creating entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to create pain entry' });
  }
};

/**
 * PUT /api/pain-entries/:userId/:entryId
 * Updates an existing pain entry. Admin/trainer or own client.
 */
export const updatePainEntry = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    if (!userId || !entryId) {
      return res.status(400).json({ success: false, message: 'Invalid pain entry identifier' });
    }

    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    // Clients can only update their own entries
    if (requester.role === 'client' && Number(requester.id) !== userId) {
      return res.status(403).json({ success: false, message: 'Clients can only update their own pain entries' });
    }

    const entry = await ClientPainEntry.findOne({
      where: { id: entryId, userId },
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Pain entry not found' });
    }

    // Clients cannot update trainer-only fields
    const isClient = requester.role === 'client';
    const allowedFields = isClient
      ? ['painLevel', 'painType', 'description', 'onsetDate', 'aggravatingMovements', 'relievingFactors', 'side', 'painContext']
      : ['painLevel', 'painType', 'description', 'onsetDate', 'aggravatingMovements', 'relievingFactors', 'trainerNotes', 'aiNotes', 'posturalSyndrome', 'assessmentFindings', 'side', 'painContext'];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.onsetDate !== undefined && isFutureDate(updates.onsetDate)) {
      return res.status(400).json({ success: false, message: 'onsetDate cannot be in the future' });
    }
    if (updates.painContext !== undefined && !PAIN_CONTEXTS.has(updates.painContext)) {
      return res.status(400).json({ success: false, message: 'painContext must be rest, daily_activity, or loaded_movement' });
    }

    if (updates.painLevel !== undefined) {
      const parsedPainLevel = parsePainLevel(updates.painLevel);
      if (!parsedPainLevel) {
        return res.status(400).json({ success: false, message: 'painLevel must be between 1 and 10' });
      }
      updates.painLevel = parsedPainLevel;
    }

    // Slice 0 (F2): a client lowering a >=7 severity is a trainer decision —
    // otherwise the fail-closed planning gate is a client-controlled toggle.
    if (
      isClient
      && Number(entry.painLevel) >= PAIN_TRAINER_REVIEW_SEVERITY
      && updates.painLevel !== undefined
      && updates.painLevel < Number(entry.painLevel)
    ) {
      return res.status(403).json({
        success: false,
        code: 'TRAINER_REVIEW_REQUIRED',
        message: TRAINER_REVIEW_REQUIRED_MESSAGE,
      });
    }

    // Slice 1: any authorized human update re-confirms the entry's state.
    updates.lastConfirmedAt = new Date();

    await entry.update(updates, { revisionActorId: requester.id });

    logger.info(`[PainEntry] Updated entry ${entryId} for user ${userId}`);

    return res.json({
      success: true,
      data: sanitizePainEntryForRequester(entry, requester),
    });
  } catch (error) {
    logger.error('[PainEntry] Error updating entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to update pain entry' });
  }
};

/**
 * PUT /api/pain-entries/:userId/:entryId/resolve
 * Marks a pain entry as resolved. Admin/trainer or own client.
 */
export const resolvePainEntry = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    if (!userId || !entryId) {
      return res.status(400).json({ success: false, message: 'Invalid pain entry identifier' });
    }

    const requester = req.user;
    const models = getAllModels();
    const { ClientPainEntry } = models;

    if (!ClientPainEntry) {
      return res.status(503).json({ success: false, message: 'Pain tracking not yet initialized' });
    }

    // Clients can only resolve their own entries
    if (requester.role === 'client' && Number(requester.id) !== userId) {
      return res.status(403).json({ success: false, message: 'Clients can only resolve their own pain entries' });
    }

    const entry = await ClientPainEntry.findOne({
      where: { id: entryId, userId },
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Pain entry not found' });
    }

    // Slice 0 (F2): clients cannot self-resolve >=7 entries — resolving a
    // severe entry is what re-opens the planning gate, so it needs a trainer.
    if (requester.role === 'client' && Number(entry.painLevel) >= PAIN_TRAINER_REVIEW_SEVERITY) {
      return res.status(403).json({
        success: false,
        code: 'TRAINER_REVIEW_REQUIRED',
        message: TRAINER_REVIEW_REQUIRED_MESSAGE,
      });
    }

    await entry.update({
      isActive: false,
      resolvedAt: new Date(),
    }, { revisionActorId: requester.id });

    logger.info(`[PainEntry] Resolved entry ${entryId} for user ${userId}`);

    return res.json({
      success: true,
      data: sanitizePainEntryForRequester(entry, requester),
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
    const userId = parsePositiveInt(req.params.userId);
    const entryId = parsePositiveInt(req.params.entryId);
    if (!userId || !entryId) {
      return res.status(400).json({ success: false, message: 'Invalid pain entry identifier' });
    }

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
      where: { id: entryId, userId },
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
