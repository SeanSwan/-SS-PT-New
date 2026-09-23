# 06 — Test plan, RED protocol, traceability

Runner: `node --test` (house convention for `scripts/*.test.mjs`). All tests
run against a **temp fixture worktree** (`fs.mkdtemp`), never the real repo
state; the server under test binds `127.0.0.1:0` (OS-chosen port) in tests.

## RED-first protocol (non-negotiable)

Per slice: the builder writes that slice's tests **first**, against a minimal
skeleton landed at slice entry, and records the exact failing output as
EXPECTED-RED evidence. **Import/setup errors are not valid RED proof** — a
test that fails only because a module is missing proves nothing. The skeleton
must be just runnable enough that tests fail on *behavior* (wrong shape, no
denial, no reap). Isolate the RED suite from the normal green suite
(`node --test scripts/swan-coordination/` is the green suite once slices land;
during a slice, run only that slice's file and quote its RED output).

## Fixtures

- `fixtures/tmp-worktree.mjs` — disposable worktree with fake
  `.ai-workflow/` dirs; the server's root/port/config are constructor-injected.
- `fixtures/fake-consult.mjs` — stub consult script (no network) used by
  `ask.mjs` tests via injected seat→command map.
- PID-probe tests spawn a **real child process** (`spawn('node', ['-e',
  'setInterval(()=>{},1e9)'])`) and kill it — no mocks for the liveness boundary.
- Forbidden-side-effect watcher: every suite asserts no writes outside the
  fixture's allowed dirs (recording `fs` operations via the server's own
  journal path options), and zero non-loopback sockets.

## Test matrix

| ID | Requirement | Level | Action → expected observable result |
|---|---|---|---|
| T-R1-01 | R1 | contract | two clients register → each `coord_who_is_active` lists the other ≤2 s |
| T-R1-02 | R1 | unit | no heartbeat >5 min → seat reported `stale` |
| T-R2-01 | R2 | contract | 10 parallel claims, same path → exactly 1 granted, 9 `DENIED_LOCK_HELD` w/ holder |
| T-R2-02 | R2 | unit | `Backend\Routes\pay.MJS` vs `backend/routes/pay.mjs` → same claim (normalization) |
| T-R2-03 | R2 | unit | `..`/absolute path → `ERR_VALIDATION`, nothing persisted |
| T-R3-01 | R3 | contract | live holder → conflicting claim still denied after probe |
| T-R3-02 | R3 | contract | killed child holder → next claim reaps + grants + audit row |
| T-R3-03 | R3 | unit | TTL expiry backstop grants to next claimer; audit `expired` |
| T-R3-04 | R3 | contract | operator force-release → audited, path claimable |
| T-R4-01 | R4 | contract | cross-seat post/get ordering + identity fields present |
| T-R4-02 | R4 | unit | 2,049-byte note → `ERR_VALIDATION`; 31 posts/min → `DENIED_RATE` |
| T-R5-01 | R5 | contract | request_review appends house-format block to fixture review-queue.md |
| T-R5-02 | R5 | contract | same rr_key twice → one append, same entry returned |
| T-R5-03 | R5 | contract | verdict APPROVE/REVISE/REJECT updates `coord_get_reviews` |
| T-R6-01 | R6 | contract | `confirm_spend:false` → `DENIED_SPEND_GATE`, **zero spawns** |
| T-R6-02 | R6 | contract | confirm + env unset → refused, zero spawns, audit row |
| T-R6-03 | R6 | contract | confirm + env + fake-consult → spawned with `--max-tokens 8000`; concurrent second call → `DENIED_SEAT_BUSY` |
| T-R6-04 | R6 | unit | `z-ai/*` model to OpenRouter host → refused by imported `redact-egress` |
| T-R6-05 | R6 | unit | DeepSeek counter at cap → `DENIED_SPEND_GATE` before spawn |
| T-R7-01 | R7 | contract | projection file matches lane-format golden (incl. no token leakage) |
| T-R8-01 | R8 | drill | kill server mid-task → seats proceed file-lane-only; restart → WAL resume, 0 lost rows |
| T-R8-02 | R8 | unit | `SWAN_COORD_DISABLED=1` → start refused `DENIED_DISABLED` |
| T-R9-01 | R9 | unit | bind attempt to non-loopback interface → fail-closed exit |
| T-R9-02 | R9 | contract | no/unknown bearer → `DENIED_TOKEN`; seat A's token ≠ seat B identity |
| T-R9-03 | R9 | unit | placeholder config → refuse start + repair hint |
| T-R9-04 | R9 | unit | secret-shaped payload (`sk-…`) → scan rejection, nothing persisted |
| T-R10-01 | R10 | contract | claim/activity/verdict rows round-trip agent_id+model+harness |
| T-R11-01 | R11 | unit | prune drops >30-day activity, keeps audit-class rows |
| T-R11-02 | R11 | unit | log rotates at 5 MB (inject size) |
| T-R12-01 | R12 | contract | server runs against fixture worktree; grep-gate: no writes outside allowed dirs |

