/**
 * coachClientOnboardingApprovalService.test.mjs
 * =============================================
 * Source guards for deterministic Coach-approved client onboarding.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeCoachOnboardingDraft } from '../../services/coachClientOnboardingApprovalService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/coachClientOnboardingApprovalService.mjs'),
  'utf8',
);

describe('coachClientOnboardingApprovalService', () => {
  it('uses app models and claim-token hashing instead of raw assignment SQL', () => {
    expect(SERVICE_SRC).toMatch(/getUser/);
    expect(SERVICE_SRC).toMatch(/getClientTrainerAssignment/);
    expect(SERVICE_SRC).toMatch(/generateClaimToken/);
    expect(SERVICE_SRC).not.toMatch(/INSERT INTO client_trainer_assignments/i);
  });

  it('does not expose invite secrets or temporary passwords in returned approval data', () => {
    expect(SERVICE_SRC).not.toMatch(/claimUrl/);
    expect(SERVICE_SRC).not.toMatch(/claimCode/);
    expect(SERVICE_SRC).not.toMatch(/plainToken/);
    expect(SERVICE_SRC).not.toMatch(/temporaryPassword/);
  });

  it('requires human-reviewable identity fields before client creation', () => {
    expect(SERVICE_SRC).toMatch(/firstName/);
    expect(SERVICE_SRC).toMatch(/lastName/);
    expect(SERVICE_SRC).toMatch(/ONBOARDING_REQUIRED_FIELDS_MISSING/);
  });

  it('requires client source before deterministic client creation', () => {
    expect(() => normalizeCoachOnboardingDraft({
      payload: { firstName: 'Marcus', lastName: 'Lee' },
    })).toThrow(/client source/i);
  });

  it('does not depend on stale ClientProgress fields during client creation', () => {
    expect(SERVICE_SRC).toMatch(/to_regclass\('client_progress'\)/);
    expect(SERVICE_SRC).toMatch(/createClientProgressIfAvailable/);
    expect(SERVICE_SRC).not.toMatch(/currentPhase/);
    expect(SERVICE_SRC).not.toMatch(/currentWeight/);
    expect(SERVICE_SRC).not.toMatch(/bodyFatPercentage/);
  });
});
