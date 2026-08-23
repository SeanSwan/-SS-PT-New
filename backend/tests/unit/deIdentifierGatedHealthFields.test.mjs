/**
 * Wave 1 Slice 5 — gated non-training health fields
 * =================================================
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

describe('gated non-training health fields', () => {
  it('is default-OFF so the gate applies without configuration', () => {
    expect(areGatedHealthFieldsEnabled()).toBe(false);
  });

  it('withholds supplements, sleep and stress by default', () => {
    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });

    expect(deIdentified.health.supplements).toBeUndefined();
    expect(deIdentified.health.sleep).toBeUndefined();
    expect(deIdentified.lifestyle?.sleepHours).toBeUndefined();
    expect(deIdentified.health.stress).toBeUndefined();
    expect(deIdentified.lifestyle?.stressLevel).toBeUndefined();
    expect(deIdentified.lifestyle?.sleepQuality).toBeUndefined();
  });

  it('logs the withheld FIELD NAME only, never the value', () => {
    deIdentify(fullClientPayload(), { clientId: 501 });

    const calls = logger.info.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('gated health field withheld'),
    );
    expect(calls.length).toBeGreaterThan(0);
    for (const [, meta] of calls) {
      expect(Object.keys(meta)).toEqual(['field']);
      expect(JSON.stringify(meta)).not.toMatch(/hypertension|creatine|high|poor/i);
    }
  });

  it('forwards the gated set when counsel has signed off and the flag is on', () => {
    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = GATED_FIELDS_REQUIRE_CONSENT_VERSION;
    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });

    expect(deIdentified.health.supplements).toEqual(['creatine']);
  });
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

describe('pre-existing protections still hold', () => {
  it('still strips direct identifiers, medications and surgeries', () => {
    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });

    expect(deIdentified.client.name).toBe('Client #501');
    expect(deIdentified.client.contact).toBeUndefined();
    expect(deIdentified.health.medications).toBeUndefined();
    expect(deIdentified.health.surgeries).toBeUndefined();
    expect(deIdentified.lifestyle?.occupation).toBeUndefined();
  });

  it('leaves training context intact so the fail-closed check still passes', () => {
    const result = deIdentify(fullClientPayload(), { clientId: 501 });
    expect(result).not.toBeNull();
    expect(result.deIdentified.training).toEqual({ level: 'intermediate', daysPerWeek: 3 });
    expect(result.deIdentified.client.goals).toEqual(['build lower-body strength']);
  });

  it('records gated removals in strippedFields for the audit trail', () => {
    const { strippedFields } = deIdentify(fullClientPayload(), { clientId: 501 });
    expect(strippedFields).toContain('health.supplements');
    expect(strippedFields).toContain('lifestyle.sleepQuality');
  });
});

describe('category gating covers unlisted field spellings', () => {
  // GLM 5.3, pre-push panel: the consent copy makes a CATEGORY claim while the
  // first implementation enumerated PATHS. An unlisted variant would flow while
  // the copy said it did not — the same drift class that let
  // health.medicalConditions slip through earlier in this wave. Matching on key
  // NAME at any depth is what actually keeps the category claim true.
  it('strips sleep/stress/supplement keys the original path list never named', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] },
      training: { level: 'intermediate' },
      clientProfile: { sleep: 'poor', stress: 'high', supplements: ['zma'] },
      wellness: { sleepQuality: 'bad', stressLevel: 9 },
      health: { sleepHours: 4, stressScore: 8, supplementStack: ['creatine'] },
      recovery: { nested: { sleepDebtHours: 12 } },
    }, { clientId: 501 });

    expect(deIdentified.clientProfile.sleep).toBeUndefined();
    expect(deIdentified.clientProfile.stress).toBeUndefined();
    expect(deIdentified.clientProfile.supplements).toBeUndefined();
    expect(deIdentified.wellness.sleepQuality).toBeUndefined();
    expect(deIdentified.wellness.stressLevel).toBeUndefined();
    expect(deIdentified.health.sleepHours).toBeUndefined();
    expect(deIdentified.health.stressScore).toBeUndefined();
    expect(deIdentified.health.supplementStack).toBeUndefined();
    expect(deIdentified.recovery.nested.sleepDebtHours).toBeUndefined();
  });

  it('never lets the category matcher eat training-safety data', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] },
      training: { level: 'intermediate' },
      health: {
        injuries: ['left knee'],
        currentPain: 7,
        conditions: ['asthma'],
        medicalConditions: ['hypertension'],
      },
      measurements: { weightKg: 82 },
      painAndInjuries: [{ area: 'knee' }],
    }, { clientId: 501 });

    expect(deIdentified.health.injuries).toEqual(['left knee']);
    expect(deIdentified.health.currentPain).toBe(7);
    expect(deIdentified.health.conditions).toEqual(['asthma']);
    expect(deIdentified.health.medicalConditions).toEqual(['hypertension']);
    expect(deIdentified.measurements).toEqual({ weightKg: 82 });
    expect(deIdentified.painAndInjuries).toEqual([{ area: 'knee' }]);
  });
});

describe('the escape hatch is a control, not a caution', () => {
  // DeepSeek v4 Pro, pre-push panel: a bare env flag plus a comment saying
  // "bump the consent version first" is advisory. An operator flipping it in
  // production would have made every consent surface false instantly. The
  // coupling is now enforced, and the failure mode is fail-CLOSED.
  it('stays closed when the flag is set but no consent version is declared', () => {
    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
    expect(areGatedHealthFieldsEnabled()).toBe(false);
    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
    expect(deIdentified.health.supplements).toBeUndefined();
  });

  it('stays closed when the declared consent version is the wrong one', () => {
    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = '2.0';
    expect(areGatedHealthFieldsEnabled()).toBe(false);
  });

  it('logs critical rather than failing silently', () => {
    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
    // A value unique to this test: the warning is deduped per declared value,
    // so reusing '2.0' here would assert against a warning an earlier test
    // already consumed.
    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = 'wrong-log-probe';
    logger.error.mockClear();
    areGatedHealthFieldsEnabled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('opens only when the declared version matches what this build requires', () => {
    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = GATED_FIELDS_REQUIRE_CONSENT_VERSION;
    expect(areGatedHealthFieldsEnabled()).toBe(true);
  });

  it('requires a consent version NEWER than the one currently shipped', () => {
    // Enabling must not be possible under the disclosure users already saw.
    expect(GATED_FIELDS_REQUIRE_CONSENT_VERSION).not.toBe('2.0');
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
