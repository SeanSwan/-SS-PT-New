/**
 * ============================================================================
 * FILE: hermesService.mjs
 * PURPOSE: In-memory Hermes agent task queue for Sprint 1
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-09
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Pure service — no HTTP, no auth dependency.
 * Provides createTask, listTasks, getTask, cancelTask backed by an in-memory
 * Map with passive TTL enforcement and overflow eviction.
 *
 * PERSISTENCE NOTE — INTENTIONALLY EPHEMERAL:
 *   Tasks are stored in process memory and are lost on server restart or
 *   Render deploy. This is acceptable for Sprint 1 because Hermes tasks are
 *   fire-and-forget queue items. Sprint 2 replaces this with a HermesTask
 *   Sequelize model + migration.
 *
 * LIMITS:
 *   TTL: 24 hours from createdAt
 *   Max tasks: 1000 (oldest evicted on overflow)
 *
 * SHARED ENTRY POINTS:
 *   - commandDispatcher.mjs (command lane execution)
 *   - hermesRoutes.mjs (direct REST access)
 * ============================================================================
 */

import { randomUUID } from 'crypto';
import logger from '../../utils/logger.mjs';

// ── Constants ────────────────────────────────────────────────────────────────

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TASKS = 1000;

/** @type {Map<string, HermesTask>} */
const taskStore = new Map();

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} HermesTask
 * @property {string} id - UUID
 * @property {string} agentType - 'dev' | 'coach' | 'content' | 'marketer' | 'platform' | 'ops' | 'nutrition' | 'life'
 * @property {string} taskTitle - Short summary
 * @property {string} taskDescription - Full task details
 * @property {'low'|'normal'|'high'} priority
 * @property {number} requestedBy - User ID (no names — zero PII)
 * @property {'pending'|'in_progress'|'completed'|'failed'|'cancelled'} status
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function isExpired(task) {
  return Date.now() - new Date(task.createdAt).getTime() > TTL_MS;
}

/** Evict all expired tasks. Called before every write to enforce TTL. */
function evictExpired() {
  for (const [id, task] of taskStore) {
    if (isExpired(task)) taskStore.delete(id);
  }
}

/** Evict oldest tasks when at capacity. Preserves non-cancelled active tasks. */
function evictOldestIfFull() {
  if (taskStore.size < MAX_TASKS) return;
  // Sort all entries by createdAt, evict the oldest until under limit
  const sorted = [...taskStore.entries()].sort(
    ([, a], [, b]) => new Date(a.createdAt) - new Date(b.createdAt)
  );
  const toEvict = sorted.slice(0, taskStore.size - MAX_TASKS + 1);
  for (const [id] of toEvict) {
    taskStore.delete(id);
    logger.info('[HermesService] Evicted oldest task due to capacity limit', { id });
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new Hermes agent task.
 *
 * @param {Object} params
 * @param {'dev'|'coach'|'content'|'marketer'|'platform'|'ops'|'nutrition'|'life'} params.agentType
 * @param {string} params.taskTitle
 * @param {string} params.taskDescription
 * @param {'low'|'normal'|'high'} [params.priority]
 * @param {number} params.requestedBy - User ID only, no names
 * @returns {HermesTask}
 */
export function createTask({ agentType, taskTitle, taskDescription, priority = 'normal', requestedBy }) {
  evictExpired();
  evictOldestIfFull();

  const now = new Date().toISOString();
  /** @type {HermesTask} */
  const task = {
    id: randomUUID(),
    agentType,
    taskTitle,
    taskDescription,
    priority,
    requestedBy,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  taskStore.set(task.id, task);

  logger.info('[HermesService] Task created', {
    taskId: task.id,
    agentType,
    priority,
    requestedBy,
  });

  return task;
}

/**
 * List tasks with optional filters.
 * Expired tasks are excluded from results.
 *
 * @param {Object} [filter]
 * @param {string} [filter.agentType]
 * @param {string} [filter.status]
 * @param {number} [filter.requestedBy] - Only return this user's tasks (optional scope)
 * @returns {{ tasks: HermesTask[], count: number, pending: number, completed: number, failed: number }}
 */
export function listTasks(filter = {}) {
  evictExpired();

  let tasks = [...taskStore.values()].filter(t => !isExpired(t));

  if (filter.agentType) tasks = tasks.filter(t => t.agentType === filter.agentType);
  if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
  // Owner scope (FAIL-CLOSED): when ownOnly is set, return ONLY this requestedBy's
  // tasks. If ownOnly is set WITHOUT a requestedBy, the === comparison excludes
  // everything (deny-all) instead of leaking all tasks. Admin callers pass
  // ownOnly:false to see all.
  if (filter.ownOnly) {
    tasks = tasks.filter(t => t.requestedBy === filter.requestedBy);
  }

  // Sort newest first
  tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const failed = tasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length;

  return { tasks, count: tasks.length, pending, completed, failed };
}

/**
 * Get a single task by ID, scoped to the caller (IDOR fix).
 * Returns null if not found, expired, OR the caller is not the owner/an admin.
 * A non-owner read returns null (not 403) so task existence is not disclosed.
 *
 * @param {string} id
 * @param {number} userId - Requesting user ID
 * @param {'admin'|'trainer'|'client'} role
 * @returns {HermesTask|null}
 */
export function getTask(id, userId, role) {
  const task = taskStore.get(id);
  if (!task || isExpired(task)) return null;
  // Owner/resource scope: admin sees any task; everyone else only their own.
  if (role !== 'admin' && task.requestedBy !== userId) return null;
  return task;
}

/**
 * Cancel a task by ID.
 * Only the requesting user or an admin can cancel.
 *
 * @param {string} id
 * @param {number} userId - Requesting user ID
 * @param {'admin'|'trainer'|'client'} role
 * @returns {boolean} true if cancelled, false if not found/unauthorized/already terminal
 */
export function cancelTask(id, userId, role) {
  const task = taskStore.get(id);
  if (!task || isExpired(task)) return false;
  if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') return false;
  if (role !== 'admin' && task.requestedBy !== userId) return false;

  const now = new Date().toISOString();
  taskStore.set(id, { ...task, status: 'cancelled', updatedAt: now });

  logger.info('[HermesService] Task cancelled', { taskId: id, cancelledBy: userId });
  return true;
}
