/**
 * Admin Ops Aggregate Routes (SWA-138 S15)
 * ========================================
 * Base path: /api/admin (mounted in core/routes.mjs)
 *
 * The S11 receipts found three ops widgets blocked on the SAME gap: list
 * endpoints existed, but nothing rolled the rows up. Rather than ship widgets
 * that sum a fetched page client-side — the exact defect S6 removed from the
 * orders KPIs — these compute in SQL and return server truth.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ GET /ops/trainer-utilization  Admin  Booked vs available, per trainer │
 * │ GET /ops/cancellation-impact  Admin  Cancellations + charged/waived   │
 * │ GET /ops/activation-funnel    Admin  Signup → booked → completed      │
 * (PLAUD + bootcamp pipeline rollups live in adminOpsPipelineRoutes.mjs.)
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Every response states its own window and its counting basis, because each of
 * these numbers is easy to misread (see the "gross vs net revenue" confusion
 * S6 had to label its way out of).
 */

import express from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import TrainerAvailability from '../models/TrainerAvailability.mjs';
import { BOOKED_STATUSES, resolveWindowDays, round2, since } from './opsAggregateHelpers.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();



/**
 * GET /ops/trainer-utilization
 * Booked hours vs declared weekly availability, per trainer.
 *
 * Availability is stored as weekly recurring slots, so capacity is
 * (weekly declared hours × weeks in the window). That is an APPROXIMATION —
 * it ignores one-off blackouts — and the response says so via `basis` so the
 * number is never mistaken for a timesheet.
 */
router.get('/ops/trainer-utilization', protect, adminOnly, async (req, res) => {
  try {
    const windowDays = resolveWindowDays(req.query.days);
    const from = since(windowDays);
    const weeks = windowDays / 7;

    const trainers = await User.findAll({
      where: { role: 'trainer' },
      attributes: ['id', 'firstName'],
      limit: 200,
    });
    if (trainers.length === 0) {
      return res.json({
        success: true,
        data: { windowDays, basis: 'weekly declared availability x weeks in window', trainers: [] },
      });
    }
    const trainerIds = trainers.map((t) => t.id);

    const [bookedRows, availabilityRows] = await Promise.all([
      Session.findAll({
        where: {
          trainerId: { [Op.in]: trainerIds },
          status: { [Op.in]: BOOKED_STATUSES },
          sessionDate: { [Op.gte]: from },
        },
        attributes: [
          'trainerId',
          [fn('COUNT', col('id')), 'sessionCount'],
          [fn('SUM', col('duration')), 'bookedMinutes'],
        ],
        group: ['trainerId'],
        raw: true,
      }),
      TrainerAvailability.findAll({
        where: { trainerId: { [Op.in]: trainerIds } },
        attributes: ['trainerId', 'startTime', 'endTime'],
        raw: true,
      }),
    ]);

    const bookedByTrainer = new Map(bookedRows.map((r) => [Number(r.trainerId), r]));

    /** "HH:MM[:SS]" → minutes; guards malformed rows rather than producing NaN. */
    const minutesBetween = (start, end) => {
      const parse = (t) => {
        const [h, m] = String(t || '').split(':').map(Number);
        return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
      };
      const a = parse(start);
      const b = parse(end);
      if (a === null || b === null || b <= a) return 0;
      return b - a;
    };

    const weeklyMinutes = new Map();
    for (const slot of availabilityRows) {
      const id = Number(slot.trainerId);
      weeklyMinutes.set(id, (weeklyMinutes.get(id) || 0) + minutesBetween(slot.startTime, slot.endTime));
    }

    const rows = trainers.map((t) => {
      const booked = bookedByTrainer.get(t.id);
      const bookedMinutes = Number(booked?.bookedMinutes || 0);
      const capacityMinutes = (weeklyMinutes.get(t.id) || 0) * weeks;
      return {
        trainerId: t.id,
        firstName: t.firstName || 'Trainer',
        sessions: Number(booked?.sessionCount || 0),
        bookedHours: round2(bookedMinutes / 60),
        capacityHours: round2(capacityMinutes / 60),
        // null (not 0) when a trainer has declared no availability — "unknown"
        // and "0% utilized" are different facts and must not be conflated.
        utilizationPct: capacityMinutes > 0
          ? Math.round((bookedMinutes / capacityMinutes) * 100)
          : null,
      };
    }).sort((a, b) => (b.utilizationPct ?? -1) - (a.utilizationPct ?? -1));

    return res.json({
      success: true,
      data: {
        windowDays,
        basis: 'weekly declared availability x weeks in window (ignores one-off blackouts)',
        trainers: rows,
      },
    });
  } catch (error) {
    logger.error('[OpsAggregate] trainer-utilization failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute trainer utilization' });
  }
});

