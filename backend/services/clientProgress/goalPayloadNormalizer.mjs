// backend/services/clientProgress/goalPayloadNormalizer.mjs

import { toMetricNumber, unwrapRow } from './progressScoring.mjs';
import { ClientProgressBadRequestError } from './routeResponses.mjs';

const GOAL_CATEGORIES = new Set([
  'fitness',
  'strength',
  'cardio',
  'flexibility',
  'nutrition',
  'weight',
  'body_composition',
  'mindfulness',
  'sleep',
  'social',
  'habit',
  'streak',
  'custom',
]);
const GOAL_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
const GOAL_STATUSES = new Set(['draft', 'active', 'completed', 'paused', 'cancelled', 'failed']);

const trimmedString = (value, fallback = '', maxLength = 1000) => {
  const normalized = String(value ?? fallback).trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
};

const rejectGoalPayload = (message) => {
  throw new ClientProgressBadRequestError(message);
};

const parseGoalDeadline = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) rejectGoalPayload('A valid target date is required');
  if (date <= new Date()) rejectGoalPayload('Target date must be in the future');
  return date;
};

const goalPercent = (currentValue, targetValue) => {
  const current = toMetricNumber(currentValue);
  const target = toMetricNumber(targetValue);
  return target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;
};

const normalizeGoalCategory = (value) => {
  const category = String(value || 'fitness');
  return GOAL_CATEGORIES.has(category) ? category : 'fitness';
};

const normalizeGoalWritePriority = (value) => {
  const priority = String(value || 'medium');
  return GOAL_PRIORITIES.has(priority) ? priority : 'medium';
};

const normalizeGoalWriteStatus = (value, fallback = 'active') => {
  const status = String(value || fallback);
  return GOAL_STATUSES.has(status) ? status : fallback;
};

const requireGoalTitle = (value) => {
  const title = trimmedString(value, '', 100);
  if (title.length < 3) rejectGoalPayload('Goal title must be at least 3 characters');
  return title;
};

const requireGoalTarget = (value) => {
  const targetValue = toMetricNumber(value);
  if (targetValue <= 0) rejectGoalPayload('Target value must be greater than zero');
  return targetValue;
};

const requireGoalUnit = (value) => {
  const unit = trimmedString(value, 'units', 50);
  if (!unit) rejectGoalPayload('Goal unit is required');
  return unit;
};

const progressHistoryEntry = ({ now, currentValue, previousCurrent, progressPercentage, notes }) => ({
  date: now.toISOString(),
  value: currentValue,
  change: currentValue - previousCurrent,
  percentage: progressPercentage,
  notes: trimmedString(notes, '', 500) || null,
});

const progressHistoryForCreate = ({ now, currentValue, progressPercentage, notes }) => {
  if (currentValue <= 0) return [];
  return [progressHistoryEntry({ now, currentValue, previousCurrent: 0, progressPercentage, notes })];
};

const statusFallbackForProgress = (progressPercentage) => (
  progressPercentage >= 100 ? 'completed' : 'active'
);

const completedAtForStatus = (status, now) => (status === 'completed' ? now : null);

const lastProgressUpdateForCurrent = (currentValue, now) => (currentValue > 0 ? now : null);

export const normalizeGoalCreatePayload = (body = {}) => {
  const title = requireGoalTitle(body.title);
  const targetValue = requireGoalTarget(body.targetValue);
  const currentValue = Math.max(0, toMetricNumber(body.currentValue));
  const unit = requireGoalUnit(body.unit);
  const deadline = parseGoalDeadline(body.deadline ?? body.targetDate);
  const progressPercentage = goalPercent(currentValue, targetValue);
  const now = new Date();
  const status = normalizeGoalWriteStatus(body.status, statusFallbackForProgress(progressPercentage));

  return {
    title,
    description: trimmedString(body.description, '', 1000) || null,
    targetValue,
    currentValue,
    unit,
    category: normalizeGoalCategory(body.category),
    priority: normalizeGoalWritePriority(body.priority),
    status,
    deadline,
    progressPercentage,
    progressHistory: progressHistoryForCreate({ now, currentValue, progressPercentage, notes: body.notes }),
    completedAt: completedAtForStatus(status, now),
    lastProgressUpdate: lastProgressUpdateForCurrent(currentValue, now),
  };
};

