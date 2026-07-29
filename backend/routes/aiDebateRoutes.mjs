/**
 * AI Debate Routes — Async Debate Execution + SSE Progress
 * =========================================================
 * Exposes the recursive debate engine for workout plans, nutrition plans,
 * and progress analysis. Debates run async — frontend polls for status.
 *
 * Endpoints:
 *   POST /api/ai/debate/start        — Start a new debate (returns jobId)
 *   GET  /api/ai/debate/:jobId/status — Poll debate progress
 *   GET  /api/ai/debate/:jobId/result — Get final debate result
 *   GET  /api/ai/debate/:jobId/stream — SSE stream for real-time progress
 *
 * All routes require authentication.
 */
import express from 'express';
import logger from '../utils/logger.mjs';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import {
  startDebate,
  getDebateStatus,
  getDebateResult,
  getDebateJob,
} from '../services/ai/debate/debateOrchestrator.mjs';
import { deIdentifyClient } from '../services/ai/deIdentifier.mjs';
import { resolveClient } from '../services/ai/clientResolver.mjs';
import sequelize from '../database.mjs';

const router = express.Router();

// ── Ownership middleware — prevents IDOR on debate jobs ────────────────────

const validateDebateOwnership = (req, res, next) => {
  const job = getDebateJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Debate not found' });
  }

  if (job.userId !== req.user.id && req.user.role !== 'admin') {
    logger.warn(`[Security] User ${req.user.id} attempted unauthorized access to debate ${req.params.jobId}`);
    return res.status(403).json({ success: false, error: 'Unauthorized access' });
  }

  req.debateJob = job;
  next();
};

// ── POST /start — Launch a new debate ───────────────────────────────────────

