/**
 * coachIntakeReviewActionsService.mjs
 * ===================================
 * Deterministic review-gate actions for Coach intake items. These functions
 * update queue metadata and audit events only; final client/workout writes
 * remain owned by the existing approval pipeline.
 */
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { coachIntakeTablesExist, mapCoachRowToIntakeItem } from './coachIntakeItemService.mjs';
import sequelize from '../database.mjs';
import {
  CoachIntakeSchemaUnavailableError,
  CoachIntakeValidationError,
} from './coachIntakeConstants.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIO_SOURCES = new Set(['voice_note', 'audio_upload', 'plaud_clip']);

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

function audioFacts(row) {
  const metadata = row?.metadata_json || {};
  const current = metadata.audioPuzzle && typeof metadata.audioPuzzle === 'object'
    ? metadata.audioPuzzle
    : {};
  const fallbackAudio = AUDIO_SOURCES.has(row?.source_type);
  const pieceCount = Number.parseInt(current.pieceCount, 10) || (fallbackAudio ? 1 : 0);
  const bundleCount = Number.parseInt(current.bundleCount, 10) || (pieceCount > 0 ? 1 : 0);
  if (pieceCount <= 0) {
    throw new CoachIntakeValidationError('NO_AUDIO_PIECES', 'This intake has no audio order to confirm');
  }
  return {
    pieceCount,
    bundleCount,
    autoBundleCount: Number.parseInt(current.autoBundleCount, 10) || 0,
    confidence: ['single', 'high', 'medium', 'low'].includes(current.confidence)
      ? current.confidence
      : (pieceCount === 1 ? 'single' : 'low'),
    previousNeedsOrderingReview: current.needsOrderingReview === true,
  };
}

export async function confirmCoachIntakeAudioOrder({
  userId,
  intakeId,
  sequelizeOverride = null,
  now = new Date(),
} = {}) {
  const db = sequelizeOverride || sequelize;
  const numericUserId = cleanUserId(userId);
  const cleanId = cleanIntakeId(intakeId);
  if (!await coachIntakeTablesExist(db)) throw new CoachIntakeSchemaUnavailableError();

  return db.transaction(async (transaction) => {
    const rows = await db.query(
      `SELECT id, user_id, source_type, source_ref, status, resolved_client_id,
              recorded_at_start, uploaded_at, metadata_json, error_code, created_at
         FROM coach_intake_items
        WHERE id = :intakeId AND user_id = :userId
        FOR UPDATE`,
      {
        replacements: { intakeId: cleanId, userId: numericUserId },
        type: QueryTypes.SELECT,
        transaction,
      },
    );
    const row = rows?.[0];
    if (!row) {
      throw new CoachIntakeValidationError('INTAKE_NOT_FOUND', 'Coach intake item was not found');
    }

    const facts = audioFacts(row);
    const confirmedAt = now.toISOString();
    const patchJson = JSON.stringify({
      pieceCount: facts.pieceCount,
      bundleCount: facts.bundleCount,
      autoBundleCount: facts.autoBundleCount,
      confidence: facts.confidence,
      needsOrderingReview: false,
      orderConfirmed: true,
      orderConfirmedAt: confirmedAt,
      orderConfirmedByUserId: numericUserId,
    });

    const updatedRows = await db.query(
      `UPDATE coach_intake_items
          SET metadata_json = jsonb_set(
                COALESCE(metadata_json, '{}'::jsonb),
                '{audioPuzzle}',
                COALESCE(metadata_json->'audioPuzzle', '{}'::jsonb) || CAST(:patchJson AS jsonb),
                true
              ),
              updated_at = NOW()
        WHERE id = :intakeId AND user_id = :userId
        RETURNING id, user_id, source_type, source_ref, status, resolved_client_id,
          recorded_at_start, uploaded_at, metadata_json, error_code, created_at`,
      {
        replacements: { intakeId: cleanId, userId: numericUserId, patchJson, confirmedAt },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    await db.query(
      `INSERT INTO coach_intake_events (
         id, intake_item_id, actor_type, actor_id, event_type, event_json
       ) VALUES (
         :eventId, :intakeId, 'user', :actorId, 'confirm_audio_order', CAST(:eventJson AS jsonb)
       )`,
      {
        replacements: {
          eventId: randomUUID(),
          intakeId: cleanId,
          actorId: String(numericUserId),
          eventJson: JSON.stringify({
            action: 'confirm_audio_order',
            pieceCount: facts.pieceCount,
            bundleCount: facts.bundleCount,
            previousNeedsOrderingReview: facts.previousNeedsOrderingReview,
          }),
        },
        type: QueryTypes.INSERT,
        transaction,
      },
    );

    return mapCoachRowToIntakeItem(updatedRows[0]);
  });
}
