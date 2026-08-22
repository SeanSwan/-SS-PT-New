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
 *   DENIED by default  — conditions, supplements, sleep, stress
 *   NEVER denied       — injuries, pain, measurements (training safety: without
 *                        them Coach cannot avoid a contraindicated movement)
 *
 * These tests pin BOTH halves. The second half matters most: a future edit that
 * "tightens privacy" by adding injuries to the gated list would silently make
 * Swan Coach unsafe, and must fail here instead.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { deIdentify, TRAINING_SAFETY_PATHS, areGatedHealthFieldsEnabled } =
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
});

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) delete process.env.COACH_HEALTH_FIELDS_ENABLED;
  else process.env.COACH_HEALTH_FIELDS_ENABLED = ORIGINAL_FLAG;
});

describe('gated non-training health fields', () => {
  it('is default-OFF so the gate applies without configuration', () => {
    expect(areGatedHealthFieldsEnabled()).toBe(false);
  });

  it('withholds conditions, supplements, sleep and stress by default', () => {
    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });

    expect(deIdentified.health.conditions).toBeUndefined();
    expect(deIdentified.health.supplements).toBeUndefined();
    expect(deIdentified.health.sleep).toBeUndefined();
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
    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });

    expect(deIdentified.health.conditions).toEqual(['hypertension']);
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
  });

  it('declares the protected paths so a future edit has to argue with the list', () => {
    expect(TRAINING_SAFETY_PATHS).toContain('painAndInjuries');
    expect(TRAINING_SAFETY_PATHS).toContain('health.injuries');
    expect(TRAINING_SAFETY_PATHS).toContain('health.currentPain');
    expect(TRAINING_SAFETY_PATHS).toContain('measurements');
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
    expect(strippedFields).toContain('health.conditions');
    expect(strippedFields).toContain('health.supplements');
  });
});
