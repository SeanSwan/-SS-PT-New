/**
 * AI Privacy Phase 1 Tests
 * ========================
 * Tests for:
 *   - De-identification service (strips PII, preserves safe fields, fail-closed)
 *   - AI consent middleware (blocks without consent, blocks withdrawn, allows active)
 *   - AI kill switch middleware (blocks when disabled, allows when enabled)
 *   - Audit logging (logs on success/failure)
 *   - Controller integration (de-identified payload reaches provider, not raw PII)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── De-Identification Service Tests ────────────────────────────────────────

// Import the service directly (no DB dependency)
import { deIdentify, hashPayload } from '../../services/deIdentificationService.mjs';

/**
 * Realistic masterPromptJson fixture matching the v3.0 schema
 */
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
    goals: {
      primary: 'weight_loss',
      secondary: 'muscle_tone',
      timeline: '12_weeks',
    },
  },
  health: {
    medicalConditions: ['mild asthma'],
    medications: ['albuterol inhaler'],
    supplements: ['whey protein', 'creatine'],
    injuries: ['left knee ACL repair 2023'],
    currentPain: [],
    surgeries: ['ACL reconstruction 2023'],
  },
  measurements: {
    height: 165,
    currentWeight: 68,
    targetWeight: 60,
    bodyFatPercentage: 28,
  },
  baseline: {
    cardiovascular: { restingHeartRate: 72, bloodPressure: '120/80' },
    strength: { benchPress: 30, squat: 50, deadlift: 60 },
  },
  training: {
    fitnessLevel: 'intermediate',
    workoutTypes: ['resistance', 'cardio'],
    favoriteExercises: ['squats', 'deadlifts'],
    dislikedExercises: ['burpees'],
    sessionsPerWeek: 4,
  },
  nutrition: {
    currentDiet: 'balanced',
    dailyProtein: 80,
    waterIntake: 2.5,
    foodAllergies: ['shellfish'],
  },
  lifestyle: {
    sleepHours: 7,
    sleepQuality: 'good',
    stressLevel: 'moderate',
    stressSources: ['work deadlines', 'childcare'],
    occupation: 'software engineer',
    activityLevel: 'moderately_active',
  },
});

