/**
 * Lead Management Routes (Admin/Trainer)
 * =======================================
 * CRM endpoints for managing leads from all sources.
 * RBAC: Admin sees all leads, Trainers see only assigned leads.
 */
import express from 'express';
import { Op } from 'sequelize';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { aggregateLeadChannels, aggregateLeadReferrers } from '../services/leadCaptureShared.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// All routes require auth + admin or trainer role
router.use(protect);
router.use(trainerOrAdminOnly);

// Helper: Get Lead and LeadActivity models dynamically to avoid circular imports
const getModels = async () => {
  const { default: Lead } = await import('../models/Lead.mjs');
  const { default: LeadActivity } = await import('../models/LeadActivity.mjs');
  const { default: User } = await import('../models/User.mjs');
  return { Lead, LeadActivity, User };
};

// Spirit name system removed — using anonymous Client #ID system instead

/**
 * GET /api/leads
 * List all leads with filtering, sorting, and pagination.
 * Admin: all leads. Trainer: only assigned leads.
 */
router.get('/', async (req, res) => {
  try {
    const { Lead } = await getModels();
    const { status, source, search, sortBy = 'createdAt', sortOrder = 'DESC', page = 1, limit = 50 } = req.query;

    const where = {};

    // RBAC: Trainers only see assigned leads
    if (req.user.role === 'trainer') {
      where.assignedTrainerId = req.user.id;
    }

    if (status) where.status = status;
    else if (req.query.hot === 'true' || req.query.followupsDue === 'true') {
      // Hot / follow-up work queues never include closed leads.
      where.status = { [Op.notIn]: ['converted', 'lost'] };
    }
    if (source) where.source = source;
    // Server-side work-queue filters so hot/follow-up lists are COMPLETE, not
    // limited to the first page the client happened to fetch (LCC-1).
    if (req.query.hot === 'true') where.score = { [Op.gte]: 70 };
    if (req.query.followupsDue === 'true') where.nextFollowUpAt = { [Op.lte]: new Date() };
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Whitelist the sort column (an unvalidated identifier -> Postgres "column does
    // not exist" -> 500) and clamp pagination (page=0/negative -> negative OFFSET,
    // limit=-1 -> negative LIMIT, NaN -> query error; all -> 500). HR-005-1 / HR-005-2.
    const SORTABLE_LEAD_FIELDS = ['createdAt', 'updatedAt', 'score', 'nextFollowUpAt', 'lastContactedAt', 'status', 'firstName', 'lastName', 'email', 'contactCount'];
    const sortColumn = SORTABLE_LEAD_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
    const offset = (pageNum - 1) * limitNum;

    const { rows: leads, count: total } = await Lead.findAndCountAll({
      where,
      order: [[sortColumn, sortDir]],
      limit: limitNum,
      offset,
    });

    return res.json({
      success: true,
      leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    logger.error('[Leads] List error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load leads' });
  }
});

/**
 * GET /api/leads/stats
 * Dashboard KPI stats for leads.
 */
router.get('/stats', async (req, res) => {
  try {
    const { Lead, User } = await getModels();

    const where = {};
    if (req.user.role === 'trainer') {
      where.assignedTrainerId = req.user.id;
    }

    const [total, newLeads, contacted, qualified, scheduled, converted, lost] = await Promise.all([
      Lead.count({ where }),
      Lead.count({ where: { ...where, status: 'new' } }),
      Lead.count({ where: { ...where, status: 'contacted' } }),
      Lead.count({ where: { ...where, status: 'qualified' } }),
      Lead.count({ where: { ...where, status: 'scheduled' } }),
      Lead.count({ where: { ...where, status: 'converted' } }),
      Lead.count({ where: { ...where, status: 'lost' } }),
    ]);

    // Calculate conversion rate
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    // Leads needing follow-up (next_follow_up_at is in the past or today)
    const needsFollowUp = await Lead.count({
      where: {
        ...where,
        status: { [Op.notIn]: ['converted', 'lost'] },
        nextFollowUpAt: { [Op.lte]: new Date() },
      },
    });

    // Hot leads (score >= 70)
    const hotLeads = await Lead.count({
      where: { ...where, score: { [Op.gte]: 70 }, status: { [Op.notIn]: ['converted', 'lost'] } },
    });

    // Acquisition-channel breakdown (which channel produces leads). Capped fetch —
    // fine at early-stage volume; move to a JSONB SQL aggregation past the cap.
    const channelRows = await Lead.findAll({ where, attributes: ['tags', 'source', 'status'], limit: 5000 });
    const byChannel = aggregateLeadChannels(channelRows);

    // Referral rollup: which clients bring leads (share links carry a signed ?ref=). Ids +
    // first name only; best-effort - a name lookup failure must not fail the stats call.
    let byReferrer = [];
    try {
      const referralRows = await Lead.findAll({
        where: { ...where, referredByUserId: { [Op.ne]: null } },
        attributes: ['referredByUserId', 'status'], limit: 5000,
      });
      byReferrer = aggregateLeadReferrers(referralRows);
      if (byReferrer.length && User) {
        const users = await User.findAll({
          where: { id: byReferrer.map((r) => r.referrerId) }, attributes: ['id', 'firstName'],
        });
        const names = new Map(users.map((u) => [Number(u.id), u.firstName || null]));
        byReferrer = byReferrer.map((r) => ({ ...r, firstName: names.get(r.referrerId) ?? null }));
      }
    } catch (refErr) {
      logger.warn('[Leads] Referral rollup skipped:', refErr.message);
    }

    return res.json({
      success: true,
      stats: {
        total, new: newLeads, contacted, qualified, scheduled, converted, lost,
        conversionRate, needsFollowUp, hotLeads, byChannel, byReferrer,
      },
    });
  } catch (err) {
    logger.error('[Leads] Stats error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load lead stats' });
  }
});

/**
 * GET /api/leads/sla  (SWA-138 S10b — speed-to-lead)
 * How fast leads get their first contact, and which are still waiting.
 *
 * Speed-to-lead is the single strongest predictor of lead conversion, so this
 * reports BOTH halves: how we performed on answered leads (median/average
 * response) and the live exposure (uncontacted leads with the clock running).
 *
 * MUST stay declared before GET /:id or the param route shadows it (Rule 31).
 */
router.get('/sla', async (req, res) => {
  try {
    const { Lead } = await getModels();

    const where = {};
    if (req.user.role === 'trainer') {
      where.assignedTrainerId = req.user.id;
    }

    const windowDays = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * 86400000);

    // Answered leads in the window: measure created -> first contact.
    const answered = await Lead.findAll({
      where: { ...where, contactedAt: { [Op.ne]: null }, createdAt: { [Op.gte]: since } },
      attributes: ['id', 'createdAt', 'contactedAt', 'source'],
      limit: 5000,
    });

    const responseMinutes = answered
      .map((l) => (new Date(l.contactedAt).getTime() - new Date(l.createdAt).getTime()) / 60000)
      .filter((m) => Number.isFinite(m) && m >= 0)
      .sort((a, b) => a - b);

    const median = responseMinutes.length
      ? responseMinutes[Math.floor(responseMinutes.length / 2)]
      : null;
    const average = responseMinutes.length
      ? responseMinutes.reduce((sum, m) => sum + m, 0) / responseMinutes.length
      : null;
    const withinFiveMin = responseMinutes.filter((m) => m <= 5).length;
    const withinHour = responseMinutes.filter((m) => m <= 60).length;

    // Live exposure: still waiting, clock running. Oldest first — that is the
    // work order.
    const waitingRows = await Lead.findAll({
      where: {
        ...where,
        contactedAt: null,
        status: { [Op.notIn]: ['converted', 'lost'] },
      },
      attributes: ['id', 'firstName', 'source', 'score', 'createdAt'],
      order: [['createdAt', 'ASC']],
      limit: 25,
    });

    const now = Date.now();
    const waiting = waitingRows.map((l) => ({
      id: l.id,
      firstName: l.firstName,
      source: l.source,
      score: l.score,
      waitingMinutes: Math.max(0, Math.round((now - new Date(l.createdAt).getTime()) / 60000)),
    }));

    return res.json({
      success: true,
      sla: {
        windowDays,
        answeredCount: responseMinutes.length,
        medianMinutes: median === null ? null : Math.round(median),
        averageMinutes: average === null ? null : Math.round(average),
        withinFiveMin,
        withinHour,
        waitingCount: waiting.length,
        waiting,
      },
    });
  } catch (err) {
    logger.error('[Leads] SLA error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load lead SLA' });
  }
});

