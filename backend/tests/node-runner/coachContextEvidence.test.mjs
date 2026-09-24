/**
 * SCU S5 — evidence-aware context contract tests.
 *
 * These tests pin the boundary between a degraded domain read and model-safe
 * planning. A missing safety domain is never represented as an empty, healthy
 * value that a downstream planner could mistake for clearance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoachEvidenceEnvelope,
  evaluateRequiredDomains,
} from '../../services/ai/contextEngine/coachContextEvidence.mjs';

const QUALITY = [
  { domain: 'profile', status: 'ok' },
  { domain: 'pain', status: 'degraded' },
  { domain: 'workouts', status: 'ok' },
];

test('preserves domain quality with explicit source and freshness fields', () => {
  const evidence = buildCoachEvidenceEnvelope({
    dataQuality: QUALITY,
    accessVia: 'assignment',
    generatedAt: '2026-09-04T23:00:00.000Z',
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.accessVia, 'assignment');
  assert.deepEqual(evidence.domains.pain, {
    status: 'degraded',
    source: 'unavailable',
    asOf: null,
  });
  assert.deepEqual(evidence.domains.profile, {
    status: 'ok',
    source: 'database',
    asOf: '2026-09-04T23:00:00.000Z',
  });
});

test('blocks a dependent plan when a required safety domain is degraded', () => {
  const evidence = buildCoachEvidenceEnvelope({ dataQuality: QUALITY });
  assert.deepEqual(evaluateRequiredDomains({ evidence, requiredDomains: ['profile', 'pain'] }), {
    allowed: false,
    blockedDomains: ['pain'],
    reasonCode: 'REQUIRED_DOMAIN_UNAVAILABLE',
  });
});

test('allows a dependent plan only when every required domain is healthy', () => {
  const evidence = buildCoachEvidenceEnvelope({
    dataQuality: QUALITY.map((entry) => ({ ...entry, status: 'ok' })),
  });
  assert.deepEqual(evaluateRequiredDomains({ evidence, requiredDomains: ['profile', 'pain'] }), {
    allowed: true,
    blockedDomains: [],
    reasonCode: null,
  });
});

test('unknown or missing required domains fail closed', () => {
  const evidence = buildCoachEvidenceEnvelope({ dataQuality: [{ domain: 'profile', status: 'ok' }] });
  assert.deepEqual(evaluateRequiredDomains({ evidence, requiredDomains: ['pain'] }), {
    allowed: false,
    blockedDomains: ['pain'],
    reasonCode: 'REQUIRED_DOMAIN_UNAVAILABLE',
  });
});
