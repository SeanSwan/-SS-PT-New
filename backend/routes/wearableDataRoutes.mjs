/**
 * Wearable Data Routes
 * ====================
 * API endpoints for syncing, querying, and managing wearable health data.
 * Data formats are normalized from each device's native aggregate/export shape.
 */

import { Router } from 'express';
import { Op } from 'sequelize';
import { protect } from '../middleware/authMiddleware.mjs';
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
import WearableData from '../models/WearableData.mjs';
import {
  DEVICE_METADATA,
  normalizeWearableData,
  resolveWearableRecordDate,
} from '../services/wearableDataInterop.mjs';
import {
  WEARABLE_METRIC_REQUIRED,
  hasWearableMetrics,
} from '../services/wearableDataMetrics.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

const clampInt = (value, { defaultValue, min, max }) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const fieldDateError = (field, error) => error.replace('recordDate', field);

/**
 * POST /api/wearable-data/sync
 * Sync wearable data (single day or batch).
 * Body: { deviceType, data: [{recordDate, ...fields}] } or { deviceType, recordDate, ...fields }
 */
router.post('/sync', protect, async (req, res) => {
  try {
    const { deviceType, data, recordDate, deviceId } = req.body;

    if (!deviceType || !WearableData.DEVICE_TYPES.includes(deviceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid deviceType. Must be one of: ${WearableData.DEVICE_TYPES.join(', ')}`,
      });
    }

    const rawItems = Array.isArray(data) ? data : [{ ...req.body, recordDate }];
    if (rawItems.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one wearable sync item is required' });
    }
    const items = [];

    for (const item of rawItems) {
      const resolvedDate = resolveWearableRecordDate(item?.recordDate);
      if (resolvedDate.error) {
        return res.status(400).json({ success: false, message: resolvedDate.error });
      }
      const parsed = normalizeWearableData(deviceType, item);
      if (!hasWearableMetrics(parsed)) {
        return res.status(400).json({ success: false, message: WEARABLE_METRIC_REQUIRED });
      }
      items.push({ item, parsed, recordDate: resolvedDate.recordDate });
    }

    const results = [];
    for (const { item, parsed, recordDate: safeRecordDate } of items) {
      const record = {
        ...parsed,
        userId: req.user.id,
        deviceType,
        deviceId: deviceId || item.deviceId || null,
        recordDate: safeRecordDate,
        rawPayload: item,
        syncedAt: new Date(),
        dataQuality: deviceType === 'manual' ? 0.7 : 1.0,
      };

      Object.keys(record).forEach(k => { if (record[k] === undefined) delete record[k]; });

      const [saved, created] = await WearableData.upsert(record, {
        conflictFields: ['userId', 'deviceType', 'recordDate'],
      });

      results.push({ recordDate: safeRecordDate, created, id: saved.id });
    }

    return res.json({
      success: true,
      message: `Synced ${results.length} record(s) from ${deviceType}`,
      results,
    });
  } catch (error) {
    logger.error('[WearableData] Sync error:', error);
    return res.status(500).json({ success: false, message: 'Failed to sync wearable data' });
  }
});

/**
 * GET /api/wearable-data
 * Get own wearable data with optional filters.
 * Query: ?days=30&deviceType=fitbit&metrics=steps,heartRate
 */
router.get('/', protect, async (req, res) => {
  try {
    const { days = 30, deviceType, startDate, endDate, limit: qLimit, offset: qOffset } = req.query;
    const limit = clampInt(qLimit, { defaultValue: 200, min: 1, max: 1000 });
    const offset = clampInt(qOffset, { defaultValue: 0, min: 0, max: 5000 });

    const where = { userId: req.user.id };

    if (deviceType) where.deviceType = deviceType;

    if (startDate || endDate) {
      const recordDateFilter = {};
      let resolvedStart = null;
      let resolvedEnd = null;
      if (startDate) {
        resolvedStart = resolveWearableRecordDate(startDate);
        if (resolvedStart.error) {
          return res.status(400).json({ success: false, message: fieldDateError('startDate', resolvedStart.error) });
        }
        recordDateFilter[Op.gte] = resolvedStart.recordDate;
      }
      if (endDate) {
        resolvedEnd = resolveWearableRecordDate(endDate);
        if (resolvedEnd.error) {
          return res.status(400).json({ success: false, message: fieldDateError('endDate', resolvedEnd.error) });
        }
        recordDateFilter[Op.lte] = resolvedEnd.recordDate;
      }
      if (resolvedStart && resolvedEnd && resolvedStart.recordDate > resolvedEnd.recordDate) {
        return res.status(400).json({ success: false, message: 'startDate cannot be after endDate' });
      }
      where.recordDate = recordDateFilter;
    } else {
      const dayWindow = clampInt(days, { defaultValue: 30, min: 1, max: 3650 });
      const start = new Date();
      start.setDate(start.getDate() - dayWindow);
      where.recordDate = { [Op.gte]: start.toISOString().split('T')[0] };
    }

    const { rows: data, count: total } = await WearableData.findAndCountAll({
      where,
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
      limit,
      offset,
    });

    return res.json({ success: true, data, count: data.length, total, limit, offset });
  } catch (error) {
    logger.error('[WearableData] Fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch wearable data' });
  }
});

/**
 * GET /api/wearable-data/summary
 * Aggregated summary for dashboard charts.
 * Query: ?weeks=12
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const weeks = clampInt(req.query.weeks, { defaultValue: 12, min: 1, max: 260 });
    const weeklyAverages = await WearableData.getWeeklyAverages(req.user.id, weeks);

    const latest = await WearableData.findOne({
      where: { userId: req.user.id },
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
    });

    const devices = await WearableData.findAll({
      where: { userId: req.user.id },
      attributes: ['deviceType'],
      group: ['deviceType'],
    });

    return res.json({
      success: true,
      latest: latest || null,
      weeklyAverages,
      connectedDevices: devices.map(d => d.deviceType),
    });
  } catch (error) {
    logger.error('[WearableData] Summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get wearable summary' });
  }
});

/**
 * GET /api/wearable-data/user/:userId
 * Admin/Trainer: view a client's wearable data.
 */
router.get('/user/:userId', protect, verifyClientAccessByUserId({ paramName: 'userId' }), async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const { days = 30, deviceType, limit: qLimit, offset: qOffset } = req.query;
    const limit = clampInt(qLimit, { defaultValue: 200, min: 1, max: 1000 });
    const offset = clampInt(qOffset, { defaultValue: 0, min: 0, max: 5000 });

    const where = { userId };
    if (deviceType) where.deviceType = deviceType;
    const dayWindow = clampInt(days, { defaultValue: 30, min: 1, max: 3650 });
    const start = new Date();
    start.setDate(start.getDate() - dayWindow);
    where.recordDate = { [Op.gte]: start.toISOString().split('T')[0] };

    const { rows: data, count: total } = await WearableData.findAndCountAll({
      where,
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
      limit,
      offset,
    });

    return res.json({ success: true, data, count: data.length, total, limit, offset });
  } catch (error) {
    logger.error('[WearableData] User fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch client wearable data' });
  }
});

/**
 * GET /api/wearable-data/user/:userId/summary
 * Admin/Trainer: client wearable summary for dashboard.
 */
router.get('/user/:userId/summary', protect, verifyClientAccessByUserId({ paramName: 'userId' }), async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const weeks = clampInt(req.query.weeks, { defaultValue: 12, min: 1, max: 260 });
    const weeklyAverages = await WearableData.getWeeklyAverages(userId, weeks);

    const latest = await WearableData.findOne({
      where: { userId },
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
    });

    const devices = await WearableData.findAll({
      where: { userId },
      attributes: ['deviceType'],
      group: ['deviceType'],
    });

    return res.json({
      success: true,
      latest: latest || null,
      weeklyAverages,
      connectedDevices: devices.map(d => d.deviceType),
    });
  } catch (error) {
    logger.error('[WearableData] Client summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get client wearable summary' });
  }
});

/**
 * DELETE /api/wearable-data/:id
 * Delete a specific wearable data record (own only, or admin).
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const recordId = parsePositiveInt(req.params.id);
    if (!recordId) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const record = await WearableData.findByPk(recordId);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (Number(record.userId) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await record.destroy();
    return res.json({ success: true, message: 'Wearable data record deleted' });
  } catch (error) {
    logger.error('[WearableData] Delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
});

/**
 * POST /api/wearable-data/share
 * Body: { category, metrics: [{label, value}], summary? }
 */
router.post('/share', protect, async (req, res) => {
  try {
    const { category, metrics, summary } = req.body;
    if (!category || !Array.isArray(metrics) || !metrics.length) {
      return res.status(400).json({ success: false, message: 'category and metrics[] are required' });
    }

    const { createWearableSharePost } = await import('../services/socialAutoPost.mjs');
    const post = await createWearableSharePost(req.user.id, { category, metrics, summary });

    return res.json({ success: true, post, message: 'Stats shared to your feed!' });
  } catch (error) {
    logger.error('[WearableData] Share error:', error);
    return res.status(500).json({ success: false, message: 'Failed to share stats' });
  }
});

/**
 * GET /api/wearable-data/devices
 * List supported device types with metadata.
 */
router.get('/devices', (_req, res) => {
  res.json({ success: true, devices: DEVICE_METADATA });
});

export default router;
