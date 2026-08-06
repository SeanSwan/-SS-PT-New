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
 * │ GET    /alert-state/claims       Admin   Who is handling what     │
 * │ POST   /alert-state/claim        Admin   Claim / release an alert │
 * │ GET    /alert-state/archived     Admin   The archive (snapshots)   │
 * │ POST   /alert-state/restore      Admin   Un-archive one alert      │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Scoping law: every query filters adminId = req.user.id — one admin can
 * never read or mutate another admin's state (IDOR guard, tested).
 */

import express from 'express';
import { Op } from 'sequelize';
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

async function upsertState(adminId, refType, refId, field, snapshot = null) {
  const [row] = await NotificationReadState.findOrCreate({
    where: { adminId, refType, refId: String(refId) },
    defaults: { [field]: new Date(), ...(snapshot ? { snapshot } : {}) },
  });
  const patch = {};
  if (!row[field]) patch[field] = new Date();
  // Snapshot is written once, on the archive that created it — later acks must
  // never overwrite what the alert actually said when it was filed away.
  if (snapshot && !row.snapshot) patch.snapshot = snapshot;
  if (Object.keys(patch).length > 0) await row.update(patch);
  return row;
}

/** Keep archive snapshots small, safe, and free of contact details (Rule 8). */
function sanitizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const snap = {
    title: str(raw.title, 160),
    message: str(raw.message, 600),
    type: str(raw.type, 40),
    priority: str(raw.priority, 20),
    timestamp: str(raw.timestamp, 40),
  };
  return Object.values(snap).some((v) => v !== undefined) ? snap : null;
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
    const row = await upsertState(
      req.user.id, refType, refId, 'archivedAt', sanitizeSnapshot(req.body?.snapshot),
    );
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
      await upsertState(
        req.user.id, item.refType, item.refId, field,
        field === 'archivedAt' ? sanitizeSnapshot(item.snapshot) : null,
      );
      processed += 1;
    }
    logger.info(`Admin ${req.user.id} bulk-${op}ed ${processed} alerts`);
    return res.json({ success: true, op, processed });
  } catch (error) {
    logger.error('Failed bulk alert-state op:', error);
    return res.status(500).json({ success: false, message: 'Failed bulk alert-state operation' });
  }
});

/**
 * GET /alert-state/claims
 * Cross-admin by design: a claim's whole purpose is telling OTHER admins that
 * someone is already handling an item, so this is the one read that is not
 * scoped to req.user.id. Returns only ref + claimant id/name — never contact
 * details (Rule 8).
 */
router.get('/alert-state/claims', protect, adminOnly, async (req, res) => {
  try {
    const rows = await NotificationReadState.findAll({
      where: { claimedAt: { [Op.ne]: null }, archivedAt: null },
      order: [['claimedAt', 'DESC']],
      limit: MAX_STATE_ROWS,
      attributes: ['adminId', 'refType', 'refId', 'claimedAt'],
    });
    return res.json({
      success: true,
      claims: rows.map((r) => ({
        refType: r.refType,
        refId: r.refId,
        adminId: r.adminId,
        claimedAt: r.claimedAt,
        mine: r.adminId === req.user.id,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch alert claims:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch alert claims' });
  }
});

/**
 * POST /alert-state/claim  { refType, refId, release?: boolean }
 * Claiming is first-writer-wins: if another admin already holds it, respond 409
 * with the holder so the UI can say who. Releasing only clears YOUR OWN claim.
 */
router.post('/alert-state/claim', protect, adminOnly, async (req, res) => {
  try {
    const { refType, refId, release = false } = req.body || {};
    if (!ALERT_REF_TYPES.includes(refType) || !isValidRefId(refId)) {
      return res.status(400).json({ success: false, message: 'Invalid refType/refId' });
    }
    const key = String(refId);

    if (release) {
      const [updated] = await NotificationReadState.update(
        { claimedAt: null },
        { where: { adminId: req.user.id, refType, refId: key } },
      );
      return res.json({ success: true, released: updated > 0 });
    }

    const holder = await NotificationReadState.findOne({
      where: { refType, refId: key, claimedAt: { [Op.ne]: null } },
      attributes: ['adminId', 'claimedAt'],
    });
    if (holder && holder.adminId !== req.user.id) {
      return res.status(409).json({
        success: false,
        message: 'Already claimed by another admin',
        claim: { adminId: holder.adminId, claimedAt: holder.claimedAt },
      });
    }

    const row = await upsertState(req.user.id, refType, key, 'claimedAt');
    return res.json({
      success: true,
      claim: { refType, refId: key, adminId: req.user.id, claimedAt: row.claimedAt },
    });
  } catch (error) {
    logger.error('Failed to claim alert:', error);
    return res.status(500).json({ success: false, message: 'Failed to claim alert' });
  }
});

/**
 * GET /alert-state/archived
 * The archive view: everything this admin has filed away, newest first, with
 * the snapshot taken at archive time so the entry is readable even when the
 * source alert is no longer emitted.
 */
router.get('/alert-state/archived', protect, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), MAX_STATE_ROWS);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { rows, count } = await NotificationReadState.findAndCountAll({
      where: { adminId: req.user.id, archivedAt: { [Op.ne]: null } },
      order: [['archivedAt', 'DESC']],
      limit,
      offset,
      attributes: ['refType', 'refId', 'archivedAt', 'snapshot'],
    });
    return res.json({
      success: true,
      total: count,
      archived: rows.map((r) => ({
        refType: r.refType,
        refId: r.refId,
        archivedAt: r.archivedAt,
        snapshot: r.snapshot || null,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch archived alerts:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch archived alerts' });
  }
});

/**
 * POST /alert-state/restore  { refType, refId }
 * Undo an archive. The snapshot is kept — restoring twice is harmless, and the
 * record of what it said is never destroyed by this route.
 */
router.post('/alert-state/restore', protect, adminOnly, async (req, res) => {
  try {
    const { refType, refId } = req.body || {};
    if (!ALERT_REF_TYPES.includes(refType) || !isValidRefId(refId)) {
      return res.status(400).json({ success: false, message: 'Invalid refType/refId' });
    }
    const [updated] = await NotificationReadState.update(
      { archivedAt: null },
      { where: { adminId: req.user.id, refType, refId: String(refId) } },
    );
    return res.json({ success: true, restored: updated > 0 });
  } catch (error) {
    logger.error('Failed to restore alert:', error);
    return res.status(500).json({ success: false, message: 'Failed to restore alert' });
  }
});

export default router;
