/**
 * ============================================================================
 * FILE: sprintAccess.mjs — S08 / R-H03.
 * Positive-safe-integer normalization, trusted actor validation and Sprint
 * ownership lookup for every callable Sprint surface.
 *
 * THE CONTRACT
 *   - IDs are normalized ONCE, here, and the NORMALIZED integer is what travels
 *     through route/service/model comparisons. A trimmed decimal digit string
 *     is accepted; zero, negative, unsafe, fractional, NaN, Infinity, junk
 *     suffixes, exponential notation and object/array input are rejected BEFORE
 *     any query or job lookup.
 *   - The actor is `{userId, role}` and comes from authenticated `req.user`
 *     ONLY — never `req.body`, never generated metadata. A bad actor or role is
 *     FORBIDDEN (403).
 *   - A missing or foreign object is a NON-DISCLOSING not-found (404): the caller
 *     cannot tell "does not exist" from "belongs to someone else".
 *   - An explicit authenticated `admin` may operate another trainer's Sprint. In
 *     that case the Sprint's stored `trainerId` remains the DATA OWNER; the
 *     admin's identity is never written into ownership.
 *
 * No exported trusted-internal bypass, and no omitted-actor fallback.
 * ============================================================================
 */

// Reused so a profile id is normalized by exactly one implementation.
import { normalizeOptionalProfileId } from './bootcampTemplateRules.mjs';

/** 400 — the identifier itself is malformed. Fails before any lookup. */
export class SprintIdInvalidError extends Error {
  constructor(message = 'A valid Sprint identifier is required') {
    super(message);
    this.name = 'SprintIdInvalidError';
    this.status = 400;
    this.code = 'SPRINT_ID_INVALID';
  }
}

/** 403 — the actor is missing, malformed or has an unsupported role. */
export class SprintActorForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'SprintActorForbiddenError';
    this.status = 403;
    this.code = 'SPRINT_ACTOR_FORBIDDEN';
  }
}

/** 404 — non-disclosing: identical for "absent" and "not yours". */
export class SprintObjectNotFoundError extends Error {
  constructor(message = 'Sprint not found') {
    super(message);
    this.name = 'SprintObjectNotFoundError';
    this.status = 404;
    this.code = 'SPRINT_NOT_FOUND';
  }
}

export const SPRINT_ROLES = Object.freeze(['admin', 'trainer']);

const DECIMAL_DIGITS = /^[0-9]+$/;

/**
 * A positive safe integer, or a string of decimal digits that parses to one.
 * Deliberately strict: no sign, no whitespace inside, no fractional part, no
 * exponent, no junk suffix, no empty string.
 */
export function normalizePositiveSafeInteger(value, label = 'identifier') {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new SprintIdInvalidError(`A valid ${label} is required`);
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!DECIMAL_DIGITS.test(trimmed)) throw new SprintIdInvalidError(`A valid ${label} is required`);
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new SprintIdInvalidError(`A valid ${label} is required`);
    }
    return parsed;
  }
  throw new SprintIdInvalidError(`A valid ${label} is required`);
}

/**
 * Validate the trusted actor. `userId` is normalized to an integer; `role` must
 * be exactly 'admin' or 'trainer'.
 */
export function normalizeActor(actor) {
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) {
    throw new SprintActorForbiddenError();
  }
  const role = typeof actor.role === 'string' ? actor.role.trim() : actor.role;
  if (!SPRINT_ROLES.includes(role)) throw new SprintActorForbiddenError();
  let userId;
  try {
    userId = normalizePositiveSafeInteger(actor.userId, 'user identifier');
  } catch {
    throw new SprintActorForbiddenError();
  }
  return { userId, role };
}

export const isAdminActor = (actor) => actor?.role === 'admin';

/**
 * Resolve a Sprint and authorize the actor against it.
 * `getSprint` is the existing model accessor; the lookup receives the
 * NORMALIZED id. Returns `{ sprint, dataOwnerTrainerId, actingAsAdmin }`.
 */
export async function requireOwnedSprint(sprintId, actor, { getSprint }) {
  const normalizedSprintId = normalizePositiveSafeInteger(sprintId, 'Sprint identifier');
  const normalizedActor = normalizeActor(actor);

  const sprint = await getSprint(normalizedSprintId);
  if (!sprint) throw new SprintObjectNotFoundError();

  const ownerId = Number(sprint.trainerId);
  const actingAsAdmin = isAdminActor(normalizedActor);
  if (!actingAsAdmin && ownerId !== normalizedActor.userId) {
    // Non-disclosing: a foreign Sprint is reported exactly like an absent one.
    throw new SprintObjectNotFoundError();
  }

  return {
    sprint,
    sprintId: normalizedSprintId,
    actor: normalizedActor,
    // The Sprint's own trainer stays the data owner even when an admin acts.
    dataOwnerTrainerId: ownerId,
    actingAsAdmin,
  };
}

/**
 * Authorize a child row (week/slot) whose query MUST also be constrained to the
 * already-authorized Sprint id, so a foreign child can never be reached by id.
 */
export function requireChildOfSprint(child, sprintId) {
  if (!child) throw new SprintObjectNotFoundError();
  const childSprintId = Number(child.sprintId);
  if (!Number.isSafeInteger(childSprintId) || childSprintId !== Number(sprintId)) {
    throw new SprintObjectNotFoundError();
  }
  return child;
}

/** A previous Sprint referenced as generation input is authorized the same way. */
export async function requireOptionalOwnedSprint(sprintId, actor, { getSprint }) {
  if (sprintId === undefined || sprintId === null || sprintId === '') return null;
  return requireOwnedSprint(sprintId, actor, { getSprint });
}

/**
 * Normalize and authorize an OPTIONAL space-profile reference.
 *
 * Same injected-accessor shape as `requireOwnedSprint`, and the same
 * non-disclosing rule: a profile belonging to someone else is reported exactly
 * like one that does not exist. The NORMALIZED id is what the caller persists.
 *
 * Baseline wrote the raw request value into an INTEGER column, so
 * `spaceProfileId: 'abc'` reached PostgreSQL (a 500) and a trainer could point a
 * Sprint at another trainer's space profile.
 */
export async function requireOwnedSpaceProfile(profileId, actor, { getSpaceProfile } = {}) {
  // A BLANK string means "no profile referenced", exactly as
  // `requireOptionalOwnedSprint` treats a blank previousSprintId. The baseline
  // wrote `spaceProfileId || null`, so `''` was absent; `normalizeOptionalProfileId`
  // is strict and would turn a benign empty form value into a 400. Note `0` is
  // still rejected — it is a value, not an absence.
  if (typeof profileId === 'string' && profileId.trim() === '') return null;

  const normalizedProfileId = normalizeOptionalProfileId(profileId);
  if (normalizedProfileId === null) return null;

  const normalizedActor = normalizeActor(actor);
  if (typeof getSpaceProfile !== 'function') throw new SprintObjectNotFoundError('Space profile not found');

  const profile = await getSpaceProfile(normalizedProfileId);
  if (!profile) throw new SprintObjectNotFoundError('Space profile not found');
  if (!isAdminActor(normalizedActor) && Number(profile.trainerId) !== normalizedActor.userId) {
    throw new SprintObjectNotFoundError('Space profile not found');
  }
  return normalizedProfileId;
}
