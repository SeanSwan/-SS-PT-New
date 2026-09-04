/**
 * SCU S5b — provider privacy, capability and budget gate tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCoachProviderPolicy,
  guardCoachProviderRequest,
} from '../../services/ai/coachProviderBoundary.mjs';

test('normalizes a de-identified provider policy without trusting model input', () => {
  assert.deepEqual(normalizeCoachProviderPolicy({
    privacyClass: 'deidentified',
    allowedProviders: ['OpenAI', 'gemini', 'openai'],
    budgetMs: 1200,
    capability: 'coach.read',
  }), {
    privacyClass: 'deidentified',
    allowedProviders: ['openai', 'gemini'],
    budgetMs: 1200,
    capability: 'coach.read',
  });
});

test('blocks raw-client policy and exhausted budget before provider egress', () => {
  const policy = normalizeCoachProviderPolicy({ privacyClass: 'raw-client', budgetMs: 0 });
  assert.deepEqual(guardCoachProviderRequest({ policy, providerName: 'openai' }), {
    allowed: false,
    reasonCode: 'PRIVACY_POLICY_BLOCKED',
  });
  const budget = normalizeCoachProviderPolicy({ privacyClass: 'deidentified', budgetMs: 0 });
  assert.deepEqual(guardCoachProviderRequest({ policy: budget, providerName: 'openai' }), {
    allowed: false,
    reasonCode: 'PROVIDER_BUDGET_EXHAUSTED',
  });
});

test('requires an explicitly allowed provider when the policy supplies an allow-list', () => {
  const policy = normalizeCoachProviderPolicy({
    privacyClass: 'deidentified',
    allowedProviders: ['gemini'],
    budgetMs: 100,
  });
  assert.deepEqual(guardCoachProviderRequest({ policy, providerName: 'openai' }), {
    allowed: false,
    reasonCode: 'PROVIDER_NOT_ALLOWED',
  });
  assert.deepEqual(guardCoachProviderRequest({ policy, providerName: 'gemini' }), { allowed: true });
});
