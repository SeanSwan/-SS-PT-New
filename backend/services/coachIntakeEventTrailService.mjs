/**
 * coachIntakeEventTrailService.mjs
 * ================================
 * Read-only, ownership-scoped Coach intake event trail for operator review.
 */
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import {
  CoachIntakeSchemaUnavailableError,
  CoachIntakeValidationError,
} from './coachIntakeConstants.mjs';
import { coachIntakeTablesExist } from './coachIntakeItemService.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_EVENT_LIMIT = 8;
const MAX_EVENT_LIMIT = 20;
const SAFE_STRING_FIELDS = new Set(['action', 'proposalId', 'proposalType', 'status', 'errorCode', 'sourceType']);
const SAFE_NUMBER_FIELDS = new Set(['charCount', 'pieceCount', 'bundleCount', 'autoBundleCount']);
const SAFE_BOOLEAN_FIELDS = new Set(['previousNeedsOrderingReview']);
const SAFE_TOKEN_RE = /^[a-z0-9_:-]{1,128}$/i;

function cleanUserId(userId) {
  const parsed = Number(userId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CoachIntakeValidationError('AUTH_REQUIRED', 'Authentication required');
  }
  return parsed;
}

function cleanIntakeId(intakeId) {
  const text = String(intakeId || '').replace(/^coach:/, '').trim();
  if (!UUID_RE.test(text)) {
    throw new CoachIntakeValidationError('INVALID_INTAKE_ID', 'Invalid Coach intake id');
  }
  return text;
}

function cleanLimit(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_EVENT_LIMIT;
  return Math.min(MAX_EVENT_LIMIT, Math.max(1, parsed));
}

function safeText(value) {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\r\n\t`\\]/g, ' ').trim();
  return clean ? clean.slice(0, 128) : null;
}

function safeToken(value) {
  const text = safeText(value);
  return text && SAFE_TOKEN_RE.test(text) ? text : null;
}

function safeEventSummary(eventJson) {
  if (!eventJson || typeof eventJson !== 'object' || Array.isArray(eventJson)) return {};
  const summary = {};
  for (const [key, value] of Object.entries(eventJson)) {
    if (SAFE_STRING_FIELDS.has(key)) {
      const text = safeToken(value);
      if (text) summary[key] = text;
    } else if (SAFE_NUMBER_FIELDS.has(key)) {
      const number = Number(value);
      if (Number.isFinite(number)) summary[key] = number;
    } else if (SAFE_BOOLEAN_FIELDS.has(key) && typeof value === 'boolean') {
      summary[key] = value;
    }
  }
  return summary;
}

function mapEventRow(row) {
  return {
    id: String(row.id || ''),
    actorType: safeText(row.actor_type) || 'system',
    eventType: safeText(row.event_type) || 'event',
    summary: safeEventSummary(row.event_json),
    createdAt: row.created_at || null,
  };
}

export async function listCoachIntakeEvents({
  userId,
  intakeId,
  limit,
  sequelizeOverride = null,
} = {}) {
  const db = sequelizeOverride || sequelize;
  const numericUserId = cleanUserId(userId);
  const cleanId = cleanIntakeId(intakeId);
  const cleanEventLimit = cleanLimit(limit);
  if (!await coachIntakeTablesExist(db)) throw new CoachIntakeSchemaUnavailableError();

  const ownedRows = await db.query(
    `SELECT id
       FROM coach_intake_items
      WHERE id = :intakeId AND user_id = :userId
      LIMIT 1`,
    {
      replacements: { intakeId: cleanId, userId: numericUserId },
      type: QueryTypes.SELECT,
    },
  );
  if (!ownedRows?.[0]) {
    throw new CoachIntakeValidationError('INTAKE_NOT_FOUND', 'Coach intake item was not found');
  }

  const rows = await db.query(
    `SELECT id, actor_type, event_type, event_json, created_at
       FROM coach_intake_events
      WHERE intake_item_id = :intakeId
      ORDER BY created_at DESC
      LIMIT :limit`,
    {
      replacements: { intakeId: cleanId, limit: cleanEventLimit },
      type: QueryTypes.SELECT,
    },
  );

  return { intakeId: cleanId, events: rows.map(mapEventRow), limit: cleanEventLimit };
}

export default { listCoachIntakeEvents };
