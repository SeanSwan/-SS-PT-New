/**
 * SCU S3 — durable intent/result coordinator.
 *
 * This service never dispatches a domain effect during retry or reconciliation.
 * A caller claims once, records the result in the same effect transaction when
 * possible, and marks unknown when the response is lost. Reconciliation can
 * only promote an intent after an independent read proves the effect exists.
 */

const ALLOWED_STATUSES = new Set(['claimed', 'completed', 'failed', 'unknown', 'cancelled']);
const PUBLIC_STATES = new Set([
  'claimed', 'awaiting_approval', 'executing', 'committed_unverified',
  'completed', 'verified', 'failed', 'unknown', 'cancelled', 'refused',
]);

const toIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const safeString = (value, max = 128) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
);

const safeRecordRefs = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((ref) => ref && typeof ref === 'object' && !Array.isArray(ref))
    .map((ref) => ({
      kind: safeString(ref.kind, 64),
      id: safeString(String(ref.id ?? ''), 128),
      version: Number.isSafeInteger(ref.version) ? ref.version : null,
    }))
    .filter((ref) => ref.kind && ref.id);
};

async function resolveModel(model) {
  if (model) return model;
  const { getModel } = await import('../../models/index.mjs');
  return getModel('CoachIntent');
}

function safeIntent(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
}

/**
 * Convert an internal intent row into the bounded C5 receipt contract.
 * Raw result payloads are deliberately ignored; callers must put only the
 * receipt-shaped fields in `result` before this boundary.
 */
export function toCoachIntentReceipt(intent) {
  if (!intent) return null;
  const source = intent.result && typeof intent.result === 'object' && !Array.isArray(intent.result)
    ? intent.result
    : {};
  const state = PUBLIC_STATES.has(source.state) ? source.state : intent.status;
  const targetUserId = Number.isSafeInteger(Number(intent.targetClientId)) && Number(intent.targetClientId) > 0
    ? Number(intent.targetClientId)
    : null;
  const realAffectedCount = Number.isSafeInteger(source.realAffectedCount)
    ? source.realAffectedCount
    : null;

  return {
    schemaVersion: 1,
    intentId: intent.id,
    operationId: intent.operationId ?? safeString(source.operationId, 64),
    proposalId: intent.proposalId ?? safeString(source.proposalId, 64),
    state,
    commandType: intent.commandType,
    targetUserId,
    committedAt: toIso(source.committedAt ?? intent.completedAt),
    verifiedAt: toIso(source.verifiedAt),
    recordRefs: safeRecordRefs(source.recordRefs),
    realAffectedCount,
    reversibility: source.reversibility === 'inverse' || source.reversibility === 'compensation'
      ? source.reversibility
      : 'none',
    undoAvailable: source.undoAvailable === true,
    reasonCode: safeString(source.reasonCode ?? intent.errorCode, 100),
    correlationId: safeString(source.correlationId, 128),
  };
}

export function toPublicCoachIntent(intent) {
  if (!intent) return null;
  return {
    id: intent.id,
    commandType: intent.commandType,
    targetUserId: intent.targetClientId ?? null,
    status: intent.status,
    operationId: intent.operationId ?? null,
    proposalId: intent.proposalId ?? null,
    expiresAt: toIso(intent.expiresAt),
    createdAt: toIso(intent.createdAt),
    updatedAt: toIso(intent.updatedAt),
    result: toCoachIntentReceipt(intent),
  };
}

function assertStatus(status) {
  if (!ALLOWED_STATUSES.has(status)) throw new Error(`Invalid CoachIntent status: ${status}`);
}

export async function claimCoachIntent({
  model,
  actorId,
  requestKey,
  requestHash,
  commandType,
  targetClientId = null,
  operationId = null,
  proposalId = null,
  expiresAt = null,
  transaction,
}) {
  if (!Number.isInteger(Number(actorId)) || !String(requestKey || '').trim() || !String(requestHash || '').trim()) {
    return { status: 'conflict', code: 'INVALID_INTENT_KEY', intent: null, created: false };
  }
  const Model = await resolveModel(model);
  const [row, created] = await Model.findOrCreate({
    where: { actorId: Number(actorId), requestKey: String(requestKey).trim() },
    defaults: {
      actorId: Number(actorId),
      requestKey: String(requestKey).trim(),
      requestHash: String(requestHash).trim(),
      commandType: String(commandType || 'unknown').trim().slice(0, 100),
      targetClientId: targetClientId == null ? null : Number(targetClientId),
      operationId,
      proposalId,
      expiresAt,
      status: 'claimed',
    },
    transaction,
  });
  const intent = safeIntent(row);
  if (!created && intent.requestHash !== String(requestHash).trim()) {
    return { status: 'conflict', code: 'REQUEST_HASH_MISMATCH', intent, created: false };
  }
  return { status: intent.status, intent, created: Boolean(created) };
}

async function transition({ model, intentId, from, to, values = {}, transaction }) {
  assertStatus(to);
  const Model = await resolveModel(model);
  const [count, rows] = await Model.update(
    { ...values, status: to },
    { where: { id: intentId, status: from }, returning: true, transaction },
  );
  const row = rows?.[0] || null;
  return count ? { status: to, intent: safeIntent(row), ...values } : { status: from, intent: null };
}

export async function completeCoachIntent({ model, intentId, result, transaction }) {
  return transition({ model, intentId, from: 'claimed', to: 'completed', values: { result, completedAt: new Date() }, transaction });
}

export async function failCoachIntent({ model, intentId, errorCode, result = null, transaction }) {
  return transition({ model, intentId, from: 'claimed', to: 'failed', values: { errorCode, result, completedAt: new Date() }, transaction });
}

export async function markCoachIntentUnknown({ model, intentId, reason = 'CLIENT_TIMEOUT', transaction }) {
  return transition({ model, intentId, from: 'claimed', to: 'unknown', values: { errorCode: reason }, transaction });
}

export async function reconcileCoachIntent({ model, intentId, readEffect }) {
  const Model = await resolveModel(model);
  const row = await Model.findByPk(intentId);
  const intent = safeIntent(row);
  if (!intent) return { status: 'unavailable', intent: null, dispatched: false };
  if (intent.status !== 'unknown' || typeof readEffect !== 'function') return { status: intent.status, intent, dispatched: false };
  const observation = await readEffect(intent);
  if (!observation?.found) return { status: 'unknown', intent, dispatched: false };
  const promoted = await transition({ model: Model, intentId, from: 'unknown', to: 'completed', values: { result: observation.result ?? intent.result, completedAt: new Date() } });
  return { ...promoted, dispatched: false };
}

export async function readCoachIntent({ model, intentId }) {
  const Model = await resolveModel(model);
  const row = await Model.findByPk(intentId);
  return safeIntent(row);
}
