**T0 — Test status and execution boundary**

The source below is an executable **proposed contract suite** against the new module interfaces. It must be saved with the implementation before execution. It was not run in this consult.

Missing-module/import errors are setup failures, not valid behavioral RED evidence.

These public signatures are part of the proposed implementation contract:

```ts
assertManifest(manifest): void
assertRoutePolicy(routeDecision, profile): void
assertCoverage(coverage, manifest): void
planRound(budget, roundAmount, finalAmount):
  { admit: boolean, reason: string | null }
decideNext(roundState):
  { kind: 'review' | 'adjudicate' | 'block', reason: string }
deriveVerdict(adjudication, ledgerIds): 'APPROVE' | 'REVISE'
sendFrozen({ body, expectedSha256, send }): Promise<unknown>
executeStage({ stageId, requestIds }, { store, dispatch }):
  Promise<{ status: 'COMPLETE' | 'BLOCKED' }>
```

`assertRoutePolicy` consumes a decision produced by the trusted route verifier. Its unit tests do not prove that verifier or its evidence.

`executeStage` consumes an already admitted, frozen stage and a dispatcher bound to its requests. Its unit tests do not replace approval or transport tests.

**T1 — `scripts/village/tests/contracts.acceptance.test.mjs`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { assertManifest } from '../manifest.mjs';
import { assertRoutePolicy } from '../policy.mjs';
import { assertCoverage } from '../coverage.mjs';
import { planRound } from '../budget.mjs';
import { decideNext } from '../rounds.mjs';
import { deriveVerdict } from '../findings.mjs';
import { sendFrozen } from '../dispatch.mjs';

const sha = value =>
  createHash('sha256').update(value, 'utf8').digest('hex');

const clone = value => structuredClone(value);

function manifest() {
  const text = 'export const syntheticValue = 1;\n';
  return {
    schemaVersion: 1,
    subject: 'Synthetic contract fixture',
    artifacts: [{
      id: 'a1',
      kind: 'source_excerpt',
      sourceClass: 'repository',
      text,
      sha256: sha(text),
    }],
    applicability: Array.from({ length: 10 }, (_, i) => ({
      area: i + 1,
      status: 'applicable',
      reason: 'Applicable to this synthetic validator fixture.',
    })),
  };
}

function coverage(packet = manifest()) {
  return packet.applicability.map(({ area }) => ({
    area,
    status: 'examined',
    method: 'static_inspection',
    observation: 'Inspected the synthetic fixture.',
    evidence: [{
      artifactId: 'a1',
      sha256: packet.artifacts[0].sha256,
      startLine: 1,
      endLine: 1,
      quote: 'export const syntheticValue = 1;',
    }],
    findingIds: [],
  }));
}

function route() {
  return {
    modelId: 'gpt-6-astra',
    modelFamily: 'astra',
    billing: 'included',
    automatedUse: 'verified',
    contextIsolation: 'verified',
    proofState: 'current',
  };
}

function roundState() {
  return {
    mode: 2,
    round: 2,
    maxRounds: 3,
    reviewerCount: 2,
    ledgerIds: ['a:r1:f1'],
    newFindingIds: [],
    budgetAdmitsRound: true,
    reviews: ['a', 'b'].map(seatId => ({
      seatId,
      valid: true,
      coverageComplete: true,
      stop: 'settled',
      positions: [{
        findingId: 'a:r1:f1',
        stance: 'uphold',
      }],
    })),
  };
}

test('P01 rejects undeclared fields and production provenance', () => {
  const extra = manifest();
  extra.clientRecords = [];
  assert.throws(() => assertManifest(extra));

  const production = manifest();
  production.artifacts[0].sourceClass = 'production';
  assert.throws(() => assertManifest(production));
});

test('P02 rejects content changed without its hash', () => {
  const packet = manifest();
  packet.artifacts[0].text += 'changed';
  assert.throws(() => assertManifest(packet));
});

test('P03 rejects Kimi regardless of billing profile', () => {
  const selected = {
    ...route(),
    modelId: 'kimi-k3',
    modelFamily: 'kimi',
  };
  for (const profile of ['subscription', 'special']) {
    assert.throws(() => assertRoutePolicy(selected, profile));
  }
});

test('P04 rejects metered routes in subscription profile', () => {
  assert.throws(() =>
    assertRoutePolicy({ ...route(), billing: 'metered' },
      'subscription'));
});

test('P05 rejects missing route or context evidence', () => {
  assert.throws(() =>
    assertRoutePolicy({ ...route(), proofState: 'unknown' },
      'subscription'));
  assert.throws(() =>
    assertRoutePolicy({ ...route(), contextIsolation: 'unknown' },
      'subscription'));
});

test('P06 requires all ten coverage areas', () => {
  const packet = manifest();
  assert.throws(() =>
    assertCoverage(coverage(packet).slice(0, 9), packet));
});

test('P07 rejects a quotation that does not match the artifact', () => {
  const packet = manifest();
  const rows = coverage(packet);
  rows[0].evidence[0].quote = 'invented evidence';
  assert.throws(() => assertCoverage(rows, packet));
});

test('P08 rejects reviewer-invented applicability', () => {
  const packet = manifest();
  const rows = coverage(packet);
  rows[0] = {
    ...rows[0],
    status: 'not_applicable',
    method: 'none',
    evidence: [],
  };
  assert.throws(() => assertCoverage(rows, packet));
});


---

> **CONTINUED in `09-tests-b.md`** (T1 budget/review/decision/transport tests, then T2–T5). Split on 2026-09-22 to satisfy Rule 4 (300-line cap); the original `09-tests.md` was 444 lines. T1 has no internal markdown headings, so the seam falls at the budget-fixture helper `const amount = ...`.
