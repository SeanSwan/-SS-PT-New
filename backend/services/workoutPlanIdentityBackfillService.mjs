/**
 * ============================================================================
 * FILE: workoutPlanIdentityBackfillService.mjs
 * PURPOSE: Repair and verify legacy WorkoutPlan content identities in batches.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Locks bounded sets of all historical rows, computes the
 * canonical prescription hash twice, repairs any mismatch, then performs a separate
 * bounded parity scan.
 * HOW IT FITS IN THE APP: Nullable expand migration -> data backfill migration ->
 * later non-null contract migration after a live parity receipt.
 * KEY DECISIONS: A UUID-primary-key cursor locks every historical row, including
 * well-formed stale hashes; a second full scan makes partial repairs fail closed.
 * NASM PROTOCOL CONTEXT: Every historical prescription receives a stable identity
 * before completion receipts and derivative provenance depend on it.
 */

import { hashWorkoutPlanContent } from './workoutPlanRevisionService.mjs';

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;
const MAX_BATCHES = 100000;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

const IDENTITY_COLUMNS_SQL = [
  'SELECT id,',
  '       plan_data AS "planData",',
  '       content_revision AS "contentRevision",',
  '       content_hash AS "contentHash"',
  'FROM workout_plans',
].join('\n');

const INVALID_IDENTITY_SQL = [
  '(content_revision IS NULL OR content_revision < 1',
  " OR content_hash IS NULL OR content_hash !~ '^[0-9a-f]{64}$')",
].join('');

const REPAIR_SELECT_SQL = [
  IDENTITY_COLUMNS_SQL,
  'WHERE (:cursor IS NULL OR id > :cursor)',
  'ORDER BY id ASC',
  'LIMIT :batchSize',
  'FOR UPDATE',
].join('\n');

const UPDATE_IDENTITY_SQL = [
  'UPDATE workout_plans',
  'SET content_revision = :contentRevision,',
  '    content_hash = :contentHash',
  'WHERE id = :id',
].join('\n');

const INVALID_COUNT_SQL = [
  'SELECT COUNT(*)::integer AS count',
  'FROM workout_plans',
  'WHERE ' + INVALID_IDENTITY_SQL,
].join('\n');

export class WorkoutPlanIdentityBackfillError extends Error {
  constructor(message, { code = 'WORKOUT_PLAN_IDENTITY_BACKFILL_FAILED', pendingInvalid } = {}) {
    super(message);
    this.name = 'WorkoutPlanIdentityBackfillError';
    this.code = code;
    if (pendingInvalid !== undefined) this.pendingInvalid = pendingInvalid;
  }
}

const assertDependencies = ({ sequelize, batchSize, hashContent }) => {
  if (typeof sequelize?.query !== 'function' || typeof sequelize?.transaction !== 'function') {
    throw new WorkoutPlanIdentityBackfillError('Sequelize query and transaction support are required', {
      code: 'WORKOUT_PLAN_IDENTITY_BACKFILL_DB_UNAVAILABLE',
    });
  }
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH_SIZE) {
    throw new WorkoutPlanIdentityBackfillError('Batch size must be an integer from 1 to 500', {
      code: 'WORKOUT_PLAN_IDENTITY_BATCH_INVALID',
    });
  }
  if (typeof hashContent !== 'function') {
    throw new WorkoutPlanIdentityBackfillError('Workout plan hash function is unavailable', {
      code: 'WORKOUT_PLAN_IDENTITY_HASH_UNAVAILABLE',
    });
  }
};

const positiveRevision = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
};

const computeVerifiedHash = ({ row, hashContent }) => {
  const first = hashContent(row.planData);
  const second = hashContent(row.planData);
  if (first !== second) {
    throw new WorkoutPlanIdentityBackfillError('Workout plan hash changed between identical passes', {
      code: 'WORKOUT_PLAN_HASH_NONDETERMINISTIC',
    });
  }
  if (typeof first !== 'string' || !HASH_PATTERN.test(first)) {
    throw new WorkoutPlanIdentityBackfillError('Workout plan hash is not a lowercase SHA-256 digest', {
      code: 'WORKOUT_PLAN_HASH_INVALID',
    });
  }
  return first;
};

