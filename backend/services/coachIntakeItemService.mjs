/**
 * coachIntakeItemService.mjs
 * ==========================
 * Canonical Coach intake queue facade. This layer lets Swan Coach create and
 * read encrypted intake drafts without replacing the existing PLAUD queue.
 */
import { randomUUID, createHash } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import { encryptPayload } from './plaudCipherService.mjs';
import { listPlaudIntakeItems } from './plaudIntakeQueueService.mjs';
import { sortCoachIntakeReviewOrder } from './coachIntakeQueueOrdering.mjs';
import {
  isCoachIntakeSameLocalDay,
  mapCoachRowToIntakeItem,
  summarizeUnifiedItems,
} from './coachIntakeItemMapper.mjs';
import {
  COACH_INTAKE_SCOPES,
  COACH_INTAKE_SOURCE_TYPES,
  COACH_TEXT_INTAKE_MAX_CHARS,
  CoachIntakeSchemaUnavailableError,
  CoachIntakeValidationError,
  DEFAULT_COACH_INTAKE_LIMIT,
  MAX_COACH_INTAKE_LIMIT,
} from './coachIntakeConstants.mjs';

export {
  COACH_TEXT_INTAKE_MAX_CHARS,
  CoachIntakeSchemaUnavailableError,
  CoachIntakeValidationError,
  mapCoachRowToIntakeItem,
  summarizeUnifiedItems,
};

function normalizeLimit(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_COACH_INTAKE_LIMIT;
  return Math.min(MAX_COACH_INTAKE_LIMIT, Math.max(1, parsed));
}

function normalizeScope(raw) {
  const scope = String(raw || 'actionable').trim();
  return COACH_INTAKE_SCOPES.has(scope) ? scope : 'actionable';
}

function buildMetadata({ text, metadata = {}, clientId = null }) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const clean = {
    captureSurface: 'coach_assistant',
    ...metadata,
    charCount: text.length,
    wordCount,
    textSha256: createHash('sha256').update(text).digest('hex'),
  };
  if (Number.isInteger(clientId) && clientId > 0) clean.clientId = clientId;
  return clean;
}

export async function coachIntakeTablesExist(sequelizeOverride = null) {
  const db = sequelizeOverride || sequelize;
  const rows = await db.query(
    `SELECT to_regclass('public.coach_intake_items') AS items_exists`,
    { type: QueryTypes.SELECT },
  );
  return !!rows?.[0]?.items_exists;
}

function filterByScope(items, scope) {
  if (scope === 'all') return items;
  if (scope === 'actionable') return items.filter((item) => item.queueStatus !== 'archived');
  if (scope === 'today') return items.filter((item) => isCoachIntakeSameLocalDay(item.createdAt));
  if (scope === 'needs_client') return items.filter((item) => item.needsClient);
  return items.filter((item) => item.queueStatus === scope);
}

function mergeIntakeSummaries(...summaries) {
  return summaries.reduce((merged, summary = {}) => {
    for (const key of Object.keys(merged)) {
      merged[key] += Number(summary[key] || 0);
    }
    return merged;
  }, summarizeUnifiedItems([]));
}

