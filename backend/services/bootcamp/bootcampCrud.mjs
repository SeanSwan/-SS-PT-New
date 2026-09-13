/**
 * ============================================================================
 * FILE: bootcampCrud.mjs
 * PURPOSE: CRUD operations for bootcamp templates, class logs, space profiles, trends
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */

import {
  getBootcampTemplate,
  getBootcampStation,
  getBootcampExercise,
  getBootcampOverflowPlan,
  getBootcampClassLog,
  getBootcampSpaceProfile,
  getBootcampStretch,
  getExerciseTrend,
  getExercise,
} from '../../models/index.mjs';

import { requireClassDate, taughtIdentityFields } from './bootcampTaughtIdentity.mjs';

// H09 / rule 4: the media rejoin lives in its own module. `hydrateTemplateExerciseMedia`
// is re-exported through `__testing__`, and `normalizeExerciseLibraryId` is used by the
// save-side id handling, so BOTH keep their import path here.
import { hydrateTemplateExerciseMedia, normalizeExerciseLibraryId } from './bootcampTemplateMedia.mjs';


// ── Save Generated Class to Database ──────────────────────────────────
// S06: the write moved to bootcampTemplateSave.mjs, which enforces the atomic
// transaction, the per-row allowlists, server-derived station resolution and
// the persisted-ID selection manifest. Re-exported here so every existing
// caller and import path keeps working unchanged.
export { saveBootcampTemplate } from './bootcampTemplateSave.mjs';

// ── Log a Class ───────────────────────────────────────────────────────

/** A strict, client-safe 4xx the route may surface verbatim. */
function clientError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.exposeToClient = true;
  return error;
}

/**
 * Normalize an OPTIONAL template reference to a positive integer id.
 * Strict on purpose: the route used to `parseInt` a client value, which read
 * '12abc' as 12 and turned 'abc' into NaN (surfacing as a 500).
 */
function normalizeOptionalTemplateId(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = typeof value === 'string' && /^[1-9][0-9]*$/.test(value.trim())
    ? Number(value.trim())
    : value;
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    throw clientError(400, 'templateId must be a positive integer');
  }
  return numeric;
}

/**
 * Write one taught class log, collapsing a retry onto the row its operation key already
 * identifies.
 *
 * @param {object} data the log body, including `operationKey` when the caller has one.
 * @param {object} [options]
 * @param {object} [options.transaction] run inside the caller's transaction. §5 line 216
 *   requires the Sprint confirmation's log, slot link and taught count to commit as ONE
 *   unit, so the confirmation passes its transaction down instead of committing a log its
 *   own rollback could not reach.
 */
export async function logBootcampClass(data, { transaction } = {}) {
  const ClassLog = getBootcampClassLog();
  const templateId = normalizeOptionalTemplateId(data?.templateId);

  // The taught DATE is validated and canonicalized for the ROW, not only for the hash.
  //
  // A hostile verification (round 108) measured what the old behaviour produced: `/log`
  // checked only that `classDate` was truthy, the raw value was persisted, and Sequelize's
  // DATEONLY stringifies anything unparseable as `'Invalid date'` — so `"not-a-date"`,
  // `"2026-02-30"` and `"2026-13-01"` each surfaced as a **500 "Failed to log class"**. That is
  // the same defect class the Sprint confirmation's date fix closed on its sibling path, and
  // §9 line 323 asks for explicit validation errors rather than generic faults.
  const classDate = requireClassDate(data?.classDate);

  // HOSTILE-REVIEW FIX (BE-F8a): a class log may only be attributed to the
  // caller's OWN template. The route previously wrote any client-supplied
  // templateId straight through, so a trainer could point their log at another
  // trainer's template — a cross-tenant reference with no ownership check.
  if (templateId !== null) {
    const Template = getBootcampTemplate();
    const owned = await Template.findOne({ where: { id: templateId, trainerId: data.trainerId }, transaction });
    if (!owned) throw clientError(404, 'Template not found');
  }

  // §5 line 220: "Canonical payloadHash is computed AFTER SCHEMA NORMALIZATION and excludes
  // receipt timestamps." The hash therefore uses the NORMALIZED `templateId` and the
  // canonical `classDate` the ROW will carry — external review round 97 (F5) showed `'42'` and
  // `42` hashed differently, and round 99 (MED-4) the same for `'2026-9-3'`/`'2026-09-03'`.
  const identity = taughtIdentityFields({ ...data, templateId, classDate });
  if (!identity) return ClassLog.create({ ...data, templateId, classDate }, { transaction });

  const where = { trainerId: data.trainerId, operationKey: identity.operationKey };
  const existing = await ClassLog.findOne({ where, transaction });
  if (existing) return resolveIdempotentLog(existing, identity.payloadHash);

  try {
    return await ClassLog.create({ ...data, templateId, classDate, ...identity }, { transaction });
  } catch (err) {
    // Two concurrent retries can both miss the lookup. The unique index on
    // (trainerId, operationKey) decides; the loser re-reads the winner's row.
    if (err?.name === 'SequelizeUniqueConstraintError') {
      // §5 line 220: "No retry handler continues querying inside an aborted PostgreSQL
      // transaction." A unique violation has ALREADY aborted a caller's transaction, so a
      // re-read here would fail with 25P02 and mask the real error. Inside a transaction the
      // caller re-reads after its own rollback; standalone, the re-read is safe.
      if (transaction) throw err;
      const raced = await ClassLog.findOne({ where });
      if (raced) return resolveIdempotentLog(raced, identity.payloadHash);
    }
    throw err;
  }
}

