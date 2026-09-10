/** V2 durable lifecycle: draft deduplication and revision-bound state transitions.
 * Internal coordinator API only. The caller must freshly authorize actor/target,
 * validate the domain preview and consume the existing signed approval protocol.
 * This service neither invokes a model nor dispatches a domain effect.
 */
import { sanitizeCoachIntentResult, intentIso, intentReason, intentSha256 } from './coachIntentReceipt.mjs';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const positive = value => (typeof value === 'number' || typeof value === 'string')
  && /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const opaque = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,63}$/.test(value);
const plain = row => typeof row?.toJSON === 'function' ? row.toJSON() : row;
const conflict = code => ({ status: 'conflict', code, intent: null, created: false });
async function getModel(model) {
  if (model) return model;
  return (await import('../../models/index.mjs')).getModel('CoachIntent');
}

export async function createCoachIntentDraft({ model, actorId, targetClientId, requestKey,
  requestHash, commandType, proposalId = null }) {
  if (!positive(actorId) || !positive(targetClientId) || !UUID.test(requestKey || '')
    || !intentSha256(requestHash) || !/^[a-z][a-z0-9_]{0,99}$/.test(commandType || '')
    || (proposalId !== null && !opaque(proposalId))) return conflict('INVALID_INTENT_KEY');
  const Model = await getModel(model);
  const defaults = { actorId: Number(actorId), targetClientId: Number(targetClientId),
    requestKey, requestHash, commandType, proposalId, status: 'drafted', version: 0, proofVersion: 2 };
  let row, created = false;
  try {
    [row, created] = await Model.findOrCreate({ where: { actorId: Number(actorId), requestKey }, defaults });
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError' || !proposalId) throw error;
    row = await Model.findOne({ where: { actorId: Number(actorId), proposalId } });
  }
  const intent = plain(row);
  if (!intent || intent.requestHash !== requestHash || intent.commandType !== commandType
    || Number(intent.targetClientId) !== Number(targetClientId) || intent.proposalId !== proposalId)
    return conflict('INTENT_BINDING_CONFLICT');
  return { status: intent.status, intent, created };
}

const EVENTS = {
  review: { from: ['drafted', 'failed'], to: 'awaiting_approval' },
  start: { from: ['awaiting_approval'], to: 'executing' },
  cancel: { from: ['drafted', 'awaiting_approval'], to: 'cancelled' },
  commit: { from: ['executing'], to: 'committed_unverified' },
  unknown: { from: ['executing'], to: 'unknown' },
  refuse: { from: ['drafted', 'awaiting_approval'], to: 'refused' },
  rollback: { from: ['executing'], to: 'failed' },
};

export async function advanceCoachIntent({ model, intentId, actorId, expectedVersion,
  event, operationId, expectedHash, expiresAt, result, reasonCode, rollbackConfirmed = false, transaction }) {
  const rule = EVENTS[event];
  if (!rule || !positive(actorId) || !UUID.test(intentId || '')
    || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
    return { changed: false, status: 'conflict', code: 'INVALID_TRANSITION', intent: null };
  const Model = await getModel(model);
  const current = plain(await Model.findOne({ where: { id: intentId, actorId: Number(actorId) }, transaction }));
  if (!current) return { changed: false, status: 'unavailable', intent: null };
  const unchanged = code => ({ changed: false, status: current.status, intent: current, code });
  if (current.proofVersion !== 2 || current.version !== expectedVersion || !rule.from.includes(current.status))
    return unchanged('REVISION_OR_STATE_MISMATCH');
  const values = { status: rule.to, version: expectedVersion + 1 };
  if (event === 'review') {
    const expiry = intentIso(expiresAt);
    if (!intentSha256(expectedHash) || !opaque(operationId) || !expiry || new Date(expiry) <= new Date())
      return unchanged('INVALID_REVIEW_BINDING');
    if (current.status === 'failed' && (current.expectedHash !== expectedHash || current.operationId === operationId))
      return unchanged('FRESH_APPROVAL_REQUIRED');
    Object.assign(values, { expectedHash, operationId, expiresAt: expiry, completedAt: null, errorCode: null });
  }
  if (event === 'start') {
    if (!current.proposalId || !current.expectedHash || !opaque(operationId) || operationId !== current.operationId)
      return unchanged('APPROVAL_BINDING_MISMATCH');
    if (!intentIso(current.expiresAt) || new Date(current.expiresAt) <= new Date()) return unchanged('APPROVAL_EXPIRED');
  }
  if (event === 'commit') {
    if (!transaction) throw new Error('CoachIntent commit requires the domain writer transaction');
    Object.assign(values, { result: sanitizeCoachIntentResult(result), committedAt: new Date(), completedAt: new Date() });
  }
  if (event === 'rollback' && rollbackConfirmed !== true) return unchanged('ROLLBACK_PROOF_REQUIRED');
  if (['cancel', 'refuse', 'rollback'].includes(event))
    Object.assign(values, { completedAt: new Date(), committedAt: null, verifiedAt: null, errorCode: intentReason(reasonCode) });
  if (event === 'unknown') values.errorCode = intentReason(reasonCode) ?? 'CLIENT_TIMEOUT';
  const [count, rows] = await Model.update(values, { where: { id: intentId, actorId: Number(actorId),
    version: expectedVersion, status: current.status }, returning: true, transaction });
  if (count) return { changed: true, status: rule.to, intent: plain(rows[0]) };
  // Return current durable state after a losing race, never a fictional cancellation.
  const latest = plain(await Model.findOne({ where: { id: intentId, actorId: Number(actorId) }, transaction }));
  return { changed: false, status: latest?.status ?? 'unavailable', intent: latest, code: 'REVISION_OR_STATE_MISMATCH' };
}
