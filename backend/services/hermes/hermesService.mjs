/**
 * Hermes durable task queue.
 *
 * Production tasks persist in Postgres through HermesTask. Unit tests can opt
 * into the memory store so ownership and terminal-state rules stay fast and
 * deterministic without touching the database.
 */
import { randomUUID } from 'crypto';
import logger from '../../utils/logger.mjs';

const HERMES_TASK_AGENT_TYPES = Object.freeze([
  'dev',
  'coach',
  'content',
  'marketer',
  'platform',
  'ops',
  'nutrition',
  'life',
]);
const HERMES_TASK_STATUSES = Object.freeze(['pending', 'in_progress', 'completed', 'failed', 'cancelled']);
const VALID_PRIORITIES = Object.freeze(['low', 'normal', 'high']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const MAX_MEMORY_TASKS = 1000;

const memoryTaskStore = new Map();
let useMemoryStore = false;
let hermesTaskModelPromise = null;

async function getHermesTaskModel() {
  if (!hermesTaskModelPromise) {
    hermesTaskModelPromise = import('../../models/HermesTask.mjs').then(module => module.default);
  }
  return hermesTaskModelPromise;
}

function toId(value) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizePriority(priority) {
  return VALID_PRIORITIES.includes(priority) ? priority : 'normal';
}

function assertAgentType(agentType) {
  if (!HERMES_TASK_AGENT_TYPES.includes(agentType)) {
    throw new Error(`Invalid Hermes agentType: ${agentType}`);
  }
}

function assertStatus(status) {
  if (!HERMES_TASK_STATUSES.includes(status)) {
    throw new Error(`Invalid Hermes status: ${status}`);
  }
}

function iso(value) {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toPlainTask(row) {
  if (!row) return null;
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    agentType: plain.agentType,
    taskTitle: plain.taskTitle,
    taskDescription: plain.taskDescription,
    priority: plain.priority,
    requestedBy: plain.requestedBy,
    status: plain.status,
    completedBy: plain.completedBy ?? null,
    completedAt: plain.completedAt ? iso(plain.completedAt) : null,
    terminalReason: plain.terminalReason ?? null,
    metadata: plain.metadata ?? {},
    createdAt: iso(plain.createdAt),
    updatedAt: iso(plain.updatedAt),
  };
}

function summarize(tasks) {
  return {
    tasks,
    count: tasks.length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length,
  };
}

function taskPayload({ agentType, taskTitle, taskDescription, priority = 'normal', requestedBy, metadata = {} }) {
  assertAgentType(agentType);
  const title = cleanText(taskTitle, 200);
  const description = cleanText(taskDescription, 2000);
  const requesterId = toId(requestedBy);
  if (!title || !description) throw new Error('Hermes task title and description are required.');
  if (requesterId === null) throw new Error('Hermes requestedBy user ID is required.');
  return {
    agentType,
    taskTitle: title,
    taskDescription: description,
    priority: normalizePriority(priority),
    requestedBy: requesterId,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  };
}

function evictMemoryIfFull() {
  if (memoryTaskStore.size < MAX_MEMORY_TASKS) return;
  const sorted = [...memoryTaskStore.entries()]
    .sort(([, a], [, b]) => new Date(a.createdAt) - new Date(b.createdAt));
  const toEvict = sorted.slice(0, memoryTaskStore.size - MAX_MEMORY_TASKS + 1);
  for (const [id] of toEvict) memoryTaskStore.delete(id);
}

function memoryCreate(payload) {
  evictMemoryIfFull();
  const now = new Date().toISOString();
  const task = {
    id: randomUUID(),
    ...payload,
    status: 'pending',
    completedBy: null,
    completedAt: null,
    terminalReason: null,
    createdAt: now,
    updatedAt: now,
  };
  memoryTaskStore.set(task.id, task);
  return toPlainTask(task);
}

function memoryList(filter = {}) {
  let tasks = [...memoryTaskStore.values()].map(toPlainTask);
  if (filter.agentType) tasks = tasks.filter(t => t.agentType === filter.agentType);
  if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
  if (filter.ownOnly) tasks = tasks.filter(t => t.requestedBy === toId(filter.requestedBy));
  tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return summarize(tasks);
}

function canAccess(task, userId, role) {
  return role === 'admin' || task?.requestedBy === toId(userId);
}

function memoryGet(id, userId, role) {
  const task = toPlainTask(memoryTaskStore.get(id));
  if (!task || !canAccess(task, userId, role)) return null;
  return task;
}

function memoryTransition(id, userId, role, status, terminalReason) {
  const task = memoryGet(id, userId, role);
  if (!task || TERMINAL_STATUSES.has(task.status)) return null;
  const now = new Date().toISOString();
  const next = {
    ...task,
    status,
    completedBy: toId(userId),
    completedAt: now,
    terminalReason: cleanText(terminalReason, 500) || null,
    updatedAt: now,
  };
  memoryTaskStore.set(id, next);
  return toPlainTask(next);
}

export function useMemoryHermesTaskStoreForTests() {
  useMemoryStore = true;
}

export function resetHermesTaskStoreForTests() {
  memoryTaskStore.clear();
  useMemoryStore = true;
}

export async function createTask(params) {
  const payload = taskPayload(params);
  const task = useMemoryStore
    ? memoryCreate(payload)
    : toPlainTask(await (await getHermesTaskModel()).create(payload));

  logger.info('[HermesService] Task created', {
    taskId: task.id,
    agentType: task.agentType,
    priority: task.priority,
    requestedBy: task.requestedBy,
  });
  return task;
}

export async function listTasks(filter = {}) {
  if (filter.ownOnly && toId(filter.requestedBy) === null) return summarize([]);
  if (useMemoryStore) return memoryList(filter);

  const where = {};
  if (filter.agentType) where.agentType = filter.agentType;
  if (filter.status) where.status = filter.status;
  if (filter.ownOnly) where.requestedBy = toId(filter.requestedBy);

  const HermesTask = await getHermesTaskModel();
  const rows = await HermesTask.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: 1000,
  });
  return summarize(rows.map(toPlainTask));
}

