/**
 * SCU S3 — durable intent/result coordinator.
 *
 * This service never dispatches a domain effect during retry or reconciliation.
 * A caller claims once, records the result in the same effect transaction when
 * possible, and marks unknown when the response is lost. Reconciliation can
 * only promote an intent after an independent read proves the effect exists.
 */

import { createHash } from 'node:crypto';
import { toCoachIntentReceipt, sanitizeCoachIntentResult, intentReason, intentIso as toIso, intentSha256 } from './coachIntentReceipt.mjs';
import { hashCoachWorkoutExpectation, verifyCoachIntentEffect } from './coachIntentEffectProof.mjs';
import { stableStringify } from './stableStringify.mjs';
export { toCoachIntentReceipt } from './coachIntentReceipt.mjs';
const ALLOWED_STATUSES = new Set([
  'drafted', 'awaiting_approval', 'executing', 'committed_unverified', 'verified',
  'claimed', 'completed', 'failed', 'unknown', 'cancelled', 'refused',
]);

async function resolveModel(model) {
  if (model) return model;
  const { getModel } = await import('../../models/index.mjs');
  return getModel('CoachIntent');
}

function safeIntent(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
}

export function toPublicCoachIntent(intent) {
  if (!intent) return null;
  const receipt = toCoachIntentReceipt(intent);
  return {
    id: intent.id,
    commandType: intent.commandType,
    targetUserId: intent.targetClientId ?? null,
    // Preserve the legacy outer enum, but never publish an unsupported verified flag.
    status: intent.status === 'completed' ? 'completed' : receipt.state,
    operationId: intent.operationId ?? null,
    proposalId: intent.proposalId ?? null,
    expiresAt: toIso(intent.expiresAt),
    createdAt: toIso(intent.createdAt),
    updatedAt: toIso(intent.updatedAt),
    result: receipt,
  };
}

/** Hash the server-normalized request envelope before a domain effect exists. */
export function hashCoachIntentRequest({ targetClientId = null, commandType, params = {}, contextVersion = 'coach-v3' }) {
  return createHash('sha256').update(stableStringify({
    schemaVersion: 2,
    targetClientId: targetClientId == null ? null : Number(targetClientId),
    commandType: String(commandType || 'unknown'),
    params: params && typeof params === 'object' && !Array.isArray(params) ? params : {},
    contextVersion: String(contextVersion),
  })).digest('hex');
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
  return transition({ model, intentId, from: 'claimed', to: 'completed', values: { result: sanitizeCoachIntentResult(result), completedAt: new Date() }, transaction });
}

export async function commitCoachIntent({ model, intentId, result, expectedHash, expectedFootprint, proofVersion = 2, transaction }) {
  if (!intentSha256(expectedHash) || proofVersion !== 2
    || !expectedFootprint || hashCoachWorkoutExpectation(expectedFootprint) !== expectedHash) {
    return { status: 'conflict', code: 'INVALID_INTENT_PROOF', intent: null };
  }
  const committedAt = new Date();
  return transition({
    model,
    intentId,
    from: 'claimed',
    to: 'committed_unverified',
    values: {
      result: sanitizeCoachIntentResult(result),
      expectedHash,
      expectedFootprint,
      proofVersion,
      committedAt,
      completedAt: committedAt,
    },
    transaction,
  });
}

export async function failCoachIntent({ model, intentId, errorCode, result = null, transaction }) {
  return transition({ model, intentId, from: 'claimed', to: 'failed', values: { errorCode: intentReason(errorCode), result: sanitizeCoachIntentResult(result), completedAt: new Date() }, transaction });
}

export async function markCoachIntentUnknown({ model, intentId, reason = 'CLIENT_TIMEOUT', transaction }) {
  return transition({ model, intentId, from: 'claimed', to: 'unknown', values: { errorCode: intentReason(reason) ?? 'CLIENT_TIMEOUT' }, transaction });
}

export async function reconcileCoachIntent({ model, intentId, readEffect, authorizeIntent }) {
  const unavailable = () => ({ status: 'unavailable', intent: null, dispatched: false });
  if (typeof authorizeIntent !== 'function') return unavailable();
  const allowed = async intent => {
    if (!intent) return false;
    try { return await authorizeIntent(intent) === true; } catch { return false; }
  };
  const Model = await resolveModel(model);
  const currentResult = async reasonCode => {
    const latest = safeIntent(await Model.findByPk(intentId));
    return await allowed(latest) ? { status: latest.status, intent: latest, dispatched: false,
      ...(reasonCode ? { reasonCode } : {}) } : unavailable();
  };
  const row = await Model.findByPk(intentId);
  const intent = safeIntent(row);
  if (!(await allowed(intent))) return unavailable();
  if (!['unknown', 'committed_unverified'].includes(intent.status) || typeof readEffect !== 'function') {
    return { status: intent.status, intent, dispatched: false };
  }
  let observation, readFailed = false;
  try { observation = await readEffect(intent); } catch { readFailed = true; }
  // Access may change while the domain read is pending, including failed reads.
  if (!(await allowed(intent))) return unavailable();
  if (readFailed) return currentResult('READBACK_UNAVAILABLE');
  const proof = verifyCoachIntentEffect(intent, observation);
  if (!proof) return currentResult('READBACK_MISMATCH');
  const verifiedAt = new Date();
  const [count, rows] = await Model.update({ status: 'verified', version: intent.version + 1,
    result: sanitizeCoachIntentResult(proof), verifiedAt, completedAt: verifiedAt },
  { where: { id: intent.id, status: intent.status, version: intent.version, expectedHash: intent.expectedHash }, returning: true });
  if (count) {
    const updated = safeIntent(rows[0]);
    return await allowed(updated) ? { status: 'verified', intent: updated, dispatched: false }
      : unavailable();
  }
  // A concurrent correction won. Never report that our stale observation verified it.
  return currentResult();
}

export async function readCoachIntent({ model, intentId }) {
  const Model = await resolveModel(model);
  const row = await Model.findByPk(intentId);
  return safeIntent(row);
}
