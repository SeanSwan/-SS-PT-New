/**
 * ============================================================================
 * FILE: coachFactService.mjs
 * PURPOSE: Durable, temporally-valid, trainer-approved facts about a client —
 *          the write/read layer of the Coach Facts memory system.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-31
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/FABLE-BLUEPRINT-COACH-FACTS-2026-08-31.md (S1)
 * ============================================================================
 *
 * WHY THIS EXISTS: everything Swan Coach learns in a chat turn or a dictated
 * session evaporates the moment the turn ends. `coachContextEngine` already
 * aggregates the *structured* record (workouts, pain, nutrition, goals); it has
 * nowhere to put "travels alternate weeks" or "left-knee discomfort on lunges"
 * — the observations that actually change how a coach programs.
 *
 * INVARIANTS (each is pinned by a test in tests/unit/coachFactService.test.mjs):
 *
 *  1. THE MACHINE MAY ONLY PROPOSE. `proposeFacts` can write only `proposed`
 *     rows. The single transition into `active` — the only status the coach
 *     context ever reads — requires a human actor id, and `approveFact` throws
 *     without one. `createManualFact` is born active because a human already
 *     decided by typing it. There is deliberately NO auto-activation path;
 *     if a future slice needs one, that is a product decision for Sean, not a
 *     refactor. This is the trainer-indispensability doctrine made structural.
 *
 *  2. NOTHING IS EVER DELETED. A fact that stops being true is `invalidated`
 *     with `invalidatedAt` and, when one fact replaced another, a link to its
 *     successor. That is what makes point-in-time recall possible later, and
 *     it is why `validTo` is a date the trainer sets rather than a row we drop.
 *
 *  3. DEDUP IS NORMALIZED, NOT EXACT. Extraction re-reads an overlapping
 *     conversation window every turn, so the same observation arrives again
 *     with drifted casing and punctuation. Exact-match dedup would fill the
 *     trainer's review queue with near-identical rows until they stop reading
 *     it — which disables invariant 1 quietly instead of loudly.
 *
 * PRIVACY (Rule 8): `statement` is de-identified prose about a client
 * identified only by `userId`. Callers must never write names into it; the S2
 * extractor enforces that at its own boundary.
 */

import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

/** Must stay byte-identical to the enum in the create-coach-facts migration. */
export const FACT_CATEGORIES = [
  'injury_constraint',
  'preference',
  'goal_context',
  'lifestyle',
  'equipment',
  'motivation_style',
  'schedule_pattern',
  'coaching_cue',
  'milestone',
];

export const FACT_SOURCE_TYPES = [
  'chat',
  'dictation',
  'intake',
  'workout_log',
  'client_note',
  'trainer_manual',
];

export const FACT_STATUSES = ['proposed', 'active', 'invalidated', 'rejected'];

/**
 * Priority for the prompt window. Safety first: when the cap truncates, an
 * injury constraint must never be the row that falls off the end while a
 * motivation preference survives.
 */
const CATEGORY_PRIORITY = [
  'injury_constraint',
  'equipment',
  'schedule_pattern',
  'goal_context',
  'preference',
  'motivation_style',
  'coaching_cue',
  'lifestyle',
  'milestone',
];

const DEFAULT_CONTEXT_CAP = 30;
const DEFAULT_LIST_LIMIT = 50;
const MAX_STATEMENT_LENGTH = 500;

/**
 * Hard ceiling on rows pulled before the priority sort. Both read paths sort in
 * JS (the category-priority order is not worth a SQL CASE expression at this
 * scale), and sorting after a DB-side LIMIT would let truncation silently drop
 * an injury constraint. Fetching up to the ceiling and then sorting keeps
 * priority meaningful. A client is expected to accumulate tens of facts, not
 * hundreds; if one ever exceeds this, the read is capped rather than wrong, and
 * the fix is real pagination rather than a bigger number.
 */
const MAX_FETCH_ROWS = 500;

