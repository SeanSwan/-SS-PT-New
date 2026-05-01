/**
 * ============================================================================
 * FILE: commissionRoutes.mjs
 * PURPOSE: Admin commission dashboard — view, manage, and pay trainer commissions
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides admin-only REST endpoints for viewing commission
 * summaries, individual trainer earnings, marking commissions as paid, and
 * generating payout reports.
 *
 * HOW IT FITS IN THE APP: Admin Dashboard → Revenue Tab → Commission Management
 * BASE PATH: /api/commissions
 */

import express from 'express';
import { Op } from 'sequelize';
import { protect, adminOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { getModel, getUser } from '../models/index.mjs';
import { calculateBulkCommissions } from '../utils/commissionCalculator.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy Model Getters
// PURPOSE: Prevent circular dependency issues at import time
// ─────────────────────────────────────────────────────────────

const getCommissionModels = () => ({
  TrainerCommission: getModel('TrainerCommission'),
  User: getUser(),
  Order: getModel('Order'),
});

// ─────────────────────────────────────────────────────────────
// SECTION: Admin Commission Dashboard
// PURPOSE: Overview stats, trainer earnings, payout management
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/commissions/summary
 * Admin dashboard summary — total revenue, unpaid commissions, trainer breakdown
 */
router.get('/summary', protect, adminOnly, async (req, res) => {
  try {
    const { TrainerCommission, User } = getCommissionModels();
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    const whereClause = {};
    if (startDate || endDate) whereClause.created_at = dateFilter;

    // Aggregate totals
    const commissions = await TrainerCommission.findAll({ where: whereClause });

    let totalGross = 0;
    let totalBusinessCut = 0;
    let totalTrainerCut = 0;
    let totalUnpaid = 0;
    let totalPaid = 0;
    const trainerMap = {};

    for (const c of commissions) {
      const gross = parseFloat(c.grossAmount) || 0;
      const bCut = parseFloat(c.businessCut) || 0;
      const tCut = parseFloat(c.trainerCut) || 0;

      totalGross += gross;
      totalBusinessCut += bCut;
      totalTrainerCut += tCut;

      if (c.paidToTrainerAt) {
        totalPaid += tCut;
      } else {
        totalUnpaid += tCut;
      }

      // Group by trainer
      const tid = c.trainerId;
      if (!trainerMap[tid]) {
        trainerMap[tid] = { trainerId: tid, totalEarned: 0, unpaid: 0, paid: 0, commissionCount: 0 };
      }
      trainerMap[tid].totalEarned += tCut;
      trainerMap[tid].commissionCount += 1;
      if (c.paidToTrainerAt) {
        trainerMap[tid].paid += tCut;
      } else {
        trainerMap[tid].unpaid += tCut;
      }
    }

    // Enrich trainer names
    const trainerIds = Object.keys(trainerMap).map(Number);
    if (trainerIds.length > 0) {
      const trainers = await User.findAll({
        where: { id: trainerIds },
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      for (const t of trainers) {
        if (trainerMap[t.id]) {
          trainerMap[t.id].firstName = t.firstName;
          trainerMap[t.id].lastName = t.lastName;
          trainerMap[t.id].email = t.email;
        }
      }
    }

    res.json({
      success: true,
      summary: {
        totalGross: parseFloat(totalGross.toFixed(2)),
        totalBusinessCut: parseFloat(totalBusinessCut.toFixed(2)),
        totalTrainerCut: parseFloat(totalTrainerCut.toFixed(2)),
        totalUnpaid: parseFloat(totalUnpaid.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        commissionCount: commissions.length,
      },
      trainers: Object.values(trainerMap).map(t => ({
        ...t,
        totalEarned: parseFloat(t.totalEarned.toFixed(2)),
        unpaid: parseFloat(t.unpaid.toFixed(2)),
        paid: parseFloat(t.paid.toFixed(2)),
      })),
    });
  } catch (error) {
    logger.error('[Commissions] Summary error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch commission summary' });
  }
});

/**
 * GET /api/commissions/trainer/:trainerId
 * Detailed commission history for a specific trainer
 */
router.get('/trainer/:trainerId', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { TrainerCommission, User, Order } = getCommissionModels();
    const { trainerId } = req.params;

    // Trainers can only see their own commissions. String()-coerce:
    // req.user.id is a string (authMiddleware.mjs:631).
    if (req.user.role === 'trainer' && String(req.user.id) !== String(trainerId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const commissions = await TrainerCommission.findAll({
      where: { trainerId: parseInt(trainerId) },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    // Enrich with client names
    const clientIds = [...new Set(commissions.map(c => c.clientId))];
    const clients = clientIds.length > 0
      ? await User.findAll({
          where: { id: clientIds },
          attributes: ['id', 'firstName', 'lastName'],
        })
      : [];
    const clientMap = {};
    for (const cl of clients) clientMap[cl.id] = `${cl.firstName} ${cl.lastName}`;

    const enriched = commissions.map(c => ({
      id: c.id,
      orderId: c.orderId,
      clientId: c.clientId,
      clientName: clientMap[c.clientId] || 'Unknown',
      leadSource: c.leadSource,
      isLoyaltyBump: c.isLoyaltyBump,
      sessionsGranted: c.sessionsGranted,
      sessionsConsumed: c.sessionsConsumed,
      grossAmount: parseFloat(c.grossAmount),
      trainerCut: parseFloat(c.trainerCut),
      businessCut: parseFloat(c.businessCut),
      commissionRateTrainer: parseFloat(c.commissionRateTrainer),
      commissionRateBusiness: parseFloat(c.commissionRateBusiness),
      paidToTrainerAt: c.paidToTrainerAt,
      payoutMethod: c.payoutMethod,
      payoutReference: c.payoutReference,
      createdAt: c.createdAt,
    }));

    // Calculate totals
    const totalEarned = enriched.reduce((sum, c) => sum + c.trainerCut, 0);
    const unpaid = enriched.filter(c => !c.paidToTrainerAt).reduce((sum, c) => sum + c.trainerCut, 0);

    res.json({
      success: true,
      trainerId: parseInt(trainerId),
      totalEarned: parseFloat(totalEarned.toFixed(2)),
      unpaid: parseFloat(unpaid.toFixed(2)),
      commissions: enriched,
    });
  } catch (error) {
    logger.error('[Commissions] Trainer detail error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch trainer commissions' });
  }
});

/**
 * POST /api/commissions/mark-paid
 * Mark commission(s) as paid to trainer (admin only)
 * Body: { commissionIds: number[], payoutMethod: string, payoutReference?: string }
 */
router.post('/mark-paid', protect, adminOnly, async (req, res) => {
  try {
    const { TrainerCommission } = getCommissionModels();
    const { commissionIds, payoutMethod, payoutReference } = req.body;

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'commissionIds array required' });
    }

    if (!payoutMethod) {
      return res.status(400).json({ success: false, message: 'payoutMethod required (zelle, venmo, check, direct_deposit, stripe_connect)' });
    }

    const [updatedCount] = await TrainerCommission.update(
      {
        paidToTrainerAt: new Date(),
        payoutMethod,
        payoutReference: payoutReference || null,
      },
      {
        where: {
          id: commissionIds,
          paidToTrainerAt: null, // Only update unpaid ones
        },
      }
    );

    logger.info(`[Commissions] Marked ${updatedCount} commissions as paid`, {
      payoutMethod,
      payoutReference,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: `Marked ${updatedCount} commission(s) as paid`,
      updatedCount,
    });
  } catch (error) {
    logger.error('[Commissions] Mark paid error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark commissions as paid' });
  }
});

