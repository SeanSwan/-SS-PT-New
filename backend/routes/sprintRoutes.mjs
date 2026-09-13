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
import {
  SprintActorForbiddenError, SprintIdInvalidError, SprintObjectNotFoundError,
} from '../services/bootcamp/sprintAccess.mjs';
import { SprintCalendarValidationError, SprintTaughtConflictError } from '../services/bootcamp/sprintCalendarContract.mjs';
import { registerSprintStreamRoute } from './sprintStream.mjs';
import logger from '../utils/logger.mjs';

// S08 hostile-review fix: ONLY these error types have messages written for a
// client. Everything else — every ORM/driver/provider error — gets the route's
// generic text. The previous `status >= 500` guard was defeated by the six
// routes that pass a 400 fallback, and no Sequelize error carries `.status`, so
// raw DB messages ("column ... does not exist", and via AccessDeniedError even
// `password authentication failed for user ...`) reached the client verbatim.
const CLIENT_SAFE_SPRINT_ERRORS = [
  SprintIdInvalidError,
  SprintActorForbiddenError,
  SprintObjectNotFoundError,
  SprintCalendarValidationError,
  SprintTaughtConflictError, // §5 line 216 — a changed payload on retry is a conflict.
];

const isClientSafeSprintError = (err) =>
  CLIENT_SAFE_SPRINT_ERRORS.some((ErrorType) => err instanceof ErrorType);

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

// ── S08/R-H03: the actor comes from authenticated req.user ONLY ──────
// Never from req.body, query or generated metadata.
const actorFromRequest = (req) => ({ userId: req.user?.id, role: req.user?.role });

// Access errors carry their own sanitized status (400/403/404). Anything else
// keeps the route's existing envelope and NEVER echoes an ORM/provider message.
// S08/R-H03: authorize the Sprint BEFORE any job lookup, job creation, SSE
// header flush or generation dispatch. Takes the RAW path param so the shared
// normalizer validates it (an earlier `parseInt` here let `/1e3/generate` act on
// Sprint 1 and `/0x0C/generate` on Sprint 12). Returns the AUTHORIZED, normalized
// id, or null when it already replied.
const authorizeSprintOrRespond = async (req, res, rawSprintId) => {
  try {
    const sprint = await getSprintById(rawSprintId, actorFromRequest(req));
    return sprint?.id ?? null;
  } catch (err) {
    logger.error('[SprintRoutes] Access check failed:', err.message);
    sendSprintServiceError(res, err, 500, 'Could not load sprint details.');
    return null;
  }
};

// Allowlist, not status arithmetic: only a known client-safe error contributes
// its own status and message. Everything else keeps the route's envelope.
const sendSprintServiceError = (res, err, fallbackStatus, fallbackMessage) => {
  const clientSafe = isClientSafeSprintError(err);
  const status = clientSafe && Number.isInteger(err.status) ? err.status : fallbackStatus;
  const message = clientSafe && typeof err.message === 'string' && err.message
    ? err.message
    : fallbackMessage;
  return sendSprintRouteError(res, status, message);
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
    const sprint = await createSprint(actorFromRequest(req), req.body);
    res.status(201).json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Create failed:', err.message);
    sendSprintServiceError(res, err, 400, 'Could not create sprint. Check the sprint settings and try again.');
  }
});

// ── GET /sprints — List sprints ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const sprints = await listSprints(actorFromRequest(req));
    res.json({ success: true, sprints });
  } catch (err) {
    logger.error('[SprintRoutes] List failed:', err.message);
    sendSprintServiceError(res, err, 500, 'Could not load sprint plans.');
  }
});

// ── GET /sprints/:id — Get sprint detail ─────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    // The service authorizes the object (owner or explicit admin) and reports a
    // foreign Sprint exactly like an absent one, so no manual check is repeated
    // here and a foreign id can never be distinguished from a missing one.
    const sprint = await getSprintById(req.params.id, actorFromRequest(req));
    res.json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Get failed:', err.message);
    sendSprintServiceError(res, err, 500, 'Could not load sprint details.');
  }
});