router.post('/start', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const {
      debateType,
      clientId,
      clientRef,
      options = {},
    } = req.body;

    // Validate debate type
    const validTypes = ['workout_plan', 'nutrition_plan', 'progress_analysis'];
    if (!debateType || !validTypes.includes(debateType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid debate type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Resolve client
    let resolvedClientId = clientId;
    if (!resolvedClientId && clientRef) {
      const { resolved, error } = await resolveClient(clientRef, sequelize);
      if (!resolved) {
        return res.status(400).json({ success: false, error });
      }
      resolvedClientId = resolved.id;
    }

    if (!resolvedClientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId or clientRef is required',
      });
    }

    // Fetch client data for de-identification
    const [client] = await sequelize.query(
      `SELECT id, "firstName", "lastName", age, gender, "nasmPhase",
              "trainingExperience", "fitnessGoals", "clientSource", "isActive"
       FROM "Users" WHERE id = :clientId AND "isActive" = true LIMIT 1`,
      { replacements: { clientId: resolvedClientId }, type: sequelize.QueryTypes.SELECT }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or inactive' });
    }

    // Fetch enrichment data (pain, workouts, macros, goals)
    const [painEntries, recentWorkouts, macroLogs, goals] = await Promise.allSettled([
      sequelize.query(
        // client_pain_entries / "bodyRegion" (SWA-71); aliased to keep the output shape.
        `SELECT "bodyRegion" AS "bodyPart", "painLevel" as level, "isActive" FROM client_pain_entries
         WHERE "userId" = :clientId AND "isActive" = true ORDER BY "createdAt" DESC LIMIT 10`,
        { replacements: { clientId: resolvedClientId }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
      sequelize.query(
        `SELECT
           ws.id,
           ws.title,
           ws.date AS "createdAt",
           ws.duration,
           ws.intensity,
           ws.notes,
           json_agg(json_build_object(
             'exerciseName', wl."exerciseName",
             'name', wl."exerciseName",
             'setNumber', wl."setNumber",
             'reps', wl.reps,
             'weight', wl.weight
           ) ORDER BY wl."exerciseName", wl."setNumber") AS exercises
         FROM workout_sessions ws
         JOIN workout_logs wl ON wl."sessionId" = ws.id
         WHERE ws."userId" = :clientId
           AND ws.status = 'completed'
         GROUP BY ws.id, ws.title, ws.date, ws.duration, ws.intensity, ws.notes
         ORDER BY ws.date DESC
         LIMIT 5`,
        { replacements: { clientId: resolvedClientId }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
      sequelize.query(
        `SELECT calories, protein, carbs, fat FROM daily_macro_logs
         WHERE "userId" = :clientId ORDER BY "createdAt" DESC LIMIT 7`,
        { replacements: { clientId: resolvedClientId }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
      sequelize.query(
        // lowercase `goals` / "progressPercentage" (SWA-71); ::float since NUMERIC arrives as text.
        `SELECT title, description, "progressPercentage"::float AS progress, status FROM goals
         WHERE "userId" = :clientId AND status = 'active' LIMIT 10`,
        { replacements: { clientId: resolvedClientId }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []),
    ]);

    // De-identify client data
    const enrichment = {
      painEntries: painEntries.status === 'fulfilled' ? painEntries.value : [],
      workouts: recentWorkouts.status === 'fulfilled' ? recentWorkouts.value : [],
      macroLogs: macroLogs.status === 'fulfilled' ? macroLogs.value : [],
      goals: goals.status === 'fulfilled' ? goals.value : [],
    };

    const { deIdentified } = deIdentifyClient(client, enrichment);

    // Start debate (returns immediately with jobId)
    const jobId = startDebate(debateType, deIdentified, req.user.id, options);

    logger.info('[AIDebate] Debate started', {
      jobId,
      debateType,
      clientId: resolvedClientId,
      userId: req.user.id,
    });

    res.json({
      success: true,
      jobId,
      debateType,
      message: `${debateType} debate started. Poll /api/ai/debate/${jobId}/status for progress.`,
    });

  } catch (err) {
    logger.error('[AIDebate] Start route error', { error: err.message, stack: err.stack });
    res.status(500).json({ success: false, error: 'Failed to start debate' });
  }
});

// ── GET /:jobId/status — Poll debate progress ──────────────────────────────

router.get('/:jobId/status', protect, validateDebateOwnership, (req, res) => {
  const status = getDebateStatus(req.params.jobId);
  if (!status) {
    return res.status(404).json({ success: false, error: 'Debate not found' });
  }
  res.json({ success: true, ...status });
});

// ── GET /:jobId/result — Get final debate result ────────────────────────────

router.get('/:jobId/result', protect, validateDebateOwnership, (req, res) => {
  const result = getDebateResult(req.params.jobId);
  if (!result) {
    const status = getDebateStatus(req.params.jobId);
    if (status && status.state === 'running') {
      return res.status(202).json({
        success: false,
        error: 'Debate still in progress',
        state: status.state,
        currentRound: status.currentRound,
      });
    }
    return res.status(404).json({ success: false, error: 'Debate not found or not yet complete' });
  }
  res.json({ success: true, ...result });
});

// ── GET /:jobId/stream — SSE stream for real-time progress ──────────────────

router.get('/:jobId/stream', protect, validateDebateOwnership, (req, res) => {
  const jobId = req.params.jobId;
  const job = req.debateJob;

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  // Support reconnection via Last-Event-ID (ARCH-2 SSE reconnection pattern)
  const lastEventId = parseInt(req.headers['last-event-id'] || '0', 10) || 0;
  let lastSent = lastEventId;

  // Replay events the client missed (or all if first connection)
  for (let i = lastSent; i < job.progress.length; i++) {
    res.write(`id: ${i + 1}\ndata: ${JSON.stringify(job.progress[i])}\n\n`);
  }
  lastSent = job.progress.length;

  // Poll for new events (throttled 500ms per V3 spec)
  const interval = setInterval(() => {
    const currentJob = getDebateJob(jobId);
    if (!currentJob) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Debate not found' })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }

    // Send any new progress events with sequential IDs
    while (lastSent < currentJob.progress.length) {
      res.write(`id: ${lastSent + 1}\ndata: ${JSON.stringify(currentJob.progress[lastSent])}\n\n`);
      lastSent++;
    }

    // Close stream when debate is done
    if (['complete', 'partial', 'failed', 'timeout'].includes(currentJob.state)) {
      res.write(`data: ${JSON.stringify({ type: 'done', state: currentJob.state })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 500);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;