/**
 * GET /api/commissions/payout-report
 * Generate payout report for a date range (admin only)
 * Query: startDate, endDate, trainerId? (optional filter)
 */
router.get('/payout-report', protect, adminOnly, async (req, res) => {
  try {
    const { TrainerCommission, User } = getCommissionModels();
    const { startDate, endDate, trainerId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate required' });
    }

    const whereClause = {
      created_at: {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate),
      },
    };
    if (trainerId) whereClause.trainerId = parseInt(trainerId);

    const commissions = await TrainerCommission.findAll({
      where: whereClause,
      order: [['trainerId', 'ASC'], ['created_at', 'ASC']],
    });

    // Group by trainer for payout summary
    const payoutMap = {};
    for (const c of commissions) {
      const tid = c.trainerId;
      if (!payoutMap[tid]) {
        payoutMap[tid] = {
          trainerId: tid,
          totalOwed: 0,
          alreadyPaid: 0,
          pendingPayout: 0,
          commissionCount: 0,
          commissions: [],
        };
      }
      const tCut = parseFloat(c.trainerCut) || 0;
      payoutMap[tid].totalOwed += tCut;
      payoutMap[tid].commissionCount += 1;
      if (c.paidToTrainerAt) {
        payoutMap[tid].alreadyPaid += tCut;
      } else {
        payoutMap[tid].pendingPayout += tCut;
      }
      payoutMap[tid].commissions.push({
        id: c.id,
        orderId: c.orderId,
        grossAmount: parseFloat(c.grossAmount),
        trainerCut: tCut,
        leadSource: c.leadSource,
        paid: !!c.paidToTrainerAt,
        createdAt: c.createdAt,
      });
    }

    // Enrich trainer names
    const trainerIds = Object.keys(payoutMap).map(Number);
    if (trainerIds.length > 0) {
      const trainers = await User.findAll({
        where: { id: trainerIds },
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
      for (const t of trainers) {
        if (payoutMap[t.id]) {
          payoutMap[t.id].firstName = t.firstName;
          payoutMap[t.id].lastName = t.lastName;
          payoutMap[t.id].email = t.email;
        }
      }
    }

    const report = Object.values(payoutMap).map(p => ({
      ...p,
      totalOwed: parseFloat(p.totalOwed.toFixed(2)),
      alreadyPaid: parseFloat(p.alreadyPaid.toFixed(2)),
      pendingPayout: parseFloat(p.pendingPayout.toFixed(2)),
    }));

    res.json({
      success: true,
      period: { startDate, endDate },
      report,
      grandTotal: {
        totalOwed: parseFloat(report.reduce((s, r) => s + r.totalOwed, 0).toFixed(2)),
        alreadyPaid: parseFloat(report.reduce((s, r) => s + r.alreadyPaid, 0).toFixed(2)),
        pendingPayout: parseFloat(report.reduce((s, r) => s + r.pendingPayout, 0).toFixed(2)),
      },
    });
  } catch (error) {
    logger.error('[Commissions] Payout report error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate payout report' });
  }
});

export default router;
