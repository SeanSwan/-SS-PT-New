/**
 * Safe-migrate data-critical lane — regression contract.
 *
 * Incident class (hostile review 2026-07-16): safe-migrate marked GENUINELY
 * FAILED migrations as completed "to prevent blocking deploys", citing
 * sync({ alter: true }) — which never runs in production. For DATA migrations
 * (backfills) that converted fail-closed design into silent fail-open: the
 * migration was recorded as applied and never retried while invalid rows
 * persisted in prod.
 *
 * Contract: a data-critical migration (filename contains "backfill" or
 * "data-critical") that genuinely fails is NEVER marked completed, HALTS the
 * remaining pending migrations (they may depend on its data), and surfaces a
 * non-zero outcome. Schema migrations keep the legacy mark-done behavior.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isAlreadyAppliedError,
  isDataCriticalMigration,
  isStructuralAlreadyExistsError,
  processPendingMigrations,
} from '../../scripts/safe-migrate.mjs';

const quiet = { log: vi.fn(), error: vi.fn(), write: vi.fn() };

const runnerFor = (outcomes) => vi.fn(async (name) => outcomes[name]);

describe('isDataCriticalMigration', () => {
  it('classifies backfill and data-critical filenames as data-critical', () => {
    expect(isDataCriticalMigration('20260715011000-backfill-workout-plan-content-identity.cjs')).toBe(true);
    expect(isDataCriticalMigration('20270101000000-data-critical-receipt-repair.cjs')).toBe(true);
  });

  it('leaves ordinary schema migrations on the legacy lane', () => {
    expect(isDataCriticalMigration('20260715010000-add-workout-plan-revision-columns.cjs')).toBe(false);
    expect(isDataCriticalMigration('20260715012000-create-workout-plan-completion-receipts.cjs')).toBe(false);
  });

  it('exempts the misnamed pre-existing schema/seeder files (fresh-env wedge prevention)', () => {
    expect(isDataCriticalMigration('20260707050000-create-history-backfill-runs.cjs')).toBe(false);
    expect(isDataCriticalMigration('20260707030000-run-ces-coverage-backfill.cjs')).toBe(false);
  });
});

describe('isStructuralAlreadyExistsError', () => {
  it('accepts structural already-exists errors and rejects data-failure signatures', () => {
    expect(isStructuralAlreadyExistsError('ERROR: relation "x" already exists')).toBe(true);
    expect(isStructuralAlreadyExistsError('ERROR: trigger "t" for relation "x" already exists')).toBe(true);
    // These are plausible GENUINE backfill failures — never skip-eligible:
    expect(isStructuralAlreadyExistsError('ERROR: duplicate key value violates unique constraint "u"')).toBe(false);
    expect(isStructuralAlreadyExistsError('ERROR: insert or update on table "x" violates foreign key constraint "fk"')).toBe(false);
  });
});

describe('processPendingMigrations', () => {
  it('never marks a genuinely failed data-critical migration as completed and halts the rest', async () => {
    const markCompleted = vi.fn();
    const result = await processPendingMigrations({
      pending: [
        '20260715011000-backfill-workout-plan-content-identity.cjs',
        '20260715012000-create-workout-plan-completion-receipts.cjs',
      ],
      runMigration: runnerFor({
        '20260715011000-backfill-workout-plan-content-identity.cjs':
          { code: 1, combined: 'ERROR: Invalid workout plan identities remain after backfill' },
      }),
      markCompleted,
      logger: quiet,
    });

    expect(markCompleted).not.toHaveBeenCalled();
    expect(result.dataCriticalFailures).toEqual([
      '20260715011000-backfill-workout-plan-content-identity.cjs',
    ]);
    expect(result.halted).toBe(true);
    // The dependent migration was never attempted and stays pending for retry.
    expect(result.haltedRemaining).toEqual([
      '20260715012000-create-workout-plan-completion-receipts.cjs',
    ]);
    expect(result.applied).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('keeps the legacy mark-done behavior for genuinely failed schema migrations', async () => {
    const markCompleted = vi.fn();
    const result = await processPendingMigrations({
      pending: [
        '20260101000000-add-some-column.cjs',
        '20260102000000-add-other-column.cjs',
      ],
      runMigration: runnerFor({
        '20260101000000-add-some-column.cjs': { code: 1, combined: 'ERROR: something schema-ish broke' },
        '20260102000000-add-other-column.cjs': { code: 0, combined: '' },
      }),
      markCompleted,
      logger: quiet,
    });

    expect(markCompleted).toHaveBeenCalledWith('20260101000000-add-some-column.cjs');
    expect(result.halted).toBe(false);
    expect(result.dataCriticalFailures).toEqual([]);
    expect(result.applied).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('still marks an already-applied data-critical migration as done and continues', async () => {
    const markCompleted = vi.fn();
    const result = await processPendingMigrations({
      pending: [
        '20260715011000-backfill-workout-plan-content-identity.cjs',
        '20260715012000-create-workout-plan-completion-receipts.cjs',
      ],
      runMigration: runnerFor({
        '20260715011000-backfill-workout-plan-content-identity.cjs':
          { code: 1, combined: 'ERROR: relation "workout_plans" column already exists' },
        '20260715012000-create-workout-plan-completion-receipts.cjs': { code: 0, combined: '' },
      }),
      markCompleted,
      logger: quiet,
    });

    expect(markCompleted).toHaveBeenCalledWith('20260715011000-backfill-workout-plan-content-identity.cjs');
    expect(result.halted).toBe(false);
    expect(result.skipped).toBe(1);
    expect(result.applied).toBe(1);
  });

  it('routes FK-violation and duplicate-key failures on a DATA-CRITICAL file to the fail-closed lane', async () => {
    // Regression (final-batch ops review F1): these two signatures are in the
    // broad already-applied family, but on a backfill they are plausible
    // GENUINE failures — treating them as "already applied" re-opens the
    // silent fail-open this lane exists to eliminate.
    for (const combined of [
      'ERROR: duplicate key value violates unique constraint "workout_plans_pkey"',
      'ERROR: insert or update on table "x" violates foreign key constraint "fk_user"',
    ]) {
      const markCompleted = vi.fn();
      const result = await processPendingMigrations({
        pending: ['20260715011000-backfill-workout-plan-content-identity.cjs'],
        runMigration: runnerFor({
          '20260715011000-backfill-workout-plan-content-identity.cjs': { code: 1, combined },
        }),
        markCompleted,
        logger: quiet,
      });
      expect(markCompleted).not.toHaveBeenCalled();
      expect(result.halted).toBe(true);
      expect(result.dataCriticalFailures).toHaveLength(1);
    }
  });

  it('still routes FK/duplicate failures on SCHEMA files to the legacy skip lane', async () => {
    const markCompleted = vi.fn();
    const result = await processPendingMigrations({
      pending: ['20260101000000-add-some-column.cjs'],
      runMigration: runnerFor({
        '20260101000000-add-some-column.cjs':
          { code: 1, combined: 'ERROR: duplicate key value violates unique constraint "u"' },
      }),
      markCompleted,
      logger: quiet,
    });
    expect(markCompleted).toHaveBeenCalledWith('20260101000000-add-some-column.cjs');
    expect(result.skipped).toBe(1);
    expect(result.halted).toBe(false);
  });

  it('counts clean runs without touching SequelizeMeta', async () => {
    const markCompleted = vi.fn();
    const result = await processPendingMigrations({
      pending: ['20260103000000-add-index.cjs'],
      runMigration: runnerFor({ '20260103000000-add-index.cjs': { code: 0, combined: '' } }),
      markCompleted,
      logger: quiet,
    });

    expect(markCompleted).not.toHaveBeenCalled();
    expect(result).toMatchObject({ applied: 1, skipped: 0, failed: 0, halted: false });
  });
});

describe('isAlreadyAppliedError (existing contract, now exported)', () => {
  it('recognizes the already-exists error family', () => {
    expect(isAlreadyAppliedError('ERROR: column "x" of relation "y" already exists')).toBe(true);
    expect(isAlreadyAppliedError('ERROR: totally novel explosion')).toBe(false);
  });
});
