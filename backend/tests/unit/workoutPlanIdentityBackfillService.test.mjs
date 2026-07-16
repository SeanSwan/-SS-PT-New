/**
 * ============================================================================
 * FILE: workoutPlanIdentityBackfillService.test.mjs
 * PURPOSE: Lock bounded deterministic repair of legacy WorkoutPlan identities.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves legacy missing, malformed, and stale identities are
 * repaired in locked batches, then independently re-read and verified.
 * HOW IT FITS IN THE APP: Expand migration -> bounded backfill -> parity gate ->
 * later non-null contract migration.
 * KEY DECISIONS: Hash every row twice, never repair more than 500 rows per batch,
 * keep valid positive revisions, and fail closed while invalid rows remain.
 * NASM PROTOCOL CONTEXT: Historical prescriptions receive the same deterministic
 * identity contract as newly authored training plans.
 */

import { describe, expect, it, vi } from 'vitest';
import { hashWorkoutPlanContent } from '../../services/workoutPlanRevisionService.mjs';
import {
  backfillWorkoutPlanContentIdentity,
  WorkoutPlanIdentityBackfillError,
} from '../../services/workoutPlanIdentityBackfillService.mjs';

const planData = {
  weeks: [{
    weekNumber: 1,
    days: [{
      dayNumber: 1,
      exercises: [{ exerciseName: 'Goblet Squat', sets: 3, targetReps: '10' }],
    }],
  }],
};

const makeSequelize = ({
  repairRows = [],
  verificationRows = repairRows,
  pendingInvalid = 0,
} = {}) => {
  let repairReadCount = 0;
  let verificationReadCount = 0;
  const updates = [];

  const sequelize = {
    QueryTypes: { SELECT: 'SELECT', UPDATE: 'UPDATE' },
    transaction: vi.fn(async (operation) => operation({ id: 'backfill-tx' })),
    query: vi.fn(async (sql, options = {}) => {
      if (sql.includes('FOR UPDATE')) {
        repairReadCount += 1;
        return repairReadCount === 1 ? repairRows : [];
      }
      if (sql.includes('UPDATE workout_plans')) {
        updates.push(options.replacements);
        return [[], { rowCount: 1 }];
      }
      if (sql.includes('COUNT(*)')) return [{ count: pendingInvalid }];
      if (sql.includes('ORDER BY id ASC')) {
        verificationReadCount += 1;
        return verificationReadCount === 1 ? verificationRows : [];
      }
      throw new Error('Unexpected query: ' + sql);
    }),
  };

  return { sequelize, updates };
};

describe('WorkoutPlan content identity backfill', () => {
  it('repairs every identity mismatch in bounded locks and verifies all hashes twice', async () => {
    const rows = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        planData,
        contentRevision: null,
        contentHash: null,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        planData: { ...planData, completedAt: 'volatile' },
        contentRevision: 4,
        contentHash: 'b'.repeat(64),
      },
    ];
    const hash = hashWorkoutPlanContent(planData);
    const verificationRows = rows.map((row) => ({
      ...row,
      contentRevision: row.contentRevision || 1,
      contentHash: hash,
    }));
    const { sequelize, updates } = makeSequelize({
      repairRows: rows,
      verificationRows,
    });

    const result = await backfillWorkoutPlanContentIdentity({
      sequelize,
      batchSize: 2,
    });

    expect(result).toEqual({
      batches: 1,
      repaired: 2,
      verified: 2,
      pendingInvalid: 0,
    });
    const repairSql = sequelize.query.mock.calls
      .map(([sql]) => sql)
      .find((sql) => sql.includes('FOR UPDATE'));
    const updateSql = sequelize.query.mock.calls
      .map(([sql]) => sql)
      .find((sql) => sql.includes('UPDATE workout_plans'));
    expect(repairSql).toContain('id > :cursor');
    expect(repairSql).toContain('ORDER BY id ASC');
    expect(repairSql).not.toContain('id::text');
    expect(repairSql).not.toContain('content_hash !~');
    expect(repairSql).not.toContain('SKIP LOCKED');
    const repairCalls = sequelize.query.mock.calls.filter(([sql]) => sql.includes('FOR UPDATE'));
    expect(repairCalls[1][1].replacements.cursor).toBe(rows[1].id);
    expect(updateSql).not.toContain('"updatedAt" = "updatedAt"');
    expect(sequelize.transaction).toHaveBeenCalledTimes(2);
    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({
      id: rows[0].id,
      contentRevision: 1,
      contentHash: hash,
    });
    expect(updates[1]).toMatchObject({
      id: rows[1].id,
      contentRevision: 4,
      contentHash: hash,
    });
  });

  it('scans valid identities without issuing a redundant update', async () => {
    const row = {
      id: '44444444-4444-4444-8444-444444444444',
      planData,
      contentRevision: 3,
      contentHash: hashWorkoutPlanContent(planData),
    };
    const { sequelize, updates } = makeSequelize({ repairRows: [row] });

    await expect(backfillWorkoutPlanContentIdentity({ sequelize })).resolves.toEqual({
      batches: 1,
      repaired: 0,
      verified: 1,
      pendingInvalid: 0,
    });
    expect(updates).toHaveLength(0);
  });

  it('fails verification when stored identity changes after the repair pass', async () => {
    const verificationRows = [{
      id: '55555555-5555-4555-8555-555555555555',
      planData,
      contentRevision: 2,
      contentHash: 'c'.repeat(64),
    }];
    const { sequelize } = makeSequelize({ verificationRows });

    await expect(backfillWorkoutPlanContentIdentity({ sequelize }))
      .rejects.toMatchObject({ code: 'WORKOUT_PLAN_IDENTITY_VERIFY_FAILED' });
  });

  it('fails before writing when the hash function is not deterministic', async () => {
    const rows = [{
      id: '33333333-3333-4333-8333-333333333333',
      planData,
      contentRevision: null,
      contentHash: null,
    }];
    const { sequelize, updates } = makeSequelize({ repairRows: rows });
    let callCount = 0;

    await expect(backfillWorkoutPlanContentIdentity({
      sequelize,
      hashContent: () => String(++callCount).padStart(64, '0'),
    })).rejects.toMatchObject({
      code: 'WORKOUT_PLAN_HASH_NONDETERMINISTIC',
    });
    expect(updates).toHaveLength(0);
  });

  it('fails parity when invalid identities remain after the repair pass', async () => {
    const { sequelize } = makeSequelize({ pendingInvalid: 1 });

    await expect(backfillWorkoutPlanContentIdentity({ sequelize }))
      .rejects.toMatchObject({
        code: 'WORKOUT_PLAN_IDENTITY_PARITY_FAILED',
        pendingInvalid: 1,
      });
  });

  it.each([0, -1, 501, 1.5])('rejects unsafe batch size %s', async (batchSize) => {
    const { sequelize } = makeSequelize();

    await expect(backfillWorkoutPlanContentIdentity({ sequelize, batchSize }))
      .rejects.toBeInstanceOf(WorkoutPlanIdentityBackfillError);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
