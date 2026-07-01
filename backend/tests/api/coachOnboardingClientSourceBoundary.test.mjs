import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readBackendFile(path) {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}

const classifierSource = readBackendFile('services/ai/coachActionProposalClassifier.mjs');
const dispatcherSource = readBackendFile('services/ai/dispatchers/clientOnboardingProposalDispatcher.mjs');
const approvalSource = readBackendFile('services/coachClientOnboardingApprovalService.mjs');
const approvalNormalizerSource = readBackendFile('services/coachClientOnboardingDraftNormalizer.mjs');
const directOnboardRouteSource = readBackendFile('routes/clientOnboardRoutes.mjs');
const publicRegistrationSource = readBackendFile('controllers/authController.mjs');

describe('Swan Coach onboarding clientSource policy boundary', () => {
  it('keeps Coach action classification on the central client source policy', () => {
    expect(classifierSource).toContain("import { CLIENT_SOURCES, parseClientSource } from '../sessionBillingPolicy.mjs';");
    expect(classifierSource).not.toContain("const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external'])");
  });

  it('keeps Coach onboarding dispatchers on the central paid/free-tracking source policy', () => {
    expect(dispatcherSource).toContain('CLIENT_SOURCES,');
    expect(dispatcherSource).toContain('NON_DEDUCTING_CLIENT_SOURCES,');
    expect(dispatcherSource).toContain("from '../../sessionBillingPolicy.mjs';");
    expect(dispatcherSource).not.toContain("const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external'])");
    expect(dispatcherSource).not.toContain("const EXTERNAL_CLIENT_SOURCES = new Set(['move_fitness', 'external'])");
  });

  it('keeps approved Coach onboarding drafts on the central source allowlist', () => {
    expect(approvalNormalizerSource).toContain('CLIENT_SOURCES,');
    expect(approvalNormalizerSource).toContain('parseClientSource,');
    expect(approvalNormalizerSource).toContain("from './sessionBillingPolicy.mjs';");
    expect(approvalSource).toContain('isNonDeductingClientSource');
    expect(approvalSource).toContain("from './sessionBillingPolicy.mjs';");
    expect(approvalNormalizerSource).not.toContain("const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external'])");
    expect(approvalSource).not.toContain("const CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external'])");
  });

  it('keeps the direct client onboarding route on the same central source allowlist', () => {
    expect(directOnboardRouteSource).toContain('CLIENT_SOURCES,');
    expect(directOnboardRouteSource).toContain('NON_DEDUCTING_CLIENT_SOURCES,');
    expect(directOnboardRouteSource).toContain("from '../services/sessionBillingPolicy.mjs';");
    expect(directOnboardRouteSource).not.toContain("const ALLOWED_CLIENT_ONBOARD_SOURCES = new Set(['swanstudios', 'move_fitness', 'external'])");
  });

  it('keeps public client registration on the central source allowlist', () => {
    expect(publicRegistrationSource).toContain('CLIENT_SOURCES,');
    expect(publicRegistrationSource).toContain('parseClientSource,');
    expect(publicRegistrationSource).toContain("from '../services/sessionBillingPolicy.mjs';");
    expect(publicRegistrationSource).not.toContain("const PUBLIC_REGISTRATION_CLIENT_SOURCES = new Set(['swanstudios', 'move_fitness', 'external'])");
  });
});
