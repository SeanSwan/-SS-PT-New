**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Supersedes the r2 text only in this candidate. Hash-verified originals remain in the review preservation set.

**Execution status**

All product tests below are **planned, not installed or executed by this document repair (NOT RUN)**. A structural documentation check does not execute these cases. Commands target the specified files after implementation. A missing runner, import, fixture, or database is BLOCKED setup, never behavioral RED.

**Frontend command**

From `frontend`, use the installed runner without downloading a package:

```powershell
node ./node_modules/vitest/vitest.mjs run src/features/trainer-workspace/tests --reporter=verbose
```

**Browser command**

From repository root:

```powershell
node frontend/node_modules/@playwright/test/cli.js test --config frontend/e2e/trainer-workspace/playwright.config.ts
```

Runner binding (Claude review, 2026-09-24): Playwright specs and their config live under `frontend/e2e/trainer-workspace/`, the repo's Playwright `testDir`. Never place a `*.spec.ts` under `frontend/src/`. The frontend Vitest include is `src/**/*.{test,spec}.{js,jsx,ts,tsx}`, so a Playwright spec there would be collected and fail `npx vitest run`.

The proposed browser configuration starts only an isolated fixture app or an explicitly designated test stack. It must not default to production-backed local services.

**Backend commands**

Runner binding (Claude review, 2026-09-24): backend tests are Vitest suites run by the repo's own runners, never `node --test`. Unit suites go in `backend/tests/unit/trainerWorkspace/`, which `cd backend && npm test` collects. Database suites (`*.integration.test.mjs`) go in `backend/tests/integration/trainerWorkspace/`. That folder is excluded from `npm test`, so each file must be added to the explicit `include` list in `backend/vitest.integration.config.mjs`. A `node:test` file under `backend/tests/` fails `npm test` with "No test suite found". The S0 suites shipped that way and had to be converted.

From `backend`:

```powershell
npx vitest run tests/unit/trainerWorkspace/money.test.mjs tests/unit/trainerWorkspace/healthNormalization.test.mjs tests/unit/trainerWorkspace/healthIdentity.test.mjs
npx vitest run --config vitest.integration.config.mjs tests/integration/trainerWorkspace/healthImports.integration.test.mjs tests/integration/trainerWorkspace/videoAssessments.integration.test.mjs tests/integration/trainerWorkspace/earningsLedger.integration.test.mjs
```

Database tests accept only `WORKSPACE_TEST_DATABASE_URL`, verify a disposable-test marker and database allowlist, and refuse fallback to `DATABASE_URL`.

**Named cases**