const applyWhenDefined = (body, field, apply) => {
  if (body[field] === undefined) return;
  apply(body[field]);
};

const applyTextUpdates = (updates, body) => {
  applyWhenDefined(body, 'title', (value) => { updates.title = requireGoalTitle(value); });
  applyWhenDefined(body, 'description', (value) => { updates.description = trimmedString(value, '', 1000) || null; });
  applyWhenDefined(body, 'unit', (value) => { updates.unit = requireGoalUnit(value); });
};

const applyOptionUpdates = (updates, body) => {
  applyWhenDefined(body, 'category', (value) => { updates.category = normalizeGoalCategory(value); });
  applyWhenDefined(body, 'priority', (value) => { updates.priority = normalizeGoalWritePriority(value); });
  if (body.deadline !== undefined || body.targetDate !== undefined) {
    updates.deadline = parseGoalDeadline(body.deadline ?? body.targetDate);
  }
};

const progressUpdateFields = (body, existing) => {
  const targetValue = body.targetValue !== undefined
    ? requireGoalTarget(body.targetValue)
    : toMetricNumber(existing.targetValue);
  const currentValue = body.currentValue !== undefined
    ? Math.max(0, toMetricNumber(body.currentValue))
    : toMetricNumber(existing.currentValue);
  return { currentValue, targetValue };
};

const progressTouched = (body) => body.currentValue !== undefined || body.targetValue !== undefined;

const applyProgressValueFields = (updates, body, currentValue, targetValue) => {
  applyWhenDefined(body, 'targetValue', () => { updates.targetValue = targetValue; });
  applyWhenDefined(body, 'currentValue', () => { updates.currentValue = currentValue; });
};

const applyAutomaticCompletion = (updates, existing, progressPercentage, now) => {
  if (progressPercentage < 100 || !['active', 'paused'].includes(existing.status)) return;
  updates.status = 'completed';
  updates.completedAt = now;
};

const applyProgressUpdate = (updates, body, existing) => {
  if (!progressTouched(body)) return;

  const { currentValue, targetValue } = progressUpdateFields(body, existing);
  const progressPercentage = goalPercent(currentValue, targetValue);
  const previousCurrent = toMetricNumber(existing.currentValue);
  const now = new Date();

  applyProgressValueFields(updates, body, currentValue, targetValue);
  updates.progressPercentage = progressPercentage;
  updates.lastProgressUpdate = now;
  updates.progressHistory = [
    ...(Array.isArray(existing.progressHistory) ? existing.progressHistory : []),
    progressHistoryEntry({ now, currentValue, previousCurrent, progressPercentage, notes: body.notes }),
  ];
  applyAutomaticCompletion(updates, existing, progressPercentage, now);
};

const completedAtForRequestedStatus = (status, existing) => (
  status === 'completed' ? (existing.completedAt || new Date()) : null
);

const applyStatusUpdate = (updates, body, existing) => {
  applyWhenDefined(body, 'status', (value) => {
    const status = normalizeGoalWriteStatus(value, existing.status || 'active');
    updates.status = status;
    updates.completedAt = completedAtForRequestedStatus(status, existing);
  });
};

export const normalizeGoalUpdatePayload = (body = {}, existingGoal = {}) => {
  const existing = unwrapRow(existingGoal);
  const updates = {};
  applyTextUpdates(updates, body);
  applyOptionUpdates(updates, body);
  applyProgressUpdate(updates, body, existing);
  applyStatusUpdate(updates, body, existing);
  return updates;
};