Commands (exact):
- Slice RED: `node --test scripts/swan-coordination/<slice>.test.mjs`
- Green suite: `node --test scripts/swan-coordination/`
- Drill T-R8-01: scripted in `scripts/swan-coordination/drills/degrade.mjs`
  (start → register/claim → SIGKILL server → verify file-lane fallback →
  restart → verify resume); output teed to the slice's evidence file.

## Example test skeleton (pattern for the builder)

```js
import test from 'node:test'; import assert from 'node:assert/strict';
import { startServer } from '../server.mjs'; import { makeFixture } from './fixtures/tmp-worktree.mjs';

test('T-R2-01: parallel claims grant exactly one', async (t) => {
  const fx = await makeFixture(t);
  const srv = await startServer({ root: fx.root, port: 0, config: fx.config });
  t.after(() => srv.stop());
  const a = fx.client('codex'); const b = fx.client('glm');
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    (i === 0 ? a : b).call('coord_claim_files',
      { paths: ['backend/routes/pay.mjs'], reason: 'race test' })));
  assert.equal(results.filter(r => r.ok).length, 1);
  for (const r of results.filter(r => !r.ok))
    assert.equal(r.error.code, 'DENIED_LOCK_HELD');
});
```

## Coverage gaps & mock disclosure (honest)

- Real consult *network* behavior is NOT tested — only the gates and spawn
  contract (fake script). The `z-ai` egress guard is covered by its existing
  suite; we test that we *call* it, not its internals.
- Harness MCP-client compatibility (Codex HTTP, Z-App config) is untestable
  here — verify tasks V1/V2 produce recorded evidence, not unit tests.
- Kill-drill covers ungraceful SIGKILL only; OS-crash scenarios are out of scope.

## Traceability matrix (requirement → artifact → tests → slice)

| Req | Blueprint | Tests | Slice |
|---|---|---|---|
| R1 | 02 §components; 03 schemas | T-R1-01/02 | S1 |
| R2 | 03 claims; 04 §4.2/4.3 | T-R2-01/02/03 | S2 |
| R3 | 03 reaper; 04 §4.3 | T-R3-01..04 | S2 |
| R4 | 03 activity | T-R4-01/02 | S3 |
| R5 | 03 review block | T-R5-01..03 | S4 |
| R6 | 02 §integration; 03 ask | T-R6-01..05 | S5 |
| R7 | 03 projection | T-R7-01 | S2 |
| R8 | 02 transport/storage; 05 §5.5 | T-R8-01/02 | S6 |
| R9 | 02 §security; 03 §permissions | T-R9-01..04 | S1/S5 |
| R10 | 03 data model | T-R10-01 | S1 |
| R11 | 07 §ops | T-R11-01/02 | S6 |
| R12 | 01 invariants; 02 §storage | T-R12-01 | S1 |

No orphan requirements; no requirement is covered only by mocks (gaps listed
above are explicit and bounded).
