/**
 * Admin Ops Pipeline Routes (SWA-138 S16)
 * =======================================
 * Base path: /api/admin (mounted in core/routes.mjs)
 *
 * The coaching-record pipeline: is voice ingestion working, and is group-class
 * attendance actually being captured. Split from adminOpsAggregateRoutes when
 * the combined file crossed the 300-line cap (Rule 4); same discipline —
 * SQL rollups, bounded windows, and a stated `basis` on every response.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ GET /ops/plaud-health   Admin  Voice-clip ingest + R2 mirror health   │
 * │ GET /ops/bootcamp-ops   Admin  Class volume + attendance logging gaps │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import express from 'express';
import { Op, fn, col } from 'sequelize';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import PlaudClip from '../models/PlaudClip.mjs';
import PlaudClipMirrorJob from '../models/PlaudClipMirrorJob.mjs';
import BootcampClassLog from '../models/BootcampClassLog.mjs';
import { resolveWindowDays, since } from './opsAggregateHelpers.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * GET /ops/plaud-health
 * Voice-clip ingestion health across ALL trainers. The per-trainer intake UI
 * shows one person's clips; this answers "is ingestion working at all".
 *
 * Two independent failure surfaces: clips that never reached a terminal state
 * (stuck uploading / awaiting merge) and R2 mirror jobs that exhausted retries.
 * `failed_terminal` is the one that needs a human — retryable jobs self-heal.
 */
router.get('/ops/plaud-health', protect, adminOnly, async (req, res) => {
  try {
    const windowDays = resolveWindowDays(req.query.days);
    const from = since(windowDays);

    const [clipRows, mirrorRows] = await Promise.all([
      PlaudClip.findAll({
        where: { createdAt: { [Op.gte]: from } },
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      PlaudClipMirrorJob.findAll({
        where: { created_at: { [Op.gte]: from } },
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
    ]);

    const tally = (rows) => rows.reduce((acc, r) => {
      acc[r.status] = Number(r.count || 0);
      return acc;
    }, {});
    const clips = tally(clipRows);
    const mirrors = tally(mirrorRows);

    const totalClips = Object.values(clips).reduce((a, b) => a + b, 0);
    const totalMirrors = Object.values(mirrors).reduce((a, b) => a + b, 0);
    // Stuck = never reached a terminal state. 'lost' is already terminal-bad.
    const stuckClips = (clips.uploading || 0) + (clips.pending_merge || 0);
    const terminalFailures = mirrors.failed_terminal || 0;

    return res.json({
      success: true,
      data: {
        windowDays,
        basis: 'clips and mirror jobs created in window, grouped by status',
        totalClips,
        merged: clips.merged || 0,
        lost: clips.lost || 0,
        stuckClips,
        mirror: {
          total: totalMirrors,
          mirrored: mirrors.mirrored || 0,
          retrying: mirrors.failed_retryable || 0,
          terminalFailures,
        },
        // Terminal mirror failures are the only bucket a human must action.
        needsAttention: terminalFailures + (clips.lost || 0),
      },
    });
  } catch (error) {
    logger.error('[OpsAggregate] plaud-health failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute PLAUD health' });
  }
});

/**
 * GET /ops/bootcamp-ops
 * Group-training volume and whether attendance actually got recorded.
 *
 * attendance is JSONB and NULL means "never recorded" (the service no-ops a
 * second submission), so an unlogged class is a real coaching-record gap —
 * counted here rather than hidden.
 */
router.get('/ops/bootcamp-ops', protect, adminOnly, async (req, res) => {
  try {
    const windowDays = resolveWindowDays(req.query.days);
    const from = since(windowDays);

    const rows = await BootcampClassLog.findAll({
      where: { classDate: { [Op.gte]: from } },
      attributes: [
        'trainerId',
        [fn('COUNT', col('id')), 'classes'],
        [fn('COUNT', col('attendance')), 'logged'],
      ],
      group: ['trainerId'],
      raw: true,
    });

    let classes = 0;
    let logged = 0;
    const byTrainer = rows.map((r) => {
      const c = Number(r.classes || 0);
      const l = Number(r.logged || 0);
      classes += c;
      logged += l;
      return { trainerId: Number(r.trainerId), classes: c, logged: l, unlogged: c - l };
    }).sort((a, b) => b.unlogged - a.unlogged);

    return res.json({
      success: true,
      data: {
        windowDays,
        basis: 'bootcamp classes in window; "logged" = attendance recorded (NULL attendance means never recorded)',
        classes,
        logged,
        unlogged: classes - logged,
        loggedPct: classes > 0 ? Math.round((logged / classes) * 100) : null,
        byTrainer: byTrainer.slice(0, 15),
      },
    });
  } catch (error) {
    logger.error('[OpsAggregate] bootcamp-ops failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to compute bootcamp ops' });
  }
});

export default router;
