/** Persist encrypted proposals; verified workout drafts also get one atomic intent.
 * The protocol version is chosen only by server rollout policy. Model output
 * cannot opt in, certify a result or provide an expected post-save fingerprint.
 */
import { randomUUID } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import { encryptPayload } from '../plaudCipherService.mjs';
import { mapProposalRow } from './coachActionProposalPersistenceService.mjs';
import { parseProposalClientId } from './coachActionProposalApprovalClientId.mjs';
import { resolveCoachWorkoutLibrary } from '../workout/coachWorkoutLibraryResolver.mjs';
import { WORKOUT_LOG_SOURCES } from '../workout/workoutLogSourcePolicy.mjs';
import { WORKOUT_INTENT_SCHEMA, verifiedWorkoutsEnabled, workoutIntentModel,
  workoutIntentInputHash, intentFailure, assertWorkoutIntentAccess } from './coachWorkoutIntentService.mjs';

export function normalizeSessionFields(payload, exercises) {
  const fields = {};
  for (const key of ['duration', 'intensity']) {
    const raw = payload[key];
    const absent = raw === undefined || raw === null || raw === '';
    if (!absent && ((typeof raw !== 'number' && typeof raw !== 'string')
      || String(raw).trim() === '' || !Number.isSafeInteger(Number(raw)) || Number(raw) < (key === 'duration' ? 0 : 1)
      || (key === 'intensity' && Number(raw) > 10))) throw intentFailure('WORKOUT_SESSION_FIELDS_INVALID', 400);
    fields[key] = absent ? (key === 'duration' ? Math.min(exercises.reduce((n, ex) => n + ex.sets.length, 0) * 3, 120) : null) : Number(raw);
  }
  for (const key of ['title', 'notes']) {
    if (payload[key] != null && typeof payload[key] !== 'string') throw intentFailure('WORKOUT_SESSION_FIELDS_INVALID', 400);
    fields[key] = payload[key]?.trim() || (key === 'title' ? `Personal Training Session - ${payload.date}` : '');
  }
  if (payload.source !== undefined && !Object.values(WORKOUT_LOG_SOURCES).includes(payload.source))
    throw intentFailure('WORKOUT_SOURCE_INVALID', 400);
  fields.source = payload.source ?? WORKOUT_LOG_SOURCES.LIVE;
  return fields;
}

