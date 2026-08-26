/**
 * The frontend and backend consent versions MUST move together
 * ============================================================
 * GLM 5.3, post-ship panel: the code demanded that
 * frontend/src/content/aiConsentCopy.ts and the backend constant "MUST be
 * bumped together" — in a COMMENT, with no test enforcing it. The exact drift
 * it guards against was one forgetful PR away, and this workstream has already
 * produced four defects of precisely that shape.
 *
 * This is the control the comment was standing in for.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CURRENT_CONSENT_VERSION,
  VALID_CONSENT_VERSIONS,
  isConsentVersionCurrent,
} from '../../config/consentVersion.mjs';

const frontendCopy = readFileSync(
  resolve(process.cwd(), '../frontend/src/content/aiConsentCopy.ts'),
  'utf8',
);

describe('consent version coupling', () => {
  it('frontend AI_CONSENT_VERSION equals the backend CURRENT_CONSENT_VERSION', () => {
    const m = frontendCopy.match(/AI_CONSENT_VERSION\s*=\s*'([^']+)'/);
    expect(m, 'AI_CONSENT_VERSION not found in aiConsentCopy.ts').toBeTruthy();
    expect(m[1]).toBe(CURRENT_CONSENT_VERSION);
  });

  it('the current version is accepted on a grant', () => {
    expect(VALID_CONSENT_VERSIONS).toContain(CURRENT_CONSENT_VERSION);
  });

  it('REJECTS a superseded version on a new grant', () => {
    // Pinning the opposite of what this test used to assert. Accepting '1.0'
    // from a cached bundle let the grant succeed, the gate 403 it, and the
    // screen re-prompt — an infinite loop. A fresh grant can only be given
    // against the disclosure actually on screen (GLM 5.3, UX panel).
    expect(VALID_CONSENT_VERSIONS).not.toContain('1.0');
    expect(isConsentVersionCurrent('1.0')).toBe(false);
  });

  it('accepts exactly one version on a new grant — the current one', () => {
    expect(VALID_CONSENT_VERSIONS).toEqual([CURRENT_CONSENT_VERSION]);
  });

  it('a missing version counts as stale, not as current', () => {
    // Fail-open here would exempt exactly the legacy records that need the prompt.
    expect(isConsentVersionCurrent(null)).toBe(false);
    expect(isConsentVersionCurrent(undefined)).toBe(false);
    expect(isConsentVersionCurrent('')).toBe(false);
  });

  it('the current version is current', () => {
    expect(isConsentVersionCurrent(CURRENT_CONSENT_VERSION)).toBe(true);
  });

  it('the health-field hatch stays CLOSED until the disclosure in force covers those fields', async () => {
    // The previous assertion here was INVERTED: it demanded REQUIRE != CURRENT
    // forever, which forbids ever legitimately enabling — and did not stop the
    // real hole, where env + REQUIRE agreed while CURRENT lagged (GLM 5.3).
    // The invariant is: the hatch opens only when the disclosure users are
    // shown (CURRENT) has been bumped to the version that names the fields.
    const { GATED_FIELDS_REQUIRE_CONSENT_VERSION, areGatedHealthFieldsEnabled } =
      await import('../../services/deIdentificationService.mjs');
    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = GATED_FIELDS_REQUIRE_CONSENT_VERSION;
    try {
      if (GATED_FIELDS_REQUIRE_CONSENT_VERSION !== CURRENT_CONSENT_VERSION) {
        // Today: 2.0 shipping, 3.0 required -> must be closed even with env set.
        expect(areGatedHealthFieldsEnabled()).toBe(false);
      } else {
        expect(areGatedHealthFieldsEnabled()).toBe(true);
      }
    } finally {
      delete process.env.COACH_HEALTH_FIELDS_ENABLED;
      delete process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION;
    }
  });
});
