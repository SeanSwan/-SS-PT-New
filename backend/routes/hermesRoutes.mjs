/**
 * Hermes Agent Routes - /api/hermes
 * =================================
 * Durable REST access to the Hermes task queue.
 *
 * Endpoints:
 *   POST /api/hermes/tasks                  - admin/trainer task creation
 *   GET  /api/hermes/tasks                  - admin/trainer list
 *   GET  /api/hermes/tasks/:id              - scoped detail
 *   POST /api/hermes/tasks/:id/cancel       - scoped cancel
 *   POST /api/hermes/tasks/:id/complete     - scoped fulfillment close
 *   POST /api/hermes/coach-review-requests  - self-scoped client CTA request
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  createTask,
  listTasks,
  getTask,
  cancelTask,
  completeTask,
  failTask,
} from '../services/hermes/hermesService.mjs';

const router = express.Router();
const coachReviewRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many coach review requests. Please try again later.',
    retryAfter: '15 minutes',
  },
});
const VALID_AGENT_TYPES = ['dev', 'coach', 'content', 'marketer', 'platform', 'ops', 'nutrition', 'life'];
const VALID_PRIORITIES = ['low', 'normal', 'high'];
const COACH_REVIEW_REASONS = {
  progress_proof: 'Progress proof review',
  pain_flag: 'Pain flag review',
  plan_review: 'Plan review',
  milestone: 'Milestone review',
  low_confidence_parse: 'Workout draft review',
  consult: 'Coach consult request',
};
const COACH_REVIEW_ACTIONS = new Set(['trainer_review', 'book_consult', 'plan_review', 'share_milestone']);
const COACH_REVIEW_SOURCES = new Set(['workout_log', 'progress_proof', 'plaud_draft', 'manual', 'challenge', 'plan']);
const FORBIDDEN_REVIEW_KEYS = new Set([
  'transcript',
  'rawTranscript',
  'notes',
  'injuryNotes',
  'healthNotes',
  'clientName',
  'clientEmail',
  'clientPhone',
  'message',
]);

function requireAdminOrTrainer(req, res, next) {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'trainer') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin or trainer role required.',
    });
  }
  next();
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanReference(value) {
  return cleanText(value, 120).replace(/[^a-zA-Z0-9:_./-]/g, '');
}

function taskSummary(task) {
  return {
    id: task.id,
    agentType: task.agentType,
    taskTitle: task.taskTitle,
    priority: task.priority,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedBy: task.completedBy ?? null,
    completedAt: task.completedAt ?? null,
    requestedBy: task.requestedBy,
  };
}

function hasForbiddenReviewKeys(body) {
  return Object.keys(body || {}).some(key => FORBIDDEN_REVIEW_KEYS.has(key));
}

router.post('/tasks', protect, requireAdminOrTrainer, async (req, res) => {
  try {
    const { agentType, taskTitle, taskDescription, priority } = req.body;
    if (!agentType || !taskTitle || !taskDescription) {
      return res.status(400).json({
        success: false,
        error: 'agentType, taskTitle, and taskDescription are required.',
      });
    }
    if (!VALID_AGENT_TYPES.includes(agentType)) {
      return res.status(400).json({
        success: false,
        error: `agentType must be one of: ${VALID_AGENT_TYPES.join(', ')}`,
      });
    }

    const task = await createTask({
      agentType,
      taskTitle,
      taskDescription,
      priority: VALID_PRIORITIES.includes(priority) ? priority : 'normal',
      requestedBy: req.user.id,
    });

    return res.status(201).json({ success: true, taskId: task.id, ...taskSummary(task) });
  } catch (err) {
    logger.error('[HermesRoutes] POST /tasks error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Failed to create task.' });
  }
});

router.post('/coach-review-requests', protect, coachReviewRequestLimiter, async (req, res) => {
  try {
    if (hasForbiddenReviewKeys(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Raw transcript, client identity, health notes, and free-text messages are not accepted here.',
      });
    }

    const reason = COACH_REVIEW_REASONS[req.body?.reason] ? req.body.reason : 'progress_proof';
    const requestedAction = COACH_REVIEW_ACTIONS.has(req.body?.requestedAction)
      ? req.body.requestedAction
      : 'trainer_review';
    const sourceType = COACH_REVIEW_SOURCES.has(req.body?.sourceType)
      ? req.body.sourceType
      : 'manual';
    const sourceId = cleanReference(req.body?.sourceId);
    const reasonLabel = COACH_REVIEW_REASONS[reason];

    const task = await createTask({
      agentType: 'coach',
      taskTitle: `coach_review_request: ${reasonLabel}`,
      taskDescription: [
        'Self-scoped coach review request.',
        `sourceType=${sourceType}`,
        `sourceId=${sourceId || 'none'}`,
        `reason=${reason}`,
        `requestedAction=${requestedAction}`,
      ].join(' '),
      priority: reason === 'pain_flag' || reason === 'low_confidence_parse' ? 'high' : 'normal',
      requestedBy: req.user.id,
      metadata: {
        requestType: 'coach_review_request',
        selfScoped: true,
        sourceType,
        sourceId: sourceId || null,
        reason,
        requestedAction,
      },
    });

    return res.status(201).json({ success: true, taskId: task.id, ...taskSummary(task) });
  } catch (err) {
    logger.error('[HermesRoutes] POST /coach-review-requests error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Failed to request coach review.' });
  }
});

router.get('/tasks', protect, requireAdminOrTrainer, async (req, res) => {
  try {
    const { agentType, status } = req.query;
    const result = await listTasks({
      agentType,
      status,
      requestedBy: req.user.id,
      ownOnly: req.user.role !== 'admin',
    });

    return res.json({
      success: true,
      count: result.count,
      pending: result.pending,
      completed: result.completed,
      failed: result.failed,
      tasks: result.tasks.map(taskSummary),
    });
  } catch (err) {
    logger.error('[HermesRoutes] GET /tasks error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Failed to list tasks.' });
  }
});

router.get('/tasks/:id', protect, requireAdminOrTrainer, async (req, res) => {
  try {
    const task = await getTask(req.params.id, req.user.id, req.user.role);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found or expired.' });
    return res.json({ success: true, task });
  } catch (err) {
    logger.error('[HermesRoutes] GET /tasks/:id error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Failed to get task.' });
  }
});

router.post('/tasks/:id/cancel', protect, requireAdminOrTrainer, async (req, res) => {
  try {
    const cancelled = await cancelTask(req.params.id, req.user.id, req.user.role);
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Task not found, already terminal, or you do not have permission to cancel it.',
      });
    }
    return res.json({ success: true, message: 'Task cancelled.' });
  } catch (err) {
    logger.error('[HermesRoutes] POST /tasks/:id/cancel error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Failed to cancel task.' });
  }
});

router.post('/tasks/:id/complete', protect, requireAdminOrTrainer, async (req, res) => {
  try {
    const task = await completeTask(req.params.id, req.user.id, req.user.role, req.body?.terminalReason);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found, already terminal, or you do not have permission to complete it.',
      });
    }
    return res.json({ success: true, task: taskSummary(task) });
  } catch (err) {
    logger.error('[HermesRoutes] POST /tasks/:id/complete error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Failed to complete task.' });
  }
});

router.post('/tasks/:id/fail', protect, requireAdminOrTrainer, async (req, res) => {
  try {
    const task = await failTask(req.params.id, req.user.id, req.user.role, req.body?.terminalReason);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found, already terminal, or you do not have permission to fail it.',
      });
    }
    return res.json({ success: true, task: taskSummary(task) });
  } catch (err) {
    logger.error('[HermesRoutes] POST /tasks/:id/fail error', { error: err.message });
    return res.status(500).json({ success: false, error: 'Failed to fail task.' });
  }
});

export default router;
