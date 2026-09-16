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
import { buildDebateClientContext } from '../services/ai/debate/debateClientContextService.mjs';
import { resolveClient } from '../services/ai/clientResolver.mjs';
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import sequelize from '../database.mjs';

const router = express.Router();

const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

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

    // Resolve client. Direct IDs are parsed strictly so coercion cannot turn an
    // invalid target into a different client's domain read.
    const hasDirectClientId = clientId !== undefined && clientId !== null && clientId !== '';
    let resolvedClientId = hasDirectClientId ? parseStrictPositiveInteger(clientId) : null;
    if (hasDirectClientId && !resolvedClientId) {
      return res.status(400).json({ success: false, error: 'clientId must be a positive integer' });
    }

    if (!resolvedClientId && clientRef) {
      const resolverOptions = req.user.role === 'trainer' ? { trainerId: req.user.id } : {};
      const { resolved, error } = await resolveClient(clientRef, sequelize, resolverOptions);
      if (!resolved) {
        return res.status(400).json({ success: false, error });
      }
      resolvedClientId = parseStrictPositiveInteger(resolved.id);
      if (!resolvedClientId) {
        return res.status(404).json({ success: false, error: 'Client not found or inactive' });
      }
    }

    if (!resolvedClientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId or clientRef is required',
      });
    }

    // This must be the first client-domain boundary. In particular, do not
    // fetch the Users row, enrichment, or start a provider-backed debate until
    // the trainer's current assignment has been checked.
    let allowed;
    try {
      allowed = await assertAssignmentOrAdmin(
        req.user.id,
        req.user.role,
        resolvedClientId,
        { throwOnUnavailable: true },
      );
    } catch (error) {
      if (error?.code === 'ASSIGNMENT_LOOKUP_UNAVAILABLE') {
        return res.status(503).json({ success: false, error: 'Client access is temporarily unavailable' });
      }
      throw error;
    }
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Client access denied' });
    }

    // Fetch client data only after assignment authorization. A profile lookup
    // outage is also unavailable health data; do not start a provider debate.
    let clientRows;
    try {
      clientRows = await sequelize.query(
        // "Users" has no age/nasmPhase; the column is singular "fitnessGoal" (SWA-71).
        `SELECT id, "firstName", "lastName", "dateOfBirth", gender,
                "trainingExperience", "fitnessGoal" AS "fitnessGoals", "clientSource", "isActive"
         FROM "Users" WHERE id = :clientId AND "isActive" = true LIMIT 1`,
        { replacements: { clientId: resolvedClientId }, type: sequelize.QueryTypes.SELECT }
      );
    } catch {
      return res.status(503).json({ success: false, error: 'Client health data is temporarily unavailable' });
    }
    if (!Array.isArray(clientRows)) {
      return res.status(503).json({ success: false, error: 'Client health data is temporarily unavailable' });
    }
    const [client] = clientRows;

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or inactive' });
    }

    // Required health enrichment is shared with the command executor and must
    // fail closed before any provider-backed debate is started. The shared
    // builder owns the canonical daily_macro_logs query.
    const { deIdentified } = await buildDebateClientContext(
      resolvedClientId,
      sequelize,
      client,
    );

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
    if (err?.code === 'AI_CONTEXT_UNAVAILABLE') {
      return res.status(503).json({ success: false, error: 'Client health data is temporarily unavailable' });
    }
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
