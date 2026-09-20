**Execution status:** New regression modules below are required implementation deliverables, not existing PASS evidence. Missing modules are setup gaps, not valid RED.

All integration stores must be newly created temporary roots. No default store, production DB or live YouTube acquisition. Fake external resolver/probe processes must be distinguishable from real engine-file integration.

| Group / file | Named cases and proof |
|---|---|
| **POLICY** `test/bridge.writegate.test.mjs` | Rename write-gate IDs to T-B26. `same origin accepted`; `different port refused`; `different alias refused`; `foreign and null Origin refused`; `native request accepted`; `custom header exact value required`; `JSON body required`; `OPTIONS grants no CORS`; actual adapter reaches bridge. Refusals leave registry bytes unchanged. |
| **READ** `test/published-generation.test.mjs` | `pointer pinned once`; `switch to empty generation keeps original claims`; `switch to malformed generation keeps original claims`; `missing rules reported`; `malformed pointer differs from absent`; `generation 10000 accepted`; bounds refuse explicitly. |
| **READ** `test/published-containment.test.mjs` | Real fixture: poisoned query pointer, namespace junction, generation junction, pointer symlink, markdown symlink, rules symlink, cross-creator link and permission denial. Assert refusal before outside content read, plus valid nonempty controls. |
| **READ** `test/published-claims.test.mjs` | Null/scalar JSONL rows, invalid timestamp/video ID, mismatched creator ID, duplicate claim identity, missing optional prose, oversized line. Invalid rows are named in `skipped`; valid actual IDs survive. |
| **HEALTH** `test/health.lifecycle.test.mjs` | `worker startup error becomes unknown`; `unexpected exit releases slot`; `watchdog terminates worker`; `old epoch ignored`; `reset drains old work`; `shutdown closes ports`; `store A history never appears in store B`; pending refresh preserves old timestamp. |
| **HEALTH** `test/health.offthread.test.mjs` | Deterministic slow fake subprocess proves concurrent route responsiveness; cold and expired-cache paths measured separately. Do not rely on installed yt-dlp taking 1.7s. |
| **CONTRACT** `web/src/test/route-contracts.test.ts` | Local/Mock parity; null counts; unknown/history provenance; generation; every newly consumed malformed nested payload; healthy controls; invalid success body becomes named contract error. |
| **WEB** `components/StatusBoard.test.tsx` | Historical `ok:true` is labelled history/stale; unknown pending is not failure; actual failure differs from pending; independent damage does not hide healthy instruments; >3-day warning uses gold. |
| **ADD** `test/creators.worker.test.mjs` | Slow resolution leaves HTTP responsive; worker never writes registry; parent reads registry after resolution; re-add preserves intervening consent change; measured/null counts; concurrent add receives busy; worker failure leaves registry unchanged. |
| **WEB** roster/add/drawer test files | No optimistic consent; neutral save copy; uncertain response triggers reconciliation; all drawer tabs; generation label; literal HTML stays text; focus restored on Close/Escape. |
| **QUERY** `test/query.parity.test.mjs` | Valid synthetic corpus matches engine scoring and top-40 behavior; ties deterministic; actual claim IDs retained; same-time distinct claims remain distinct; damaged namespace yields visible skipped entry. |
| **WEB** `components/QueryConsole.test.tsx` | Submitted-term copy; stale response discarded; creator filter; skipped rows; citation seconds; duplicate-time claims render independently. |
| **JOURNAL** `test/run-concurrency.test.mjs` | Two real engine child processes, shared temp store: losing runner cannot replace winner’s journal identity or terminal result. Repeat daily-vs-repair. Failure blocks both S3b and S4. |
| **OPS** `test/repair.test.mjs` | Real engine record projects all four counts and `ok`; failed result cannot read completed; busy exclusion; worker failure becomes uncertain; no raw content in result. |
| **RUN** `test/run-launch.test.mjs` | Positive safe-integer validation; one child under rapid double-submit; 202 contains null engine ID; fast terminal run correlates; unrelated/reused PID rejected by identity/time checks; exit zero alone unknown; failed record never completed; restart loses only documented metadata. |
| **WEB** OpsRail/RunConsole tests | Exact state copy; holder details; failed repair verdict; blocked Backup sends nothing; read abort on unmount; no automatic mutation retry. |
| **SCENE** `three/layoutBrains.test.ts`, `lifecycle.test.ts` | Sorted deterministic layout; real counts/unknown counts; hidden/offscreen pause; runtime reduced motion; full disposal and single renderer after remount. |
| **LAUNCH** `web/e2e/console-launch.spec.ts` | Actual built app and fixture bridge; real `main.tsx` mount; missing hashed asset fails visibly; launcher from unrelated cwd; single-instance behavior; ≤15s evidence. |
| **VISUAL** `web/e2e/console-responsive.spec.ts` | All eleven sizes, 44px controls, no clipping/overlap, complete keyboard tasks, focus restoration, axe and measured contrast. |
| **SCENE** `web/e2e/console-motion.spec.ts` | Network proves prohibited chunk fetches absent; late dolly skipped; DPR/motion bounds; hardware frame measurements separate from software GL. |
| **ROUTES** `test/bridge.hy4.structure.test.mjs` | Exact slice-specific allowlist across server/router; no premature routes; cap walk reaches web; unique test IDs. |
| **TRANSFER** `test/snapshot.test.mjs` | Tag exists; copied source matches complete manifest; changed/missing/unlisted owned source blocks transfer. |

