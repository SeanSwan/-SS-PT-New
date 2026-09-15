/**
 * ============================================================================
 * FILE: sprintRoutes.mjs
 * PURPOSE: REST API for bootcamp sprint planning and generation
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * POST   /api/bootcamp/sprints              Create new sprint
 * GET    /api/bootcamp/sprints              List trainer's sprints
 * GET    /api/bootcamp/sprints/:id          Get sprint with weeks/slots
 * PUT    /api/bootcamp/sprints/:id          Update sprint settings
 * DELETE /api/bootcamp/sprints/:id          Archive sprint
 * POST   /api/bootcamp/sprints/:id/generate SSE: Generate all classes
 * PUT    /api/bootcamp/sprints/:id/weeks/:weekId          Update week
 * PUT    /api/bootcamp/sprints/:sprintId/slots/:slotId    Update slot
 * PUT    /api/bootcamp/sprints/:sprintId/slots/:slotId/confirm  Confirm taught
 * POST   /api/bootcamp/sprints/:sprintId/slots/:slotId/regenerate  Regen slot
 * ============================================================================
 */

import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import rateLimit from 'express-rate-limit';
import {
  createSprint, getSprintById, listSprints,
  updateSprint, archiveSprint,
  updateWeek, updateSlot, confirmSlotUsed,
} from '../services/bootcamp/sprintService.mjs';
import { generateSprintClasses, regenerateSlot } from '../services/bootcamp/sprintGenerator.mjs';
import { sprintClaimIsLive, validateGenerationRequest } from '../services/bootcamp/sprintGenerationClaim.mjs';
import logger from '../utils/logger.mjs';

// ── ARCH-2: In-memory progress store for SSE reconnection ──────────
const sprintJobs = new Map(); // sprintId → { events: [], done: boolean }
const SPRINT_JOB_TTL = 5 * 60 * 1000; // 5 min TTL after completion
const SPRINT_INTERNAL_ERROR = 'internal_error';
const SPRINT_REQUEST_ERROR = 'invalid_sprint_request';
const SPRINT_GENERATION_ERROR = 'sprint_generation_failed';

const router = Router();

const sendSprintRouteError = (
  res,
  status,
  message,
  code = status >= 500 ? SPRINT_INTERNAL_ERROR : SPRINT_REQUEST_ERROR,
) => res.status(status).json({ success: false, error: code, message });

const sendSprintEventError = (sendEvent, message) => sendEvent({
  type: 'error',
  error: message,
  code: SPRINT_GENERATION_ERROR,
});

const positiveId = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

// ── Auth: admin + trainer only ───────────────────────────────────────
router.use(protect);
router.use(authorize(['admin', 'trainer']));

// ── Rate limit for generation (expensive) ────────────────────────────
const genLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Sprint generation rate limit reached. Try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /sprints — Create new sprint ────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const sprint = await createSprint(req.user.id, req.body);
    res.status(201).json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Create failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not create sprint. Check the sprint settings and try again.');
  }
});

// ── GET /sprints — List sprints ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const sprints = await listSprints(req.user.id);
    res.json({ success: true, sprints });
  } catch (err) {
    logger.error('[SprintRoutes] List failed:', err.message);
    sendSprintRouteError(res, 500, 'Could not load sprint plans.');
  }
});

// ── GET /sprints/:id — Get sprint detail ─────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const sprintId = positiveId(req.params.id);
    if (sprintId === null) return sendSprintRouteError(res, 400, 'Valid sprint ID required');
    const sprint = await getSprintById(sprintId, { userId: req.user.id, role: req.user.role });
    if (!sprint) return res.status(404).json({ success: false, error: 'Sprint not found' });
    res.json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Get failed:', err.message);
    sendSprintRouteError(res, 500, 'Could not load sprint details.');
  }
});

// ── PUT /sprints/:id — Update sprint ─────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const sprintId = positiveId(req.params.id);
    if (sprintId === null) return sendSprintRouteError(res, 400, 'Valid sprint ID required');
    const sprint = await updateSprint(sprintId, req.user.id, req.body);
    res.json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Update failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not update sprint. Check the sprint settings and try again.');
  }
});

// ── DELETE /sprints/:id — Archive sprint ─────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const sprintId = positiveId(req.params.id);
    if (sprintId === null) return sendSprintRouteError(res, 400, 'Valid sprint ID required');
    const result = await archiveSprint(sprintId, req.user.id);
    res.json(result);
  } catch (err) {
    logger.error('[SprintRoutes] Archive failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not archive sprint.');
  }
});

