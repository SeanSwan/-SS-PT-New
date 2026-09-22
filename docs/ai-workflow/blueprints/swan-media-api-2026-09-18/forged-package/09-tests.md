**Evidence status**

Existing lane suites: **recorded green at baseline; NOT RERUN here**.

New suites below: **TO IMPLEMENT / NOT RUN**. Each named case is an acceptance requirement, not a claim that the file already exists.

Tests use isolated temporary directories, synthetic credentials, explicit injected time and transports that reject unexpected egress. They must never read production DB configuration or ambient provider credentials.

**Executable read-only snapshot audit**

The following complete Node script can run from `C:/tmp/ss-media-api` without starting services or writing state. It checks three narrow source-level contradictions identified in this review. It is **not** a replacement for the behavioral suites.

```js
// snapshot-audit.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(path, `file://${process.cwd().replaceAll('\\', '/')}/`), 'utf8');

test('NET-001: configuration has no non-loopback override', () => {
  const source = read('media-api/server.mjs');
  assert.equal(
    /if\s*\(\s*!loopback\s*&&\s*!override\s*\)/.test(source),
    false,
    'Non-loopback binding is permitted by an override',
  );
});

test('CAP-001: runnable is not derived only from enablement and transport', () => {
  const source = read('media-api/routesCatalog.mjs');
  assert.equal(
    /runnable:\s*on\s*&&\s*caps\.transport\s*===\s*['"]comfyui['"]/.test(source),
    false,
    'Readiness lacks executable binding evidence',
  );
});

test('STORE-001: malformed collection is not converted to an empty store', () => {
  const source = read('media-api/store.mjs');
  assert.equal(
    /Array\.isArray\(raw\?\.\[key\]\)\s*\?\s*raw\[key\]\s*:\s*\[\]/.test(source),
    false,
    'Valid JSON with an invalid collection shape resets store history',
  );
});
```

Command after saving the supplied script in an authorized test location:

```text
node --test snapshot-audit.mjs
```

Expected baseline result from inspected source: these three assertions fail. **Not executed here.** Passing them after a refactor does not prove the corresponding behavior; the cases below do.

**Behavioral acceptance matrix**

Each command is:

```text
node --test media-api/tests/<file>
```

| File | Named cases / IDs | What must be observed |
|---|---|---|
| `api-contract.test.mjs` | `API-001 malformed JSON`; `unknown nested field`; `duration union`; `missing ceiling`; `request id on errors` | Correct 400/422; zero jobs, reservations and backend requests |
| `readiness.test.mjs` | `CAP-001 enabled but missing graph`; `stale observation`; `claimed capability`; `changed profile hash` | `runnable:false`; capability remains null where claimed; quote refusal |
| `auth.test.mjs` | `AUTH-001 missing invalid revoked`; `foreign job quote asset`; `AUTH-002 forged human and limit fields` | 401/404/422; identity and server allowance unchanged |
| `network.test.mjs` | `NET-001 override cannot enable wildcard`; `hostname rejected`; `literal loopback listener` | Startup refusal before listener for forbidden hosts |
| `licence.test.mjs` | `LIC-001 US H3 commercial without grant`; `grant snapshot matches decision`; `territory cannot weaken policy` | Licence refusal or accurate evidence; zero fallback/submission |
| `duration.test.mjs` | `DUR-001 H3 four seconds`; `profile duration omits seconds`; `DUR-002 decoded duration` | No graph `length` mutation; 422 on seconds; actual media duration from inspection |
| `admission.test.mjs` | `API-002 synthetic over-wire`; `same key same body`; `same key changed body`; `consumed quote new key`; `expired quote existing key` | One durable admission; replay safe; conflicts 409; synthetic label explicit |
| `accounting.test.mjs` | `PAY-001 zero allowance`; `PAY-002 simultaneous last allowance`; `midnight held reservation`; `clock rollback`; `failed free run consumes volume` | Atomic limits; no duplicate exposure; no fresh credit from clock changes |
| `pricing.test.mjs` | `PRICE-001 H3 arithmetic`; `DoP units`; `image count`; `unknown rounding`; `micro-dollar boundary` | Correct dimensions; no float authority; unknown bounds refused |
| `recovery.test.mjs` | `JOB-001 poll unavailable`; `JOB-003 accepted before ID persistence`; `backend identity recovered`; `missing history` | Reconciling when uncertain; generation POST count remains one |
| `store-crash.test.mjs` | `STORE-001 each journal boundary`; `valid JSON wrong schema`; `active record at capacity`; `second writer`; `flush failure` | Recovery preserves admission/accounting agreement; malformed state blocks dispatch |
| `resource.test.mjs` | `GPU-001 existing competing lease`; `gateway dies with active lease`; `authority unavailable` | No second lock or overlapping execution; unknown ownership blocks dispatch |
| `cancellation.test.mjs` | `CANCEL-001 queued wins`; `dispatch wins`; `owned local cancel unsupported`; `hosted late cancel` | Serialized outcome; no global interrupt; truthful 200/202/409 |
| `artifacts.test.mjs` | `ASSET-001 copy fails after completion`; `path escape`; `wrong MIME`; `checksum`; `single range`; `expired owned asset` | No false success; charge retained; verified bytes; 206/416/410 as specified |
| `hosted-contract.test.mjs` | `missing path`; `missing terms`; `unknown maximum`; `expired price evidence`; `agent cannot grant itself spend` | Every missing prerequisite blocks; rows remain disabled |
| `hosted-lifecycle.test.mjs` | `JOB-001 every vendor status`; `BILL-001 failed without refund evidence`; `confirmed zero`; `debit then refund`; `reservation breach` | Execution and settlement independent; no invented refund; paid admission disabled on breach |
| `download-policy.test.mjs` | `SEC-001 private resolved address`; `redirect target changes`; `credential header isolation`; `byte cap`; `short secret in error` | Forbidden request never leaves; no secret in log/wire; bounded ingestion |
| `graph.test.mjs` | `GRAPH-001 misleading name`; `partner category`; `nested forbidden node`; `unavailable node definition` | Reject before submission; unknown audit evidence does not pass |
| `migration.test.mjs` | `legacy unknown execution`; `unrepresentable money`; `unattributed caller`; `rollback after later submission` | Preserve unknowns and bytes; block unsafe import/restore |
| `routing.test.mjs` | `ROUTE-001 absent profile`; `ambiguous target`; `quoted target disabled`; `licence denied` | Explicit refusal; never another provider |
| `operations.test.mjs` | `idempotency tombstone after retention`; `restore unresolved exposure`; `ledger unavailable wallet`; `provenance declaration versus observation` | Replay protected; no fabricated zero; labels remain truthful |
| `evidence.test.mjs` | `EVID-001 stale patch receipt`; `synthetic cannot satisfy live gate`; `untracked packet identity` | Receipt distinguishes artifact, execution and dirty state |

**Real execution tests — blocked**

- **API-002 real variant:** authenticated HTTP admission produces video from the actual audited Wan graph; returned content hashes match stored metadata.
- **JOB-002:** terminate and restart the gateway during that approved render; recover the same job and backend identity without a second submission.
- **GPU-001 real variant:** verify resource ownership before, during and after restart.
- **NET-001 SSH variant:** approved forwarding reaches the loopback listener with authentication; no LAN/tailnet bind.
- **DUR-002 real variant:** media inspection reports actual profile output duration without claiming seconds were requested.

No existing CPU-ffmpeg test satisfies these live variants.

**Baseline regression commands**

```text
node --test media-api/media-api.test.mjs
node media-api/demo-http-flow.mjs
node media-api/hostile-http-probe.mjs
node media-api/control-round12-checks.mjs
node media-api/smoke-adapters.mjs
```

From `backend/`:

```text
npx vitest run tests/unit/videoProviderRegistry.test.mjs
npx vitest run tests/unit/videoComplianceControls.test.mjs
```

Also run each existing `media-api/hostile-round2-probe.mjs` through `hostile-round23-probe.mjs` individually, recording its exit status. Inspect their fixtures before execution and remove ambient credentials from the test environment.

Disclosure assertions that intentionally pin an old gap must be replaced with new behavioral requirements when that gap is repaired. Preserve the old assertion and its historical result in review evidence; do not retain the defect to keep the suite green.