/**
 * A retry with the SAME key and the SAME payload returns the original row. A different
 * payload under a used key is a caller bug, not a retry, and must not silently overwrite
 * history — §5 line 218 gives it its own identity, so it gets a 409.
 *
 * The message is CLIENT-VISIBLE (hostile review, round 127): `clientError` sets `exposeToClient`
 * and 409 is in the route's `CLIENT_SAFE_STATUSES` allowlist, so this string reaches the trainer.
 * It used to read "operationKey was already used with a different payload", which names an internal
 * handshake the trainer has no concept of, and it was the visible half of a HIGH defect: the taught
 * log re-sent a live `classDate` under a surviving key, turning an honest retry into a permanent
 * 409 (fixed in `useBootcampTaughtLog.ts` by freezing the body with the key). The wording now says
 * what the trainer can act on, matching the Sprint path's equivalent
 * (`sprintCalendarContract.mjs:45`, "This class was already confirmed with different details").
 * The refusal itself is unchanged — only the sentence.
 */
function resolveIdempotentLog(existing, payloadHash) {
  if (existing.payloadHash && existing.payloadHash !== payloadHash) {
    throw clientError(409, 'This class was already logged with different details');
  }
  return existing;
}

// ── Get Class History ─────────────────────────────────────────────────

/**
 * The columns a history reader is entitled to. An ATTRIBUTE ALLOWLIST, not `SELECT *`
 * (integration review, round 104): the H29 columns are internal write machinery —
 * `operationKey` and `payloadHash` describe an idempotency handshake, and `executionSummary`
 * is provenance for the class, not part of the history list — so they were riding to every
 * owner/admin reader by default.
 */
const HISTORY_ATTRIBUTES = [
  'id', 'classDate', 'dayType', 'actualParticipants', 'overflowActivated',
  'exercisesUsed', 'modificationsMade', 'trainerNotes', 'classRating', 'energyLevel',
  'attendance', 'templateId', 'createdAt',
];

export async function getClassHistory(trainerId, { dayType, limit = 20, offset = 0 } = {}) {
  const ClassLog = getBootcampClassLog();
  const where = { trainerId };
  if (dayType) where.dayType = dayType;

  return ClassLog.findAndCountAll({
    where,
    attributes: HISTORY_ATTRIBUTES,
    order: [['classDate', 'DESC']],
    limit,
    offset,
  });
}

// ── Get Templates ─────────────────────────────────────────────────────

export async function getTemplates(trainerId, { classFormat, dayType, limit = 20 } = {}) {
  const Template = getBootcampTemplate();
  const where = { trainerId, isActive: true };
  if (classFormat) where.classFormat = classFormat;
  if (dayType) where.dayType = dayType;

  const templates = await Template.findAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit,
    include: [
      { model: getBootcampStation(), as: 'stations', include: [{ model: getBootcampExercise(), as: 'exercises' }] },
      { model: getBootcampOverflowPlan(), as: 'overflowPlans' },
      { model: getBootcampStretch(), as: 'stretches' },
    ],
  });

  return hydrateTemplateExerciseMedia(templates);
}

// ── Space Profile CRUD ────────────────────────────────────────────────

export async function createSpaceProfile(data) {
  const SpaceProfile = getBootcampSpaceProfile();
  return SpaceProfile.create(data);
}

export async function getSpaceProfiles(trainerId) {
  const SpaceProfile = getBootcampSpaceProfile();
  return SpaceProfile.findAll({ where: { trainerId }, order: [['name', 'ASC']] });
}

/**
 * Columns a client may change on a space profile — every writable column of
 * models/BootcampSpaceProfile.mjs EXCEPT `id` and `trainerId`.
 *
 * HOSTILE-REVIEW FIX (BE-F8b): the route passed `req.body` straight into
 * `profile.update()`, which mass-assigns every matching attribute. A trainer
 * could therefore PUT `{ trainerId: <another trainer's id> }` and hand their own
 * space profile to someone else — a cross-tenant reassignment, past an
 * ownership check that had already passed.
 */
const SPACE_PROFILE_UPDATABLE_FIELDS = Object.freeze([
  'name', 'locationName', 'totalAreaSqft', 'maxStations', 'maxPerStation',
  'layoutData', 'mediaUrls', 'hasOutdoorAccess', 'outdoorDescription', 'notes',
]);

export async function updateSpaceProfile(id, trainerId, updates) {
  const SpaceProfile = getBootcampSpaceProfile();
  const profile = await SpaceProfile.findOne({ where: { id, trainerId } });
  if (!profile) throw new Error('Space profile not found');

  const picked = {};
  for (const key of SPACE_PROFILE_UPDATABLE_FIELDS) {
    if (updates && Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
      picked[key] = updates[key];
    }
  }
  return profile.update(picked);
}

// ── Exercise Trend CRUD ───────────────────────────────────────────────

export async function getExerciseTrends({ source, isApproved, limit = 50 } = {}) {
  const Trend = getExerciseTrend();
  const where = {};
  if (source) where.source = source;
  if (isApproved != null) where.isApproved = isApproved;

  return Trend.findAll({
    where,
    order: [['trendScore', 'DESC']],
    limit,
  });
}

export async function approveExerciseTrend(trendId, userId) {
  const Trend = getExerciseTrend();
  const trend = await Trend.findByPk(trendId);
  if (!trend) throw new Error('Trend not found');
  return trend.update({ isApproved: true, approvedBy: userId });
}

export const __testing__ = {
  hydrateTemplateExerciseMedia,
  normalizeExerciseLibraryId,
};