**Executable seed regression**

Install as `C/test/r2-contract.test.mjs`. This is a complete runnable test module. The different-port test is expected to fail against the reviewed gate until S0H fixes it.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readBody } from '../lib/http.mjs';
import { writeGateFailure } from '../lib/write-gate.mjs';

const request = (origin) => ({
  method: 'POST',
  headers: {
    host: '127.0.0.1:54321',
    origin,
    'content-type': 'application/json',
    'content-length': '2',
    'x-console-write': '1',
  },
});

test('R2-POLICY-01: same serving origin remains accepted', () => {
  assert.equal(writeGateFailure(request('http://127.0.0.1:54321')), null);
});

test('R2-POLICY-02: another loopback port is refused', () => {
  const result = writeGateFailure(request('http://127.0.0.1:5173'));
  assert.equal(result?.code, 'FORBIDDEN_WRITE');
});

test('R2-UTF8-01: invalid byte inside JSON string is rejected', async () => {
  const bytes = Buffer.from([123,34,114,101,102,34,58,34,255,34,125]);
  await assert.rejects(
    readBody(Readable.from([bytes])),
    (err) => err.code === 'VALIDATION' && /UTF-8/.test(err.message),
  );
});

test('R2-UTF8-02: valid JSON remains accepted', async () => {
  assert.deepEqual(
    await readBody(Readable.from([Buffer.from('{"ref":"sample"}')])),
    { ref: 'sample' },
  );
});
```

**Exact targeted commands**

```powershell
$c = 'packages/creator-brains-console'
node --test "$c/test/r2-contract.test.mjs"
node --test "$c/test/published-generation.test.mjs" "$c/test/published-containment.test.mjs" "$c/test/published-claims.test.mjs"
node --test "$c/test/health.lifecycle.test.mjs" "$c/test/health.offthread.test.mjs"
node --test "$c/test/creators.worker.test.mjs"
node --test "$c/test/query.parity.test.mjs"
node --test "$c/test/run-concurrency.test.mjs"
node --test "$c/test/repair.test.mjs" "$c/test/run-launch.test.mjs"
npm --prefix "$c/web" test
npm --prefix "$c/web" run typecheck
npm --prefix "$c/web" run build
```

From `C/web` after the isolated configuration exists:

```powershell
npx --no-install playwright test --config playwright.console.config.ts
```

Viewport matrix:

```text
320×812, 375×812, 414×896, 768×1024, 1024×768, 1280×800,
1440×900, 1920×1080, 2560×1440, 3840×2160, 3440×1440
```

**Mock boundary matrix**

| Evidence | Establishes | Does not establish |
|---|---|---|
| In-memory filesystem probes | Actual reader control flow under supplied filesystem responses | Real junction behavior or live-store exploit |
| Real temporary store + HTTP | Serialization and engine file-format integration | Live acquisition/provider availability |
| Fake resolver/probe subprocess | Scheduling, lifecycle and error containment | YouTube or installed yt-dlp availability |
| Fake fetch / MockAdapter | Consumer states and contract behavior | Actual bridge compatibility |
| Built app + fixture bridge | Mounted browser workflow | Production data or receiving-repo behavior |
| Software WebGL | Eligibility and teardown logic | Sean’s GPU performance |
| Mutation test | Named guard’s sensitivity | Complete feature correctness |