const repairNextBatch = ({ sequelize, batchSize, cursor, hashContent }) => (
  sequelize.transaction(async (transaction) => {
    const rows = await sequelize.query(REPAIR_SELECT_SQL, {
      replacements: { batchSize, cursor },
      type: sequelize.QueryTypes?.SELECT,
      transaction,
    });
    let repaired = 0;

    for (const row of rows) {
      const contentRevision = positiveRevision(row.contentRevision);
      const contentHash = computeVerifiedHash({ row, hashContent });
      if (
        contentRevision === Number(row.contentRevision)
        && contentHash === row.contentHash
      ) continue;

      await sequelize.query(UPDATE_IDENTITY_SQL, {
        replacements: { id: row.id, contentRevision, contentHash },
        type: sequelize.QueryTypes?.UPDATE,
        transaction,
      });
      repaired += 1;
    }
    return {
      scanned: rows.length,
      repaired,
      lastCursor: rows.length > 0 ? rows.at(-1).id : cursor,
    };
  })
);

const verifyStoredIdentity = ({ row, hashContent }) => {
  const expectedHash = computeVerifiedHash({ row, hashContent });
  if (
    positiveRevision(row.contentRevision) !== Number(row.contentRevision)
    || row.contentHash !== expectedHash
  ) {
    throw new WorkoutPlanIdentityBackfillError('Stored workout plan identity does not match its prescription', {
      code: 'WORKOUT_PLAN_IDENTITY_VERIFY_FAILED',
    });
  }
};

const verifyAllRows = async ({ sequelize, batchSize, hashContent }) => {
  let cursor = null;
  let verified = 0;

  while (true) {
    const cursorSql = cursor === null ? '' : 'WHERE id > :cursor\n';
    const rows = await sequelize.query(
      IDENTITY_COLUMNS_SQL + '\n' + cursorSql + 'ORDER BY id ASC\nLIMIT :batchSize',
      {
        replacements: { batchSize, cursor },
        type: sequelize.QueryTypes?.SELECT,
      },
    );
    if (rows.length === 0) return verified;

    for (const row of rows) verifyStoredIdentity({ row, hashContent });
    verified += rows.length;
    cursor = rows.at(-1).id;
  }
};

const countInvalidRows = async (sequelize) => {
  const rows = await sequelize.query(INVALID_COUNT_SQL, {
    type: sequelize.QueryTypes?.SELECT,
  });
  return Number(rows?.[0]?.count || 0);
};

export const backfillWorkoutPlanContentIdentity = async ({
  sequelize,
  batchSize = DEFAULT_BATCH_SIZE,
  hashContent = hashWorkoutPlanContent,
} = {}) => {
  assertDependencies({ sequelize, batchSize, hashContent });

  let batches = 0;
  let repaired = 0;
  let cursor = null;
  while (batches < MAX_BATCHES) {
    const batch = await repairNextBatch({ sequelize, batchSize, cursor, hashContent });
    if (batch.scanned === 0) break;
    batches += 1;
    repaired += batch.repaired;
    cursor = batch.lastCursor;
  }
  if (batches === MAX_BATCHES) {
    throw new WorkoutPlanIdentityBackfillError('Workout plan identity backfill exceeded its batch guard', {
      code: 'WORKOUT_PLAN_IDENTITY_BATCH_GUARD',
    });
  }

  const verified = await verifyAllRows({ sequelize, batchSize, hashContent });
  const pendingInvalid = await countInvalidRows(sequelize);
  if (pendingInvalid > 0) {
    throw new WorkoutPlanIdentityBackfillError('Invalid workout plan identities remain after backfill', {
      code: 'WORKOUT_PLAN_IDENTITY_PARITY_FAILED',
      pendingInvalid,
    });
  }

  return { batches, repaired, verified, pendingInvalid };
};
