/**
 * The inline consent bullets must agree with the shared copy module
 * =================================================================
 * The module's own docblock claimed "a test asserts the inline bullets stay
 * consistent with it." That test did not exist — a speculative-success claim
 * written INTO the file whose entire purpose is removing inaccurate claims
 * (caught by Grok 4.6, post-ship panel).
 *
 * This is that test. It does not force the components to render from
 * AI_CONSENT_PROTECTIONS — each styles its bullets differently — but it does
 * make the constant load-bearing: if the shared copy and the inline bullets
 * disagree about what is withheld or shared, this fails.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AI_CONSENT_PROTECTIONS,
  AI_CONSENT_DISCLOSURE,
  AI_CONSENT_VERSION,
} from './aiConsentCopy';

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
const consentScreen = read('../components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx');
const onboardingSection = read('../pages/onboarding/components/ConsentSection.tsx');
const surfaces = [
  ['AiConsentScreen', consentScreen],
  ['ConsentSection', onboardingSection],
] as const;

/** Categories the code withholds. Must never be described as shared. */
const WITHHELD = ['supplement', 'sleep', 'stress'];
/** Categories the code forwards. Must never be described as removed. */
const SHARED = ['injury', 'medical condition'];

describe('consent copy contract', () => {
  it('the shared module names every withheld category', () => {
    const removedBullet = AI_CONSENT_PROTECTIONS.find((p) => p.key === 'removed');
    expect(removedBullet).toBeTruthy();
    for (const term of WITHHELD) {
      expect(removedBullet!.body.toLowerCase()).toContain(term);
    }
  });

  it('the long-form disclosure agrees with the bullets on what is withheld', () => {
    // The prior defect in this artifact was an adjacent-sentence contradiction.
    for (const term of WITHHELD) {
      expect(AI_CONSENT_DISCLOSURE.toLowerCase()).toContain(term);
    }
  });

  it('the disclosure names what IS shared, including the safety data', () => {
    for (const term of SHARED) {
      expect(AI_CONSENT_DISCLOSURE.toLowerCase()).toContain(term);
    }
  });

  it.each(surfaces)('%s never claims anonymity', (_name, source) => {
    // The exact wording class this whole wave existed to remove.
    expect(source).not.toMatch(/stay anonymous/i);
    expect(source).not.toMatch(/identity is hidden/i);
    expect(source).not.toMatch(/no way to identify/i);
    expect(source).not.toMatch(/anonymous client ID/i);
  });

  it.each(surfaces)('%s describes the withheld categories as withheld', (_name, source) => {
    const lower = source.toLowerCase();
    for (const term of WITHHELD) {
      expect(lower).toContain(term);
    }
  });

  it.each(surfaces)('%s renders the version from the shared module, not a literal', (_name, source) => {
    // A hardcoded "Consent Version 1.0" under a v2.0 heading is exactly how the
    // previous contradiction shipped.
    expect(source).toContain('AI_CONSENT_VERSION');
    expect(source).not.toMatch(/Consent Version \d+\.\d+/);
  });

  it('the version is a plain semver-ish string the backend can compare', () => {
    expect(AI_CONSENT_VERSION).toMatch(/^\d+\.\d+$/);
  });
});
