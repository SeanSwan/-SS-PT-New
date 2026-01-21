/**
 * Automation Routes
 * =================
 * Admin routes for managing automation sequences and logs.
 */

import express from 'express';
import logger from '../utils/logger.mjs';
import { protect, adminOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import { getAllModels } from '../models/index.mjs';
import {
  ensureDefaultSequences,
  triggerSequence,
  cancelSequence
} from '../services/automationService.mjs';

const router = express.Router();

const normalizeError = (error) => {
  if (!error) return 'Unknown error';
  return typeof error === 'string' ? error : (error.message || 'Unknown error');
};

const normalizeSteps = (steps) => {
  if (!Array.isArray(steps)) return [];
  return steps.map((step) => ({
    dayOffset: Number(step.dayOffset) || 0,
    templateName: step.templateName || null,
    channel: step.channel || 'sms'
  }));
};

/**
 * GET /api/automation/sequences
 * List automation sequences (admin only).
 */
router.get('/sequences', protect, adminOnly, async (_req, res) => {
  try {
    const { AutomationSequence } = getAllModels();
    if (!AutomationSequence) {
      return res.status(500).json({ success: false, message: 'AutomationSequence model not available' });
    }

    await ensureDefaultSequences();

    const sequences = await AutomationSequence.findAll({
      order: [['createdAt', 'ASC']]
    });

    return res.status(200).json({ success: true, data: sequences });
  } catch (error) {
    logger.error('Error fetching automation sequences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch automation sequences',
      error: normalizeError(error)
    });
  }
});

/**
 * POST /api/automation/sequences
 * Create an automation sequence (admin only).
 */
router.post('/sequences', protect, adminOnly, async (req, res) => {
  try {
    const { AutomationSequence } = getAllModels();
    if (!AutomationSequence) {
      return res.status(500).json({ success: false, message: 'AutomationSequence model not available' });
    }

    const { name, triggerEvent, isActive = true, steps } = req.body || {};

    if (!name || !triggerEvent) {
      return res.status(400).json({ success: false, message: 'Name and triggerEvent are required' });
    }

    if (steps && !Array.isArray(steps)) {
      return res.status(400).json({ success: false, message: 'Steps must be an array' });
    }

    const sequence = await AutomationSequence.create({
      name: name.trim(),
      triggerEvent: triggerEvent.trim(),
      isActive: Boolean(isActive),
      steps: normalizeSteps(steps)
    });

    return res.status(201).json({ success: true, data: sequence });
  } catch (error) {
    logger.error('Error creating automation sequence:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create automation sequence',
      error: normalizeError(error)
    });
  }
});

/**
 * PUT /api/automation/sequences/:id
 * Update an automation sequence (admin only).
 */
router.put('/sequences/:id', protect, adminOnly, async (req, res) => {
  try {
    const { AutomationSequence } = getAllModels();
    if (!AutomationSequence) {
      return res.status(500).json({ success: false, message: 'AutomationSequence model not available' });
    }

    const { id } = req.params;
    const sequence = await AutomationSequence.findByPk(id);
    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Automation sequence not found' });
    }

    const { name, triggerEvent, isActive, steps } = req.body || {};

    if (name !== undefined) sequence.name = name.trim();
    if (triggerEvent !== undefined) sequence.triggerEvent = triggerEvent.trim();
    if (isActive !== undefined) sequence.isActive = Boolean(isActive);
    if (steps !== undefined) {
      if (!Array.isArray(steps)) {
        return res.status(400).json({ success: false, message: 'Steps must be an array' });
      }
      sequence.steps = normalizeSteps(steps);
    }

    await sequence.save();

    return res.status(200).json({ success: true, data: sequence });
  } catch (error) {
    logger.error('Error updating automation sequence:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update automation sequence',
      error: normalizeError(error)
    });
  }
});

/**
 * DELETE /api/automation/sequences/:id
 * Delete an automation sequence (admin only).
 */
router.delete('/sequences/:id', protect, adminOnly, async (req, res) => {
  try {
    const { AutomationSequence } = getAllModels();
    if (!AutomationSequence) {
      return res.status(500).json({ success: false, message: 'AutomationSequence model not available' });
    }

    const { id } = req.params;
    const sequence = await AutomationSequence.findByPk(id);
    if (!sequence) {
      return res.status(404).json({ success: false, message: 'Automation sequence not found' });
    }

    await sequence.destroy();

    return res.status(200).json({ success: true, message: 'Automation sequence deleted' });
  } catch (error) {
    logger.error('Error deleting automation sequence:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete automation sequence',
      error: normalizeError(error)
    });
  }
});

/**
 * GET /api/automation/logs/:userId
 * Fetch automation logs for a user (trainer/admin).
 */
router.get('/logs/:userId', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { AutomationLog, AutomationSequence } = access.models;

    if (!AutomationLog) {
      return res.status(500).json({ success: false, message: 'AutomationLog model not available' });
    }

    const { limit = 50, status, sequenceId } = req.query;

    const where = { userId: access.clientId };
    if (status) {
      where.status = status;
    }
    if (sequenceId) {
      where.sequenceId = sequenceId;
    }

    const logs = await AutomationLog.findAll({
      where,
      order: [['scheduledFor', 'DESC']],
      limit: Number(limit) || 50,
      include: AutomationSequence ? [{
        model: AutomationSequence,
        as: 'sequence',
        attributes: ['id', 'name', 'triggerEvent']
      }] : []
    });

    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    logger.error('Error fetching automation logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch automation logs',
      error: normalizeError(error)
    });
  }
});

/**
 * POST /api/automation/trigger
 * Manually trigger a sequence by event (admin only).
 */
router.post('/trigger', protect, adminOnly, async (req, res) => {
  try {
    const { eventName, userId, data } = req.body || {};

    if (!eventName || !userId) {
      return res.status(400).json({ success: false, message: 'eventName and userId are required' });
    }

    const result = await triggerSequence(eventName, Number(userId), data || {});
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error triggering automation sequence:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger automation sequence',
      error: normalizeError(error)
    });
  }
});

/**
 * POST /api/automation/cancel
 * Cancel pending sequence steps for a user (admin only).
 */
router.post('/cancel', protect, adminOnly, async (req, res) => {
  try {
    const { userId, sequenceName } = req.body || {};
    if (!userId || !sequenceName) {
      return res.status(400).json({ success: false, message: 'userId and sequenceName are required' });
    }

    const result = await cancelSequence(Number(userId), sequenceName);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error cancelling automation sequence:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel automation sequence',
      error: normalizeError(error)
    });
  }
});

export default router;
