/**
 * Training-safety data must survive the health gate
 * =================================================
 * Split out of deIdentifierGatedHealthFields.test.mjs on 2026-08-22 to stay
 * under the 300-line cap. Same fixtures and mocks; this half owns the direction
 * that can HURT someone if it regresses — over-gating removes the inputs that
 * keep programming safe, while the other half owns under-gating, which leaks a
 * lifestyle metric the consent copy can disclose honestly. Those are not
 * equivalent, which is why they now live apart.
 *
 * Original context
 * ----------------
 * `deIdentify` is a DENYLIST: it strips known direct identifiers and regex-
 * redacts email/phone shapes, then forwards everything else the caller packed
 * into the payload. That meant sensitive non-training health data reached the
 * Swan Coach provider simply by being present.
 *
 * Owner decision Q2 (2026-08-22): health fields stay off until counsel signs
 * off. Owner decision, same day: SPLIT the set rather than deny it wholesale.
 *
 *   DENIED by default  — supplements, sleep, stress
 *   NEVER denied       — injuries, pain, measurements, medical conditions
 *                        (training safety: without them Coach cannot avoid a
 *                        contraindicated movement)
 *
 * Medical conditions moved to the protected side on 2026-08-22, during the dry
 * loop. The first cut of this gate denied them, which broke an assertion in
 * aiPrivacy.test.mjs that had already labelled them "safety-critical" with a
 * `mild asthma` fixture. That test was right: asthma, cardiac conditions and
 * diabetes change what can be safely programmed. Gating them was the same
 * mistake as gating injuries would have been.
 *
 * These tests pin BOTH halves. The second half matters most: a future edit that
 * "tightens privacy" by adding injuries or conditions to the gated list would
 * silently make Swan Coach unsafe, and must fail here instead.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { deIdentify, TRAINING_SAFETY_PATHS, areGatedHealthFieldsEnabled,
  GATED_FIELDS_REQUIRE_CONSENT_VERSION } =
  await import('../../services/deIdentificationService.mjs');
const logger = (await import('../../utils/logger.mjs')).default;

/** A payload shaped like what contextBuilder assembles for a real client. */
function fullClientPayload() {
  return {
    client: {
      id: 501,
      name: 'Real Name',
      contact: { email: 'real@example.com', phone: '555-123-4567' },
      goals: ['build lower-body strength'],
    },
    training: { level: 'intermediate', daysPerWeek: 3 },
    measurements: { weightKg: 82, bodyFatPct: 18 },
    painAndInjuries: [{ area: 'left knee', severity: 7, note: 'post-surgical' }],
    health: {
      injuries: ['left knee'],
      currentPain: 7,
      conditions: ['hypertension'],
      medications: ['lisinopril'],
      surgeries: ['ACL repair 2019'],
      supplements: ['creatine'],
      sleep: { hoursPerNight: 5 },
      stress: 'high',
    },
    lifestyle: { occupation: 'nurse', stressLevel: 8, sleepQuality: 'poor' },
  };
}

const ORIGINAL_FLAG = process.env.COACH_HEALTH_FIELDS_ENABLED;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.COACH_HEALTH_FIELDS_ENABLED;
  delete process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION;
});

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) delete process.env.COACH_HEALTH_FIELDS_ENABLED;
  else process.env.COACH_HEALTH_FIELDS_ENABLED = ORIGINAL_FLAG;
});

describe('training-safety data is NOT gated', () => {
  it('keeps injuries, pain and measurements with the gate active', () => {
    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });

    expect(deIdentified.painAndInjuries).toEqual([
      { area: 'left knee', severity: 7, note: 'post-surgical' },
    ]);
    expect(deIdentified.health.injuries).toEqual(['left knee']);
    expect(deIdentified.health.currentPain).toBe(7);
    expect(deIdentified.measurements).toEqual({ weightKg: 82, bodyFatPct: 18 });
    // Safety-critical: asthma/cardiac/diabetes change what can be programmed.
    expect(deIdentified.health.conditions).toEqual(['hypertension']);
  });

  it('declares the protected paths so a future edit has to argue with the list', () => {
    expect(TRAINING_SAFETY_PATHS).toContain('painAndInjuries');
    expect(TRAINING_SAFETY_PATHS).toContain('health.injuries');
    expect(TRAINING_SAFETY_PATHS).toContain('health.currentPain');
    expect(TRAINING_SAFETY_PATHS).toContain('measurements');
    // Added after the dry loop caught the first cut stripping them.
    expect(TRAINING_SAFETY_PATHS).toContain('health.medicalConditions');
    expect(TRAINING_SAFETY_PATHS).toContain('health.conditions');
    expect(Object.isFrozen(TRAINING_SAFETY_PATHS)).toBe(true);
  });
});

