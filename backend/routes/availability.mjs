/**
 * Availability Routes
 * ===================
 * Trainer availability endpoints for schedule availability checks.
 */

import express from 'express';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import availabilityService from '../services/availabilityService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const parseTrainerId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateOnlyLocal = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const ensureTrainerAccess = (req, trainerId) => {
  if (req.user?.role === 'trainer' && Number(req.user.id) !== Number(trainerId)) {
    return false;
  }
  return true;
};

router.get('/:trainerId', protect, async (req, res) => {
  try {
    const trainerId = parseTrainerId(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, message: 'Invalid trainerId' });
    }

    const date = req.query.date ? parseDateOnlyLocal(String(req.query.date)) : null;
    if (req.query.date && !date) {
      return res.status(400).json({ success: false, message: 'Invalid date. Use YYYY-MM-DD.' });
    }
    const data = await availabilityService.getAvailabilityForTrainer(trainerId, date);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching availability:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
});

router.get('/:trainerId/slots', protect, async (req, res) => {
  try {
    const trainerId = parseTrainerId(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, message: 'Invalid trainerId' });
    }

    const rawDate = req.query.date ? String(req.query.date) : null;
    const date = rawDate ? parseDateOnlyLocal(rawDate) : null;
    if (!rawDate) {
      return res.status(400).json({ success: false, message: 'date query param is required' });
    }
    if (!date) {
      return res.status(400).json({ success: false, message: 'Invalid date. Use YYYY-MM-DD.' });
    }

    const duration = Number(req.query.duration || 60);
    if (!Number.isInteger(duration) || duration < 15 || duration > 180) {
      return res.status(400).json({ success: false, message: 'duration must be an integer between 15 and 180' });
    }
    const slots = await availabilityService.getAvailableSlots(trainerId, date, duration);

    return res.status(200).json({ success: true, data: slots });
  } catch (error) {
    logger.error('Error fetching available slots:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch available slots' });
  }
});

router.put('/:trainerId', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const trainerId = parseTrainerId(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, message: 'Invalid trainerId' });
    }

    if (!ensureTrainerAccess(req, trainerId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const schedule = Array.isArray(req.body.schedule) ? req.body.schedule : [];
    const updated = await availabilityService.updateWeeklyAvailability(trainerId, schedule);

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating availability:', error);
    return res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
});

router.post('/:trainerId/override', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const trainerId = parseTrainerId(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, message: 'Invalid trainerId' });
    }

    if (!ensureTrainerAccess(req, trainerId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { date, startTime, endTime, type, reason } = req.body;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'date, startTime, and endTime are required' });
    }

    const entry = await availabilityService.createOverride(trainerId, {
      date,
      startTime,
      endTime,
      type,
      reason
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    logger.error('Error creating availability override:', error);
    return res.status(500).json({ success: false, message: 'Failed to create availability override' });
  }
});

export default router;
