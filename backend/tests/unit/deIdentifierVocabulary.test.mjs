/**
 * The classifier's VOCABULARY — which spellings gate and which are kept.
 * Split from deIdentifierTrainingSafety.test.mjs 2026-08-25 for the 300-line cap.
 * That file owns the direction that can HURT someone (contraindications must
 * survive); this one owns the direction that leaks a lifestyle metric.
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

describe('word-classifier: known lifestyle vocabulary gates, unknown words keep', () => {
  // GLM 5.3, UX panel: the prefix+suffix shape was NARROWER than the risk the
  // owner accepted — avgSleepHours, nightlyStress, sleepNotes, supplementRegimen,
  // reportedStressLevel and typicalSleep all escaped, while the disclosure
  // promised those categories were withheld. Third shape for this one defect
  // class; this one asks a question with a bounded answer.
  const gated = [
    'avgSleepHours', 'nightlyStress', 'sleepNotes', 'supplementRegimen',
    'reportedStressLevel', 'typicalSleep', 'sleep_debt_hours', 'supplements',
  ];
  const kept = [
    'stressFracture', 'sleepApnea', 'supplementalOxygenNeeded', 'stressEchocardiogram',
  ];

  it.each(gated)('gates %s', (key) => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] }, training: { level: 'i' }, health: { [key]: 'v' },
    }, { clientId: 501 });
    expect(deIdentified.health[key]).toBeUndefined();
  });

  it.each(kept)('keeps %s — an unknown word means clinical', (key) => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] }, training: { level: 'i' }, health: { [key]: 'v' },
    }, { clientId: 501 });
    expect(deIdentified.health[key]).toBe('v');
  });

  it('logs the ambiguous keeps so unknown vocabulary stops being invisible', () => {
    logger.warn.mockClear();
    deIdentify({
      client: { id: 501, goals: ['x'] }, training: { level: 'i' },
      health: { stressFracture: 'tibia' },
    }, { clientId: 501 });
    const warned = logger.warn.mock.calls.filter(
      ([m]) => typeof m === 'string' && m.includes('ambiguous health-ish key KEPT'),
    );
    expect(warned.length).toBeGreaterThan(0);
    // Field NAME only, never the value (rules 8/44/59).
    expect(JSON.stringify(warned[0][1])).not.toContain('tibia');
  });
});

describe('synonyms the first classifier could not see at all', () => {
  // GLM 5.3: keys with no sleep/stress/supplement substring bypassed the gate
  // AND were not logged — the silent no-token path was never part of the
  // accepted under-gating tradeoff.
  it.each(['bedtime', 'anxietyLevel', 'fatigueScore', 'hoursAsleep', 'timeAsleep'])('gates %s', (key) => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] }, training: { level: 'i' }, health: { [key]: 'v' },
    }, { clientId: 501 });
    expect(deIdentified.health[key]).toBeUndefined();
  });

  it('the vocabulary edit that HURTS is adding a clinical word — pinned', () => {
    // Kimi K3: unknown=KEEP is only safe while LIFESTYLE_WORDS stays lifestyle.
    // If someone adds "fracture" thinking of recovery notes, stressFracture gates.
    for (const key of ['stressFracture', 'sleepApnea', 'supplementalOxygenNeeded', 'stressEchocardiogram']) {
      const { deIdentified } = deIdentify({
        client: { id: 501, goals: ['x'] }, training: { level: 'i' }, health: { [key]: 'v' },
      }, { clientId: 501 });
      expect(deIdentified.health[key], key).toBe('v');
    }
  });
});
