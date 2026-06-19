/**
 * Hermes Agent Routes — /api/hermes
 * ==================================
 * Direct REST access to the Hermes task queue.
 * Also reachable via the command lane (POST /api/ai-command/execute).
 * Both entry points call hermesService functions directly — no duplication.
 *
 * Endpoints:
 *   POST /api/hermes/tasks   — Create a Hermes agent task
 *   GET  /api/hermes/tasks   — List tasks (filterable by agentType, status)
 *   GET  /api/hermes/tasks/:id — Get a single task
 *   POST /api/hermes/tasks/:id/cancel — Cancel a task
 *
 * All routes require auth. admin/trainer only — clients receive 403.
 */
import express from 'express';
import logger from '../utils/logger.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  createTask,
  listTasks,
  getTask,
  cancelTask,
} from '../services/hermes/hermesService.mjs';

const router = express.Router();

// ── Role guard middleware ───────────────────────────────────────────────────

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

// ── POST /api/hermes/tasks ─────────────────────────────────────────────────

router.post('/tasks', protect, requireAdminOrTrainer, (req, res) => {
  try {
    const { agentType, taskTitle, taskDescription, priority } = req.body;

    if (!agentType || !taskTitle || !taskDescription) {
      return res.status(400).json({
        success: false,
        error: 'agentType, taskTitle, and taskDescription are required.',
      });
    }

    const VALID_AGENT_TYPES = ['dev', 'coach', 'content', 'marketer', 'platform', 'ops', 'nutrition', 'life'];
    if (!VALID_AGENT_TYPES.includes(agentType)) {
      return res.status(400).json({
        success: false,
        error: `agentType must be one of: ${VALID_AGENT_TYPES.join(', ')}`,
      });
    }

    const VALID_PRIORITIES = ['low', 'normal', 'high'];
    const resolvedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'normal';

    const task = createTask({
      agentType,
      taskTitle: String(taskTitle).slice(0, 200),
      taskDescription: String(taskDescription).slice(0, 2000),
      priority: resolvedPriority,
      requestedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      taskId: task.id,
      agentType: task.agentType,
      taskTitle: task.taskTitle,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt,
    });
  } catch (err) {
    logger.error('[HermesRoutes] POST /tasks error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to create task.' });
  }
});

// ── GET /api/hermes/tasks ──────────────────────────────────────────────────

router.get('/tasks', protect, requireAdminOrTrainer, (req, res) => {
  try {
    const { agentType, status } = req.query;
    // Owner scope (IDOR fix): trainers see only their own tasks; admins see all.
    const result = listTasks({
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
      tasks: result.tasks.map(t => ({
        id: t.id,
        agentType: t.agentType,
        taskTitle: t.taskTitle,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        // requestedBy is user ID — included for admin visibility, no names
        requestedBy: t.requestedBy,
      })),
    });
  } catch (err) {
    logger.error('[HermesRoutes] GET /tasks error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to list tasks.' });
  }
});

// ── GET /api/hermes/tasks/:id ──────────────────────────────────────────────

router.get('/tasks/:id', protect, requireAdminOrTrainer, (req, res) => {
  try {
    const task = getTask(req.params.id, req.user.id, req.user.role);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found or expired.' });
    }
    return res.json({ success: true, task });
  } catch (err) {
    logger.error('[HermesRoutes] GET /tasks/:id error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to get task.' });
  }
});

// ── POST /api/hermes/tasks/:id/cancel ──────────────────────────────────────

router.post('/tasks/:id/cancel', protect, requireAdminOrTrainer, (req, res) => {
  try {
    const cancelled = cancelTask(req.params.id, req.user.id, req.user.role);
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Task not found, already in a terminal state, or you do not have permission to cancel it.',
      });
    }
    return res.json({ success: true, message: 'Task cancelled.' });
  } catch (err) {
    logger.error('[HermesRoutes] POST /tasks/:id/cancel error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to cancel task.' });
  }
});

export default router;