export async function persistCoachActionProposal({ type, payload, summary, user, conversation, sourceMessageId, db, requestKey = null }) {
  const verified = type === 'workout_log' && verifiedWorkoutsEnabled();
  const id = randomUUID();
  let attemptedHash = null;
  const persist = async transaction => {
    let normalized = payload, targetUserId = conversation?.targetUserId || null, intent;
    if (verified) {
      const target = parseProposalClientId(payload?.clientId, targetUserId);
      if (!target || (targetUserId != null && Number(targetUserId) !== target)) throw intentFailure('INTENT_BINDING_CONFLICT');
      // Retry and approval must both lock intent before User/assignment rows.
      // Otherwise approval and a draft retry can deadlock in opposite order.
      const existing = requestKey == null ? null : await workoutIntentModel(db).findOne({
        where: { actorId: Number(user.id), requestKey }, transaction, lock: transaction.LOCK.UPDATE,
      });
      await assertWorkoutIntentAccess({ intent: { actorId: user.id, targetClientId: target }, req: { user }, transaction });
      const date = payload.date;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
        || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
        throw intentFailure('WORKOUT_DATE_REQUIRED', 400);
      const exercises = await resolveCoachWorkoutLibrary({ Exercise: db.models?.Exercise, exercises: payload.exercises, transaction });
      normalized = { ...payload, ...normalizeSessionFields(payload, exercises), clientId: target, exercises }; targetUserId = target;
      const actorId = Number(user.id);
      const key = requestKey ?? id;
      // Request identity hashes the fully normalized payload (G03: the resolver
      // is now a pure function of library+payload, so this is reproducible by
      // the review/commit paths, which re-hash the stored payload).
      const expectedHash = workoutIntentInputHash(actorId, target, normalized);
      attemptedHash = expectedHash;
      // SCU G03: trusted caller requestKey dedupes inside the transaction so a
      // transport retry returns the same prepared proposal, a semantic edit on
      // a reused key is a 409, and the race loser recovers the winner.
      if (requestKey != null) {
        if (existing) {
          if (existing.requestHash !== expectedHash) throw intentFailure('WORKOUT_DRAFT_HASH_MISMATCH', 409);
          const rows = await existingProposalRows(db, existing.proposalId, actorId, transaction);
          if (!rows.length) throw intentFailure('PROPOSAL_NOT_FOUND', 404);
          return { ...mapProposalRow(rows[0]), intentId: existing.id, idempotent: true, recovered: false };
        }
      }
      intent = await workoutIntentModel(db).create({ actorId, targetClientId: target,
        requestKey: key, requestHash: expectedHash,
        commandType: 'log_workout', proposalId: id, status: 'drafted', version: 0, proofVersion: 2 }, { transaction });
    }
    const enc = encryptPayload({ type, payload: normalized, conversationId: conversation?.id || null, targetUserId });
    const rows = await db.query(`INSERT INTO coach_action_proposals (
      id, created_by_user_id, conversation_id, source_message_id, proposal_type, status,
      schema_version, summary_json, proposal_cipher, proposal_iv, proposal_tag, cipher_key_id
    ) VALUES (:id, :userId, :conversationId, :sourceMessageId, :proposalType, 'PENDING',
      :schemaVersion, CAST(:summaryJson AS jsonb), :cipher, :iv, :tag, :keyId)
    RETURNING id, proposal_type, status, summary_json, created_at`, {
      replacements: { id, userId: user.id, conversationId: conversation?.id || null,
        sourceMessageId: sourceMessageId || null, proposalType: type,
        schemaVersion: verified ? WORKOUT_INTENT_SCHEMA : '2026-05-06', summaryJson: JSON.stringify(summary),
        cipher: enc.cipher, iv: enc.iv, tag: enc.tag, keyId: enc.keyId },
      type: QueryTypes.SELECT, ...(transaction ? { transaction } : {}),
    });
    const record = { ...mapProposalRow(rows[0]), ...(intent ? { intentId: intent.id } : {}) };
    if (intent) {
      record.idempotent = false;
      record.recovered = false;
    }
    return record;
  };
  if (!verified) return persist();
  try {
    return await db.transaction(persist);
  } catch (err) {
    // PostgreSQL aborts a transaction on a uniqueness violation. Recover only
    // after the managed rollback, in a fresh transaction; never query the
    // aborted connection or redispatch a write after an ambiguous commit.
    if (requestKey == null || !attemptedHash || err?.name !== 'SequelizeUniqueConstraintError') throw err;
    return db.transaction(async transaction => {
      const actorId = Number(user.id);
      const winner = await workoutIntentModel(db).findOne({ where: { actorId, requestKey }, transaction, lock: transaction.LOCK.UPDATE });
      if (!winner) throw err;
      await assertWorkoutIntentAccess({ intent: winner, req: { user }, transaction });
      if (winner.requestHash !== attemptedHash) throw intentFailure('WORKOUT_DRAFT_HASH_MISMATCH', 409);
      const rows = await existingProposalRows(db, winner.proposalId, actorId, transaction);
      if (!rows.length) throw intentFailure('PROPOSAL_NOT_FOUND', 404);
      return { ...mapProposalRow(rows[0]), intentId: winner.id, idempotent: true, recovered: true };
    });
  }
}

async function existingProposalRows(db, proposalId, actorId, transaction) {
  const rows = await db.query(
    `SELECT * FROM coach_action_proposals WHERE id = :id AND created_by_user_id = :actorId`,
    { replacements: { id: proposalId, actorId }, type: QueryTypes.SELECT, ...(transaction ? { transaction } : {}) },
  );
  return Array.isArray(rows) ? rows : [];
}