export async function getTask(id, userId, role) {
  if (useMemoryStore) return memoryGet(id, userId, role);
  const HermesTask = await getHermesTaskModel();
  const task = toPlainTask(await HermesTask.findByPk(id));
  if (!task || !canAccess(task, userId, role)) return null;
  return task;
}

async function transitionTask(id, userId, role, status, terminalReason) {
  assertStatus(status);
  if (useMemoryStore) return memoryTransition(id, userId, role, status, terminalReason);

  const HermesTask = await getHermesTaskModel();
  const row = await HermesTask.findByPk(id);
  const task = toPlainTask(row);
  if (!task || !canAccess(task, userId, role) || TERMINAL_STATUSES.has(task.status)) return null;

  await row.update({
    status,
    completedBy: toId(userId),
    completedAt: new Date(),
    terminalReason: cleanText(terminalReason, 500) || null,
  });
  return toPlainTask(row);
}

export async function cancelTask(id, userId, role) {
  const task = await transitionTask(id, userId, role, 'cancelled');
  if (task) logger.info('[HermesService] Task cancelled', { taskId: id, cancelledBy: userId });
  return Boolean(task);
}

export async function completeTask(id, userId, role, terminalReason = 'Fulfilled by operator') {
  const task = await transitionTask(id, userId, role, 'completed', terminalReason);
  if (task) logger.info('[HermesService] Task completed', { taskId: id, completedBy: userId });
  return task;
}

export async function failTask(id, userId, role, terminalReason = 'Closed as failed') {
  const task = await transitionTask(id, userId, role, 'failed', terminalReason);
  if (task) logger.info('[HermesService] Task failed', { taskId: id, failedBy: userId });
  return task;
}
