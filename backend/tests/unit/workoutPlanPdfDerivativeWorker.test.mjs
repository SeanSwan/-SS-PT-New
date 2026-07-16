/**
 * ============================================================================
 * FILE: workoutPlanPdfDerivativeWorker.test.mjs
 * PURPOSE: Lock stale-job rejection and manual-PDF promotion protection.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';
import {
  classifyWorkoutPlanPdfDerivativeError,
  isWorkoutPlanPdfJobCurrent,
  processWorkoutPlanPdfDerivativeJob,
  recoverStaleWorkoutPlanPdfJobs,
  shouldPromoteGeneratedPdf,
} from '../../jobs/workoutPlanPdfDerivativeWorker.mjs';
import { buildWorkoutPlanPdfDerivativeIdentity } from '../../services/workoutPlanPdfDerivativeService.mjs';

const plan = (overrides = {}) => ({
  id: '6ea7806d-36c8-4307-bd5d-6b04b68be849',
  userId: 42,
  trainerId: 7,
  title: 'Strength Arc',
  status: 'active',
  contentRevision: 4,
  contentHash: 'a'.repeat(64),
  planData: { weeks: [] },
  metadata: {},
  update: vi.fn(),
  ...overrides,
});

const jobFor = (currentPlan, overrides = {}) => {
  const identity = buildWorkoutPlanPdfDerivativeIdentity({
    plan: currentPlan,
    brandKey: 'swanstudios',
  });
  return {
    id: 'job-1',
    plan_id: currentPlan.id,
    source_revision: identity.sourceRevision,
    source_hash: identity.sourceHash,
    render_hash: identity.renderHash,
    renderer_version: identity.rendererVersion,
    brand_key: identity.brandKey,
    source_type: 'generated',
    attempt_count: 1,
    promote_generated: false,
    requested_by: 7,
    ...overrides,
  };
};

const artifact = {
  planPdf: {
    url: '/api/workout-plans/6ea7806d-36c8-4307-bd5d-6b04b68be849/pdf/content.pdf',
    fileName: 'Strength Arc.pdf',
    contentType: 'application/pdf',
    storage: 'r2',
    storageKey: 'workout-plans/42/6ea7806d-36c8-4307-bd5d-6b04b68be849-generated.pdf',
    size: 512,
  },
  checksum: 'c'.repeat(64),
};

const dependencies = ({ plans, renderAndStore = vi.fn(async () => artifact) }) => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const sequelizeInstance = {
    query: vi.fn(async () => [[], { rowCount: 1 }]),
    transaction: vi.fn(async (work) => work(transaction)),
  };
  const WorkoutPlan = { findByPk: vi.fn().mockImplementation(async () => plans.shift()) };
  const User = { findByPk: vi.fn(async () => ({ id: 42, clientSource: 'swanstudios' })) };
  return { sequelizeInstance, WorkoutPlan, User, renderAndStore, transaction };
};

describe('workout plan PDF derivative worker guards', () => {
  it('accepts only the exact current revision/hash/render/brand/lifecycle tuple', () => {
    const currentPlan = plan();
    const job = jobFor(currentPlan);
    expect(isWorkoutPlanPdfJobCurrent({
      job,
      plan: currentPlan,
      brandKey: 'swanstudios',
      renderHash: job.render_hash,
    })).toBe(true);
    expect(isWorkoutPlanPdfJobCurrent({
      job,
      plan: plan({ contentRevision: 5 }),
      brandKey: 'swanstudios',
      renderHash: job.render_hash,
    })).toBe(false);
    expect(isWorkoutPlanPdfJobCurrent({
      job,
      plan: plan({ status: 'archived' }),
      brandKey: 'swanstudios',
      renderHash: job.render_hash,
    })).toBe(false);
    expect(isWorkoutPlanPdfJobCurrent({
      job,
      plan: currentPlan,
      brandKey: 'move_fitness',
      renderHash: job.render_hash,
    })).toBe(false);
  });

  it('never replaces manual or unproven legacy PDFs without explicit intent', () => {
    expect(shouldPromoteGeneratedPdf({ currentPdf: null })).toBe(true);
    expect(shouldPromoteGeneratedPdf({ currentPdf: { sourceType: 'generated' } })).toBe(true);
    expect(shouldPromoteGeneratedPdf({ currentPdf: { sourceType: 'manual' } })).toBe(false);
    expect(shouldPromoteGeneratedPdf({ currentPdf: { storageKey: 'legacy.pdf' } })).toBe(false);
    expect(shouldPromoteGeneratedPdf({
      currentPdf: { sourceType: 'manual' }, promoteGenerated: true,
    })).toBe(true);
  });

  it('persists only bounded safe error codes', () => {
    expect(classifyWorkoutPlanPdfDerivativeError({ code: 'WORKOUT_PLAN_PDF_STORAGE_FAILED' }))
      .toBe('WORKOUT_PLAN_PDF_STORAGE_FAILED');
    expect(classifyWorkoutPlanPdfDerivativeError(new Error('private raw storage failure')))
      .toBe('WORKOUT_PLAN_PDF_RENDER_FAILED');
  });

  it('terminalizes stale rendering jobs even after their retry budget is exhausted', async () => {
    const sequelizeInstance = { query: vi.fn(async () => [[], { rowCount: 1 }]) };

    await recoverStaleWorkoutPlanPdfJobs(sequelizeInstance);

    const [sql, options] = sequelizeInstance.query.mock.calls[0];
    expect(sql).toContain("state = 'failed'");
    expect(sql).toContain('WORKOUT_PLAN_PDF_STALE_RECOVERED');
    expect(sql).not.toContain('attempt_count <');
    expect(options).toBeUndefined();
  });
  it('supersedes a stale job before rendering', async () => {
    const initialPlan = plan();
    const job = jobFor(initialPlan);
    const renderAndStore = vi.fn();
    const deps = dependencies({ plans: [plan({ contentRevision: 5 })], renderAndStore });

    const result = await processWorkoutPlanPdfDerivativeJob(job, deps);

    expect(result).toEqual({ state: 'superseded' });
    expect(renderAndStore).not.toHaveBeenCalled();
    expect(deps.sequelizeInstance.query).toHaveBeenCalledWith(
      expect.stringContaining("state = 'superseded'"),
      expect.objectContaining({ replacements: expect.objectContaining({ id: 'job-1' }) }),
    );
  });

  it('supersedes and records an artifact when the plan changes during rendering', async () => {
    const initialPlan = plan();
    const job = jobFor(initialPlan);
    const changedPlan = plan({ contentRevision: 5, contentHash: 'd'.repeat(64) });
    const deps = dependencies({ plans: [initialPlan, changedPlan] });

    const result = await processWorkoutPlanPdfDerivativeJob(job, deps);

    expect(result).toEqual({ state: 'superseded' });
    expect(initialPlan.update).not.toHaveBeenCalled();
    const supersedeCall = deps.sequelizeInstance.query.mock.calls.find(([sql]) => (
      sql.includes("state = 'superseded'")
    ));
    expect(supersedeCall[1]).toMatchObject({
      replacements: {
        id: 'job-1',
        storageKey: artifact.planPdf.storageKey,
        byteSize: 512,
        checksum: artifact.checksum,
      },
      transaction: deps.transaction,
    });
  });

  it('retains stored artifact coordinates when promotion fails', async () => {
    const currentPlan = plan();
    const job = jobFor(currentPlan);
    const deps = dependencies({ plans: [currentPlan] });
    deps.sequelizeInstance.transaction.mockRejectedValueOnce(new Error('promotion transaction failed'));

    const result = await processWorkoutPlanPdfDerivativeJob(job, deps);

    expect(result).toEqual({
      state: 'failed',
      safeErrorCode: 'WORKOUT_PLAN_PDF_RENDER_FAILED',
    });
    const failureCall = deps.sequelizeInstance.query.mock.calls.find(([sql]) => (
      sql.includes("state = 'failed'")
    ));
    expect(failureCall[1].replacements).toMatchObject({
      id: 'job-1',
      storageKey: artifact.planPdf.storageKey,
      byteSize: 512,
      checksum: artifact.checksum,
    });
  });
  it('marks generated output ready without replacing a current manual PDF', async () => {
    const currentPlan = plan({ metadata: { planPdf: { sourceType: 'manual' } } });
    const job = jobFor(currentPlan);
    const deps = dependencies({ plans: [currentPlan, currentPlan] });

    const result = await processWorkoutPlanPdfDerivativeJob(job, deps);

    expect(result).toEqual({ state: 'ready', promoted: false });
    expect(currentPlan.update).not.toHaveBeenCalled();
    expect(deps.sequelizeInstance.query).toHaveBeenCalledWith(
      expect.stringContaining("state = 'ready'"),
      expect.objectContaining({ transaction: deps.transaction }),
    );
  });

  it('allows explicit generation to replace a manual PDF after the final stale check', async () => {
    const currentPlan = plan({ metadata: { planPdf: { sourceType: 'manual' } } });
    const job = jobFor(currentPlan, { promote_generated: true });
    const deps = dependencies({ plans: [currentPlan, currentPlan] });

    const result = await processWorkoutPlanPdfDerivativeJob(job, deps);

    expect(result).toEqual({ state: 'ready', promoted: true });
    expect(currentPlan.update).toHaveBeenCalledWith({
      metadata: expect.objectContaining({
        planPdf: expect.objectContaining({
          sourceType: 'generated',
          sourceRevision: 4,
          checksum: artifact.checksum,
          needsReview: false,
        }),
      }),
    }, { transaction: deps.transaction });
  });
});
