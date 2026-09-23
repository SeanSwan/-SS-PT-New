
---

> **CONTINUED FROM `09-tests-a.md`** (T0, and T1 through the P-series fixture tests). This file begins mid-T1 at the budget-fixture helper. Split on 2026-09-22 for Rule 4 (300-line cap).

const amount = (calls, tokens = 0, usdMicros = 0) =>
  ({ calls, tokens, usdMicros });

test('B01 preserves one final call when admitting a round', () => {
  const budget = {
    limits: amount(12, 100000, 0),
    charged: amount(8, 1000, 0),
  };
  assert.equal(
    planRound(budget, amount(4, 1000), amount(1, 1000)).admit,
    false,
  );
});

test('B02 counts final reservation once', () => {
  const budget = {
    limits: amount(9, 3000, 0),
    charged: amount(4, 1000, 0),
  };
  assert.equal(
    planRound(budget, amount(4, 1000), amount(1, 1000)).admit,
    true,
  );
});

test('B03 refuses token or monetary overflow', () => {
  const base = {
    limits: amount(9, 3000, 100),
    charged: amount(4, 1000, 0),
  };
  assert.equal(
    planRound(base, amount(4, 2000), amount(1, 1)).admit,
    false,
  );
  assert.equal(
    planRound(base, amount(4, 1000, 100), amount(1, 1000, 1)).admit,
    false,
  );
});

test('R01 missing selected reviewer blocks adjudication', () => {
  const state = roundState();
  state.reviews.pop();
  assert.equal(decideNext(state).kind, 'block');
});

test('R02 complete identical positions can converge', () => {
  assert.deepEqual(decideNext(roundState()), {
    kind: 'adjudicate',
    reason: 'CONVERGED',
  });
});

test('R03 a new finding prevents convergence', () => {
  const state = roundState();
  state.newFindingIds = ['b:r2:f2'];
  state.ledgerIds.push('b:r2:f2');
  assert.equal(decideNext(state).kind, 'review');
});

test('R04 phrase text cannot override structured disagreement', () => {
  const state = roundState();
  state.reviews[0].stop = 'continue';
  state.reviews[0].comment = 'CONSENSUS REACHED';
  state.reviews[1].positions[0].stance = 'dismiss';
  assert.equal(decideNext(state).kind, 'review');
});

test('R05 round cap leads only to reserved adjudication', () => {
  const state = roundState();
  state.round = 7;
  state.maxRounds = 7;
  state.reviews[0].stop = 'continue';
  state.reviews[1].positions[0].stance = 'dismiss';
  assert.deepEqual(decideNext(state), {
    kind: 'adjudicate',
    reason: 'ROUND_LIMIT',
  });
});

test('D01 missing finding resolution cannot approve', () => {
  assert.throws(() =>
    deriveVerdict({ resolutions: [], newFindings: [] },
      ['a:r1:f1']));
});

test('D02 confirmed or unresolved findings require revision', () => {
  for (const disposition of ['confirmed', 'unresolved']) {
    assert.equal(deriveVerdict({
      resolutions: [{
        findingId: 'a:r1:f1',
        disposition,
        duplicateOf: null,
      }],
      newFindings: [],
    }, ['a:r1:f1']), 'REVISE');
  }
});

test('D03 a newly introduced adjudicator finding requires revision', () => {
  assert.equal(deriveVerdict({
    resolutions: [],
    newFindings: [{ localId: 'f1' }],
  }, []), 'REVISE');
});

test('T01 a changed final body causes zero sends', async () => {
  let sends = 0;
  await assert.rejects(() => sendFrozen({
    body: '{"message":"changed"}',
    expectedSha256: sha('{"message":"approved"}'),
    send: async () => { sends += 1; },
  }));
  assert.equal(sends, 0);
});