/**
 * GET /api/leads/:id
 * Get single lead with activity history.
 */
router.get('/:id', async (req, res) => {
  try {
    const { Lead, LeadActivity } = await getModels();

    const where = { id: req.params.id };
    if (req.user.role === 'trainer') {
      where.assignedTrainerId = req.user.id;
    }

    const lead = await Lead.findOne({
      where,
      include: [
        { model: LeadActivity, as: 'activities', order: [['createdAt', 'DESC']], limit: 50 },
      ],
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    return res.json({ success: true, lead });
  } catch (err) {
    logger.error('[Leads] Get error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load lead' });
  }
});

/**
 * POST /api/leads
 * Create a new lead (manual entry).
 */
router.post('/', async (req, res) => {
  try {
    const { Lead, LeadActivity } = await getModels();
    const { firstName, lastName, email, phone, source, sourceDetail, notes, goals, tags } = req.body;

    if (!firstName) {
      return res.status(400).json({ success: false, error: 'firstName is required' });
    }

    const lead = await Lead.create({
      firstName,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      source: source || 'other',
      sourceDetail: sourceDetail || null,
      notes: notes || null,
      goals: goals || null,
      tags: tags || [],
      spiritName: null, // Spirit names deprecated — client ID system used instead
      assignedTrainerId: req.user.role === 'trainer' ? req.user.id : null,
    });

    // Log activity
    await LeadActivity.create({
      leadId: lead.id,
      type: 'note_added',
      performedByUserId: req.user.id,
      title: 'Lead created',
      description: `Lead manually created by ${req.user.username || 'admin'} from source: ${source || 'other'}`,
      metadata: { source, sourceDetail },
    });

    logger.info(`[Leads] Created lead ${lead.id}: ${firstName} ${lastName || ''} (${source})`);
    return res.status(201).json({ success: true, lead });
  } catch (err) {
    logger.error('[Leads] Create error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create lead' });
  }
});