describe('arrays are walked — the third appearance of one drift class', () => {
  // Post-ship panel (ox-alpha) found the category matcher guarded recursion with
  // `!Array.isArray(value)`, so array-nested keys sailed through while every
  // consent surface said they were withheld. Reproduced live before fixing.
  //
  // Sequence worth remembering: an enumerated PATH list missed medicalConditions;
  // the category matcher that replaced it missed ARRAY-nested keys. Each fix
  // narrowed the hole without closing the SHAPE. These tests pin the shape.
  it('strips gated keys nested inside arrays of objects', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] },
      training: { level: 'intermediate' },
      recoveryLogs: [{ date: '2026-08-01', sleepHours: 5, stressLevel: 8 }],
      weeklyCheckins: [{ supplements: ['creatine'], sleepQuality: 'poor' }],
    }, { clientId: 501 });

    expect(deIdentified.recoveryLogs[0].sleepHours).toBeUndefined();
    expect(deIdentified.recoveryLogs[0].stressLevel).toBeUndefined();
    expect(deIdentified.weeklyCheckins[0].supplements).toBeUndefined();
    expect(deIdentified.weeklyCheckins[0].sleepQuality).toBeUndefined();
    // Non-gated siblings inside the same array element survive.
    expect(deIdentified.recoveryLogs[0].date).toBe('2026-08-01');
  });

  it('strips through arrays nested inside arrays', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] },
      training: { level: 'intermediate' },
      blocks: [{ weeks: [{ sleepDebtHours: 12, notes: 'keep' }] }],
    }, { clientId: 501 });

    expect(deIdentified.blocks[0].weeks[0].sleepDebtHours).toBeUndefined();
    expect(deIdentified.blocks[0].weeks[0].notes).toBe('keep');
  });

  it('records the array path in strippedFields so the audit trail is precise', () => {
    const { strippedFields } = deIdentify({
      client: { id: 501, goals: ['x'] },
      training: { level: 'intermediate' },
      recoveryLogs: [{ sleepHours: 5 }],
    }, { clientId: 501 });

    expect(strippedFields).toContain('recoveryLogs[0].sleepHours');
  });

  it('never strips training-safety data out of arrays', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] },
      training: { level: 'intermediate' },
      painAndInjuries: [{ area: 'left knee', severity: 7 }],
      history: [{ injuries: ['ACL'], conditions: ['asthma'] }],
    }, { clientId: 501 });

    expect(deIdentified.painAndInjuries[0]).toEqual({ area: 'left knee', severity: 7 });
    expect(deIdentified.history[0].injuries).toEqual(['ACL']);
    expect(deIdentified.history[0].conditions).toEqual(['asthma']);
  });

  it('warns once per process about a consent-version mismatch, not once per call', () => {
    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
    // A distinct value, so this exercises the once-per-VALUE guard rather than
    // inheriting a warning another test already emitted.
    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = 'wrong-flood-probe';
    logger.error.mockClear();
    areGatedHealthFieldsEnabled();
    areGatedHealthFieldsEnabled();
    areGatedHealthFieldsEnabled();
    expect(logger.error.mock.calls.length).toBeLessThanOrEqual(1);
  });
});

describe('clinical terms survive the category matcher', () => {
  // GLM 5.3 (post-ship panel): the matcher gated any key containing
  // sleep/stress/supplement, so `stressFracture`, `sleepApnea` and
  // `supplementalOxygenNeeded` were stripped — a tibial stress fracture,
  // moderate apnea and an oxygen requirement removed from what Coach can see.
  // All three are exercise contraindications. Reproduced before fixing.
  //
  // The asymmetry these tests defend: over-gating can hurt someone,
  // under-gating leaks a lifestyle metric. Ambiguity resolves toward KEEPING.
  const clinical = {
    stressFracture: 'left tibia 2024',
    sleepApnea: 'moderate, uses CPAP',
    supplementalOxygenNeeded: true,
    stressEchocardiogram: 'normal',
    sleepDisorderDiagnosis: 'insomnia',
  };

  it('keeps clinical keys even though they contain gated tokens', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] }, training: { level: 'i' }, health: { ...clinical },
    }, { clientId: 501 });

    for (const [key, value] of Object.entries(clinical)) {
      expect(deIdentified.health[key]).toEqual(value);
    }
  });

  it('still gates the lifestyle metrics in the same payload', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] }, training: { level: 'i' },
      health: { ...clinical, sleepHours: 5, stressLevel: 8, supplements: ['creatine'] },
    }, { clientId: 501 });

    expect(deIdentified.health.sleepHours).toBeUndefined();
    expect(deIdentified.health.stressLevel).toBeUndefined();
    expect(deIdentified.health.supplements).toBeUndefined();
    expect(deIdentified.health.stressFracture).toBe('left tibia 2024');
  });

  it('TRAINING_SAFETY_PATHS is LOAD-BEARING, not decorative', () => {
    // It previously described itself as the protective list, was asserted by a
    // test, and was never read by the stripper. Adding a path did nothing. This
    // proves the list is actually consulted: every protected leaf name survives
    // even when it also matches a gated token.
    for (const path of TRAINING_SAFETY_PATHS) {
      const leaf = path.split('.').pop();
      const { deIdentified } = deIdentify({
        client: { id: 501, goals: ['x'] }, training: { level: 'i' },
        health: { [leaf]: 'protected-value' },
      }, { clientId: 501 });
      expect(deIdentified.health[leaf]).toBe('protected-value');
    }
  });
});

describe('no-throw on degenerate shapes', () => {
  // `typeof null === 'object'` let a null intermediate through setNestedValue's
  // guard, so `client: null` threw instead of failing closed (ox-alpha, executed).
  it('returns a payload rather than throwing when client is null', () => {
    expect(() => deIdentify({ client: null, training: { level: 'i' } }, { clientId: 501 })).not.toThrow();
    const r = deIdentify({ client: null, training: { level: 'i' } }, { clientId: 501 });
    expect(r).not.toBeNull();
    expect(r.deIdentified.client.alias).toBe('Client #501');
  });
});