test('T02 the approved final body is sent exactly once', async () => {
  const body = '{"message":"synthetic review"}';
  const seen = [];
  await sendFrozen({
    body,
    expectedSha256: sha(body),
    send: async value => { seen.push(value); return {}; },
  });
  assert.deepEqual(seen, [body]);
});
```

The fixture intentionally reuses one excerpt across areas to test schema mechanics. It is **not** a meaningful full-spectrum review or evidence of semantic coverage.

**T2 — `scripts/village/tests/engine.acceptance.test.mjs`**

The store contract here is:

```text
read(requestId) -> attempt record or null
write(requestId, record) -> durable completion before resolving
```

The test store is in memory. Production durability requires the additional tests below.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { executeStage } from '../engine.mjs';

function memoryStore(seed = []) {
  const records = new Map(seed);
  return {
    records,
    async read(id) { return records.get(id) ?? null; },
    async write(id, value) { records.set(id, value); },
  };
}

const stage = {
  stageId: 'r1',
  requestIds: ['r1-a', 'r1-b'],
};

test('E01 records STARTED before invoking dispatch', async () => {
  const store = memoryStore();
  const result = await executeStage(stage, {
    store,
    dispatch: async id => {
      assert.equal((await store.read(id)).status, 'STARTED');
      return { status: 'COMPLETE', receiptId: `receipt-${id}` };
    },
  });
  assert.equal(result.status, 'COMPLETE');
});

test('E02 ambiguous execution stops the stage without retry', async () => {
  const store = memoryStore();
  const attempts = [];
  const result = await executeStage(stage, {
    store,
    dispatch: async id => {
      attempts.push(id);
      throw new Error('synthetic ambiguous transport failure');
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(attempts, ['r1-a']);
  assert.equal((await store.read('r1-a')).status, 'AMBIGUOUS');
});

test('E03 an interrupted STARTED attempt is never resent', async () => {
  const store = memoryStore([
    ['r1-a', { status: 'STARTED' }],
  ]);
  let sends = 0;
  const result = await executeStage(stage, {
    store,
    dispatch: async () => {
      sends += 1;
      return { status: 'COMPLETE' };
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(sends, 0);
});
```

**T3 — Exact local commands**

S1 and policy-contract checks:

```text
node --test scripts/village/tests/contracts.acceptance.test.mjs
```

S2 engine checks:

```text
node --test scripts/village/tests/engine.acceptance.test.mjs
```

Combined contract verification:

```text
node --test scripts/village/tests/contracts.acceptance.test.mjs scripts/village/tests/engine.acceptance.test.mjs
```

These are proposed commands for the implementation checkout. No passing result is asserted.

**T4 — Required integration tests before live adoption**

These named tests are implementation requirements whose real fixtures cannot be supplied from the packet. They must be implemented against the inspected callers; they are **NOT WRITTEN / NOT RUN**, and block the corresponding slices.

| Proposed test file | Required named cases | What they establish |
|---|---|---|
| `scripts/village/tests/journal.integration.test.mjs` | `crash after STARTED never resends`; `second process cannot own run`; `journal write failure prevents dispatch` | Real process and filesystem behavior. |
| `scripts/village/tests/subscription.integration.test.mjs` | `unapproved repository context is unavailable`; `served identity is recorded`; `unknown billing blocks before invocation`; `expired route proof blocks` | Actual subscription adapter boundary. |
| `scripts/village/tests/openrouter.integration.test.mjs` | `no approval means zero socket calls`; `final redacted body matches approved digest`; `redirect is refused`; `input and output spend are reserved` | Actual guarded HTTP caller behavior. |
| `scripts/village/tests/council.integration.test.mjs` | `existing tool response shape is preserved`; `diagnostics never contaminate JSON-RPC stdout`; `Kimi request is rejected` | Real Council compatibility. |
| `scripts/village/tests/media.integration.test.mjs` | `all six listed locations use admitted transport`; `encoded media bytes are preserved`; `unknown attachment provenance blocks` | Actual image-request behavior. |
| `scripts/village/tests/migration.integration.test.mjs` | `each discovered legacy caller reaches the shared engine or explicit retirement error`; `legacy commands cannot bypass profile approval` | Actual migration completeness. |

Exact commands, once those files exist:

```text
node --test scripts/village/tests/journal.integration.test.mjs
node --test scripts/village/tests/subscription.integration.test.mjs
node --test scripts/village/tests/openrouter.integration.test.mjs
node --test scripts/village/tests/council.integration.test.mjs
node --test scripts/village/tests/media.integration.test.mjs
node --test scripts/village/tests/migration.integration.test.mjs
```

Existing redactor tests remain required regression inputs. Their basenames are supplied in the packet, but their locations and executable commands are not. **Existing-suite command: N/A — scope-bounded consult, no repository test surface in scope.** The builder must resolve those exact paths in S0 rather than invent them.

**T5 — Verification discipline**

- Observe intended behavioral RED failures before implementation where feasible.
- Use only synthetic artifacts and controlled test transports.
- Do not load a production database for fixtures.
- Mutate each critical control once: remove approval checking, remove final reservation, remove ledger completeness, and remove attempt-before-send ordering. The corresponding test must fail.
- Do not claim transport protection from tests that stop at `readForEgress()`.
- A live provider invocation is separate evidence with its own route, content, budget, and authorization receipt.
- Keep all unperformed integration tests visible in the readiness receipt.
