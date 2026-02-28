/**
 * AI Privacy Phase 1 — Controller Integration Tests
 * ==================================================
 * Tests that require full mock isolation of the controller, router,
 * database, and models. Separated from unit tests for clean mock hoisting.
 *
 * Updated for Phase 3A: Controller now uses provider router (not direct OpenAI).
 * Router is mocked to test controller-level behavior (RBAC, consent, de-id, audit).
 *
 * Covers:
 *   - De-identified payload reaches router context (no raw PII)
 *   - User-supplied constraints are NOT forwarded to router
 *   - RBAC runs BEFORE consent check (no consent status leak)
 *   - Audit log lifecycle (pending → success/degraded/parse_error/validation_error)
 *   - Consent controller endpoints (grant/withdraw/read)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Mock Setup (hoisted before any imports) ──────────────────────────────────

const { mockRouteAiGeneration, mockTransaction, mockEvaluateWaiverVersionEligibility } = vi.hoisted(() => {
  return {
    mockRouteAiGeneration: vi.fn(),
    mockTransaction: { commit: vi.fn(), rollback: vi.fn() },
    mockEvaluateWaiverVersionEligibility: vi.fn(),
  };
});

let capturedRouterContext = null;

vi.mock('../../services/ai/providerRouter.mjs', () => ({
  routeAiGeneration: mockRouteAiGeneration,
}));

vi.mock('../../services/ai/rateLimiter.mjs', () => ({
  releaseConcurrent: vi.fn(),
}));

vi.mock('../../services/waivers/waiverVersionEligibilityService.mjs', () => ({
  evaluateWaiverVersionEligibility: (...args) => mockEvaluateWaiverVersionEligibility(...args),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    authenticate: vi.fn().mockResolvedValue(true),
    transaction: vi.fn().mockResolvedValue(mockTransaction),
  },
}));

vi.mock('../../routes/aiMonitoringRoutes.mjs', () => ({
  updateMetrics: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { mockModels } = vi.hoisted(() => ({
  mockModels: {
    User: { findByPk: vi.fn() },
    Exercise: { findOne: vi.fn() },
    WorkoutPlan: { create: vi.fn() },
    WorkoutPlanDay: { create: vi.fn() },
    WorkoutPlanDayExercise: { create: vi.fn() },
    ClientTrainerAssignment: { findOne: vi.fn() },
    ClientBaselineMeasurements: { findOne: vi.fn() },
    AiPrivacyProfile: { findOne: vi.fn(), findOrCreate: vi.fn() },
    AiInteractionLog: { create: vi.fn() },
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => mockModels,
  getModel: (name) => mockModels[name],
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { generateWorkoutPlan } from '../../controllers/aiWorkoutController.mjs';
import {
  grantAiConsent,
  withdrawAiConsent,
  getAiConsentStatus,
} from '../../controllers/aiConsentController.mjs';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const createMasterPromptFixture = () => ({
  client: {
    name: 'Jane Doe',
    preferredName: 'Janie',
    alias: 'Phoenix Rising',
    age: 32,
    gender: 'female',
    bloodType: 'O+',
    contact: {
      email: 'jane.doe@example.com',
      phone: '555-123-4567',
      preferredTime: 'morning',
    },
    goals: { primary: 'weight_loss', secondary: 'muscle_tone', timeline: '12_weeks' },
  },
  health: {
    medicalConditions: ['mild asthma'],
    medications: ['albuterol inhaler'],
    supplements: ['whey protein'],
    injuries: ['left knee ACL repair 2023'],
    currentPain: [],
    surgeries: ['ACL reconstruction 2023'],
  },
  measurements: { height: 165, currentWeight: 68, targetWeight: 60, bodyFatPercentage: 28 },
  baseline: {
    cardiovascular: { restingHeartRate: 72, bloodPressure: '120/80' },
    strength: { benchPress: 30, squat: 50, deadlift: 60 },
  },
  training: {
    fitnessLevel: 'intermediate',
    workoutTypes: ['resistance', 'cardio'],
    favoriteExercises: ['squats', 'deadlifts'],
    sessionsPerWeek: 4,
  },
  nutrition: { currentDiet: 'balanced', dailyProtein: 80 },
  lifestyle: {
    sleepHours: 7, sleepQuality: 'good', stressLevel: 'moderate',
    stressSources: ['work deadlines', 'childcare'],
    occupation: 'software engineer',
  },
});

const validAiResponse = JSON.stringify({
  planName: 'Test Plan', durationWeeks: 4, summary: 'Test plan',
  days: [{
    dayNumber: 1, name: 'Day 1', focus: 'Full Body', dayType: 'training',
    estimatedDuration: 60,
    exercises: [{ name: 'Barbell Squat', setScheme: '3x10', repGoal: '10', restPeriod: 90 }],
  }],
});

const createReq = (overrides = {}) => ({
  user: { id: 3, role: 'client' },
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const createRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

// ── Controller Integration Tests ─────────────────────────────────────────────

describe('Controller Integration — generateWorkoutPlan', () => {
  let mockAuditUpdate;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedRouterContext = null;
    mockAuditUpdate = vi.fn().mockResolvedValue(true);

    // Default happy path: router returns success outcome
    mockRouteAiGeneration.mockImplementation(async (ctx) => {
      capturedRouterContext = ctx;
      return {
        ok: true,
        result: {
          provider: 'openai',
          model: 'gpt-4',
          rawText: validAiResponse,
          latencyMs: 123,
          finishReason: 'stop',
          tokenUsage: { inputTokens: 200, outputTokens: 300, totalTokens: 500, estimatedCostUsd: null },
        },
        errors: [],
        failoverTrace: ['openai:ok'],
      };
    });

    // Default waiver eligibility — no waiver consent (5W-F)
    mockEvaluateWaiverVersionEligibility.mockResolvedValue({
      hasWaiverConsent: false, isCurrent: false,
      reasonCode: 'AI_WAIVER_MISSING', consentSource: 'none',
      details: { requiredVersionIds: [], acceptedVersionIds: [], missingRequiredVersionIds: [], reconsentRequiredVersionIds: [] },
    });

    mockModels.AiPrivacyProfile.findOne.mockResolvedValue({ aiEnabled: true, withdrawnAt: null });
    mockModels.AiInteractionLog.create.mockResolvedValue({ update: mockAuditUpdate });
    mockModels.User.findByPk.mockResolvedValue({
      id: 3, spiritName: 'Phoenix Rising', masterPromptJson: createMasterPromptFixture(),
    });
    mockModels.ClientBaselineMeasurements.findOne.mockResolvedValue(null);
    mockModels.Exercise.findOne.mockResolvedValue({ id: 1, name: 'Barbell Squat' });
    mockModels.WorkoutPlan.create.mockResolvedValue({ id: 100 });
    mockModels.WorkoutPlanDay.create.mockResolvedValue({ id: 200 });
    mockModels.WorkoutPlanDayExercise.create.mockResolvedValue({ id: 300 });
  });

  it('should send de-identified payload to router (no raw PII)', async () => {
    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(capturedRouterContext).not.toBeNull();
    const payload = JSON.stringify(capturedRouterContext.deidentifiedPayload);
    expect(payload).not.toContain('Jane Doe');
    expect(payload).not.toContain('jane.doe@example.com');
    expect(payload).not.toContain('555-123-4567');
    expect(payload).not.toContain('albuterol');
    expect(payload).not.toContain('software engineer');
    expect(payload).toContain('Phoenix Rising');
  });

  it('should NOT forward user-supplied constraints to router', async () => {
    const req = createReq({
      body: {
        userId: 3,
        constraints: {
          freeText: 'My name is Jane and my email is jane@doe.com',
          piiLeak: 'Please use my real name',
        },
      },
    });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(capturedRouterContext).not.toBeNull();
    const payload = JSON.stringify(capturedRouterContext.deidentifiedPayload);
    const constraints = JSON.stringify(capturedRouterContext.serverConstraints);
    expect(payload).not.toContain('My name is Jane');
    expect(payload).not.toContain('jane@doe.com');
    expect(constraints).not.toContain('My name is Jane');
    expect(constraints).not.toContain('jane@doe.com');
  });

  it('should block request when consent is missing', async () => {
    mockModels.AiPrivacyProfile.findOne.mockResolvedValue(null);

    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(res.statusCode).toBe(403);
    // 5W-F: When both AiPrivacyProfile and waiver are absent, waiver-specific code takes precedence
    expect(res.body.code).toBe('AI_WAIVER_MISSING');
    expect(mockRouteAiGeneration).not.toHaveBeenCalled();
  });

  it('should block request when consent is withdrawn', async () => {
    mockModels.AiPrivacyProfile.findOne.mockResolvedValue({
      aiEnabled: true,
      withdrawnAt: new Date('2026-01-01'),
    });

    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_WITHDRAWN');
    expect(mockRouteAiGeneration).not.toHaveBeenCalled();
  });

  it('should check RBAC BEFORE consent for trainers (no consent leak)', async () => {
    mockModels.ClientTrainerAssignment.findOne.mockResolvedValue(null);

    const req = createReq({
      user: { id: 2, role: 'trainer' },
      body: { userId: 3 },
    });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('not assigned');
    expect(res.body.code).toBe('AI_ASSIGNMENT_DENIED');
  });

  it('should create audit log with pending status, then update to success', async () => {
    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(mockModels.AiInteractionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', provider: 'pending', requestType: 'workout_generation' })
    );
    expect(mockAuditUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', provider: 'openai', outputHash: expect.any(String), durationMs: expect.any(Number) })
    );
  });

  it('should mark audit log as parse_error on invalid JSON from router', async () => {
    mockRouteAiGeneration.mockResolvedValueOnce({
      ok: true,
      result: {
        provider: 'openai',
        model: 'gpt-4',
        rawText: 'This is not JSON {{{',
        latencyMs: 100,
        finishReason: 'stop',
        tokenUsage: null,
      },
      errors: [],
      failoverTrace: ['openai:ok'],
    });

    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(res.statusCode).toBe(502);
    expect(mockAuditUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'parse_error', errorCode: 'parse_error' })
    );
  });

  it('should return degraded response when all providers fail', async () => {
    mockRouteAiGeneration.mockResolvedValueOnce({
      ok: false,
      result: null,
      errors: [{ provider: 'openai', code: 'PROVIDER_UNAVAILABLE', message: 'Service unavailable', retryable: true }],
      failoverTrace: ['openai:PROVIDER_UNAVAILABLE'],
    });

    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.degraded).toBe(true);
    expect(res.body.success).toBe(true);
    expect(mockAuditUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'degraded', provider: 'degraded' })
    );
  });

  it('should return 502 when all providers have auth errors', async () => {
    mockRouteAiGeneration.mockResolvedValueOnce({
      ok: false,
      result: null,
      errors: [{ provider: 'openai', code: 'PROVIDER_AUTH', message: 'Auth failed', retryable: false }],
      failoverTrace: ['openai:PROVIDER_AUTH'],
    });

    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('AI_CONFIG_ERROR');
    expect(mockAuditUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'degraded', errorCode: 'PROVIDER_AUTH' })
    );
  });

  it('should finalize audit log as error on unexpected exception (no stuck pending)', async () => {
    // Simulate an unexpected exception during DB persistence (after audit creation)
    mockModels.WorkoutPlan.create.mockRejectedValueOnce(new Error('DB connection lost'));

    const req = createReq({ body: { userId: 3 } });
    const res = createRes();

    await generateWorkoutPlan(req, res);

    expect(res.statusCode).toBe(500);
    expect(mockAuditUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', errorCode: 'INTERNAL_ERROR' })
    );
  });
});

// ── Consent Controller Tests ─────────────────────────────────────────────────

describe('AI Consent Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('grantAiConsent', () => {
    it('should create consent profile for client (self)', async () => {
      mockModels.AiPrivacyProfile.findOrCreate.mockResolvedValue([
        { userId: 3, aiEnabled: true, consentVersion: '1.0', consentedAt: new Date(), update: vi.fn() },
        true,
      ]);

      const req = createReq({ user: { id: 3, role: 'client' }, body: {} });
      const res = createRes();

      await grantAiConsent(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.aiEnabled).toBe(true);
    });

    it('should block trainers from granting consent', async () => {
      const req = createReq({ user: { id: 2, role: 'trainer' }, body: { userId: 3 } });
      const res = createRes();

      await grantAiConsent(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should allow admin to grant consent for existing client', async () => {
      mockModels.User.findByPk.mockResolvedValue({ id: 5, role: 'client' });
      mockModels.AiPrivacyProfile.findOrCreate.mockResolvedValue([
        { userId: 5, aiEnabled: true, consentVersion: '1.0', consentedAt: new Date(), update: vi.fn() },
        true,
      ]);

      const req = createReq({ user: { id: 1, role: 'admin' }, body: { userId: 5 } });
      const res = createRes();

      await grantAiConsent(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when admin grants consent for non-existent user', async () => {
      mockModels.User.findByPk.mockResolvedValue(null);

      const req = createReq({ user: { id: 1, role: 'admin' }, body: { userId: 999 } });
      const res = createRes();

      await grantAiConsent(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should return 400 when admin grants consent for non-client role', async () => {
      mockModels.User.findByPk.mockResolvedValue({ id: 2, role: 'trainer' });

      const req = createReq({ user: { id: 1, role: 'admin' }, body: { userId: 2 } });
      const res = createRes();

      await grantAiConsent(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('client accounts');
    });

    it('should reject invalid consentVersion', async () => {
      const req = createReq({ user: { id: 3, role: 'client' }, body: { consentVersion: '99.0' } });
      const res = createRes();

      await grantAiConsent(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid consent version');
    });

    it('should block client from granting consent for another user', async () => {
      const req = createReq({ user: { id: 3, role: 'client' }, body: { userId: 5 } });
      const res = createRes();

      await grantAiConsent(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('withdrawAiConsent', () => {
    it('should withdraw consent for self', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue({
        userId: 3, aiEnabled: true, withdrawnAt: null,
        update: vi.fn().mockResolvedValue(true),
      });

      const req = createReq({ user: { id: 3, role: 'client' }, body: {} });
      const res = createRes();

      await withdrawAiConsent(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when no consent record exists', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue(null);

      const req = createReq({ user: { id: 3, role: 'client' }, body: {} });
      const res = createRes();

      await withdrawAiConsent(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when admin withdraws for non-existent user', async () => {
      mockModels.User.findByPk.mockResolvedValue(null);

      const req = createReq({ user: { id: 1, role: 'admin' }, body: { userId: 999 } });
      const res = createRes();

      await withdrawAiConsent(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('getAiConsentStatus', () => {
    beforeEach(() => {
      // Default: waiver check returns AI_WAIVER_MISSING
      mockEvaluateWaiverVersionEligibility.mockResolvedValue({
        hasWaiverConsent: false,
        isCurrent: false,
        reasonCode: 'AI_WAIVER_MISSING',
        consentSource: 'none',
        details: {
          requiredVersionIds: [],
          acceptedVersionIds: [],
          missingRequiredVersionIds: [],
          reconsentRequiredVersionIds: [],
        },
      });
    });

    it('should return consentGranted=false when no profile exists', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue(null);

      const req = createReq({ user: { id: 3, role: 'client' }, params: {}, query: {} });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.consentGranted).toBe(false);
    });

    it('should return consentGranted=true when active consent exists', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue({
        userId: 3, aiEnabled: true, consentVersion: '1.0',
        consentedAt: new Date(), withdrawnAt: null,
      });

      const req = createReq({ user: { id: 3, role: 'client' }, params: {}, query: {} });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.consentGranted).toBe(true);
    });

    it('should block trainer from viewing unassigned client consent', async () => {
      mockModels.User.findByPk.mockResolvedValue({ id: 5 });
      mockModels.ClientTrainerAssignment.findOne.mockResolvedValue(null);

      const req = createReq({
        user: { id: 2, role: 'trainer' },
        params: { userId: '5' },
        query: {},
      });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 when admin queries non-existent user status', async () => {
      mockModels.User.findByPk.mockResolvedValue(null);

      const req = createReq({
        user: { id: 1, role: 'admin' },
        params: { userId: '999' },
        query: {},
      });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should return 400 when admin/trainer omits userId', async () => {
      const req = createReq({
        user: { id: 1, role: 'admin' },
        params: {},
        query: {},
      });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.statusCode).toBe(400);
    });

    // ── 5W-F: waiverEligibility field in status response ──────
    it('should include waiverEligibility in status response when profile exists', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue({
        userId: 3, aiEnabled: true, consentVersion: '1.0',
        consentedAt: new Date(), withdrawnAt: null,
      });
      mockEvaluateWaiverVersionEligibility.mockResolvedValue({
        hasWaiverConsent: true,
        isCurrent: true,
        reasonCode: null,
        consentSource: 'waiver_signature',
        details: {
          requiredVersionIds: [1, 2],
          acceptedVersionIds: [1, 2],
          missingRequiredVersionIds: [],
          reconsentRequiredVersionIds: [],
        },
      });

      const req = createReq({ user: { id: 3, role: 'client' }, params: {}, query: {} });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.body.waiverEligibility).toEqual({
        isCurrent: true,
        reasonCode: null,
        requiresReconsent: false,
      });
    });

    it('should include waiverEligibility in status response when no profile exists', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue(null);
      mockEvaluateWaiverVersionEligibility.mockResolvedValue({
        hasWaiverConsent: false,
        isCurrent: false,
        reasonCode: 'AI_WAIVER_MISSING',
        consentSource: 'none',
        details: {
          requiredVersionIds: [1, 2],
          acceptedVersionIds: [],
          missingRequiredVersionIds: [1, 2],
          reconsentRequiredVersionIds: [],
        },
      });

      const req = createReq({ user: { id: 3, role: 'client' }, params: {}, query: {} });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.body.waiverEligibility).toEqual({
        isCurrent: false,
        reasonCode: 'AI_WAIVER_MISSING',
        requiresReconsent: false,
      });
    });

    it('should show requiresReconsent=true when waiver versions need re-consent', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue({
        userId: 3, aiEnabled: true, consentVersion: '1.0',
        consentedAt: new Date(), withdrawnAt: null,
      });
      mockEvaluateWaiverVersionEligibility.mockResolvedValue({
        hasWaiverConsent: true,
        isCurrent: false,
        reasonCode: 'AI_WAIVER_VERSION_OUTDATED',
        consentSource: 'waiver_signature',
        details: {
          requiredVersionIds: [1, 2],
          acceptedVersionIds: [1, 2],
          missingRequiredVersionIds: [],
          reconsentRequiredVersionIds: [1],
        },
      });

      const req = createReq({ user: { id: 3, role: 'client' }, params: {}, query: {} });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.body.waiverEligibility).toEqual({
        isCurrent: false,
        reasonCode: 'AI_WAIVER_VERSION_OUTDATED',
        requiresReconsent: true,
      });
    });

    it('should return waiverEligibility=null when waiver service throws', async () => {
      mockModels.AiPrivacyProfile.findOne.mockResolvedValue({
        userId: 3, aiEnabled: true, consentVersion: '1.0',
        consentedAt: new Date(), withdrawnAt: null,
      });
      mockEvaluateWaiverVersionEligibility.mockRejectedValue(new Error('DB connection lost'));

      const req = createReq({ user: { id: 3, role: 'client' }, params: {}, query: {} });
      const res = createRes();

      await getAiConsentStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.waiverEligibility).toBeNull();
      expect(res.body.consentGranted).toBe(true);
    });
  });
});
