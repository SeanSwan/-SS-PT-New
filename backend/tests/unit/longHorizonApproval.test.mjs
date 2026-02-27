/**
 * Long-Horizon Approval Tests — Phase 5C-D
 * ==========================================
 * 43 behavioral tests across 5 sections:
 *   A: AI Eligibility Helper (6)
 *   B: Approval Validator (7)
 *   C: Approval Controller — Auth/RBAC/Eligibility (11)
 *   D: Approval Controller — Validation + Persistence (10)
 *   E: Generation Controller — Behavioral (6)
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Direct imports for pure function tests (Sections A, B)
import { checkAiEligibility } from '../../services/ai/aiEligibilityHelper.mjs';
import { validateLongHorizonApproval } from '../../services/ai/longHorizonApprovalValidator.mjs';
import { stableStringify } from '../../services/ai/stableStringify.mjs';

// ─── Module-level mocks (hoisted by vitest) ─────────────────
vi.mock('../../models/index.mjs', () => ({ getAllModels: vi.fn() }));

vi.mock('../../database.mjs', () => ({
  default: { transaction: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../services/deIdentificationService.mjs', () => ({
  deIdentify: vi.fn(),
  hashPayload: vi.fn(),
}));

vi.mock('../../services/ai/providerRouter.mjs', () => ({
  routeAiGeneration: vi.fn(),
  registerAdapter: vi.fn(),
}));

vi.mock('../../services/ai/rateLimiter.mjs', () => ({
  releaseConcurrent: vi.fn(),
}));

// Partial mock — keep Zod schema + rules real for validator tests
vi.mock('../../services/ai/longHorizonOutputValidator.mjs', async () => {
  const actual = await vi.importActual('../../services/ai/longHorizonOutputValidator.mjs');
  return { ...actual, runLongHorizonValidationPipeline: vi.fn() };
});

vi.mock('../../services/ai/degradedResponse.mjs', () => ({
  buildDegradedResponse: vi.fn().mockReturnValue({ success: true, degraded: true }),
}));

vi.mock('../../services/ai/templateContextBuilder.mjs', () => ({
  buildTemplateContext: vi.fn().mockReturnValue({}),
}));

vi.mock('../../services/ai/longHorizonContextBuilder.mjs', () => ({
  buildLongHorizonContext: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/ai/longHorizonPromptBuilder.mjs', () => ({
  buildLongHorizonPrompt: vi.fn().mockReturnValue('mock prompt'),
  LONG_HORIZON_SYSTEM_MESSAGE: 'mock system',
}));

vi.mock('../../routes/aiMonitoringRoutes.mjs', () => ({
  updateMetrics: vi.fn(),
}));

vi.mock('../../services/ai/types.mjs', () => ({
  PROMPT_VERSION: '5C-test',
}));

// ─── Named imports (mocked) for assertions ───────────────────
import { getAllModels } from '../../models/index.mjs';
import sequelize from '../../database.mjs';
import logger from '../../utils/logger.mjs';
import { deIdentify, hashPayload } from '../../services/deIdentificationService.mjs';
import { routeAiGeneration } from '../../services/ai/providerRouter.mjs';
import { releaseConcurrent } from '../../services/ai/rateLimiter.mjs';
import { runLongHorizonValidationPipeline } from '../../services/ai/longHorizonOutputValidator.mjs';
import { buildDegradedResponse } from '../../services/ai/degradedResponse.mjs';

// ─── Test helpers ────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const makeValidPlan = (overrides = {}) => ({
  planName: 'Test 6-Month Periodization',
  horizonMonths: 6,
  summary: 'Test plan summary',
  blocks: [
    { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Stabilization Endurance', focus: 'Core stability', durationWeeks: 4, sessionsPerWeek: 3, entryCriteria: 'Entry', exitCriteria: 'Exit', notes: 'Notes' },
    { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Strength Endurance', focus: 'Compounds', durationWeeks: 4, sessionsPerWeek: 4, entryCriteria: null, exitCriteria: null, notes: null },
    { sequence: 3, nasmFramework: 'OPT', optPhase: 3, phaseName: 'Hypertrophy', focus: 'Volume', durationWeeks: 4, sessionsPerWeek: 4, entryCriteria: null, exitCriteria: null, notes: null },
    { sequence: 4, nasmFramework: 'OPT', optPhase: 4, phaseName: 'Maximal Strength', focus: 'Intensity', durationWeeks: 4, sessionsPerWeek: 3, entryCriteria: null, exitCriteria: null, notes: null },
  ],
  ...overrides,
});

const makeDefaultUser = (overrides = {}) => ({
  id: 1,
  role: 'client',
  spiritName: 'Spirit',
  masterPromptJson: {
    client: {
      name: 'Test User',
      goals: { primary: 'strength', secondary: ['hypertrophy'], constraints: [] },
    },
  },
  ...overrides,
});

const makeMockModels = (overrides = {}) => ({
  User: { findByPk: vi.fn().mockResolvedValue(makeDefaultUser()) },
  ClientTrainerAssignment: { findOne: vi.fn().mockResolvedValue({ id: 1, status: 'active' }) },
  AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: null }) },
  LongTermProgramPlan: {
    create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 100, ...data })),
  },
  ProgramMesocycleBlock: { create: vi.fn().mockResolvedValue({}) },
  AiInteractionLog: {
    findByPk: vi.fn().mockResolvedValue({
      id: 50, userId: 1, requestType: 'long_horizon_generation', status: 'draft',
      tokenUsage: { validatedPlanHash: 'stored-hash' },
      update: vi.fn().mockResolvedValue({}),
    }),
    create: vi.fn().mockResolvedValue({ id: 1, update: vi.fn().mockResolvedValue({}) }),
  },
  ClientBaselineMeasurements: { findOne: vi.fn().mockResolvedValue(null) },
  ...overrides,
});

const setupTransaction = () => {
  const tx = { commit: vi.fn(), rollback: vi.fn() };
  sequelize.transaction.mockResolvedValue(tx);
  return tx;
};

// ═════════════════════════════════════════════════════════════
// Section A: AI Eligibility Helper (6 tests)
// ═════════════════════════════════════════════════════════════

describe('Section A: checkAiEligibility', () => {
  it('1 — returns allow for admin with consent', async () => {
    const models = {
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: null }),
      },
    };
    const result = await checkAiEligibility({
      targetUserId: 1, actorUserId: 10, actorRole: 'admin', models,
    });
    expect(result.decision).toBe('allow');
    expect(result.requiresAuditOverride).toBe(false);
    expect(result.consentSource).toBe('ai_privacy_profile');
  });

  it('2 — returns allow_with_override_warning for admin without consent', async () => {
    const models = {
      AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue(null) },
    };
    const result = await checkAiEligibility({
      targetUserId: 1, actorUserId: 10, actorRole: 'admin', models,
    });
    expect(result.decision).toBe('allow_with_override_warning');
    expect(result.requiresAuditOverride).toBe(true);
    expect(result.warnings).toContain('AI_CONSENT_OVERRIDE_USED');
    expect(result.consentSource).toBe('none');
  });

  it('3 — returns allow for trainer with consent', async () => {
    const models = {
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: null }),
      },
    };
    const result = await checkAiEligibility({
      targetUserId: 1, actorUserId: 10, actorRole: 'trainer', models,
    });
    expect(result.decision).toBe('allow');
    expect(result.requiresAuditOverride).toBe(false);
  });

  it('4 — returns deny for trainer without consent (AI_CONSENT_MISSING)', async () => {
    const models = {
      AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue(null) },
    };
    const result = await checkAiEligibility({
      targetUserId: 1, actorUserId: 10, actorRole: 'trainer', models,
    });
    expect(result.decision).toBe('deny');
    expect(result.reasonCode).toBe('AI_CONSENT_MISSING');
  });

  it('5 — returns deny for trainer with disabled consent (AI_CONSENT_DISABLED)', async () => {
    const models = {
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue({ aiEnabled: false, withdrawnAt: null }),
      },
    };
    const result = await checkAiEligibility({
      targetUserId: 1, actorUserId: 10, actorRole: 'trainer', models,
    });
    expect(result.decision).toBe('deny');
    expect(result.reasonCode).toBe('AI_CONSENT_DISABLED');
  });

  it('6 — returns deny for trainer with withdrawn consent (AI_CONSENT_WITHDRAWN)', async () => {
    const models = {
      AiPrivacyProfile: {
        findOne: vi.fn().mockResolvedValue({ aiEnabled: true, withdrawnAt: new Date() }),
      },
    };
    const result = await checkAiEligibility({
      targetUserId: 1, actorUserId: 10, actorRole: 'trainer', models,
    });
    expect(result.decision).toBe('deny');
    expect(result.reasonCode).toBe('AI_CONSENT_WITHDRAWN');
  });
});

// ═════════════════════════════════════════════════════════════
// Section B: Approval Validator (7 tests)
// ═════════════════════════════════════════════════════════════

describe('Section B: validateLongHorizonApproval', () => {
  it('7 — valid plan passes with normalized output', () => {
    const result = validateLongHorizonApproval({
      plan: makeValidPlan(),
      requestedHorizon: 6,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.normalizedPlan).toBeTruthy();
    expect(result.normalizedPlan.planName).toBe('Test 6-Month Periodization');
    expect(result.normalizedPlan.blocks).toHaveLength(4);
  });

  it('8 — rejects non-object plan (INVALID_DRAFT_PAYLOAD)', () => {
    const result = validateLongHorizonApproval({
      plan: null,
      requestedHorizon: 6,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_DRAFT_PAYLOAD')).toBe(true);
  });

  it('9 — rejects missing planName (Zod validation error)', () => {
    const plan = makeValidPlan();
    delete plan.planName;
    const result = validateLongHorizonApproval({ plan, requestedHorizon: 6 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'AI_VALIDATION_ERROR')).toBe(true);
  });

  it('10 — rejects non-contiguous block sequences (INVALID_BLOCK_SEQUENCE)', () => {
    const plan = makeValidPlan({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 4 },
        { sequence: 3, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4 },
      ],
    });
    const result = validateLongHorizonApproval({ plan, requestedHorizon: 6 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_BLOCK_SEQUENCE')).toBe(true);
  });

  it('11 — rejects OPT block without optPhase (rule engine error)', () => {
    const plan = makeValidPlan({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: null, phaseName: 'Phase 1', durationWeeks: 4 },
      ],
    });
    const result = validateLongHorizonApproval({ plan, requestedHorizon: 6 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('12 — passes with warnings for short duration', () => {
    const plan = makeValidPlan({
      blocks: [
        { sequence: 1, nasmFramework: 'OPT', optPhase: 1, phaseName: 'Phase 1', durationWeeks: 4, sessionsPerWeek: 3 },
        { sequence: 2, nasmFramework: 'OPT', optPhase: 2, phaseName: 'Phase 2', durationWeeks: 4, sessionsPerWeek: 3 },
      ],
    });
    // 8 total weeks for 6-month plan (threshold: 16) → warning
    const result = validateLongHorizonApproval({ plan, requestedHorizon: 6 });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('13 — rejects horizonMonths mismatch (HORIZON_MISMATCH)', () => {
    const plan = makeValidPlan({ horizonMonths: 3 });
    const result = validateLongHorizonApproval({ plan, requestedHorizon: 6 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'HORIZON_MISMATCH')).toBe(true);
  });

  it('13b — rejects whitespace-only planName as validation error (not DB error)', () => {
    const plan = makeValidPlan({ planName: '   ' });
    const result = validateLongHorizonApproval({ plan, requestedHorizon: 6 });
    expect(result.valid).toBe(false);
    // Pre-trim converts "   " to "", Zod catches .min(1) → 422 not 500
    expect(result.errors.some(e => e.code === 'AI_VALIDATION_ERROR')).toBe(true);
  });
});

describe('stableStringify — key-order invariance', () => {
  it('produces identical output regardless of key insertion order', () => {
    const objA = { z: 1, a: 2, m: { b: 3, a: 4 } };
    const objB = { a: 2, m: { a: 4, b: 3 }, z: 1 };
    expect(stableStringify(objA)).toBe(stableStringify(objB));
  });
});

// ═════════════════════════════════════════════════════════════
// Section C: Approval Controller — Auth/RBAC/Eligibility (11)
// ═════════════════════════════════════════════════════════════

describe('Section C: approveLongHorizonPlan — auth/RBAC/eligibility', () => {
  let approveLongHorizonPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    getAllModels.mockReturnValue(makeMockModels());
    setupTransaction();
    hashPayload.mockReturnValue('stored-hash');
    const mod = await import('../../controllers/longHorizonController.mjs');
    approveLongHorizonPlan = mod.approveLongHorizonPlan;
  });

  it('14 — 401 for unauthenticated', async () => {
    const req = { user: null, body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 } };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('15 — 403 for client role', async () => {
    const req = {
      user: { id: 10, role: 'client' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('trainers and admins'),
    }));
  });

  it('16 — 400 for missing userId', async () => {
    const req = {
      user: { id: 10, role: 'admin' },
      body: { plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('17 — 400 for missing plan', async () => {
    const req = {
      user: { id: 10, role: 'admin' },
      body: { userId: 1, horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INVALID_DRAFT_PAYLOAD',
    }));
  });

  it('18 — 400 for missing auditLogId', async () => {
    const req = {
      user: { id: 10, role: 'admin' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MISSING_AUDIT_LOG_ID',
    }));
  });

  it('19 — 400 HORIZON_MISMATCH when body.horizonMonths ≠ plan.horizonMonths', async () => {
    const req = {
      user: { id: 10, role: 'admin' },
      body: { userId: 1, plan: makeValidPlan({ horizonMonths: 3 }), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'HORIZON_MISMATCH',
    }));
  });

  it('20 — 404 for nonexistent user', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      User: { findByPk: vi.fn().mockResolvedValue(null) },
    }));
    const req = {
      user: { id: 10, role: 'admin' },
      body: { userId: 999, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('21 — 403 + AI_ASSIGNMENT_DENIED for unassigned trainer', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      ClientTrainerAssignment: { findOne: vi.fn().mockResolvedValue(null) },
    }));
    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_ASSIGNMENT_DENIED',
    }));
  });

  it('22 — 403 + AI_CONSENT_MISSING for trainer without consent', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue(null) },
    }));
    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_CONSENT_MISSING',
    }));
  });

  it('23 — admin bypasses assignment + proceeds with override (reaches 200)', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue(null) }, // No consent
    }));
    const req = {
      user: { id: 10, role: 'admin' },
      body: {
        userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50,
        overrideReason: 'Testing admin override',
      },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
    }));
  });

  it('24 — 400 MISSING_OVERRIDE_REASON when admin override triggered but no reason', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue(null) }, // No consent
    }));
    const req = {
      user: { id: 10, role: 'admin' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MISSING_OVERRIDE_REASON',
    }));
  });
});

// ═════════════════════════════════════════════════════════════
// Section D: Approval Controller — Validation + Persistence (10)
// ═════════════════════════════════════════════════════════════

describe('Section D: approveLongHorizonPlan — validation + persistence', () => {
  let approveLongHorizonPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    getAllModels.mockReturnValue(makeMockModels());
    setupTransaction();
    hashPayload.mockReturnValue('stored-hash');
    const mod = await import('../../controllers/longHorizonController.mjs');
    approveLongHorizonPlan = mod.approveLongHorizonPlan;
  });

  it('25 — 422 + APPROVED_DRAFT_INVALID with granular errors for invalid plan', async () => {
    const req = {
      user: { id: 10, role: 'trainer' },
      body: {
        userId: 1,
        plan: { horizonMonths: 6 }, // Missing planName, blocks
        horizonMonths: 6,
        auditLogId: 50,
      },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.code).toBe('APPROVED_DRAFT_INVALID');
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('26 — 200 success: persists plan + blocks in transaction', async () => {
    const models = makeMockModels();
    getAllModels.mockReturnValue(models);
    const mockTx = setupTransaction();

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.planId).toBe(100);
    expect(body.blockCount).toBe(4);

    // Plan created in transaction
    expect(models.LongTermProgramPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, horizonMonths: 6, status: 'approved' }),
      { transaction: mockTx },
    );
    // 4 blocks created
    expect(models.ProgramMesocycleBlock.create).toHaveBeenCalledTimes(4);
    // Transaction committed
    expect(mockTx.commit).toHaveBeenCalled();
    expect(mockTx.rollback).not.toHaveBeenCalled();
  });

  it('27 — transaction rollback on block creation failure', async () => {
    const models = makeMockModels({
      ProgramMesocycleBlock: {
        create: vi.fn().mockRejectedValue(new Error('Block insert failed')),
      },
    });
    getAllModels.mockReturnValue(models);
    const mockTx = setupTransaction();

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockTx.rollback).toHaveBeenCalled();
    expect(mockTx.commit).not.toHaveBeenCalled();
  });

  it('28a — sourceType is ai_assisted when validatedPlanHash matches', async () => {
    hashPayload.mockReturnValue('stored-hash'); // Matches default audit log's hash

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: 'ai_assisted',
    }));
  });

  it('28b — sourceType is ai_assisted_edited when validatedPlanHash mismatches', async () => {
    hashPayload.mockReturnValue('different-hash'); // Does NOT match stored 'stored-hash'

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: 'ai_assisted_edited',
    }));
  });

  it('29 — sourceType defaults to ai_assisted_edited when log has no validatedPlanHash', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiInteractionLog: {
        findByPk: vi.fn().mockResolvedValue({
          id: 50, userId: 1, requestType: 'long_horizon_generation', status: 'draft',
          tokenUsage: {}, // No validatedPlanHash
          update: vi.fn().mockResolvedValue({}),
        }),
        create: vi.fn(),
      },
    }));

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: 'ai_assisted_edited',
    }));
  });

  it('30 — audit log skips linkage when auditLogId not found (info log)', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiInteractionLog: {
        findByPk: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
    }));

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 999 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: 'ai_assisted_edited',
    }));
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('auditLogId not found'),
      expect.any(Object),
    );
  });

  it('31 — audit log skips linkage when auditLogId belongs to wrong userId (warn)', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiInteractionLog: {
        findByPk: vi.fn().mockResolvedValue({
          id: 50, userId: 999, // Wrong user!
          requestType: 'long_horizon_generation', status: 'draft',
          tokenUsage: { validatedPlanHash: 'stored-hash' },
          update: vi.fn(),
        }),
        create: vi.fn(),
      },
    }));

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('userId mismatch'),
      expect.any(Object),
    );
  });

  it('32 — audit log skips linkage when auditLogId has wrong requestType (warn)', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiInteractionLog: {
        findByPk: vi.fn().mockResolvedValue({
          id: 50, userId: 1,
          requestType: 'workout_generation', // Wrong type!
          status: 'draft',
          tokenUsage: { validatedPlanHash: 'stored-hash' },
          update: vi.fn(),
        }),
        create: vi.fn(),
      },
    }));

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('requestType mismatch'),
      expect.any(Object),
    );
  });

  it('33 — audit log skips linkage when auditLogId has wrong status (warn)', async () => {
    getAllModels.mockReturnValue(makeMockModels({
      AiInteractionLog: {
        findByPk: vi.fn().mockResolvedValue({
          id: 50, userId: 1,
          requestType: 'long_horizon_generation',
          status: 'error', // Wrong status!
          tokenUsage: { validatedPlanHash: 'stored-hash' },
          update: vi.fn(),
        }),
        create: vi.fn(),
      },
    }));

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50 },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('status invalid'),
      expect.any(Object),
    );
  });

  it('34 — goalProfile is server-derived from masterPromptJson, not from request body', async () => {
    const models = makeMockModels({
      User: {
        findByPk: vi.fn().mockResolvedValue(makeDefaultUser({
          masterPromptJson: {
            client: {
              goals: { primary: 'weight_loss', secondary: ['endurance'], constraints: ['knee_injury'] },
            },
          },
        })),
      },
    });
    getAllModels.mockReturnValue(models);

    const req = {
      user: { id: 10, role: 'trainer' },
      body: {
        userId: 1, plan: makeValidPlan(), horizonMonths: 6, auditLogId: 50,
        goalProfile: { primaryGoal: 'bodybuilding' }, // Should be ignored
      },
    };
    const res = mockRes();
    await approveLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(models.LongTermProgramPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        goalProfile: {
          primaryGoal: 'weight_loss',
          secondaryGoals: ['endurance'],
          constraints: ['knee_injury'],
        },
      }),
      expect.any(Object),
    );
  });
});

// ═════════════════════════════════════════════════════════════
// Section E: Generation Controller — Behavioral (6 tests)
// ═════════════════════════════════════════════════════════════

describe('Section E: generateLongHorizonPlan — behavioral', () => {
  let generateLongHorizonPlan;

  const setupGenerationMocks = () => {
    const models = makeMockModels();
    getAllModels.mockReturnValue(models);
    deIdentify.mockReturnValue({ deIdentified: { client: {} }, strippedFields: ['name'] });
    hashPayload.mockReturnValue('test-hash');
    return models;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../controllers/longHorizonController.mjs');
    generateLongHorizonPlan = mod.generateLongHorizonPlan;
  });

  it('35 — success path: returns draft + releases concurrent lock', async () => {
    setupGenerationMocks();

    routeAiGeneration.mockResolvedValue({
      ok: true,
      result: {
        rawText: '{"valid":"json"}',
        provider: 'openai',
        model: 'gpt-4',
        tokenUsage: { totalTokens: 100 },
      },
      failoverTrace: [],
    });

    runLongHorizonValidationPipeline.mockReturnValue({
      ok: true,
      data: makeValidPlan(),
      warnings: [],
    });

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, horizonMonths: 6 },
    };
    const res = mockRes();
    await generateLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      draft: true,
    }));
    expect(releaseConcurrent).toHaveBeenCalledWith(10);
  });

  it('36 — degraded path: returns degraded response + releases lock', async () => {
    setupGenerationMocks();

    routeAiGeneration.mockResolvedValue({
      ok: false,
      errors: [{ code: 'PROVIDER_ERROR' }],
      failoverTrace: ['openai_failed'],
    });

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, horizonMonths: 6 },
    };
    const res = mockRes();
    await generateLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(buildDegradedResponse).toHaveBeenCalled();
    expect(releaseConcurrent).toHaveBeenCalledWith(10);
  });

  it('37 — validation failure: returns error + releases lock', async () => {
    setupGenerationMocks();

    routeAiGeneration.mockResolvedValue({
      ok: true,
      result: {
        rawText: '{"bad":"data"}',
        provider: 'openai',
        model: 'gpt-4',
        tokenUsage: {},
      },
      failoverTrace: [],
    });

    runLongHorizonValidationPipeline.mockReturnValue({
      ok: false,
      failStage: 'validation_error',
      failReason: 'Schema validation failed',
    });

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, horizonMonths: 6 },
    };
    const res = mockRes();
    await generateLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(releaseConcurrent).toHaveBeenCalledWith(10);
  });

  it('38 — consent denied: returns 403 before reaching router', async () => {
    const models = makeMockModels({
      AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue(null) }, // No consent
    });
    getAllModels.mockReturnValue(models);

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 1, horizonMonths: 6 },
    };
    const res = mockRes();
    await generateLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(routeAiGeneration).not.toHaveBeenCalled();
    expect(releaseConcurrent).toHaveBeenCalledWith(10);
  });

  it('39 — 400 MISSING_OVERRIDE_REASON when admin override triggered without reason', async () => {
    const models = makeMockModels({
      AiPrivacyProfile: { findOne: vi.fn().mockResolvedValue(null) }, // No consent → override
    });
    getAllModels.mockReturnValue(models);

    const req = {
      user: { id: 10, role: 'admin' },
      body: { userId: 1, horizonMonths: 6 }, // No overrideReason
    };
    const res = mockRes();
    await generateLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MISSING_OVERRIDE_REASON',
    }));
    expect(releaseConcurrent).toHaveBeenCalledWith(10);
  });

  it('40 — exception path: returns 500 + releases lock', async () => {
    const models = makeMockModels({
      User: { findByPk: vi.fn().mockRejectedValue(new Error('DB connection failed')) },
    });
    getAllModels.mockReturnValue(models);

    const req = {
      user: { id: 10, role: 'admin' },
      body: { userId: 1, horizonMonths: 6, overrideReason: 'Testing' },
    };
    const res = mockRes();
    await generateLongHorizonPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(releaseConcurrent).toHaveBeenCalledWith(10);
  });
});