/**
 * GET /ops/cancellation-impact
 * How much revenue late cancellations put at risk, and how it was decided.
 * Charged vs waived is the policy signal; pending is the work queue.
 */
router.get('/ops/cancellation-impact', protect, adminOnly, async (req, res) => {
  try {
    const windowDays = resolveWindowDays(req.query.days);
    const from = since(windowDays);

    const rows = await Session.findAll({
      where: { status: 'cancelled', sessionDate: { [Op.gte]: from } },
      attributes: [
        'cancellationDecision',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', literal('COALESCE("cancellationChargeAmount", 0)')), 'amount'],
      ],
      group: ['cancellationDecision'],
      raw: true,
    });

    const bucket = { pending: 0, charged: 0, waived: 0, undecided: 0 };
    const amounts = { charged: 0, waived: 0 };
    let total = 0;
    for (const r of rows) {
      const count = Number(r.count || 0);
      total += count;
      const key = r.cancellationDecision;
      if (key === 'charged' || key === 'waived' || key === 'pending') {
        bucket[key] += count;
        if (key === 'charged' || key === 'waived') amounts[key] += Number(r.amount || 0);
      } else {
        bucket.undecided += count;
      }
    }

    return res.json({
      success: true,
      data: {
        windowDays,
        basis: 'sessions with status=cancelled in window, grouped by admin decision',
        totalCancellations: total,
        byDecision: bucket,
        chargedAmountUSD: round2(amounts.charged),
        waivedAmountUSD: round2(amounts.waived),
        // What the policy let go: the clearest single number here.
        leakageUSD: round2(amounts.waived),
      },
    });
  } catch (error) {
    logger.error('[OpsAggregate] cancellation-impact failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute cancellation impact' });
  }
});

/**
 * GET /ops/activation-funnel
 * Signup → first session booked → first session completed, for clients who
 * signed up inside the window. Activation is the retention lever; this shows
 * where new clients stall.
 */
router.get('/ops/activation-funnel', protect, adminOnly, async (req, res) => {
  try {
    const windowDays = resolveWindowDays(req.query.days);
    const from = since(windowDays);

    const signups = await User.findAll({
      where: { role: 'client', createdAt: { [Op.gte]: from } },
      attributes: ['id'],
      limit: 5000,
      raw: true,
    });
    const ids = signups.map((u) => u.id);
    if (ids.length === 0) {
      return res.json({
        success: true,
        data: {
          windowDays,
          basis: 'clients created in window; booked/completed measured on their sessions',
          signups: 0, booked: 0, completed: 0, bookedPct: null, completedPct: null,
        },
      });
    }

    const [bookedRows, completedRows] = await Promise.all([
      Session.findAll({
        where: { userId: { [Op.in]: ids }, status: { [Op.in]: BOOKED_STATUSES } },
        attributes: [[fn('COUNT', fn('DISTINCT', col('userId'))), 'n']],
        raw: true,
      }),
      Session.findAll({
        where: { userId: { [Op.in]: ids }, status: 'completed' },
        attributes: [[fn('COUNT', fn('DISTINCT', col('userId'))), 'n']],
        raw: true,
      }),
    ]);

    const signupCount = ids.length;
    const booked = Number(bookedRows?.[0]?.n || 0);
    const completed = Number(completedRows?.[0]?.n || 0);

    return res.json({
      success: true,
      data: {
        windowDays,
        basis: 'clients created in window; booked/completed measured on their sessions',
        signups: signupCount,
        booked,
        completed,
        bookedPct: Math.round((booked / signupCount) * 100),
        completedPct: Math.round((completed / signupCount) * 100),
      },
    });
  } catch (error) {
    logger.error('[OpsAggregate] activation-funnel failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute activation funnel' });
  }
});

export default router;
