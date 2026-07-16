/**
 * Completion-receipt DB immutability trigger — migration contract.
 *
 * Hostile review 2026-07-16 (3B): the receipt model's "application-immutable"
 * guarantee is ORM-hook-only — Model.upsert, increment/decrement, and raw
 * sequelize.query all bypass hooks. This migration adds the database-level
 * BEFORE UPDATE trigger. DELETE is deliberately NOT blocked: the retention
 * design removes receipts via FK cascades (account/plan/form deletion), and a
 * delete trigger would break that privacy path.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { isDataCriticalMigration } from '../../scripts/safe-migrate.mjs';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(
  __dirname,
  '../../migrations/20260716120000-add-completion-receipt-immutability-trigger.cjs',
);
const source = readFileSync(migrationPath, 'utf8');
const migration = require(migrationPath);

describe('completion-receipt immutability trigger migration', () => {
  it('blocks UPDATE at the database level', () => {
    expect(source).toContain('BEFORE UPDATE ON');
    expect(source).toContain('RAISE EXCEPTION');
    expect(source).toContain('workout_plan_completion_receipts');
  });

  it('does NOT block DELETE — retention FK cascades must keep working', () => {
    expect(source).not.toContain('BEFORE DELETE');
    expect(source).not.toContain('INSTEAD OF DELETE');
  });

  it('is idempotent and reversible', () => {
    expect(source).toContain('CREATE OR REPLACE FUNCTION');
    expect(source).toContain('DROP TRIGGER IF EXISTS');
    expect(typeof migration.down).toBe('function');
    // down() removes both trigger and function, nothing else.
    expect(source).toContain('DROP FUNCTION IF EXISTS');
    expect(source).not.toContain('dropTable');
  });

  it('runs on the schema lane, not the data-critical lane', () => {
    expect(isDataCriticalMigration(path.basename(migrationPath))).toBe(false);
  });

  it('exposes up/down with transaction wrapping', () => {
    expect(typeof migration.up).toBe('function');
    expect(source.match(/queryInterface\.sequelize\.transaction/g)?.length).toBe(2);
  });
});