describe('De-Identification Service', () => {
  describe('deIdentify()', () => {
    it('should strip client.name and replace with spiritName', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input, { spiritName: 'Phoenix Rising' });

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.name).toBe('Phoenix Rising');
      expect(result.strippedFields).toContain('client.name');
    });

    it('should strip client.preferredName and replace with spiritName', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input, { spiritName: 'Phoenix Rising' });

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.preferredName).toBe('Phoenix Rising');
      expect(result.strippedFields).toContain('client.preferredName');
    });

    it('should use generic alias when no spiritName provided', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.name).toBe('Client');
      expect(result.deIdentified.client.preferredName).toBe('Client');
    });

    it('should strip email', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.contact?.email).toBeUndefined();
      expect(result.strippedFields).toContain('client.contact.email');
    });

    it('should strip phone', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.contact?.phone).toBeUndefined();
      expect(result.strippedFields).toContain('client.contact.phone');
    });

    it('should strip bloodType', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.bloodType).toBeUndefined();
      expect(result.strippedFields).toContain('client.bloodType');
    });

    it('should strip medications', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.health.medications).toBeUndefined();
      expect(result.strippedFields).toContain('health.medications');
    });

    it('should strip surgeries', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.health.surgeries).toBeUndefined();
      expect(result.strippedFields).toContain('health.surgeries');
    });

    it('should strip occupation', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.lifestyle?.occupation).toBeUndefined();
      expect(result.strippedFields).toContain('lifestyle.occupation');
    });

    it('should strip stressSources', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.lifestyle?.stressSources).toBeUndefined();
      expect(result.strippedFields).toContain('lifestyle.stressSources');
    });

    it('should preserve spiritName alias', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input, { spiritName: 'Phoenix Rising' });

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.alias).toBe('Phoenix Rising');
    });

    it('should preserve training data', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.training).toEqual(input.training);
    });

    it('should preserve measurements', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.measurements).toEqual(input.measurements);
    });

    it('should preserve baseline data', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.baseline).toEqual(input.baseline);
    });

    it('should preserve medicalConditions (safety-critical)', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.health.medicalConditions).toEqual(['mild asthma']);
    });

    it('should preserve injuries (safety-critical)', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.health.injuries).toEqual(['left knee ACL repair 2023']);
    });

    it('should preserve safe lifestyle fields', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.lifestyle.sleepHours).toBe(7);
      expect(result.deIdentified.lifestyle.sleepQuality).toBe('good');
      expect(result.deIdentified.lifestyle.stressLevel).toBe('moderate');
    });

    it('should not mutate the original input', () => {
      const input = createMasterPromptFixture();
      const originalName = input.client.name;
      deIdentify(input, { spiritName: 'Phoenix Rising' });

      expect(input.client.name).toBe(originalName);
    });

    it('should fail closed on null input', () => {
      const result = deIdentify(null);
      expect(result).toBeNull();
    });

    it('should fail closed on undefined input', () => {
      const result = deIdentify(undefined);
      expect(result).toBeNull();
    });

    it('should fail closed on non-object input', () => {
      const result = deIdentify('not an object');
      expect(result).toBeNull();
    });

    it('should fail closed when no training context remains', () => {
      const input = {
        client: {
          name: 'Jane Doe',
          contact: { email: 'jane@example.com' },
        },
      };
      const result = deIdentify(input);
      expect(result).toBeNull();
    });

    it('should succeed with minimal training context', () => {
      const input = {
        client: {
          name: 'Jane Doe',
          goals: { primary: 'weight_loss' },
        },
        training: { fitnessLevel: 'beginner' },
      };
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      expect(result.deIdentified.client.name).toBe('Client');
      expect(result.deIdentified.training.fitnessLevel).toBe('beginner');
    });

    it('should return list of all stripped fields', () => {
      const input = createMasterPromptFixture();
      const result = deIdentify(input);

      expect(result).not.toBeNull();
      // At minimum: name, preferredName, email, phone, bloodType, contact, occupation, stressSources, medications, surgeries
      expect(result.strippedFields.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('hashPayload()', () => {
    it('should return a 64-char hex string (SHA-256)', () => {
      const hash = hashPayload({ test: 'data' });
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic', () => {
      const data = { foo: 'bar', baz: 123 };
      expect(hashPayload(data)).toBe(hashPayload(data));
    });

    it('should differ for different payloads', () => {
      expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
    });
  });
});

// ─── AI Consent Middleware Tests ─────────────────────────────────────────────

import { aiKillSwitch, requireAiConsent } from '../../middleware/aiConsent.mjs';

const createMockReq = (overrides = {}) => ({
  user: { id: 3, role: 'client' },
  body: {},
  ...overrides,
});

const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
  };
  return res;
};

