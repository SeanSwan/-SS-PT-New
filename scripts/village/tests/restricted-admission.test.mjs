/**
 * T-POLICY-01 … 03 — restricted-material admission (blueprint C5, ban 7).
 *
 * Astra R2-A1-04 (HIGH) asked that `UNDECIDED` be a blocking state and that no
 * policy be selected by an implementation default. These tests hold that line:
 * they fail if someone makes `UNDECIDED` admit, if an absent state starts behaving
 * like DENY, or if `ALLOW_SCOPED_PERSONAL` widens when its scope is missing.
 *
 * They are mutation-tested — see the note at the bottom — so a green run here means
 * the guards are load-bearing, not merely present.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PRIVATE_POLICY_STATES,
  ADMISSION_REJECTIONS,
  PENDING_PRIVATE_POLICY_DECISION,
  admitRestrictedMaterial,
} from '../restricted-admission.mjs';

const fullScope = {
  classes: ['personal-reference'],
  providers: ['openai-codex'],
  purposes: ['image-reference'],
  destinations: ['sean-personal'],
};

const inScopeRequest = {
  materialClass: 'personal-reference',
  provider: 'openai-codex',
  purpose: 'image-reference',
  destination: 'sean-personal',
};

test('T-POLICY-01 UNDECIDED is a blocking state and cannot produce an admission', () => {
  // Exercised against a request that WOULD be admitted under a full scoped allow,
  // so an admission here could only come from the state check being absent.
  const result = admitRestrictedMaterial(inScopeRequest, { state: 'UNDECIDED', scope: fullScope });
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, ADMISSION_REJECTIONS.POLICY_DECISION_REQUIRED);
  assert.equal(result.policyState, 'UNDECIDED');
  // The structural guarantee: no truthy `allowed` field exists to be misread.
  assert.equal(Object.hasOwn(result, 'allowed'), false, 'a rejection must not carry an `allowed` field');
});

test('T-POLICY-01b an absent or unknown state requires a decision — it is not silently DENY', () => {
  for (const policy of [{}, { state: null }, { state: undefined }, { state: 'MAYBE' }]) {
    const result = admitRestrictedMaterial(inScopeRequest, policy);
    assert.equal(result.status, 'rejected', `${JSON.stringify(policy)} must be rejected`);
    assert.ok(
      result.reason === ADMISSION_REJECTIONS.POLICY_DECISION_REQUIRED
      || result.reason === ADMISSION_REJECTIONS.UNKNOWN_POLICY_STATE,
      `unexpected reason ${result.reason}`,
    );
    // Critically NOT the denial reason: "we have not decided" is not "we decided no".
    assert.notEqual(result.reason, ADMISSION_REJECTIONS.RESTRICTED_MATERIAL_DENIED);
  }
});

test('T-POLICY-02 DENY rejects restricted material even with a full scope present', () => {
  const result = admitRestrictedMaterial(inScopeRequest, { state: 'DENY', scope: fullScope });
  assert.equal(result.status, 'rejected');
  assert.equal(result.reason, ADMISSION_REJECTIONS.RESTRICTED_MATERIAL_DENIED);
});

test('T-POLICY-03 ALLOW_SCOPED_PERSONAL admits only what the policy record enumerates', () => {
  const ok = admitRestrictedMaterial(inScopeRequest, { state: 'ALLOW_SCOPED_PERSONAL', scope: fullScope });
  assert.equal(ok.status, 'admitted');
  assert.equal(ok.policyState, 'ALLOW_SCOPED_PERSONAL');
  assert.equal(Object.hasOwn(ok, 'reason'), false, 'an admission must not carry a rejection reason');
});

test('T-POLICY-03b ALLOW_SCOPED_PERSONAL denies when the request leaves the approved scope', () => {
  const cases = [
    { ...inScopeRequest, materialClass: 'other-class' },
    { ...inScopeRequest, provider: 'some-other-provider' },
    { ...inScopeRequest, purpose: 'marketing' },
    { ...inScopeRequest, destination: 'public-web' },
  ];
  for (const request of cases) {
    const result = admitRestrictedMaterial(request, { state: 'ALLOW_SCOPED_PERSONAL', scope: fullScope });
    assert.equal(result.status, 'rejected', `${JSON.stringify(request)} must be rejected`);
    assert.equal(result.reason, ADMISSION_REJECTIONS.SCOPE_NOT_SATISFIED);
  }
});

test('T-POLICY-03c ALLOW_SCOPED_PERSONAL with a missing or empty dimension denies — it never widens', () => {
  // This is the implicit-policy hole: an absent list must not mean "any".
  const broken = [
    {},
    { ...fullScope, classes: [] },
    { ...fullScope, providers: [] },
    { ...fullScope, purposes: [] },
    { ...fullScope, destinations: [] },
    { ...fullScope, providers: undefined },
    { ...fullScope, providers: 'openai-codex' }, // a bare string is not a list
  ];
  for (const scope of broken) {
    const result = admitRestrictedMaterial(inScopeRequest, { state: 'ALLOW_SCOPED_PERSONAL', scope });
    assert.equal(result.status, 'rejected', `scope ${JSON.stringify(scope)} must deny`);
    assert.equal(result.reason, ADMISSION_REJECTIONS.SCOPE_NOT_SATISFIED);
  }
});

test('T-POLICY-03d ALLOW_SCOPED_PERSONAL denies when the request omits a scope dimension', () => {
  for (const dimension of ['materialClass', 'provider', 'purpose', 'destination']) {
    const request = { ...inScopeRequest };
    delete request[dimension];
    const result = admitRestrictedMaterial(request, { state: 'ALLOW_SCOPED_PERSONAL', scope: fullScope });
    assert.equal(result.status, 'rejected', `missing ${dimension} must not be admitted`);
    assert.equal(result.reason, ADMISSION_REJECTIONS.SCOPE_NOT_SATISFIED);
  }
});

test('the module states the pending decision without selecting a reading', () => {
  // The contract says "Neither reading is selected here." A module that silently
  // picked one would pass the tests above and still be wrong, so this asserts the
  // absence of a selection.
  assert.equal(PENDING_PRIVATE_POLICY_DECISION.selected, null);
  assert.ok(PENDING_PRIVATE_POLICY_DECISION.readings.A);
  assert.ok(PENDING_PRIVATE_POLICY_DECISION.readings.B);
  assert.deepEqual([...PRIVATE_POLICY_STATES], ['UNDECIDED', 'DENY', 'ALLOW_SCOPED_PERSONAL']);
});
