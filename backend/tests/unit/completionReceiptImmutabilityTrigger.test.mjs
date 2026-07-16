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
  '../../migrations/20260716120000-data-critical-completion-receipt-immutability-trigger.cjs',
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

  it('allows the workout_sessions ON DELETE SET NULL transition (fires as an UPDATE)', () => {
    // Final-batch ops review F2: Postgres executes SET NULL referential
    // actions as row UPDATEs and fires user triggers — without this carve-out
    // every session delete referenced by a receipt 500s, and account-deletion
    // cascades can abort on FK-action ordering.
    expect(source).toContain('NEW.workout_session_id IS NULL');
    expect(source).toContain('OLD.workout_session_id IS NOT NULL');
    expect(source).toContain("(to_jsonb(NEW) - 'workout_session_id') = (to_jsonb(OLD) - 'workout_session_id')");
    expect(source).toContain('RETURN NEW');
  });

  it('is idempotent and reversible', () => {
    expect(source).toContain('CREATE OR REPLACE FUNCTION');
    expect(source).toContain('DROP TRIGGER IF EXISTS');
    expect(typeof migration.down).toBe('function');
    // down() removes both trigger and function, nothing else.
    expect(source).toContain('DROP FUNCTION IF EXISTS');
    expect(source).not.toContain('dropTable');
  });

  it('runs on the FAIL-CLOSED data-critical lane (integrity control must never be silently skipped)', () => {
    // Final-batch ops review F4: if installing this evidence-integrity
    // control genuinely fails, the failure must block and retry — the legacy
    // schema lane would mark it done and the codebase would assume a DB-level
    // guarantee that silently does not exist.
    expect(isDataCriticalMigration(path.basename(migrationPath))).toBe(true);
  });

  it('exposes up/down with transaction wrapping', () => {
    expect(typeof migration.up).toBe('function');
    expect(source.match(/queryInterface\.sequelize\.transaction/g)?.length).toBe(2);
  });
});