| File under `F/tests/` | Named cases and proof | Slice / requirement |
|---|---|---|
| `frontend/src/components/VideoChat/WearableDataPanel.test.tsx` (existing seam, outside F/tests) | `provider clicks cause zero POSTs`; `GET retry is observed`; `unverified legacy numbers remain hidden`; baseline button clicks prove the POST observer detects writes | S0 / R10 |
| `quality.test.ts` | `reduced motion prevents enhancement`; `idle frames cannot promote`; `interaction budget promotes`; `slow interaction downgrades`; `downgrade is sticky`; `video suspends decoration` | S2 / R3 |
| `effectsLifecycle.test.tsx` | `only active card owns pointer work`; `unmount removes listeners`; `touch receives static emphasis`; `focus remains visible` | S2 / R3 |
| `navigation.test.tsx` | `every route declares a disposition`; `primary links mount expected heading`; `contextual route has tested parent link`; `unauthorized destination denies access` | S2 / R4 |
| `themeParity.test.tsx` | `every consumed alias resolves`; `switching palette changes computed colors`; `focus contrast passes`; `undefined-token control fails` | S2 / R1 |
| `home.test.tsx` | `next action uses actual session`; `failed metric is not zero`; `partial failure preserves valid activity`; `workout action preserves selected client` | S3 / R1 |
| `clients.test.tsx` | `trainer receives assigned scope`; `admin team tab is distinct`; `card geometry is shared`; `hidden capability is server-denied when invoked directly` | S3 / R2 |
| `equipment.test.tsx` | `profile selection loads its inventory`; `missing field says not recorded`; `save reloads authoritative result`; `conflict preserves edits`; `unauthorized profile cannot be read` | S4 / R5 |
| `sprint.test.tsx` | `explains bootcamp planning`; `renders actual week and deload data`; `lost SSE reconciles before retry`; `double click starts one job`; `failed generation does not report completion` | S5 / R6 |
| `video.test.tsx` | `no capture before explicit preview`; `join requires consent`; `denied camera has recovery`; `leave stops every local track`; `client view lacks private notes` | S6 / R7 |
| `intake.test.tsx` | `admin mounts workspace directly`; `paid client is self-scoped`; `expired plan retains privacy controls`; `import requires review`; `Coach action requires separate approval` | S7 / R8 |
| `earnings.test.tsx` | `pending policy omits totals`; `currency formatting preserves minor units`; `unreconciled payout is not paid`; `another trainer statement is denied` | S8 / R9 |
| `frontend/e2e/trainer-workspace/workspace.visual.spec.ts` (Playwright; not under F/tests) | `all states fit viewport`; `keyboard reaches every action`; `drawer returns focus`; `mobile has no clipped controls`; `static mode retains hierarchy` | S9 / R1,R3 |
| `frontend/e2e/trainer-workspace/workspace.performance.spec.ts` (Playwright; not under F/tests) | `interaction overload downgrades`; `hidden tab schedules no decoration`; `video route loads no ornamental graphics`; `ornament freezes within budget` | S9 / R3 |
| `frontend/e2e/trainer-workspace/workspace.routes.spec.ts` (Playwright; not under F/tests) | `trainer named surfaces are reachable`; `admin clients and intake mount`; `client video and intake enforce access`; `disabled feature never displays a fake room` | S9 / R4,R7,R8 |

**Backend cases**

| File (unit: `backend/tests/unit/trainerWorkspace/`; `*.integration.*`: `backend/tests/integration/trainerWorkspace/`) | Named cases and proof |
|---|---|
| `money.test.mjs` | Exact share/remainder; large integer precision; cumulative refund delta; invalid basis points rejected |
| `healthNormalization.test.mjs` | Units normalized; absent values rejected; timezone retained; external XML entities rejected; incompatible HRV kept separate |
| `healthIdentity.test.mjs` | Same record replay deduped; identical values from different devices preserved; revision preserved; cross-user provider binding denied |
| `healthImports.integration.test.mjs` | Atomic commit; repeated commit returns original job; stale preview rejected; disconnect halts future sync; consent withdrawal blocks commit; deletion invalidates summaries |
| `videoAssessments.integration.test.mjs` | Outsider denied; credential scoped; revoked participant disconnected; expired credential refused; note conflict detected; client cannot retrieve private notes |
| `earningsLedger.integration.test.mjs` | Unapproved policy blocked; replay creates one event; journal balanced; transaction rollback leaves no partial lines; refund capped at original eligible amount; payout reconciliation is idempotent |

**Executable arithmetic specification**

Target file: `backend/tests/unit/trainerWorkspace/money.test.mjs`.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeShares, refundDelta } from '../money.mjs';

test('allocates one cent once and gives platform the remainder', () => {
  assert.deepEqual(computeShares(1n, 8200), {
    trainerMinor: 1n,
    platformMinor: 0n,
  });
});

test('preserves integers beyond Number safe range', () => {
  const base = 9007199254740993n;
  const result = computeShares(base, 8200);
  assert.equal(result.trainerMinor + result.platformMinor, base);
});

test('cumulative refunds do not reverse the same rounded cent twice', () => {
  assert.equal(refundDelta(1n, 5000, 0n), 1n);
  assert.equal(refundDelta(2n, 5000, 1n), 0n);
});

