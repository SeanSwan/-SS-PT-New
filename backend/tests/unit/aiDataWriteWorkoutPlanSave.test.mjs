/**
 * ============================================================================
 * FILE: aiDataWriteWorkoutPlanSave.test.mjs
 * PURPOSE: Guard Swan Coach plan writes at the canonical model boundary.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  create: vi.fn(),
  storePdf: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../models/index.mjs', () => ({
  getWorkoutPlan: () => ({ create: harness.create }),
}));
vi.mock('../../services/workoutPlanPdfStorageService.mjs', () => ({
  storeWorkoutPlanPdf: harness.storePdf,
}));

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

const makePlanData = (durationWeeks = 4) => ({
  planSummary: { durationWeeks, sessionsPerWeek: 3, totalSessions: durationWeeks * 3 },
  weeks: Array.from({ length: durationWeeks }, (_, index) => ({
    weekNumber: index + 1,
    days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Split Squat' }] }],
  })),
});

function makeFakeSequelize(capture) {
  const transaction = { id: 'tx-ai-plan' };
  capture.transaction = transaction;
  return {
    QueryTypes: { INSERT: 'INSERT', UPDATE: 'UPDATE' },
    transaction: vi.fn(async (work) => work(transaction)),
    query: vi.fn(async (sql, options = {}) => {
      const call = { sql, ...options };
      capture.queries.push(call);
      if (sql.includes('SELECT "clientSource"')) return [[{ clientSource: 'swanstudios' }]];
      if (sql.includes('INSERT INTO workout_plan_pdf_derivatives')) {
        capture.outbox = call;
        return [[{
          id: 'job-ai-1',
          state: 'pending',
          source_type: 'generated',
          source_revision: options.replacements.sourceRevision,
          source_hash: options.replacements.sourceHash,
          render_hash: options.replacements.renderHash,
          renderer_version: options.replacements.rendererVersion,
          needs_review: false,
          attempt_count: 0,
        }]];
      }
      return [[], { rowCount: 1 }];
    }),
  };
}

describe('aiDataWriteService save_workout_plan', () => {
  let capture;

  beforeEach(() => {
    capture = { createdValues: null, plan: null, outbox: null, queries: [], transaction: null };
    vi.clearAllMocks();
    harness.create.mockImplementation(async (values, options) => {
      const plan = {
        id: 'plan-ai-1',
        ...values,
        setDataValue(key, value) { this[key] = value; },
      };
      capture.createdValues = values;
      capture.createOptions = options;
      capture.plan = plan;
      return plan;
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  const save = async (data) => {
    const sequelize = makeFakeSequelize(capture);
    const result = await processAIDataUpdates(42, [{ type: 'save_workout_plan', data }], 7, sequelize);
    expect(result).toEqual({ successful: 1, errors: [] });
    return sequelize;
  };

  it('uses authoritative model fields and stamps deterministic content identity', async () => {
    await save({ title: 'Six Month Strength Arc', durationWeeks: 24, nasmPhase: 2, planData: makePlanData(24) });

    expect(capture.createdValues).toMatchObject({
      userId: 42,
      trainerId: 7,
      nasmPhase: 2,
      durationWeeks: 24,
      createdBy: 'swan_coach_planning',
      contentRevision: 1,
      contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(capture.createdValues).not.toHaveProperty('user_id');
    expect(capture.createdValues).not.toHaveProperty('duration_weeks');
    expect(capture.createdValues.metadata).toMatchObject({
      planHorizon: 'six_month',
      horizonKey: 'six_month',
      planDurationKey: 'six_month',
      planSource: 'swan_coach_planning',
    });
    expect(capture.createOptions.transaction).toBe(capture.transaction);
  });

  it('derives duration and horizon from generated planData', async () => {
    await save({ title: 'Generated Six Month Arc', nasmPhase: 2, planData: makePlanData(26) });
    expect(capture.createdValues.durationWeeks).toBe(26);
    expect(capture.createdValues.metadata).toMatchObject({
      planHorizon: 'six_month', horizonKey: 'six_month', planDurationKey: 'six_month',
    });
    expect(capture.createdValues.planData.weeks).toHaveLength(26);
  });

  it('overrides AI-supplied horizon metadata with generated duration truth', async () => {
    await save({
      title: 'Prompt Metadata Six Month Arc',
      durationWeeks: 4,
      metadata: { planHorizon: 'one_day', horizonKey: 'one_day', planDurationKey: 'one_day' },
      planData: makePlanData(26),
    });
    expect(capture.createdValues.durationWeeks).toBe(26);
    expect(capture.createdValues.metadata).toMatchObject({
      planHorizon: 'six_month', horizonKey: 'six_month', planDurationKey: 'six_month',
    });
  });

  it('defaults to trainer-led non-auto-deduct assignment semantics', async () => {
    await save({ title: 'Trainer-Led Strength Arc', planData: makePlanData() });
    expect(capture.createdValues.metadata).toMatchObject({
      assignmentDefault: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      defaultShouldDeductSession: false,
    });
    expect(capture.createdValues.planData.assignmentDefaults).toEqual({
      defaultAssignmentType: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      shouldDeductSession: false,
    });
  });

  it('drops invalid NASM phases instead of persisting NaN', async () => {
    await save({ title: 'Invalid Phase Arc', nasmPhase: 'phase two', planData: makePlanData() });
    expect(capture.createdValues.nasmPhase).toBeNull();
  });

  it('refuses AI-supplied auto-deduct defaults', async () => {
    const planData = makePlanData();
    planData.assignmentDefaults = { shouldDeductSession: true };
    await save({
      title: 'Prompt Injected Deduction Arc',
      metadata: { defaultShouldDeductSession: true },
      planData,
    });
    expect(capture.createdValues.metadata.defaultShouldDeductSession).toBe(false);
    expect(capture.createdValues.planData.assignmentDefaults.shouldDeductSession).toBe(false);
  });

  it('sanitizes contact details from planData', async () => {
    const planData = makePlanData();
    planData.planSummary.email = 'private@example.com';
    planData.recommendations = ['Email private@example.com or call (555) 555-0199.'];
    await save({ title: 'Privacy Safe AI Arc', planData });
    const serialized = JSON.stringify(capture.createdValues.planData);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('(555) 555-0199');
    expect(serialized).toContain('[redacted]');
  });

  it('sanitizes contact details from metadata', async () => {
    await save({
      title: 'Privacy Safe Metadata Arc',
      metadata: {
        contactEmail: 'private@example.com',
        emergencyPhone: '555-555-0199',
        notes: 'Backup private@example.com or (555) 555-0199.',
      },
      planData: makePlanData(),
    });
    const serialized = JSON.stringify(capture.createdValues.metadata);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('555-555-0199');
    expect(serialized).toContain('[redacted]');
    expect(serialized).toContain('swan_coach_planning');
  });

  it('queues one protected derivative in the plan transaction without inline rendering', async () => {
    vi.stubEnv('TRAINING_PLAN_PDF_DERIVATIVES', 'true');
    await save({ title: 'Six Month Strength Arc', durationWeeks: 24, planData: makePlanData(24) });

    expect(capture.outbox).toBeTruthy();
    expect(capture.outbox.transaction).toBe(capture.transaction);
    expect(capture.outbox.replacements).toMatchObject({
      planId: 'plan-ai-1',
      sourceRevision: 1,
      sourceHash: capture.createdValues.contentHash,
      promoteGenerated: true,
      reason: 'ai_plan_save',
    });
    expect(capture.plan.pdfDerivative).toMatchObject({
      enabled: true, id: 'job-ai-1', state: 'pending', sourceType: 'generated',
    });
    expect(harness.storePdf).not.toHaveBeenCalled();
  });
});