// ── POST /sprints/:id/generate — SSE progress stream (ARCH-2 reconnection) ──
router.post('/:id/generate', genLimiter, async (req, res) => {
  const sprintId = positiveId(req.params.id);
  if (sprintId === null) return sendSprintRouteError(res, 400, 'Valid sprint ID required');

  // Authorize before consulting the process-local job map or writing SSE
  // headers. The map is an optimization, never an ownership boundary.
  let authorizedSprint;
  try {
    authorizedSprint = await getSprintById(sprintId, {
      userId: req.user.id,
      role: req.user.role,
    });
  } catch (err) {
    logger.error('[SprintRoutes] Generate authorization failed:', err.message);
    return sendSprintRouteError(res, 500, 'Could not authorize sprint generation.');
  }
  if (!authorizedSprint) return res.status(404).json({ success: false, error: 'Sprint not found' });

  // Reject duplicate generation if one is already in progress (Codex R18 fix)
  const existingJob = sprintJobs.get(sprintId);
  if (existingJob && !existingJob.done) {
    return res.status(409).json({
      success: false,
      error: 'Generation already in progress for this sprint',
    });
  }

  // F06: decide the 428/400/409 answers BEFORE committing to SSE headers.
  // Writing 200 first collapsed every claim/validation failure into one
  // opaque stream frame. The locked claim check inside claimSprint stays
  // authoritative — this read-only pre-check is best-effort against a race
  // (worst case degrades to the pre-F06 behavior).
  const invalidRequest = validateGenerationRequest(req.body);
  if (invalidRequest) {
    logger.warn('[SprintRoutes] Generate rejected pre-stream:', invalidRequest.message);
    return sendSprintRouteError(res, invalidRequest.status, invalidRequest.message);
  }
  if (sprintClaimIsLive(authorizedSprint, Date.now())) {
    return sendSprintRouteError(res, 409, 'Sprint generation in progress');
  }

  // Initialize job store for this sprint
  const job = { events: [], done: false };
  sprintJobs.set(sprintId, job);

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (data) => {
    job.events.push(data);
    const eventId = job.events.length;
    res.write(`id: ${eventId}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent({ type: 'started', sprintId });

    const result = await generateSprintClasses(sprintId, sendEvent, {
      userId: req.user.id,
      role: req.user.role,
    }, req.body);

    sendEvent(result);
    job.done = true;
    res.end();
  } catch (err) {
    logger.error('[SprintRoutes] Generate failed:', err.message);
    sendSprintEventError(sendEvent, 'Sprint generation failed');
    job.done = true;
    res.end();
  }

  // Clean up job after TTL
  const cleanup = setTimeout(() => {
    if (sprintJobs.get(sprintId) === job) sprintJobs.delete(sprintId);
  }, SPRINT_JOB_TTL);
  cleanup.unref?.();
});

// ── GET /sprints/:id/generate/stream — Reconnect to in-progress generation ──
router.get('/:id/generate/stream', async (req, res) => {
  const sprintId = positiveId(req.params.id);
  if (sprintId === null) return sendSprintRouteError(res, 400, 'Valid sprint ID required');
  let authorizedSprint;
  try {
    authorizedSprint = await getSprintById(sprintId, {
      userId: req.user.id,
      role: req.user.role,
    });
  } catch (err) {
    logger.error('[SprintRoutes] Stream authorization failed:', err.message);
    return sendSprintRouteError(res, 500, 'Could not authorize sprint stream.');
  }
  if (!authorizedSprint) return res.status(404).json({ success: false, error: 'Sprint not found' });
  const job = sprintJobs.get(sprintId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'No active generation for this sprint' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Replay from Last-Event-ID (ARCH-2 pattern)
  const lastEventId = parseInt(req.headers['last-event-id'] || '0', 10) || 0;
  let lastSent = lastEventId;

  for (let i = lastSent; i < job.events.length; i++) {
    res.write(`id: ${i + 1}\ndata: ${JSON.stringify(job.events[i])}\n\n`);
  }
  lastSent = job.events.length;

  if (job.done) {
    return res.end();
  }

  // Poll for new events until done
  const interval = setInterval(() => {
    while (lastSent < job.events.length) {
      res.write(`id: ${lastSent + 1}\ndata: ${JSON.stringify(job.events[lastSent])}\n\n`);
      lastSent++;
    }
    if (job.done) {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
});

// ── PUT /sprints/:id/weeks/:weekId — Update week ─────────────────────
router.put('/:id/weeks/:weekId', async (req, res) => {
  try {
    const sprintId = positiveId(req.params.id);
    const weekId = positiveId(req.params.weekId);
    if (sprintId === null || weekId === null) return sendSprintRouteError(res, 400, 'Valid sprint and week IDs required');
    const week = await updateWeek(sprintId, weekId, req.user.id, req.body);
    res.json({ success: true, week });
  } catch (err) {
    logger.error('[SprintRoutes] UpdateWeek failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not update sprint week.');
  }
});

// ── PUT /sprints/:sprintId/slots/:slotId — Update slot ───────────────
router.put('/:sprintId/slots/:slotId', async (req, res) => {
  try {
    const sprintId = positiveId(req.params.sprintId);
    const slotId = positiveId(req.params.slotId);
    if (sprintId === null || slotId === null) return sendSprintRouteError(res, 400, 'Valid sprint and slot IDs required');
    const slot = await updateSlot(sprintId, slotId, req.user.id, req.body);
    res.json({ success: true, slot });
  } catch (err) {
    logger.error('[SprintRoutes] UpdateSlot failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not update sprint slot.');
  }
});

// ── PUT /sprints/:sprintId/slots/:slotId/confirm — Mark as taught ────
router.put('/:sprintId/slots/:slotId/confirm', async (req, res) => {
  try {
    const sprintId = positiveId(req.params.sprintId);
    const slotId = positiveId(req.params.slotId);
    if (sprintId === null || slotId === null) return sendSprintRouteError(res, 400, 'Valid sprint and slot IDs required');
    const slot = await confirmSlotUsed(
      sprintId, slotId, req.user.id, req.body,
    );
    res.json({ success: true, slot });
  } catch (err) {
    logger.error('[SprintRoutes] Confirm failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not confirm the sprint class.');
  }
});

// ── POST /sprints/:sprintId/slots/:slotId/regenerate — Regen one ─────
router.post('/:sprintId/slots/:slotId/regenerate', genLimiter, async (req, res) => {
  try {
    const sprintId = positiveId(req.params.sprintId);
    const slotId = positiveId(req.params.slotId);
    if (sprintId === null || slotId === null) return sendSprintRouteError(res, 400, 'Valid sprint and slot IDs required');
    const result = await regenerateSlot(
      sprintId, slotId, { userId: req.user.id, role: req.user.role }, req.body,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[SprintRoutes] Regenerate failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not regenerate sprint slot.');
  }
});

export default router;
