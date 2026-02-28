import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/index.mjs', () => ({
  getAllModels: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    transaction: vi.fn(),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../routes/aiMonitoringRoutes.mjs', () => ({
  updateMetrics: vi.fn(),
}));

vi.mock('../../services/deIdentificationService.mjs', () => ({
  deIdentify: vi.fn(),
  hashPayload: vi.fn(),
}));

vi.mock('../../services/ai/providerRouter.mjs', () => ({
  routeAiGeneration: vi.fn(),
}));

vi.mock('../../services/ai/outputValidator.mjs', () => ({
  runValidationPipeline: vi.fn(),
  validateApprovedDraftPlan: vi.fn(),
}));

vi.mock('../../services/ai/degradedResponse.mjs', () => ({
  buildDegradedResponse: vi.fn().mockReturnValue({ success: true, degraded: true }),
}));

vi.mock('../../services/ai/rateLimiter.mjs', () => ({
  releaseConcurrent: vi.fn(),
}));

vi.mock('../../services/ai/types.mjs', () => ({
  PROMPT_VERSION: 'test-version',
}));

vi.mock('../../services/ai/templateContextBuilder.mjs', () => ({
  buildTemplateContext: vi.fn().mockReturnValue(null),
}));

vi.mock('../../services/ai/progressContextBuilder.mjs', () => ({
  buildProgressContext: vi.fn().mockReturnValue(null),
}));

vi.mock('../../services/ai/contextBuilder.mjs', () => ({
  buildUnifiedContext: vi.fn().mockReturnValue({
    generationMode: 'ai_full',
    explainability: { progressFlags: [], safetyFlags: [] },
    safetyConstraints: null,
    exerciseRecommendations: [],
    missingInputs: [],
  }),
}));

vi.mock('../../services/ai/aiEligibilityHelper.mjs', () => ({
  checkAiEligibility: vi.fn(),
}));

import sequelize from '../../database.mjs';
import { getAllModels } from '../../models/index.mjs';
import { checkAiEligibility } from '../../services/ai/aiEligibilityHelper.mjs';
import { deIdentify, hashPayload } from '../../services/deIdentificationService.mjs';
import { routeAiGeneration } from '../../services/ai/providerRouter.mjs';
import { runValidationPipeline, validateApprovedDraftPlan } from '../../services/ai/outputValidator.mjs';

const makeRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const makeDraftPlan = () => ({
  planName: 'Coach Draft',
  durationWeeks: 4,
  summary: 'Summary',
  days: [
    {
      dayNumber: 1,
      name: 'Day 1',
      dayType: 'training',
      exercises: [
        { name: 'Bench Press', setScheme: '3x8', repGoal: '8-10', restPeriod: 60 },
      ],
    },
  ],
});

const makeUser = () => ({
  id: 100,
  masterPromptJson: {
    client: { name: 'Client Name' },
    goals: { primary: 'strength' },
  },
  spiritName: 'Spirit',
});

const buildModels = () => {
  const draftAuditLog = {
    id: 501,
    tokenUsage: {},
    update: vi.fn().mockResolvedValue({}),
  };
  const approvalAuditLog = {
    id: 777,
    tokenUsage: {},
    update: vi.fn().mockResolvedValue({}),
  };

  return {
    User: { findByPk: vi.fn().mockResolvedValue(makeUser()) },
    Exercise: { findOne: vi.fn().mockResolvedValue({ id: 900, name: 'Bench Press' }) },
    WorkoutPlan: { create: vi.fn().mockResolvedValue({ id: 1001 }) },
    WorkoutPlanDay: { create: vi.fn().mockResolvedValue({ id: 1002 }) },
    WorkoutPlanDayExercise: { create: vi.fn().mockResolvedValue({ id: 1003 }) },
    ClientTrainerAssignment: { findOne: vi.fn().mockResolvedValue({ id: 1, status: 'active' }) },
    ClientBaselineMeasurements: { findOne: vi.fn().mockResolvedValue(null) },
    AiInteractionLog: {
      create: vi.fn().mockResolvedValue(draftAuditLog),
      findByPk: vi.fn().mockResolvedValue(approvalAuditLog),
    },
    AiConsentLog: { create: vi.fn().mockResolvedValue({ id: 88 }) },
    _draftAuditLog: draftAuditLog,
    _approvalAuditLog: approvalAuditLog,
  };
};