export async function createCoachTextIntakeItem({
  userId,
  text,
  sourceType = 'chat_narrative',
  clientId = null,
  metadata = {},
  sequelizeOverride = null,
} = {}) {
  const db = sequelizeOverride || sequelize;
  const numericUserId = Number(userId);
  const numericClientId = clientId == null ? null : Number(clientId);
  const cleanText = String(text || '').trim();

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw new CoachIntakeValidationError('AUTH_REQUIRED', 'Authentication required');
  }
  if (!COACH_INTAKE_SOURCE_TYPES.has(sourceType)) {
    throw new CoachIntakeValidationError('INVALID_SOURCE_TYPE', 'Unsupported intake source type');
  }
  if (cleanText.length < 5) {
    throw new CoachIntakeValidationError('TEXT_REQUIRED', 'Intake text is required');
  }
  if (cleanText.length > COACH_TEXT_INTAKE_MAX_CHARS) {
    throw new CoachIntakeValidationError(
      'TEXT_TOO_LONG',
      `Intake text too long (max ${COACH_TEXT_INTAKE_MAX_CHARS} characters)`,
      { maxChars: COACH_TEXT_INTAKE_MAX_CHARS },
    );
  }
  if (numericClientId != null && (!Number.isInteger(numericClientId) || numericClientId <= 0)) {
    throw new CoachIntakeValidationError('INVALID_CLIENT_ID', 'clientId must be a positive integer');
  }
  if (!await coachIntakeTablesExist(db)) throw new CoachIntakeSchemaUnavailableError();

  const id = randomUUID();
  const eventId = randomUUID();
  const sourceRef = `coach:${sourceType}:${id}`;
  const safeMetadata = buildMetadata({ text: cleanText, metadata, clientId: numericClientId });
  const enc = encryptPayload({ text: cleanText, sourceType, metadata: safeMetadata });

  const rows = await db.transaction(async (transaction) => {
    const inserted = await db.query(
      `INSERT INTO coach_intake_items (
         id, user_id, created_by_user_id, source_type, source_ref, status,
         resolved_client_id, payload_cipher, payload_iv, payload_tag,
         cipher_key_id, metadata_json
       ) VALUES (
         :id, :userId, :userId, :sourceType, :sourceRef, 'RECEIVED',
         :clientId, :cipher, :iv, :tag, :keyId, CAST(:metadataJson AS jsonb)
       )
       RETURNING id, user_id, source_type, source_ref, status, resolved_client_id,
         recorded_at_start, uploaded_at, metadata_json, resolver_json,
         duplicate_scan_json, error_code, created_at`,
      {
        replacements: {
          id,
          userId: numericUserId,
          sourceType,
          sourceRef,
          clientId: numericClientId,
          cipher: enc.cipher,
          iv: enc.iv,
          tag: enc.tag,
          keyId: enc.keyId,
          metadataJson: JSON.stringify(safeMetadata),
        },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    await db.query(
      `INSERT INTO coach_intake_events (
         id, intake_item_id, actor_type, actor_id, event_type, event_json
       ) VALUES (
         :eventId, :id, 'user', :userIdText, 'created', CAST(:eventJson AS jsonb)
       )`,
      {
        replacements: {
          eventId,
          id,
          userIdText: String(numericUserId),
          eventJson: JSON.stringify({ sourceType, charCount: cleanText.length }),
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    return inserted;
  });

  return mapCoachRowToIntakeItem(rows[0]);
}

export async function listCoachIntakeItems({
  userId,
  scope,
  limit,
  sequelizeOverride = null,
} = {}) {
  const db = sequelizeOverride || sequelize;
  const normalizedLimit = normalizeLimit(limit);
  const normalizedScope = normalizeScope(scope);
  if (!await coachIntakeTablesExist(db)) {
    return { items: [], summary: summarizeUnifiedItems([]), scope: normalizedScope, limit: normalizedLimit, schemaReady: false };
  }
  const rows = await db.query(
    `SELECT id, user_id, source_type, source_ref, status, resolved_client_id,
            recorded_at_start, uploaded_at, metadata_json, resolver_json,
            duplicate_scan_json, latest_proposal_id, error_code, created_at
       FROM coach_intake_items
      WHERE user_id = :userId
      ORDER BY uploaded_at DESC, created_at DESC
      LIMIT :queryLimit`,
    {
      replacements: { userId, queryLimit: normalizedLimit * 2 },
      type: QueryTypes.SELECT,
    },
  );
  const items = rows.map(mapCoachRowToIntakeItem);
  const scopedItems = filterByScope(items, normalizedScope).slice(0, normalizedLimit);
  return { items: scopedItems, summary: summarizeUnifiedItems(items), scope: normalizedScope, limit: normalizedLimit, schemaReady: true };
}

export async function listUnifiedCoachIntakeItems(options = {}) {
  const coach = await listCoachIntakeItems(options);
  let plaud = { items: [], summary: summarizeUnifiedItems([]) };
  if (process.env.PLAUD_MERGE_ENABLED === 'true') {
    try {
      plaud = await listPlaudIntakeItems(options);
    } catch {
      plaud = { items: [], summary: summarizeUnifiedItems([]) };
    }
  }
  const limit = normalizeLimit(options.limit);
  const scope = normalizeScope(options.scope);
  const items = sortCoachIntakeReviewOrder([...coach.items, ...plaud.items]).slice(0, limit);
  return { items, summary: mergeIntakeSummaries(coach.summary, plaud.summary), scope, limit, schemaReady: coach.schemaReady };
}