export class CoachFactError extends Error {
  constructor(message, statusCode = 400, code = 'COACH_FACT_INVALID') {
    super(message);
    this.name = 'CoachFactError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Collapse a statement to its comparable core: lowercase, punctuation stripped,
 * whitespace normalized. "  Prefers SUPERSETS!! " and "prefers supersets" must
 * land on the same key or invariant 3 fails.
 */
function normalizeStatement(statement) {
  return String(statement ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Today as a DATEONLY string in the server's calendar day. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Accept only a real calendar day in YYYY-MM-DD. An unvalidated value reached
 * Postgres as a DATEONLY and threw at INSERT — inside an async post-turn hook,
 * where nobody would ever see the error. Note the round-trip check: Date()
 * silently rolls 2026-02-30 forward to March 2 rather than rejecting it.
 */
function normalizeDateOnly(value, field) {
  const raw = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new CoachFactError(
      `${field} must be a date in YYYY-MM-DD form, received "${raw}".`,
      400,
      'COACH_FACT_DATE_INVALID',
    );
  }
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw new CoachFactError(
      `${field} is not a real calendar date: "${raw}".`,
      400,
      'COACH_FACT_DATE_INVALID',
    );
  }
  return raw;
}

/**
 * `limit`/`cap` arrive from route query strings. Array.slice(0, -1) drops the
 * last element instead of erroring, so an unsanitised ?limit=-1 returns a
 * quietly truncated list that looks legitimate; a non-numeric value slices to
 * nothing and looks like an empty client. Clamp into [0, ceiling] and fall back
 * to the default only when the value is genuinely absent or unparseable — never
 * on a deliberate 0, which means "no rows".
 */
function sanitizeCount(value, fallback, ceiling = MAX_FETCH_ROWS) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.min(fallback, ceiling);
  return Math.min(Math.max(Math.trunc(parsed), 0), ceiling);
}

function requireActor(actorUserId, action) {
  const id = Number(actorUserId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new CoachFactError(
      `${action} requires an authenticated actor.`,
      400,
      'COACH_FACT_ACTOR_REQUIRED',
    );
  }
  return id;
}

function requireClientId(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new CoachFactError('A valid client id is required.', 400, 'COACH_FACT_CLIENT_REQUIRED');
  }
  return id;
}

/** Validate and normalize one incoming candidate into row values. */
function toRowValues(fact, { userId, createdByUserId, status }) {
  if (!fact || typeof fact !== 'object') {
    throw new CoachFactError('Each fact must be an object.');
  }

  if (!FACT_CATEGORIES.includes(fact.category)) {
    throw new CoachFactError(
      `Unknown fact category "${fact.category}". Expected one of: ${FACT_CATEGORIES.join(', ')}.`,
      400,
      'COACH_FACT_CATEGORY_INVALID',
    );
  }

  const statement = String(fact.statement ?? '').trim();
  if (!statement) {
    throw new CoachFactError('A fact statement cannot be empty.', 400, 'COACH_FACT_STATEMENT_EMPTY');
  }
  // A punctuation-only statement survives the trim above but normalizes to an
  // EMPTY dedup key, so every such statement would collide with every other one
  // and all but the first would be silently dropped as duplicates.
  if (!normalizeStatement(statement)) {
    throw new CoachFactError(
      'A fact statement must contain readable text.',
      400,
      'COACH_FACT_STATEMENT_EMPTY',
    );
  }
  if (statement.length > MAX_STATEMENT_LENGTH) {
    throw new CoachFactError(
      `A fact statement cannot exceed ${MAX_STATEMENT_LENGTH} characters.`,
      400,
      'COACH_FACT_STATEMENT_TOO_LONG',
    );
  }

  const sourceType = fact.sourceType ?? 'chat';
  if (!FACT_SOURCE_TYPES.includes(sourceType)) {
    throw new CoachFactError(
      `Unknown sourceType "${sourceType}".`,
      400,
      'COACH_FACT_SOURCE_INVALID',
    );
  }

  const approvedNow = status === 'active';

  return {
    userId,
    category: fact.category,
    statement,
    structured: fact.structured ?? null,
    status,
    validFrom: fact.validFrom == null ? today() : normalizeDateOnly(fact.validFrom, 'validFrom'),
    validTo: fact.validTo == null ? null : normalizeDateOnly(fact.validTo, 'validTo'),
    invalidatedAt: null,
    invalidatedByFactId: null,
    sourceType,
    sourceRef: fact.sourceRef ?? null,
    createdByUserId,
    approvedByUserId: approvedNow ? createdByUserId : null,
    approvedAt: approvedNow ? new Date() : null,
  };
}

/**
 * Propose machine-extracted facts. Writes `proposed` rows ONLY (invariant 1),
 * dedup-guarded against both the existing proposed+active rows for this client
 * and the rest of this same batch.
 *
 * @param {Object} params
 * @param {number} params.userId - the client the facts are about
 * @param {Array}  params.facts - candidates: {category, statement, structured?, validFrom?, sourceType?, sourceRef?}
 * @param {number} params.createdByUserId - the actor whose session produced them
 * @returns {Promise<{created: Array, dropped: number}>}
 */
