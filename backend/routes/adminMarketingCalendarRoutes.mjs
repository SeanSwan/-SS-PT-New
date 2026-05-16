/**
 * ROUTES: Admin Marketing Calendar
 * ================================
 * Prefix: /api/admin/marketing-calendar
 * Auth: protect + adminOnly
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import marketingCalendarService from '../services/marketingCalendarService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.use(protect, adminOnly);

const sendValidationError = (res, err) => (
  res.status(400).json({ success: false, message: err.message })
);

router.get('/', async (req, res) => {
  try {
    const data = await marketingCalendarService.listItems({
      start: req.query.start,
      end: req.query.end,
    });
    return res.json({ success: true, data });
  } catch (err) {
    logger.error('Marketing calendar list failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load marketing calendar' });
  }
});

router.get('/conflicts', async (req, res) => {
  try {
    const data = await marketingCalendarService.findTrainingOverlaps({
      scheduledAt: req.query.scheduledAt,
      durationMinutes: req.query.durationMinutes,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return sendValidationError(res, err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await marketingCalendarService.getItem(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Marketing calendar item not found' });
    return res.json({ success: true, data: item });
  } catch (err) {
    logger.error('Marketing calendar get failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load marketing calendar item' });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = await marketingCalendarService.createItem(req.body, { userId: req.user?.id });
    return res.status(201).json({ success: true, data: result.item, advisories: result.advisories });
  } catch (err) {
    return sendValidationError(res, err);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const result = await marketingCalendarService.updateItem(req.params.id, req.body, { userId: req.user?.id });
    if (!result) return res.status(404).json({ success: false, message: 'Marketing calendar item not found' });
    return res.json({ success: true, data: result.item, advisories: result.advisories });
  } catch (err) {
    return sendValidationError(res, err);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await marketingCalendarService.deleteItem(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Marketing calendar item not found' });
    return res.json({ success: true, message: 'Marketing calendar item deleted' });
  } catch (err) {
    logger.error('Marketing calendar delete failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete marketing calendar item' });
  }
});

export default router;
