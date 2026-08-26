/**
 * The health-field hatch OPENS only once the shipping disclosure covers the
 * fields — proven here by mocking CURRENT_CONSENT_VERSION to the required 3.0.
 * Companion to deIdentifierGatedHealthFields.test.mjs, which pins the closed
 * state under today's 2.0 (GLM 5.3, 2026-08-25).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../config/consentVersion.mjs', () => ({
  CURRENT_CONSENT_VERSION: '3.0',
  VALID_CONSENT_VERSIONS: ['3.0'],
  isConsentVersionCurrent: (v) => v === '3.0',
}));

const { deIdentify, areGatedHealthFieldsEnabled, GATED_FIELDS_REQUIRE_CONSENT_VERSION } =
  await import('../../services/deIdentificationService.mjs');

beforeEach(() => {
  process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
  process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = GATED_FIELDS_REQUIRE_CONSENT_VERSION;
});
afterEach(() => {
  delete process.env.COACH_HEALTH_FIELDS_ENABLED;
  delete process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION;
});

describe('hatch open path — disclosure bumped to the required version', () => {
  it('requires 3.0 (sanity: this file only proves anything if that holds)', () => {
    expect(GATED_FIELDS_REQUIRE_CONSENT_VERSION).toBe('3.0');
  });
  it('reports enabled', () => {
    expect(areGatedHealthFieldsEnabled()).toBe(true);
  });
  it('forwards the gated set', () => {
    const { deIdentified } = deIdentify({
      client: { id: 501, goals: ['x'] }, training: { level: 'i' },
      health: { supplements: ['creatine'], sleepHours: 6, stressLevel: 8 },
    }, { clientId: 501 });
    expect(deIdentified.health.supplements).toEqual(['creatine']);
    expect(deIdentified.health.sleepHours).toBe(6);
    expect(deIdentified.health.stressLevel).toBe(8);
  });
});