test('rejects invalid commercial inputs', () => {
  assert.throws(() => computeShares(-1n, 8200));
  assert.throws(() => computeShares(100n, 10001));
  assert.throws(() => computeShares(100n, 82.5));
});
```

The 8,200-basis-point fixture tests arithmetic only. It does not approve an 82% compensation policy.

**Executable quality specification**

Target file: `F/tests/quality.test.ts`.

```ts
import { describe, expect, it } from 'vitest';
import { reduceQuality, type QualityState } from '../quality';

const initial: QualityState = {
  tier: 'balanced',
  preference: 'auto',
  reducedMotion: false,
  visible: true,
  videoActive: false,
  downgradedThisSession: false,
};

describe('adaptive effects', () => {
  it('idle frames cannot promote', () => {
    const next = reduceQuality(initial, {
      type: 'sample', interactive: false, frames: 120,
      p95Ms: 12, over32MsRatio: 0, longTaskOver100Ms: false,
    });
    expect(next.tier).toBe('balanced');
  });

  it('interaction budget promotes', () => {
    const next = reduceQuality(initial, {
      type: 'sample', interactive: true, frames: 120,
      p95Ms: 18, over32MsRatio: 0.01, longTaskOver100Ms: false,
    });
    expect(next.tier).toBe('enhanced');
  });

  it('slow interaction downgrades and remains downgraded', () => {
    const degraded = reduceQuality(
      { ...initial, tier: 'enhanced' },
      { type: 'sample', interactive: true, frames: 60,
        p95Ms: 40, over32MsRatio: 0.2, longTaskOver100Ms: false },
    );
    expect(degraded.tier).toBe('balanced');
    expect(degraded.downgradedThisSession).toBe(true);

    const later = reduceQuality(degraded, {
      type: 'sample', interactive: true, frames: 120,
      p95Ms: 12, over32MsRatio: 0, longTaskOver100Ms: false,
    });
    expect(later.tier).toBe('balanced');
  });

  it('reduced motion overrides enhanced effects', () => {
    const next = reduceQuality(
      { ...initial, tier: 'enhanced' },
      { type: 'preferences', preference: 'auto', reducedMotion: true },
    );
    expect(next.tier).toBe('static');
  });
});
```

**Negative controls**

- Force `reduceQuality` to always return enhanced: reduced-motion and downgrade cases must fail.
- Disable idempotency: duplicate-import and duplicate-ledger cases must fail.
- Remove subject authorization: outsider and cross-user tests must fail.
- Replace a token binding with an undefined alias: computed-style parity must fail.
- Bypass source selection: overlapping-step fixture must fail.
- Leak `privateNotes` into the client DTO: the client-response test must fail.

**Browser measurements**

Widths: 375, 414, 768, 1,024, 1,280, 1,920; monitor checks at 2,560×1,440 and 3,840×2,160. Run reduced motion, coarse pointer, keyboard-only, and throttled CPU scenarios. Real low-power hardware and real two-device video remain separate release evidence; CPU emulation alone cannot certify GPU or media performance.

**Performance targets**

- No page overflow at 375px.
- No decorative work while hidden or during video.
- No continuously running ornamental animation.
- Pointer effects do not cause more than 10% of measured interaction frames to exceed 32ms; otherwise downgrade within the next 60 measured frames.
- Record route bundle changes and interaction latency against the actual baseline. An absolute bundle budget cannot be truthfully derived from the packet; B-06 sets it before S2 implementation.

**r3 contract regression plan — all NOT RUN**

Each case runs against the decoded API boundary and isolated transactional services, then through the mounted UI where specified. Named fixtures contain synthetic data only. Parent requirement/slice links below supplement, not replace, the original cases.

| Test ID / requirement / slice | Fixture, action, expected result | Negative control / forbidden side effect |
|---|---|---|
| T-H01 / R8 / S7 | Create a two-record import, poll its server preview, and commit using only returned hash/version; exactly those reviewed records commit. Change parser/output/consent after preview: 409, zero committed rows. | Omit the hash from the response or ignore a changed preview: test fails. |
| T-H02 / R8 / S7 | Race discard against commit, pause validator until after discard, and simulate lost 202; one serialized winner, GET reconciles one operation, cancelled import never publishes. Retry a failed operation twice: one committed batch. | Remove import version lock or allocate a new operation on retry: test detects duplicate/late rows. |
| T-H03 / R8 / S7 | Decode heart_rate/count, negative steps, reversed interval and duration exceeding interval: rejected. Certified daily windows across DST retain source semantics. | Bypass runtime decoder: malformed observation reaches storage and fails the test. |
| T-H04 / R8 / S7 | Include accepted-current, superseded, quarantined, cross-subject and erased rows; trend/Coach selection contains only eligible current rows. Revision cannot link another subject/source. | Disable eligibility filter: forbidden IDs appear and fail. History may retain explicitly labelled provenance. |
| T-H05 / R8 / S7 | Pause sync/import/approval after reading generation g; request deletion (g+1); resume all workers. None may publish, reads stay fenced until job completes, and failed deletion retains its fence. | Remove the transactional generation comparison: late data reappears and fails. Reapply tombstones on isolated restore before reads. |
| T-C01 / R8 / S7 | Render exact server Coach preview, approve returned hash, inspect adapter payload; bytes match approved content. Change an observation/consent/assignment/expiry/generation before approval or consumption: deny, no handoff. | Mutate content after approval or skip a dependency check: captured payload differs or a forbidden send occurs and fails. |
| T-C02 / R8 / S7 | Feed identity, raw export, credentials, device keys and arbitrary source labels into preview creation; reject prohibited fields. Trainer cannot mint client consent without bound delegated authority. | Bypass allowlist/consent grantor check: prohibited content or grant is observed and fails. Observer positive control proves a legitimate approved handoff is detected. |
| T-E01 / R9 / S8 | Payout has no reconciliation, stale receipt or conflicting sources: unknown status, null paid total, truthful label. A verified pending event alone yields pending. | Default unknown to pending/paid or missing amount to zero: rendering/DTO assertion fails. |
| T-E02 / R9 / S8 | Accrue under policy A, activate B, then process two concurrent partial refunds and replay one; reversal uses A, preserves cap, and posts each event once. | Use current policy or remove serialization: arithmetic/line count fails. |
| T-E03 / R9 / S8 | Page a multi-entry statement while a new event arrives; fixed asOf snapshot has no missing/duplicate entries and invariant full-period totals. Cross-trainer/currency cursor denied. | Recompute page snapshot or accept foreign cursor: inconsistent totals/scope fails. |
| T-A01 / R7,R8,R9 / S6–S8 | Replay an operation after assignment/consent revocation; deny before replay result. Reconnect video after token expiry with new operation identity and fresh authorization. | Return cached response before authorization: revoked credential/data is observed and fails. |

Place T-H01/H02/H05 in healthImports.integration.test.mjs, T-H03 in healthNormalization.test.mjs, T-H04 in healthIdentity.test.mjs, T-C01/C02 in new coachSnapshots.integration.test.mjs, T-E01/E03 in new earningsStatements.integration.test.mjs plus earnings.test.tsx, T-E02 in earningsLedger.integration.test.mjs, and T-A01 in the affected domain integration suites. New test files inherit the same disposable-database refusal guard and ≤240-line cap. Additional exact commands (from `backend`, after implementation and after adding both files to the integration config's `include`):

```powershell
npx vitest run --config vitest.integration.config.mjs tests/integration/trainerWorkspace/coachSnapshots.integration.test.mjs tests/integration/trainerWorkspace/earningsStatements.integration.test.mjs
```

These tests may not use only frontend request interception to claim authorization, transaction, consent, deletion, or reconciliation proof. B-05 must supply runnable deletion/restore resources and policy before that boundary can pass. T-C01 must assert zero external model calls during preview and snapshot creation; a fake egress observer's positive control must first demonstrate it detects a deliberately attempted send.
