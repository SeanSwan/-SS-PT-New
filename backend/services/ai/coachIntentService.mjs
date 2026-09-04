/**
 * SCU S3 — durable intent/result coordinator.
 *
 * This service never dispatches a domain effect during retry or reconciliation.
 * A caller claims once, records the result in the same effect transaction when
 * possible, and marks unknown when the response is lost. Reconciliation can
 * only promote an intent after an independent read proves the effect exists.
 */

const ALLOWED_STATUSES = new Set(['claimed', 'completed', 'failed', 'unknown', 'cancelled']);

async function resolveModel(model) {
  if (model) return model;
  const { getModel } = await import('../../models/index.mjs');
  return getModel('CoachIntent');
}

function safeIntent(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
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
