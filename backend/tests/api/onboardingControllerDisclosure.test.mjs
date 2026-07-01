import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/onboardingController.mjs'), 'utf8');

describe('onboarding controller disclosure and ID contracts', () => {
  it('does not expose raw exception details in onboarding 500 responses', () => {
    expect(controllerSource).not.toContain('details: error.message');
    expect(controllerSource).toContain("code: 'internal_error'");
  });

  it('uses reset-link handoff instead of returning generated passwords for created onboarding clients', () => {
    expect(controllerSource).toContain('buildOnboardingResetLinkHandoff(user)');
    expect(controllerSource).toContain('...resetHandoff');
    expect(controllerSource).not.toContain('tempPassword:');
    expect(controllerSource).not.toContain('Temporary Password');
    const handoffServiceSource = readFileSync(resolve(__dirname, '../../services/onboardingResetHandoffService.mjs'), 'utf8');
    expect(handoffServiceSource).toContain('{ includeResetUrl: true }');
    expect(handoffServiceSource).toContain("'reset_link_ready'");
  });
  it('marks legacy onboarding seed-password accounts for reset-link completion', () => {
    const createStart = controllerSource.indexOf('user = await User.create({');
    const createEnd = controllerSource.indexOf('// Now set the anonymous alias', createStart);
    expect(createStart).toBeGreaterThanOrEqual(0);
    expect(createEnd).toBeGreaterThan(createStart);
    const createBlock = controllerSource.slice(createStart, createEnd);

    expect(createBlock).toContain('password: accountSeedPassword');
    expect(createBlock).toContain('forcePasswordChange: true');
  });
  it('normalizes explicit and authenticated user IDs before onboarding data access', () => {
    expect(controllerSource).toContain('const parsePositiveUserId = (value) =>');
    expect(controllerSource).toContain('Number.isSafeInteger(parsed) && parsed > 0');
    expect(controllerSource).toContain('const userId = parsePositiveUserId(req.params.userId);');
    expect(controllerSource).toContain('const userId = parsePositiveUserId(req.user?.id);');
  });
});
