/**
 * G09/S9 — scoped visible memory policy over the adopted CoachFact layer.
 *
 * Composition rules (contract 32, T35-T37):
 * - FORGET is immediately enforced by retrieval: the fact transitions
 *   active -> invalidated through the adopted service's conditional update,
 *   forgottenAt/purgeAfterAt are stamped, and the coach context cache for the
 *   client is invalidated in the SAME call — a stale cached context can never
 *   resurrect a forgotten fact. purgeDueFacts hard-destroys rows past the 24h
 *   deadline.
 * - PRIVATE tasks disable retrieval AND extraction: zero durable writes, zero
 *   returned facts.
 * - Task memory is scoped strictly to the target client id; a cross-client
 *   query returns only that client's rows.
 * - CONFLICTS: a stale active fact that contradicts the authoritative record
 *   is flagged for an explicit reconcile step; consumers use the
 *   authoritative value. Nothing is silently mutated.
 */

import { Op } from 'sequelize';
import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { invalidateCoachContextCache } from './ai/coachContextCache.mjs';
import {
  CoachFactError,
  getActiveFactsForContext,
  proposeFacts,
} from './coachFactService.mjs';

export const PURGE_DEADLINE_HOURS = 24;

/**
 * T35 — forget a fact: tombstone + purge clock + immediate context-cache
 * recheck for the client. Forget is a DELETION operation, not a status
 * transition: it must work for any existing row (proposed, active, or
 * already invalidated/superseded), because those rows still hold the
 * client's content. An active row additionally transitions to invalidated
 * through the adopted conditional update so retrieval excludes it instantly;
 * the human-activation invariant is untouched (forget never activates).
 */
export async function forgetFact({ factId, byUserId, now = new Date() } = {}) {
  if (!Number(factId)) throw new CoachFactError('factId is required.', 400, 'COACH_FACT_ID_REQUIRED');
  if (!Number.isInteger(Number(byUserId)) || Number(byUserId) <= 0) {
    throw new CoachFactError('A human actor (byUserId) is required to forget a fact.', 400, 'COACH_FACT_ACTOR_REQUIRED');
  }
  const CoachFact = getModel('CoachFact');
  const existing = await CoachFact.findByPk(Number(factId));
  if (!existing) throw new CoachFactError('Fact not found.', 404, 'COACH_FACT_NOT_FOUND');

  const forgottenAt = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(forgottenAt.getTime())) throw new CoachFactError('Invalid forget time.', 400, 'COACH_FACT_TIME_INVALID');
  const purgeAfterAt = new Date(forgottenAt.getTime() + PURGE_DEADLINE_HOURS * 3600000);
  // A single conditional write wins against concurrent activation. All states
  // become invalidated; repeated forget cannot extend the original deadline.
  await CoachFact.update({ status: 'invalidated', forgottenAt, purgeAfterAt },
    { where: { id: existing.id, forgottenAt: null } });
  invalidateCoachContextCache({ targetClientId: existing.userId });
  return CoachFact.findByPk(existing.id);
}

/**
 * T35 — hard-destroy every row whose purge deadline has passed. Facts are
 * stored as content text; the purge is row destruction (backup retention is
 * disclosed separately per the contract).
 */
export async function purgeDueFacts({ now = new Date() } = {}) {
  const CoachFact = getModel('CoachFact');
  const instant = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(instant.getTime())) throw new CoachFactError('Invalid purge time.', 400, 'COACH_FACT_TIME_INVALID');
  const purged = await CoachFact.destroy({ where: { forgottenAt: { [Op.ne]: null }, purgeAfterAt: { [Op.lte]: instant } } });
  return { purged };
}

/**
 * T36 — extraction from a task's conversation. PRIVATE tasks produce ZERO
 * durable writes: nothing is proposed, nothing is stored.
 */
export async function proposeFactsFromTask({
  taskPrivate = false,
  userId,
  facts = [],
  createdByUserId,
} = {}) {
  if (taskPrivate) {
    return { created: 0, disabled: 'private_task', facts: [] };
  }
  const created = await proposeFacts({ userId, facts, createdByUserId });
  return { created: Array.isArray(created) ? created.length : 0, disabled: null, facts: created };
}

/**
 * T36 — memory visible to a task. Private tasks get an explicit empty result;
 * otherwise facts are scoped strictly to the target client id.
 */
export async function getMemoryForTask({ actorId, targetUserId, taskPrivate = false, cap } = {}) {
  if (!Number(targetUserId)) throw new CoachFactError('targetUserId is required.', 400, 'COACH_FACT_TARGET_REQUIRED');
  if (taskPrivate) {
    return { facts: [], disabled: 'private_task', targetUserId: Number(targetUserId) };
  }
  void actorId; // authorization is enforced upstream by the task context.
  // Cap honesty: 0 means "no facts" (it must never fall through to the
  // service's default cap via a falsy skip); only positive integers pass.
  const capNumber = Number(cap);
  if (Number.isInteger(capNumber) && capNumber <= 0) {
    return { facts: [], disabled: null, targetUserId: Number(targetUserId) };
  }
  const facts = await getActiveFactsForContext({
    userId: Number(targetUserId),
    ...(Number.isInteger(capNumber) && capNumber > 0 ? { cap: capNumber } : {}),
  });
  return { facts, disabled: null, targetUserId: Number(targetUserId) };
}

/**
 * T37 — flag stale active facts whose claim contradicts the authoritative
 * record. Pure: returns the conflict report and the authoritative values to
 * use; it NEVER mutates rows or silently rewrites facts.
 */
export function detectFactConflicts({ facts = [], authoritative = {} } = {}) {
  const conflicts = [];
  for (const fact of Array.isArray(facts) ? facts : []) {
    if (fact?.status !== 'active') continue;
    const key = String(fact.category || '');
    const authoritativeValue = authoritative[key];
    if (authoritativeValue === undefined || authoritativeValue === null) continue;
    const claim = String(fact.statement ?? fact.content ?? '').trim().toLowerCase();
    const truth = String(authoritativeValue).trim().toLowerCase();
    if (claim && truth && claim !== truth) {
      conflicts.push({
        factId: fact.id,
        category: key,
        factClaim: fact.statement ?? fact.content,
        authoritativeValue,
        resolution: 'use_authoritative_record',
      });
    }
  }
  return { conflicts, authoritative };
}