export async function proposeFacts({ userId, facts = [], createdByUserId } = {}) {
  const clientId = requireClientId(userId);
  const actorId = requireActor(createdByUserId, 'Proposing facts');

  if (!Array.isArray(facts) || facts.length === 0) {
    return { created: [], dropped: 0 };
  }

  const CoachFact = getModel('CoachFact');

  // Validate the whole batch before writing any of it — a partial write on a
  // bad third element would leave the caller unable to say what landed.
  const candidates = facts.map((fact) =>
    toRowValues(fact, { userId: clientId, createdByUserId: actorId, status: 'proposed' }),
  );

  // Dedup key is (category, normalized statement): the same words in a
  // different category are a genuinely different claim.
  const existing = await CoachFact.findAll({
    where: { userId: clientId, status: ['proposed', 'active'] },
  });
  const seen = new Set(
    existing.map((row) => `${row.category}::${normalizeStatement(row.statement)}`),
  );

  const created = [];
  let dropped = 0;

  for (const values of candidates) {
    const key = `${values.category}::${normalizeStatement(values.statement)}`;
    if (seen.has(key)) {
      dropped += 1;
      continue;
    }
    seen.add(key);
    created.push(await CoachFact.create(values));
  }

  if (created.length || dropped) {
    logger.info('[coachFacts] proposed', {
      clientId,
      actorId,
      created: created.length,
      dropped,
    });
  }

  return { created, dropped };
}

/**
 * Create a fact a trainer typed by hand. Born `active` and self-approved —
 * the human decision already happened at the keyboard.
 */
export async function createManualFact({ userId, fact, createdByUserId } = {}) {
  const clientId = requireClientId(userId);
  const actorId = requireActor(createdByUserId, 'Creating a fact');

  const CoachFact = getModel('CoachFact');
  const values = toRowValues(fact, {
    userId: clientId,
    createdByUserId: actorId,
    status: 'active',
  });

  const created = await CoachFact.create(values);
  logger.info('[coachFacts] manual fact created', { clientId, actorId, factId: created.id });
  return created;
}

/** Load a fact or throw the 404 that distinguishes "gone" from "bad transition". */
async function loadFactOrThrow(factId) {
  const CoachFact = getModel('CoachFact');
  const fact = await CoachFact.findByPk(factId);
  if (!fact) {
    throw new CoachFactError('Fact not found.', 404, 'COACH_FACT_NOT_FOUND');
  }
  return fact;
}

/**
 * Apply a status transition as a CONDITIONAL update — `WHERE id = ? AND status = ?`
 * — so the database, not a read-then-write in this process, decides who wins.
 *
 * The read-then-write version had a TOCTOU: two trainers approving the same
 * proposal both read 'proposed', both wrote, and the loser's id overwrote the
 * winner's in `approvedByUserId`. That column is the audit trail for the
 * human-approval invariant this whole service exists to enforce, so a wrong
 * value there discredits the one record the design rests on.
 *
 * On zero affected rows we re-read to tell 404 (never existed) from 409 (someone
 * else got there first), because the caller needs to distinguish them.
 */
async function transitionStatus({ factId, from, to, values, action }) {
  const CoachFact = getModel('CoachFact');

  const [affected] = await CoachFact.update(
    { status: to, ...values },
    { where: { id: Number(factId), status: from } },
  );

  if (affected === 0) {
    const current = await CoachFact.findByPk(factId);
    if (!current) {
      throw new CoachFactError('Fact not found.', 404, 'COACH_FACT_NOT_FOUND');
    }
    throw new CoachFactError(
      `Cannot ${action} a fact with status "${current.status}".`,
      409,
      'COACH_FACT_STATUS_CONFLICT',
    );
  }

  return CoachFact.findByPk(factId);
}

/**
 * A superseding fact must exist and belong to the SAME client. Unvalidated, one
 * client's fact could be recorded as superseded by another's — a cross-client
 * link in the audit trail, and a privacy leak the moment any UI renders it.
 */
async function assertSupersedingFact(supersededByFactId, fact) {
  if (supersededByFactId == null) return null;

  const id = Number(supersededByFactId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new CoachFactError('supersededByFactId must be a fact id.', 400, 'COACH_FACT_SUPERSEDE_INVALID');
  }
  if (id === Number(fact.id)) {
    throw new CoachFactError('A fact cannot supersede itself.', 400, 'COACH_FACT_SUPERSEDE_SELF');
  }

  const CoachFact = getModel('CoachFact');
  const superseding = await CoachFact.findByPk(id);
  if (!superseding) {
    throw new CoachFactError('The superseding fact does not exist.', 404, 'COACH_FACT_SUPERSEDE_NOT_FOUND');
  }
  if (Number(superseding.userId) !== Number(fact.userId)) {
    throw new CoachFactError(
      'A fact can only be superseded by another fact about the same client.',
      400,
      'COACH_FACT_SUPERSEDE_CROSS_CLIENT',
    );
  }
  return id;
}

