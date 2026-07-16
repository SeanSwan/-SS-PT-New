/**
 * ============================================================================
 * FILE: workoutPlanPdfDerivativeMigration.test.mjs
 * PURPOSE: Lock the PostgreSQL derivative state machine, indexes, and backfill.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';

const migration = await import('../../migrations/20260716010000-create-workout-plan-pdf-derivatives.cjs');

describe('workout plan PDF derivative migration', () => {
  it('creates the durable state machine and conservatively backfills legacy PDFs', async () => {
    const sql = [];
    const transaction = { id: 'pdf-derivatives' };
    const queryInterface = {
      sequelize: {
        transaction: vi.fn(async (callback) => callback(transaction)),
        query: vi.fn(async (statement) => {
          sql.push(statement);
          if (statement.includes('to_regclass')) return [[{ exists: null }]];
          return [[], {}];
        }),
      },
    };

    await migration.up(queryInterface);

    const source = sql.join('\n');
    expect(source).toContain('CREATE TABLE workout_plan_pdf_derivatives');
    expect(source).toContain('REFERENCES workout_plans(id) ON DELETE CASCADE');
    expect(source).toContain("source_type IN ('generated','manual')");
    expect(source).toContain("state IN ('pending','rendering','ready','failed','superseded')");
    expect(source).toContain('idempotency_key');
    expect(source).toContain('UNIQUE');
    expect(source).toContain('next_attempt_at');
    expect(source).toContain('safe_error_code');
    expect(source).toContain('promote_generated');
    expect(source).toContain('CREATE INDEX workout_plan_pdf_derivatives_claim_idx');
    expect(source).toContain("source_type, needs_review");
    expect(source).toContain("'legacy_backfill'");
    expect(source).toContain('pg_input_is_valid');
    expect(source).not.toContain("COALESCE((p.metadata->'planPdf'->>'updatedAt')::TIMESTAMPTZ");
    expect(source).toContain("'manual'");
  });
});