describe('workout controller eligibility integration', () => {
  let generateWorkoutPlan;
  let approveDraftPlan;

  beforeEach(async () => {
    vi.clearAllMocks();

    deIdentify.mockReturnValue({
      deIdentified: { client: { goals: { primary: 'strength' } } },
      strippedFields: [],
    });
    hashPayload.mockReturnValue('hash');
    routeAiGeneration.mockResolvedValue({
      ok: true,
      result: {
        rawText: '{"ok":true}',
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokenUsage: { totalTokens: 123 },
      },
      failoverTrace: [],
    });
    runValidationPipeline.mockReturnValue({
      ok: true,
      data: makeDraftPlan(),
      warnings: [],
    });
    validateApprovedDraftPlan.mockReturnValue({
      valid: true,
      normalizedDraft: makeDraftPlan(),
      warnings: [],
      errors: [],
    });
    sequelize.transaction.mockResolvedValue({
      commit: vi.fn().mockResolvedValue(),
      rollback: vi.fn().mockResolvedValue(),
    });

    const mod = await import('../../controllers/aiWorkoutController.mjs');
    generateWorkoutPlan = mod.generateWorkoutPlan;
    approveDraftPlan = mod.approveDraftPlan;
  });

  it('1 - calls checkAiEligibility with expected params on generate', async () => {
    const models = buildModels();
    getAllModels.mockReturnValue(models);
    checkAiEligibility.mockResolvedValue({ decision: 'allow', reasonCode: null, warnings: [] });

    const req = { user: { id: 10, role: 'trainer' }, body: { userId: 100, mode: 'draft' } };
    const res = makeRes();
    await generateWorkoutPlan(req, res);

    expect(checkAiEligibility).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: 100,
      actorUserId: 10,
      actorRole: 'trainer',
      models,
      featureType: 'workout_generation',
    }));
  });

  it('2 - returns 403 when eligibility decision is deny on generate', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'deny',
      reasonCode: 'AI_CONSENT_WITHDRAWN',
      warnings: [],
    });

    const req = { user: { id: 10, role: 'trainer' }, body: { userId: 100, mode: 'draft' } };
    const res = makeRes();
    await generateWorkoutPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_CONSENT_WITHDRAWN',
    }));
  });

  it('3 - returns 400 MISSING_OVERRIDE_REASON for admin override on generate', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = { user: { id: 99, role: 'admin' }, body: { userId: 100, mode: 'draft' } };
    const res = makeRes();
    await generateWorkoutPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MISSING_OVERRIDE_REASON',
    }));
  });

  it('4 - proceeds when admin override reason is provided on generate', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = {
      user: { id: 99, role: 'admin' },
      body: { userId: 100, mode: 'draft', overrideReason: 'In-person signed consent review' },
    };
    const res = makeRes();
    await generateWorkoutPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      draft: true,
    }));
  });

  it('5 - includes eligibilityOverride in generate audit log', async () => {
    const models = buildModels();
    getAllModels.mockReturnValue(models);
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = {
      user: { id: 99, role: 'admin' },
      body: { userId: 100, mode: 'draft', overrideReason: 'Override for supervised session' },
    };
    const res = makeRes();
    await generateWorkoutPlan(req, res);

    expect(models._draftAuditLog.update).toHaveBeenCalledWith(expect.objectContaining({
      tokenUsage: expect.objectContaining({
        eligibilityOverride: expect.objectContaining({
          actorUserId: 99,
          overrideReason: 'Override for supervised session',
          warning: 'AI_CONSENT_OVERRIDE_USED',
        }),
      }),
    }));
  });

  it('6 - creates AiConsentLog on admin override in generate', async () => {
    const models = buildModels();
    getAllModels.mockReturnValue(models);
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = {
      user: { id: 99, role: 'admin' },
      body: { userId: 100, mode: 'draft', overrideReason: 'Override for supervised session' },
    };
    const res = makeRes();
    await generateWorkoutPlan(req, res);

    expect(models.AiConsentLog.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 100,
      action: 'override_used',
      sourceType: 'admin_override',
      actorUserId: 99,
      reason: 'Override for supervised session',
      metadata: { endpoint: 'workout_generation' },
    }));
  });

  it('7 - calls checkAiEligibility on approve', async () => {
    const models = buildModels();
    getAllModels.mockReturnValue(models);
    checkAiEligibility.mockResolvedValue({ decision: 'allow', reasonCode: null, warnings: [] });

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 100, plan: makeDraftPlan(), auditLogId: 777 },
    };
    const res = makeRes();
    await approveDraftPlan(req, res);

    expect(checkAiEligibility).toHaveBeenCalledWith(expect.objectContaining({
      targetUserId: 100,
      actorUserId: 10,
      actorRole: 'trainer',
      models,
      featureType: 'workout_generation',
    }));
  });

  it('8 - returns 403 when eligibility decision is deny on approve', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'deny',
      reasonCode: 'AI_CONSENT_MISSING',
      warnings: [],
    });

    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 100, plan: makeDraftPlan(), auditLogId: 777 },
    };
    const res = makeRes();
    await approveDraftPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AI_CONSENT_MISSING',
    }));
  });

  it('9 - returns 400 MISSING_OVERRIDE_REASON on approve for admin override', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = {
      user: { id: 99, role: 'admin' },
      body: { userId: 100, plan: makeDraftPlan(), auditLogId: 777 },
    };
    const res = makeRes();
    await approveDraftPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MISSING_OVERRIDE_REASON',
    }));
  });

  it('10 - proceeds when override reason is provided on approve', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = {
      user: { id: 99, role: 'admin' },
      body: {
        userId: 100,
        plan: makeDraftPlan(),
        auditLogId: 777,
        overrideReason: 'Signed in clinic',
      },
    };
    const res = makeRes();
    await approveDraftPlan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('11 - includes eligibilityOverride in approval audit log', async () => {
    const models = buildModels();
    getAllModels.mockReturnValue(models);
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = {
      user: { id: 99, role: 'admin' },
      body: {
        userId: 100,
        plan: makeDraftPlan(),
        auditLogId: 777,
        overrideReason: 'Signed in clinic',
      },
    };
    const res = makeRes();
    await approveDraftPlan(req, res);

    expect(models._approvalAuditLog.update).toHaveBeenCalledWith(expect.objectContaining({
      tokenUsage: expect.objectContaining({
        approval: expect.objectContaining({
          eligibilityOverride: expect.objectContaining({
            actorUserId: 99,
            overrideReason: 'Signed in clinic',
          }),
        }),
      }),
    }));
  });

  // ── 5W-F: Waiver-specific error codes ──

  it('12a - returns 403 with AI_WAIVER_MISSING on generate', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'deny', reasonCode: 'AI_WAIVER_MISSING', warnings: [],
    });
    const req = { user: { id: 10, role: 'trainer' }, body: { userId: 100, mode: 'draft' } };
    const res = makeRes();
    await generateWorkoutPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_WAIVER_MISSING' }));
  });

  it('12b - returns 403 with AI_WAIVER_VERSION_OUTDATED on generate', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'deny', reasonCode: 'AI_WAIVER_VERSION_OUTDATED', warnings: [],
    });
    const req = { user: { id: 10, role: 'trainer' }, body: { userId: 100, mode: 'draft' } };
    const res = makeRes();
    await generateWorkoutPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_WAIVER_VERSION_OUTDATED' }));
  });

  it('12c - returns 403 with AI_WAIVER_VERSION_OUTDATED on approve', async () => {
    getAllModels.mockReturnValue(buildModels());
    checkAiEligibility.mockResolvedValue({
      decision: 'deny', reasonCode: 'AI_WAIVER_VERSION_OUTDATED', warnings: [],
    });
    const req = {
      user: { id: 10, role: 'trainer' },
      body: { userId: 100, plan: makeDraftPlan(), auditLogId: 777 },
    };
    const res = makeRes();
    await approveDraftPlan(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_WAIVER_VERSION_OUTDATED' }));
  });

  it('12 - creates AiConsentLog on admin override in approve', async () => {
    const models = buildModels();
    getAllModels.mockReturnValue(models);
    checkAiEligibility.mockResolvedValue({
      decision: 'allow_with_override_warning',
      reasonCode: null,
      warnings: ['AI_CONSENT_OVERRIDE_USED'],
    });

    const req = {
      user: { id: 99, role: 'admin' },
      body: {
        userId: 100,
        plan: makeDraftPlan(),
        auditLogId: 777,
        overrideReason: 'Signed in clinic',
      },
    };
    const res = makeRes();
    await approveDraftPlan(req, res);

    expect(models.AiConsentLog.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 100,
      action: 'override_used',
      sourceType: 'admin_override',
      actorUserId: 99,
      reason: 'Signed in clinic',
      metadata: { endpoint: 'workout_generation' },
    }));
  });
});
