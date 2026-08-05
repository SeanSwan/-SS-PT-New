/**
 * Admin Alert Read-State Routes (SWA-138 S4)
 * ==========================================
 * Base path: /api/admin/alert-state (mounted app.use('/api/admin', …))
 *
 * Per-admin ack/archive over ANY alert source, replacing the abandoned
 * 501 stub (`/api/admin/alerts/:id/acknowledge`) that never had a store.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ GET    /alert-state              Admin   Own read-state rows     │
 * │ POST   /alert-state/ack          Admin   Mark one alert seen     │
 * │ POST   /alert-state/archive      Admin   Hide one alert (self)   │
 * │ POST   /alert-state/bulk         Admin   ack|archive ≤100 items  │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Scoping law: every query filters adminId = req.user.id — one admin can
 * never read or mutate another admin's state (IDOR guard, tested).
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import NotificationReadState, { ALERT_REF_TYPES } from '../models/NotificationReadState.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const MAX_BULK_ITEMS = 100;
const MAX_STATE_ROWS = 500;

const isValidRefId = (refId) => {
  if (typeof refId !== 'string' && typeof refId !== 'number') return false;
  const value = String(refId).trim();
  return value.length > 0 && value.length <= 160;
};

async function upsertState(adminId, refType, refId, field) {
  const [row] = await NotificationReadState.findOrCreate({
    where: { adminId, refType, refId: String(refId) },
    defaults: { [field]: new Date() },
  });
  if (!row[field]) {
    await row.update({ [field]: new Date() });
  }
  return row;
}

router.get('/alert-state', protect, adminOnly, async (req, res) => {
  try {
    const rows = await NotificationReadState.findAll({
      where: { adminId: req.user.id },
      order: [['updatedAt', 'DESC']],
      limit: MAX_STATE_ROWS,
      attributes: ['refType', 'refId', 'readAt', 'archivedAt'],
    });
    return res.json({ success: true, state: rows });
  } catch (error) {
    logger.error('Failed to fetch alert read-state:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch alert state' });
  }
});

router.post('/alert-state/ack', protect, adminOnly, async (req, res) => {
  try {
    const { refType, refId } = req.body || {};
    if (!ALERT_REF_TYPES.includes(refType) || !isValidRefId(refId)) {
      return res.status(400).json({ success: false, message: 'Invalid refType/refId' });
    }
    const row = await upsertState(req.user.id, refType, refId, 'readAt');
    return res.json({ success: true, state: { refType, refId: String(refId), readAt: row.readAt } });
  } catch (error) {
    logger.error('Failed to ack alert:', error);
    return res.status(500).json({ success: false, message: 'Failed to ack alert' });
  }
});

router.post('/alert-state/archive', protect, adminOnly, async (req, res) => {
  try {
    const { refType, refId } = req.body || {};
    if (!ALERT_REF_TYPES.includes(refType) || !isValidRefId(refId)) {
      return res.status(400).json({ success: false, message: 'Invalid refType/refId' });
    }
    const row = await upsertState(req.user.id, refType, refId, 'archivedAt');
    return res.json({ success: true, state: { refType, refId: String(refId), archivedAt: row.archivedAt } });
  } catch (error) {
    logger.error('Failed to archive alert:', error);
    return res.status(500).json({ success: false, message: 'Failed to archive alert' });
  }
});

router.post('/alert-state/bulk', protect, adminOnly, async (req, res) => {
  try {
    const { op, items } = req.body || {};
    const field = op === 'ack' ? 'readAt' : op === 'archive' ? 'archivedAt' : null;
    if (!field || !Array.isArray(items) || items.length === 0 || items.length > MAX_BULK_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `op must be ack|archive and items must be a 1-${MAX_BULK_ITEMS} entry array`,
      });
    }
    if (!items.every((i) => i && ALERT_REF_TYPES.includes(i.refType) && isValidRefId(i.refId))) {
      return res.status(400).json({ success: false, message: 'Invalid item in bulk payload' });
    }
    let processed = 0;
    for (const item of items) {
      await upsertState(req.user.id, item.refType, item.refId, field);
      processed += 1;
    }
    logger.info(`Admin ${req.user.id} bulk-${op}ed ${processed} alerts`);
    return res.json({ success: true, op, processed });
  } catch (error) {
    logger.error('Failed bulk alert-state op:', error);
    return res.status(500).json({ success: false, message: 'Failed bulk alert-state operation' });
  }
});

export default router;