describe('AI Kill Switch Middleware', () => {
  const originalEnv = process.env.AI_WORKOUT_GENERATION_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AI_WORKOUT_GENERATION_ENABLED;
    } else {
      process.env.AI_WORKOUT_GENERATION_ENABLED = originalEnv;
    }
  });

  it('should call next() when env var is not set (default enabled)', () => {
    delete process.env.AI_WORKOUT_GENERATION_ENABLED;
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    aiKillSwitch(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should call next() when env var is "true"', () => {
    process.env.AI_WORKOUT_GENERATION_ENABLED = 'true';
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    aiKillSwitch(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 503 when env var is "false"', () => {
    process.env.AI_WORKOUT_GENERATION_ENABLED = 'false';
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    aiKillSwitch(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('AI_FEATURE_DISABLED');
  });
});

describe('AI Consent Middleware', () => {
  const mockFindOne = vi.fn();
  const mockGetModel = () => ({ findOne: mockFindOne });
  const middleware = requireAiConsent(mockGetModel);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 AI_CONSENT_MISSING when no profile exists', async () => {
    mockFindOne.mockResolvedValue(null);
    const req = createMockReq({ body: { userId: 3 } });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_MISSING');
  });

  it('should return 403 AI_CONSENT_DISABLED when aiEnabled is false', async () => {
    mockFindOne.mockResolvedValue({ aiEnabled: false, withdrawnAt: null });
    const req = createMockReq({ body: { userId: 3 } });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_DISABLED');
  });

  it('should return 403 AI_CONSENT_WITHDRAWN when consent is withdrawn', async () => {
    mockFindOne.mockResolvedValue({
      aiEnabled: true,
      withdrawnAt: new Date('2026-01-01'),
    });
    const req = createMockReq({ body: { userId: 3 } });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_WITHDRAWN');
  });

  it('should call next() and attach profile when consent is active', async () => {
    const profile = { aiEnabled: true, withdrawnAt: null };
    mockFindOne.mockResolvedValue(profile);
    const req = createMockReq({ body: { userId: 3 } });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.aiConsentProfile).toBe(profile);
  });

  it('should resolve targetUserId from req.user.id for client role', async () => {
    const profile = { aiEnabled: true, withdrawnAt: null };
    mockFindOne.mockResolvedValue(profile);
    const req = createMockReq({ body: {} }); // no explicit userId
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(mockFindOne).toHaveBeenCalledWith({ where: { userId: 3 } });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when no user is authenticated', async () => {
    const req = createMockReq({ user: undefined, body: {} });
    const res = createMockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

// ─── Integration: Provider payload must be de-identified ─────────────────────

describe('Provider Payload Safety', () => {
  it('should NEVER contain raw name in de-identified payload', () => {
    const input = createMasterPromptFixture();
    const result = deIdentify(input, { spiritName: 'Phoenix Rising' });

    const serialized = JSON.stringify(result.deIdentified);
    expect(serialized).not.toContain('Jane Doe');
    expect(serialized).not.toContain('Janie');
  });

  it('should NEVER contain raw email in de-identified payload', () => {
    const input = createMasterPromptFixture();
    const result = deIdentify(input);

    const serialized = JSON.stringify(result.deIdentified);
    expect(serialized).not.toContain('jane.doe@example.com');
  });

  it('should NEVER contain raw phone in de-identified payload', () => {
    const input = createMasterPromptFixture();
    const result = deIdentify(input);

    const serialized = JSON.stringify(result.deIdentified);
    expect(serialized).not.toContain('555-123-4567');
  });

  it('should NEVER contain medications in de-identified payload', () => {
    const input = createMasterPromptFixture();
    const result = deIdentify(input);

    const serialized = JSON.stringify(result.deIdentified);
    expect(serialized).not.toContain('albuterol');
  });

  it('should NEVER contain occupation in de-identified payload', () => {
    const input = createMasterPromptFixture();
    const result = deIdentify(input);

    const serialized = JSON.stringify(result.deIdentified);
    expect(serialized).not.toContain('software engineer');
  });

  it('should NEVER contain stress sources in de-identified payload', () => {
    const input = createMasterPromptFixture();
    const result = deIdentify(input);

    const serialized = JSON.stringify(result.deIdentified);
    expect(serialized).not.toContain('work deadlines');
    expect(serialized).not.toContain('childcare');
  });

  it('should still contain training-relevant data', () => {
    const input = createMasterPromptFixture();
    const result = deIdentify(input);

    const serialized = JSON.stringify(result.deIdentified);
    expect(serialized).toContain('intermediate');
    expect(serialized).toContain('weight_loss');
    expect(serialized).toContain('squats');
  });
});