/**
 * PUT /api/leads/:id
 * Update a lead (edit info, change status, add notes).
 */
router.put('/:id', async (req, res) => {
  try {
    const { Lead, LeadActivity } = await getModels();

    const where = { id: req.params.id };
    if (req.user.role === 'trainer') {
      where.assignedTrainerId = req.user.id;
    }

    const lead = await Lead.findOne({ where });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const oldStatus = lead.status;
    const oldScore = lead.score;

    // Update allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'source', 'sourceDetail',
      'status', 'score', 'notes', 'goals', 'tags', 'lastContactedAt',
      'nextFollowUpAt', 'lostReason',
    ];
    // Only admins may (re)assign a lead's owning trainer. Without this gate a trainer
    // could set assignedTrainerId to another trainer or null — reassigning/unassigning
    // leads outside their own scope (data-isolation bypass). The fetch above already
    // scopes a trainer to their own leads; this stops them mutating ownership.
    if (req.user.role === 'admin') allowedFields.push('assignedTrainerId');

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Auto-set pipeline timestamps on status change
    if (updates.status && updates.status !== oldStatus) {
      const now = new Date();
      if (updates.status === 'contacted' && !lead.contactedAt) updates.contactedAt = now;
      if (updates.status === 'qualified' && !lead.qualifiedAt) updates.qualifiedAt = now;
      if (updates.status === 'scheduled' && !lead.scheduledAt) updates.scheduledAt = now;
      if (updates.status === 'converted' && !lead.convertedAt) updates.convertedAt = now;
      if (updates.status === 'lost' && !lead.lostAt) updates.lostAt = now;
    }

    await lead.update(updates);

    // Log status change activity
    if (updates.status && updates.status !== oldStatus) {
      await LeadActivity.create({
        leadId: lead.id,
        type: 'status_change',
        performedByUserId: req.user.id,
        title: `Status changed to ${updates.status}`,
        description: `Pipeline status changed from "${oldStatus}" to "${updates.status}"`,
        metadata: { from: oldStatus, to: updates.status },
      });
    }

    // Log score change activity
    if (updates.score !== undefined && updates.score !== oldScore) {
      await LeadActivity.create({
        leadId: lead.id,
        type: 'score_changed',
        performedByUserId: req.user.id,
        title: `Score updated to ${updates.score}`,
        metadata: { from: oldScore, to: updates.score },
      });
    }

    // Log follow-up set
    if (updates.nextFollowUpAt) {
      await LeadActivity.create({
        leadId: lead.id,
        type: 'follow_up_set',
        performedByUserId: req.user.id,
        title: `Follow-up scheduled for ${new Date(updates.nextFollowUpAt).toLocaleDateString()}`,
        metadata: { date: updates.nextFollowUpAt },
      });
    }

    return res.json({ success: true, lead });
  } catch (err) {
    logger.error('[Leads] Update error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
});

/**
 * POST /api/leads/:id/activity
 * Add an activity entry to a lead (note, email sent, call made, etc.)
 */
router.post('/:id/activity', async (req, res) => {
  try {
    const { Lead, LeadActivity } = await getModels();

    const where = { id: req.params.id };
    if (req.user.role === 'trainer') {
      where.assignedTrainerId = req.user.id;
    }

    const lead = await Lead.findOne({ where });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const { type, title, description, metadata } = req.body;
    if (!type || !title) {
      return res.status(400).json({ success: false, error: 'type and title are required' });
    }

    const activity = await LeadActivity.create({
      leadId: lead.id,
      type,
      performedByUserId: req.user.id,
      title,
      description: description || null,
      metadata: metadata || {},
    });

    // Update contact tracking
    if (['email_sent', 'call_made', 'sms_sent'].includes(type)) {
      await lead.update({
        lastContactedAt: new Date(),
        contactCount: lead.contactCount + 1,
      });
    }

    return res.status(201).json({ success: true, activity });
  } catch (err) {
    logger.error('[Leads] Activity error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to add activity' });
  }
});

/**
 * DELETE /api/leads/:id
 * Soft-delete a lead (admin only).
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { Lead } = await getModels();
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    await lead.destroy(); // soft delete (paranoid: true)
    return res.json({ success: true, message: 'Lead archived' });
  } catch (err) {
    logger.error('[Leads] Delete error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
});

export default router;
