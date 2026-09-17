import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessJobAdmission,
  getWorkerPolicy,
} from './worker-resource-policy.mjs';

test('exposes conservative, balanced, full, and sleep worker policies', () => {
  assert.deepEqual(getWorkerPolicy('cool'), {
    mode: 'cool',
    cpuBudgetPercent: 20,
    gpuProfile: 'conservative',
    maxHeavyJobs: 0,
    maxBrowserSessions: 0,
    requiresFreshTelemetry: false,
    fullModeExpires: false,
  });
  assert.equal(getWorkerPolicy('balanced').maxHeavyJobs, 1);
  assert.equal(getWorkerPolicy('full').fullModeExpires, true);
  assert.equal(getWorkerPolicy('sleep').maxHeavyJobs, 0);
});

test('cool mode admits control-plane work but rejects heavy work', () => {
  assert.equal(assessJobAdmission({ mode: 'cool', kind: 'health' }).allowed, true);
  assert.equal(assessJobAdmission({ mode: 'cool', kind: 'video-render' }).allowed, false);
});

test('balanced mode admits one heavy job only with fresh telemetry', () => {
  const request = { mode: 'balanced', kind: 'video-render', telemetryFresh: true };
  assert.equal(assessJobAdmission(request).allowed, true);
  assert.equal(assessJobAdmission({ ...request, heavyJobsRunning: 1 }).allowed, false);
  assert.equal(assessJobAdmission({ ...request, telemetryFresh: false }).allowed, false);
});

test('full mode requires an explicit future expiry and never authorizes external sends', () => {
  const now = Date.parse('2026-09-06T09:00:00Z');
  const base = {
    mode: 'full',
    kind: 'video-render',
    telemetryFresh: true,
    now,
    expiresAt: '2026-09-06T11:00:00Z',
  };
  assert.equal(assessJobAdmission(base).allowed, true);
  assert.equal(assessJobAdmission({ ...base, expiresAt: null }).reason, 'full_mode_requires_expiry');
  assert.equal(assessJobAdmission({ ...base, kind: 'external-send' }).reason, 'external_action_requires_approval');
});

test('sleep mode rejects work and unknown modes fail closed', () => {
  assert.equal(assessJobAdmission({ mode: 'sleep', kind: 'health' }).reason, 'worker_sleeping');
  assert.equal(assessJobAdmission({ mode: 'unknown', kind: 'health' }).reason, 'unknown_mode');
});
