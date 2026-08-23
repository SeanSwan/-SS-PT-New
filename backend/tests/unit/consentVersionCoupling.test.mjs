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

  it('a superseded version is still ACCEPTED as a record but is not CURRENT', () => {
    // Historical grants remain readable; they simply no longer authorize.
    expect(VALID_CONSENT_VERSIONS).toContain('1.0');
    expect(isConsentVersionCurrent('1.0')).toBe(false);
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

  it('enabling gated health fields requires a version NEWER than the one shipping', async () => {
    // Cross-file invariant: the health-field escape hatch must not be openable
    // under the disclosure users have already seen.
    const { GATED_FIELDS_REQUIRE_CONSENT_VERSION } =
      await import('../../services/deIdentificationService.mjs');
    expect(GATED_FIELDS_REQUIRE_CONSENT_VERSION).not.toBe(CURRENT_CONSENT_VERSION);
  });
});
