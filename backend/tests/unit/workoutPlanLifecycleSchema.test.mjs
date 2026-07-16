/**
 * ============================================================================
 * FILE: workoutPlanLifecycleSchema.test.mjs
 * PURPOSE: Lock the forward-safe archived lifecycle schema and route wiring.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, '../..');
const read = (relativePath) => fs.readFileSync(path.join(backend, relativePath), 'utf8');

describe('workout-plan lifecycle schema and mount contract', () => {
  it('adds archived state, authoritative audit columns, and append-only receipts', () => {
    const source = read('migrations/20260716020000-add-workout-plan-lifecycle.cjs');
    expect(source).toContain(`ADD VALUE IF NOT EXISTS 'archived'`);
    expect(source).toMatch(/archived_at\s+TIMESTAMPTZ/i);
    expect(source).toMatch(/archived_by\s+INTEGER/i);
    expect(source).toMatch(/CREATE TABLE IF NOT EXISTS workout_plan_lifecycle_receipts/i);
    expect(source).toMatch(/from_status\s+TEXT\s+NOT NULL/i);
    expect(source).toMatch(/to_status\s+TEXT\s+NOT NULL/i);
    expect(source).not.toMatch(/DELETE FROM workout_plan_lifecycle_receipts/i);
    expect(source).not.toMatch(/DROP TYPE[^;]*enum_workout_plans_status/i);
    expect(source).toContain('resolveUsersTable');
    expect(source).not.toContain('REFERENCES "Users"');
  });

  it('exposes archived fields from the authoritative Sequelize model', () => {
    const source = read('models/WorkoutPlan.mjs');
    expect(source).toMatch(/DataTypes\.ENUM\([^)]*'archived'/s);
    expect(source).toMatch(/archivedAt:\s*\{[\s\S]*?field:\s*'archived_at'/);
    expect(source).toMatch(/archivedBy:\s*\{[\s\S]*?field:\s*'archived_by'/);
  });

  it('mounts one protected status transition and routes legacy activation through it', () => {
    const source = read('routes/workoutPlanRoutes.mjs');
    expect(source).toMatch(/router\.post\(\s*'\/:id\/status',[\s\S]*?protect,[\s\S]*?trainerOrAdminOnly,[\s\S]*?verifyClientAccessByPlanId/);
    expect(source).toMatch(/router\.put\(\s*'\/:id\/activate',[\s\S]*?workoutPlanActivateHandler/);
    expect(source).toContain('workoutPlanStatusHandler');
    expect(source).toMatch(/router\.put\(\s*'\/:id\/primary',[\s\S]*?workoutPlanActivateHandler/);
    expect(source).not.toContain('markPlanPrimary');
    expect(source).toMatch(/if \(req\.body\.status !== undefined\)[\s\S]*?Use the status endpoint/);
    const genericUpdateFields = source.match(/const allowedFields = \[([\s\S]*?)\];/)?.[1] || '';
    expect(genericUpdateFields).not.toMatch(/['\x22]status['\x22]/);
  });
});