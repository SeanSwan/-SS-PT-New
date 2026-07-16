/**
 * ============================================================================
 * FILE: workoutPlanPdfDerivativeService.test.mjs
 * PURPOSE: Lock revision-bound PDF request identity and durable outbox writes.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';
import {
  PDF_RENDERER_VERSION,
  buildWorkoutPlanPdfDerivativeIdentity,
  requestWorkoutPlanPdfDerivative,
  markManualWorkoutPlanPdfNeedsReview,
  getWorkoutPlanPdfDerivativeStatus,
  getWorkoutPlanPdfDerivativeStatusesForPlans,
  recordManualWorkoutPlanPdfDerivative,
} from '../../services/workoutPlanPdfDerivativeService.mjs';

const plan = (overrides = {}) => ({
  id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  userId: 42,
  trainerId: 7,
  title: 'Strength Foundation',
  description: 'Four-week base',
  durationWeeks: 4,
  nasmPhase: 2,
  status: 'active',
  contentRevision: 3,
  contentHash: 'a'.repeat(64),
  planData: { weeks: [{ weekNumber: 1, days: [] }] },
  metadata: {},
  ...overrides,
});

describe('workout plan PDF derivative service', () => {
  it('builds deterministic identity while title and brand changes alter renderHash', () => {
    const first = buildWorkoutPlanPdfDerivativeIdentity({
      plan: plan(),
      brandKey: 'swanstudios',
    });
    const repeat = buildWorkoutPlanPdfDerivativeIdentity({
      plan: plan(),
      brandKey: 'swanstudios',
    });
    const renamed = buildWorkoutPlanPdfDerivativeIdentity({
      plan: plan({ title: 'Renamed Foundation' }),
      brandKey: 'swanstudios',
    });
    const rebranded = buildWorkoutPlanPdfDerivativeIdentity({
      plan: plan(),
      brandKey: 'move_fitness',
    });

    expect(first).toEqual(repeat);
    expect(first.rendererVersion).toBe(PDF_RENDERER_VERSION);
    expect(first.renderHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.idempotencyKey).toBe(
      plan().id + ':3:' + first.renderHash + ':' + PDF_RENDERER_VERSION,
    );
    expect(renamed.renderHash).not.toBe(first.renderHash);
    expect(rebranded.renderHash).not.toBe(first.renderHash);
  });

  it('records one safe generated request inside the caller transaction', async () => {
    const transaction = { id: 'plan-save' };
    const queries = [];
    const sequelize = {
      query: vi.fn(async (sql, options) => {
        queries.push({ sql, options });
        if (sql.includes('SELECT "clientSource"')) {
          return [[{ clientSource: 'move_fitness' }]];
        }
        return [[{
          id: 'job-1',
          state: 'pending',
          source_type: 'generated',
          source_revision: 3,
          source_hash: 'a'.repeat(64),
          render_hash: 'b'.repeat(64),
          renderer_version: PDF_RENDERER_VERSION,
          needs_review: false,
        }]];
      }),
    };

    const result = await requestWorkoutPlanPdfDerivative({
      sequelize,
      plan: plan(),
      requestedBy: 7,
      reason: 'canonical_save',
      transaction,
      enabled: true,
    });

    expect(result).toMatchObject({
      enabled: true,
      id: 'job-1',
      state: 'pending',
      sourceType: 'generated',
      sourceRevision: 3,
    });
    const insert = queries.find((entry) => entry.sql.includes('INSERT INTO workout_plan_pdf_derivatives'));
    expect(insert).toBeTruthy();
    expect(insert.sql).toContain('ON CONFLICT (idempotency_key)');
    expect(insert.options.transaction).toBe(transaction);
    expect(insert.options.replacements.idempotencyKey).toContain(PDF_RENDERER_VERSION);
    expect(insert.options.replacements.reason).toBe('canonical_save');
  });

  it('marks only current manual derivatives review-needed after content changes', async () => {
    const transaction = { id: 'content-update' };
    const sequelize = { query: vi.fn(async () => [[], {}]) };

    await markManualWorkoutPlanPdfNeedsReview({
      sequelize,
      planId: plan().id,
      transaction,
      enabled: true,
    });

    expect(sequelize.query).toHaveBeenCalledTimes(1);
    const [sql, options] = sequelize.query.mock.calls[0];
    expect(sql).toContain("source_type = 'manual'");
    expect(sql).toContain("state = 'ready'");
    expect(sql).toContain('needs_review = TRUE');
    expect(options.transaction).toBe(transaction);
  });
  it('keeps separate audit rows for identical manual bytes stored under different keys', async () => {
    const keys = [];
    const sequelize = {
      query: vi.fn(async (_sql, options) => {
        keys.push(options.replacements.idempotencyKey);
        return [[{
          id: 'manual-' + keys.length,
          state: 'ready',
          source_type: 'manual',
          source_revision: 3,
          source_hash: 'a'.repeat(64),
          render_hash: options.replacements.renderHash,
          renderer_version: 'manual-upload-v1',
          needs_review: false,
        }]];
      }),
    };
    const input = {
      sequelize,
      plan: plan(),
      checksum: 'c'.repeat(64),
      requestedBy: 7,
      enabled: true,
    };

    await recordManualWorkoutPlanPdfDerivative({
      ...input,
      planPdf: { storageKey: 'workout-plans/42/plan-a.pdf', updatedAt: '2026-07-16T01:00:00Z' },
    });
    await recordManualWorkoutPlanPdfDerivative({
      ...input,
      planPdf: { storageKey: 'workout-plans/42/plan-b.pdf', updatedAt: '2026-07-16T01:00:00Z' },
    });

    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toContain('c'.repeat(64));
  });
  it('returns safe status summaries without storage keys', async () => {
    const sequelize = {
      query: vi.fn(async () => [[{
        plan_id: plan().id,
        id: 'job-ready',
        state: 'ready',
        source_type: 'generated',
        source_revision: 3,
        source_hash: 'a'.repeat(64),
        render_hash: 'b'.repeat(64),
        renderer_version: PDF_RENDERER_VERSION,
        storage_key: 'workout-plans/42/private-generated.pdf',
        needs_review: false,
        attempt_count: 1,
        ready_at: '2026-07-16T08:00:00.000Z',
      }]]),
    };

    const result = await getWorkoutPlanPdfDerivativeStatus({
      sequelize,
      planId: plan().id,
      enabled: true,
    });

    expect(result).toMatchObject({
      enabled: true,
      state: 'ready',
      latestGenerated: {
        id: 'job-ready',
        state: 'ready',
        sourceType: 'generated',
        sourceRevision: 3,
      },
    });
    expect(result.latestGenerated).not.toHaveProperty('storageKey');
    expect(JSON.stringify(result)).not.toContain('private-generated.pdf');
  });

  it('reads derivative summaries for a staff plan list in one bounded query', async () => {
    const planA = plan().id;
    const planB = '4b29b19c-c47c-48eb-8260-8dcda24b07f8';
    const sequelize = {
      query: vi.fn(async () => [[
        {
          plan_id: planA,
          id: 'manual-review',
          state: 'ready',
          source_type: 'manual',
          source_revision: 2,
          source_hash: 'a'.repeat(64),
          render_hash: 'b'.repeat(64),
          renderer_version: 'manual-upload-v1',
          storage_key: 'private/manual.pdf',
          needs_review: true,
          created_at: '2026-07-16T09:00:00.000Z',
        },
        {
          plan_id: planA,
          id: 'generated-failed',
          state: 'failed',
          source_type: 'generated',
          source_revision: 3,
          source_hash: 'c'.repeat(64),
          render_hash: 'd'.repeat(64),
          renderer_version: PDF_RENDERER_VERSION,
          safe_error_code: 'WORKOUT_PLAN_PDF_RENDER_FAILED',
          created_at: '2026-07-16T08:00:00.000Z',
        },
        {
          plan_id: planB,
          id: 'generated-pending',
          state: 'pending',
          source_type: 'generated',
          source_revision: 1,
          source_hash: 'e'.repeat(64),
          render_hash: 'f'.repeat(64),
          renderer_version: PDF_RENDERER_VERSION,
          created_at: '2026-07-16T07:00:00.000Z',
        },
      ]]),
    };

    const result = await getWorkoutPlanPdfDerivativeStatusesForPlans({
      sequelize,
      planIds: [planA, planB, planA],
      enabled: true,
    });

    expect(sequelize.query).toHaveBeenCalledTimes(1);
    expect(sequelize.query.mock.calls[0][1].replacements.planIds).toEqual([planA, planB]);
    expect(result[planA]).toMatchObject({
      enabled: true,
      state: 'failed',
      latestGenerated: { state: 'failed', safeErrorCode: 'WORKOUT_PLAN_PDF_RENDER_FAILED' },
      latestManual: { state: 'ready', needsReview: true },
    });
    expect(result[planB]).toMatchObject({ enabled: true, state: 'pending' });
    expect(JSON.stringify(result)).not.toContain('private/manual.pdf');
  });
});
