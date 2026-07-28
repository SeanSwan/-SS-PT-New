/**
 * Content Studio project service.
 * Validates and serializes creator workflow records without leaking DB errors.
 */

import {
  CONTENT_PROJECT_SOURCE_TYPES,
  CONTENT_PROJECT_STATUSES,
} from '../models/ContentProject.mjs';

const PRIORITIES = ['low', 'normal', 'high'];
const JSON_FIELDS = ['scriptDraft', 'shotList', 'editingHandoff', 'youtubePackage', 'assets', 'metadata'];
const ARRAY_JSON_FIELDS = new Set(['shotList', 'assets']);
const DATE_FIELDS = ['scheduledAt', 'filmedAt', 'editingDueAt', 'publishDueAt'];

export class ContentProjectValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ContentProjectValidationError';
    this.statusCode = statusCode;
  }
}

const cleanString = (value, max, field) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.length > max) {
    throw new ContentProjectValidationError(`${field} must be ${max} characters or fewer.`);
  }
  return trimmed;
};

const requireAllowed = (value, allowed, field) => {
  if (!allowed.includes(value)) {
    throw new ContentProjectValidationError(`${field} is invalid.`);
  }
  return value;
};

const normalizeDate = (value, field) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new ContentProjectValidationError(`${field} must be a valid date.`);
  }
  return parsed;
};

const normalizeJson = (value, field) => {
  const expectsArray = ARRAY_JSON_FIELDS.has(field);
  if (value === undefined) return undefined;
  if (value === null) return expectsArray ? [] : {};
  if (expectsArray) {
    if (!Array.isArray(value)) {
      throw new ContentProjectValidationError(`${field} must be a list.`);
    }
    return value;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ContentProjectValidationError(`${field} must be structured data.`);
  }
  return value;
};

export function sanitizeContentProjectPayload(input = {}, { partial = false } = {}) {
  const payload = {};
  const title = cleanString(input.title, 180, 'title');
  if ((!partial && !title) || (partial && title !== undefined && !title)) {
    throw new ContentProjectValidationError('title is required.');
  }
  if (title !== undefined) payload.title = title;

  if (!partial || input.status !== undefined) {
    payload.status = requireAllowed(input.status || 'idea', CONTENT_PROJECT_STATUSES, 'status');
  }
  if (!partial || input.sourceType !== undefined) {
    payload.sourceType = requireAllowed(input.sourceType || 'manual', CONTENT_PROJECT_SOURCE_TYPES, 'sourceType');
  }
  if (!partial || input.priority !== undefined) {
    payload.priority = requireAllowed(input.priority || 'normal', PRIORITIES, 'priority');
  }

  const sourceId = cleanString(input.sourceId, 120, 'sourceId');
  if (sourceId !== undefined) payload.sourceId = sourceId || null;

  for (const field of JSON_FIELDS) {
    const normalized = normalizeJson(input[field], field);
    if (normalized !== undefined) payload[field] = normalized;
    else if (!partial) payload[field] = ARRAY_JSON_FIELDS.has(field) ? [] : {};
  }

  for (const field of DATE_FIELDS) {
    const normalized = normalizeDate(input[field], field);
    if (normalized !== undefined) payload[field] = normalized;
  }

  return payload;
}

export function serializeContentProject(project) {
  const row = project?.toJSON ? project.toJSON() : project;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    priority: row.priority,
    scriptDraft: row.scriptDraft || {},
    shotList: row.shotList || [],
    editingHandoff: row.editingHandoff || {},
    youtubePackage: row.youtubePackage || {},
    assets: row.assets || [],
    metadata: row.metadata || {},
    scheduledAt: row.scheduledAt || null,
    filmedAt: row.filmedAt || null,
    editingDueAt: row.editingDueAt || null,
    publishDueAt: row.publishDueAt || null,
    createdBy: row.createdBy || null,
    updatedBy: row.updatedBy || null,
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };
}

export async function listContentProjects(ContentProject, query = {}) {
  if (!ContentProject?.findAll) throw new Error('ContentProject model unavailable');
  const where = {};
  if (query.status) where.status = requireAllowed(String(query.status), CONTENT_PROJECT_STATUSES, 'status');
  const requestedLimit = Number(query.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.round(requestedLimit), 1), 100) : 50;
  const rows = await ContentProject.findAll({ where, limit, order: [['updatedAt', 'DESC']] });
  return rows.map(serializeContentProject);
}

export async function createContentProject(ContentProject, input, actorUserId) {
  if (!ContentProject?.create) throw new Error('ContentProject model unavailable');
  const payload = sanitizeContentProjectPayload(input);
  payload.createdBy = actorUserId || null;
  payload.updatedBy = actorUserId || null;
  return serializeContentProject(await ContentProject.create(payload));
}

export async function updateContentProject(ContentProject, id, input, actorUserId) {
  if (!ContentProject?.findByPk) throw new Error('ContentProject model unavailable');
  const projectId = cleanString(id, 80, 'project id');
  if (!projectId) throw new ContentProjectValidationError('project id is required.');
  const project = await ContentProject.findByPk(projectId);
  if (!project) throw new ContentProjectValidationError('project not found.', 404);
  const payload = sanitizeContentProjectPayload(input, { partial: true });
  if (Object.keys(payload).length === 0) throw new ContentProjectValidationError('No project updates supplied.');
  payload.updatedBy = actorUserId || null;
  await project.update(payload);
  return serializeContentProject(project);
}
