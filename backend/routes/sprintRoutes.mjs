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
    const sprint = await getSprintById(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, error: 'Sprint not found' });
    if (sprint.trainerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    res.json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Get failed:', err.message);
    sendSprintRouteError(res, 500, 'Could not load sprint details.');
  }
});

// ── PUT /sprints/:id — Update sprint ─────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const sprint = await updateSprint(req.params.id, req.user.id, req.body);
    res.json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Update failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not update sprint. Check the sprint settings and try again.');
  }
});

// ── DELETE /sprints/:id — Archive sprint ─────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await archiveSprint(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    logger.error('[SprintRoutes] Archive failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not archive sprint.');
  }
});

// ── POST /sprints/:id/generate — SSE progress stream (ARCH-2 reconnection) ──
router.post('/:id/generate', genLimiter, async (req, res) => {
  const sprintId = parseInt(req.params.id);

  // Reject duplicate generation if one is already in progress (Codex R18 fix)
  const existingJob = sprintJobs.get(sprintId);
  if (existingJob && !existingJob.done) {
    return res.status(409).json({
      success: false,
      error: 'Generation already in progress for this sprint',
    });
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

    const result = await generateSprintClasses(sprintId, sendEvent);

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
  setTimeout(() => sprintJobs.delete(sprintId), SPRINT_JOB_TTL);
});

// ── GET /sprints/:id/generate/stream — Reconnect to in-progress generation ──
router.get('/:id/generate/stream', async (req, res) => {
  const sprintId = parseInt(req.params.id);
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
    const week = await updateWeek(req.params.id, req.params.weekId, req.user.id, req.body);
    res.json({ success: true, week });
  } catch (err) {
    logger.error('[SprintRoutes] UpdateWeek failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not update sprint week.');
  }
});

// ── PUT /sprints/:sprintId/slots/:slotId — Update slot ───────────────
router.put('/:sprintId/slots/:slotId', async (req, res) => {
  try {
    const slot = await updateSlot(req.params.sprintId, req.params.slotId, req.user.id, req.body);
    res.json({ success: true, slot });
  } catch (err) {
    logger.error('[SprintRoutes] UpdateSlot failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not update sprint slot.');
  }
});

// ── PUT /sprints/:sprintId/slots/:slotId/confirm — Mark as taught ────
router.put('/:sprintId/slots/:slotId/confirm', async (req, res) => {
  try {
    const slot = await confirmSlotUsed(
      req.params.sprintId, req.params.slotId, req.user.id, req.body,
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
    const result = await regenerateSlot(
      req.params.sprintId, req.params.slotId, req.user.id,
    );
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[SprintRoutes] Regenerate failed:', err.message);
    sendSprintRouteError(res, 400, 'Could not regenerate sprint slot.');
  }
});

export default router;
