/**
 * ROUTES: Admin Marketing Campaigns
 * =================================
 * Prefix: /api/admin/marketing-campaigns
 * Auth: protect + adminOnly
 *
 * CRUD for the MarketingCampaign spine (Marketing OS, Slice 2). Admin-only. Input is
 * field-whitelisted (clients cannot set id / timestamps / createdBy) and enum-validated
 * server-side. This manages the campaign business object ONLY — it sends nothing,
 * publishes nothing, and touches no PII or money. Soft-delete via paranoid destroy.
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import MarketingCampaign, { OBJECTIVES, STATUSES } from '../models/MarketingCampaign.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

router.use(protect, adminOnly);

// Only these fields are client-settable. id / createdBy / timestamps are never accepted from the body.
const EDITABLE = ['name', 'objective', 'offer', 'audience', 'status', 'startAt', 'endAt', 'budget', 'primaryChannel', 'utmCampaign'];

const pick = (body = {}) => {
  const out = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

const validate = (data, { partial = false } = {}) => {
  const errors = [];
  if (!partial || data.name !== undefined) {
    if (!data.name || !String(data.name).trim()) errors.push('name is required');
  }
  if (data.objective !== undefined && !OBJECTIVES.includes(data.objective)) {
    errors.push(`objective must be one of: ${OBJECTIVES.join(', ')}`);
  }
  if (data.status !== undefined && !STATUSES.includes(data.status)) {
    errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  }
  return errors;
};

// GET / — list (optional ?status= filter)
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.status && STATUSES.includes(req.query.status)) where.status = req.query.status;
    const campaigns = await MarketingCampaign.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 });
    return res.json({ success: true, data: campaigns });
  } catch (err) {
    logger.error('List marketing campaigns failed:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to list campaigns' });
  }
});

// GET /:id — one campaign
router.get('/:id', async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    return res.json({ success: true, data: campaign });
  } catch (err) {
    logger.error('Get marketing campaign failed:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to load campaign' });
  }
});

// POST / — create
router.post('/', async (req, res) => {
  const data = pick(req.body);
  const errors = validate(data);
  if (errors.length) return res.status(400).json({ success: false, message: errors.join('; ') });
  try {
    const campaign = await MarketingCampaign.create({
      ...data,
      createdBy: req.user?.id ?? null,
      updatedBy: req.user?.id ?? null,
    });
    return res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    logger.error('Create marketing campaign failed:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
});

// PUT /:id — update
router.put('/:id', async (req, res) => {
  const data = pick(req.body);
  const errors = validate(data, { partial: true });
  if (errors.length) return res.status(400).json({ success: false, message: errors.join('; ') });
  try {
    const campaign = await MarketingCampaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await campaign.update({ ...data, updatedBy: req.user?.id ?? null });
    return res.json({ success: true, data: campaign });
  } catch (err) {
    logger.error('Update marketing campaign failed:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to update campaign' });
  }
});

// DELETE /:id — soft delete (paranoid → archived out of normal queries)
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await campaign.destroy();
    return res.json({ success: true, message: 'Campaign archived' });
  } catch (err) {
    logger.error('Delete marketing campaign failed:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to delete campaign' });
  }
});

export default router;
