import test from 'node:test';
import assert from 'node:assert/strict';

import { assertWorkerAdmission, evaluateWorkerAdmission } from './worker-admission.mjs';

const assess = (input) => input.mode === 'balanced' && input.telemetryFresh
  ? { allowed: true, reason: 'admitted', kind: input.kind }
  : { allowed: false, reason: input.mode === 'sleep' ? 'worker_sleeping' : 'telemetry_stale', kind: input.kind };

test('maps the existing workflow id to the policy job kind', () => {
  assert.deepEqual(evaluateWorkerAdmission({
    job: { workflowId: 'generate:video' }, assess,
    state: { mode: 'balanced', telemetryFresh: true },
  }), { allowed: true, reason: 'admitted', kind: 'generate' });
});

test('denied admission is observable before a handler can be called', () => {
  let handlerCalls = 0;
  assert.throws(() => {
    assertWorkerAdmission({
      job: { workflowId: 'generate:video' }, assess,
      state: { mode: 'sleep', telemetryFresh: false },
    });
    handlerCalls += 1;
  }, /Worker admission denied: worker_sleeping/);
  assert.equal(handlerCalls, 0);
});

test('invalid context fails closed', () => {
  assert.equal(evaluateWorkerAdmission({}).reason, 'invalid_admission_context');
});