/**
 * proposed -> active. The human gate (invariant 1). Requires a real actor id;
 * the conditional update means an already-approved fact yields a 409 and the
 * original approver survives, even under concurrency.
 */
export async function approveFact({ factId, approverUserId } = {}) {
  const actorId = requireActor(approverUserId, 'Approving a fact');

  const fact = await transitionStatus({
    factId,
    from: 'proposed',
    to: 'active',
    values: { approvedByUserId: actorId, approvedAt: new Date() },
    action: 'approve',
  });

  logger.info('[coachFacts] approved', { factId: fact.id, actorId });
  return fact;
}

/** proposed -> rejected. A rejected fact never surfaces and cannot be revived. */
export async function rejectFact({ factId, approverUserId } = {}) {
  const actorId = requireActor(approverUserId, 'Rejecting a fact');

  const fact = await transitionStatus({
    factId,
    from: 'proposed',
    to: 'rejected',
    values: { approvedByUserId: actorId, approvedAt: new Date() },
    action: 'reject',
  });

  logger.info('[coachFacts] rejected', { factId: fact.id, actorId });
  return fact;
}

/**
 * active -> invalidated (invariant 2). `supersededByFactId` links the fact that
 * replaced this one, so a later slice can answer "what was true in March"
 * without guessing which row superseded which.
 */
export async function invalidateFact({ factId, byUserId, supersededByFactId = null, validTo = null } = {}) {
  const actorId = requireActor(byUserId, 'Invalidating a fact');

  // Validate the link BEFORE the transition: a bad supersession must leave the
  // fact active rather than invalidating it and then failing.
  const existing = await loadFactOrThrow(factId);
  const supersedingId = await assertSupersedingFact(supersededByFactId, existing);
  const closedAt = validTo == null ? existing.validTo ?? null : normalizeDateOnly(validTo, 'validTo');

  const fact = await transitionStatus({
    factId,
    from: 'active',
    to: 'invalidated',
    values: {
      invalidatedAt: new Date(),
      invalidatedByFactId: supersedingId,
      validTo: closedAt,
    },
    action: 'invalidate',
  });

  logger.info('[coachFacts] invalidated', {
    factId: fact.id,
    actorId,
    supersededByFactId: supersedingId,
  });
  return fact;
}

function byCategoryPriorityThenRecency(a, b) {
  const rank = (row) => {
    const index = CATEGORY_PRIORITY.indexOf(row.category);
    return index === -1 ? CATEGORY_PRIORITY.length : index;
  };
  const delta = rank(a) - rank(b);
  if (delta !== 0) return delta;
  return String(b.validFrom ?? '').localeCompare(String(a.validFrom ?? ''));
}

/**
 * The review-queue read. Unfiltered by default so a trainer can see the whole
 * history including invalidated rows.
 */
export async function listFacts({ userId, status, category, limit = DEFAULT_LIST_LIMIT } = {}) {
  const clientId = requireClientId(userId);
  const take = sanitizeCount(limit, DEFAULT_LIST_LIMIT);
  const CoachFact = getModel('CoachFact');

  const where = { userId: clientId };
  if (status) where.status = status;
  if (category) where.category = category;

  // Fetch to the ceiling, sort, THEN slice. Passing `limit` to findAll would let
  // the database truncate in insertion order before the priority sort ran, which
  // can drop an injury constraint recorded late.
  const rows = await CoachFact.findAll({ where, limit: MAX_FETCH_ROWS });
  return [...rows].sort(byCategoryPriorityThenRecency).slice(0, take);
}

/**
 * The prompt read (consumed by coachContextEngine in S3). Active facts only —
 * a proposal must never reach the model, or the human gate becomes decorative.
 * Sorted so that truncation at `cap` drops the least safety-critical rows.
 */
export async function getActiveFactsForContext({ userId, cap = DEFAULT_CONTEXT_CAP } = {}) {
  const clientId = requireClientId(userId);
  const take = sanitizeCount(cap, DEFAULT_CONTEXT_CAP);
  const CoachFact = getModel('CoachFact');

  const rows = await CoachFact.findAll({
    where: { userId: clientId, status: 'active' },
    limit: MAX_FETCH_ROWS,
  });
  return [...rows].sort(byCategoryPriorityThenRecency).slice(0, take);
}

export default {
  proposeFacts,
  createManualFact,
  approveFact,
  rejectFact,
  invalidateFact,
  listFacts,
  getActiveFactsForContext,
  CoachFactError,
  FACT_CATEGORIES,
  FACT_SOURCE_TYPES,
  FACT_STATUSES,
};