// ── PUT /sprints/:id — Update sprint ─────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const sprint = await updateSprint(req.params.id, actorFromRequest(req), req.body);
    res.json({ success: true, sprint });
  } catch (err) {
    logger.error('[SprintRoutes] Update failed:', err.message);
    sendSprintServiceError(res, err, 400, 'Could not update sprint. Check the sprint settings and try again.');
  }
});

// ── DELETE /sprints/:id — Archive sprint ─────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await archiveSprint(req.params.id, actorFromRequest(req));
    res.json(result);
  } catch (err) {
    logger.error('[SprintRoutes] Archive failed:', err.message);
    sendSprintServiceError(res, err, 400, 'Could not archive sprint.');
  }
});

// ── POST /sprints/:id/generate — SSE progress stream (ARCH-2 reconnection) ──
router.post('/:id/generate', genLimiter, async (req, res) => {
  // S08/R-H03: authorize FIRST, on the RAW param, so the shared normalizer sees
  // it. The duplicate-job guard below reads the job cache, so a foreign Sprint
  // must be refused before it can even learn whether someone else's generation
  // is in progress.
  const sprintId = await authorizeSprintOrRespond(req, res, req.params.id);
  if (sprintId === null) return;

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

    const result = await generateSprintClasses(sprintId, actorFromRequest(req), sendEvent);

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
// R-H04 (slice D): the route, its Last-Event-ID replay and its terminal fallback
// live in sprintStream.mjs — extracted to bring this file back toward the cap.
registerSprintStreamRoute(router, {
  authorizeSprintOrRespond,
  sprintJobs,
  actorFromRequest,
  // Persisted status is the authority when no job is cached: it survives the
  // process restart that empties `sprintJobs`. The ACTOR is the request's own, so
  // the read is authorized exactly like every other sprint read.
  getSprintById,
});

// ── PUT /sprints/:id/weeks/:weekId — Update week ─────────────────────
router.put('/:id/weeks/:weekId', async (req, res) => {
  try {
    const week = await updateWeek(req.params.id, req.params.weekId, actorFromRequest(req), req.body);
    res.json({ success: true, week });
  } catch (err) {
    logger.error('[SprintRoutes] UpdateWeek failed:', err.message);
    sendSprintServiceError(res, err, 400, 'Could not update sprint week.');
  }
});

// ── PUT /sprints/:sprintId/slots/:slotId — Update slot ───────────────
router.put('/:sprintId/slots/:slotId', async (req, res) => {
  try {
    const slot = await updateSlot(req.params.sprintId, req.params.slotId, actorFromRequest(req), req.body);
    res.json({ success: true, slot });
  } catch (err) {
    logger.error('[SprintRoutes] UpdateSlot failed:', err.message);
    sendSprintServiceError(res, err, 400, 'Could not update sprint slot.');
  }
});

// ── PUT /sprints/:sprintId/slots/:slotId/confirm — Mark as taught ────
router.put('/:sprintId/slots/:slotId/confirm', async (req, res) => {
  try {
    const slot = await confirmSlotUsed(
      req.params.sprintId, req.params.slotId, actorFromRequest(req), req.body,
    );
    res.json({ success: true, slot });
  } catch (err) {
    logger.error('[SprintRoutes] Confirm failed:', err.message);
    sendSprintServiceError(res, err, 400, 'Could not confirm the sprint class.');
  }
});

// ── POST /sprints/:sprintId/slots/:slotId/regenerate — Regen one ─────
router.post('/:sprintId/slots/:slotId/regenerate', genLimiter, async (req, res) => {
  try {
    const result = await regenerateSlot(
      req.params.sprintId, req.params.slotId, actorFromRequest(req),
    );
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[SprintRoutes] Regenerate failed:', err.message);
    // NOT the hardcoded `sendSprintRouteError(res, 400, …)`, which flattened every failure into a
    // generic 400 and would have swallowed the round-128 taught-slot refusal; same allowlist and same
    // fail-closed default as the confirm route below. Full reasoning: ledger, round 128.
    sendSprintServiceError(res, err, 400, 'Could not regenerate sprint slot.');
  }
});

export default router;
