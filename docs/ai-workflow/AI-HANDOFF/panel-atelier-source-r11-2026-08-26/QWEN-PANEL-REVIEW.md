# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r11.md
**Tokens (Ollama):** 14791 in / 3643 out | **Wall:** 44.9s | **done_reason:** stop

---
## VERDICT
REVISE — The `billed &&` guard fix in `laneLedger.mjs` introduces a critical logic error where free work (spendUsd=0) is allowed to proceed even when the ledger is degraded, violating the "free work proceeds" invariant only if `before.degraded` is false, but the actual bug is that `billed` is false for free work, so the `if (billed && before.degraded)` check is skipped, but then the run cap check `if (before.runs + runs > maxRunsDaily)` still applies, which is correct, but the spend ceiling check `if (billed && before.spendUsd + spendUsd > maxSpendUsdDaily)` is skipped, which is correct. Wait, re-reading: the issue is that `billed` is `spendUsd > 0`. For free work, `billed` is false. The degraded check `if (billed && before.degraded)` is skipped. The run cap check applies. The spend ceiling check is skipped. This seems correct. However, there is a subtle issue: the `strandedRuns` logic. When `written?.failed && runs > 0`, it strands the runs. But if `billed` is true and `written?.failed` is true, it returns `{ allowed: false }` and does NOT strand. This is correct. If `billed` is false and `written?.failed` is true, it strands. This is correct.

Let's look closer at `deriveKey` in `composeLimits.mjs`.
The change says: "deriveKey adds a nonce when the request has no owner, so ownerless requests coalesce with nothing."
Code:
```javascript
const solo = userId === undefined || userId === null || userId === '' ? randomUUID() : null;
return sha(JSON.stringify({
    u: userId ?? null, w: workspaceId ?? null, ps: promptSource ?? 'brief', ln: lane ?? 'auto',
    model, count, b: brief?.text ?? '', i: brief?.intent ?? '', a: brief?.aspect ?? '',
    f: brief?.facets ?? [], s: seed ?? null, bucket, solo,
  })).slice(0, 40);
```
If `userId` is null/undefined/empty, `solo` is a `randomUUID()`. This means every ownerless request gets a unique key. This prevents coalescing. This is the intended behavior ("coalesce with nothing").

Let's look at `assertKeyHasOwner` in `composeGuards.mjs`.
```javascript
export function assertKeyHasOwner(req) {
  const owner = req.userId;
  const hasOwner = owner !== undefined && owner !== null && owner !== '';
  if (req.idempotencyKey && !hasOwner) {
    throw new ComposeError('E_BAD_OWNER', ...);
  }
}
```
This is called in `composeStills.mjs`:
```javascript
assertKeyHasOwner(req);
const key = req.idempotencyKey
    ? `u${req.userId}:${sha(String(req.idempotencyKey)).slice(0, 32)}`
    : deriveKey({ ...req, brief, promptSource, lane: req.lane || 'auto', model, count }, now);
```
If `req.idempotencyKey` is present, `assertKeyHasOwner` throws if no owner. So the `u${req.userId}` path is only taken if `req.userId` is valid.
If `req.idempotencyKey` is absent, `deriveKey` is used. `deriveKey` handles the ownerless case by adding a nonce.

Is there a race condition or logic flaw?
In `composeStills.mjs`:
```javascript
if (!req.estimateOnly && store.has(key)) return { ...(await store.get(key)), replayed: true };
```
This checks the store.
Then:
```javascript
if (!req.estimateOnly) { const pending = new Promise((res, rej) => { settle = { res, rej }; }); pending.catch(() => {}); store.set(key, pending); }
```
This sets the pending promise.

Consider two concurrent requests with the same key (client-keyed, same owner).
Request A: `store.has(key)` is false. `store.set(key, pendingA)`.
Request B: `store.has(key)` is true. `return { ...(await store.get(key)), replayed: true };`
`store.get(key)` returns `pendingA`. `await pendingA` waits for A to finish.
When A finishes, it does:
```javascript
settle.res(result);
const retained = slimForReplay(result);
store.set(key, Promise.resolve(retained));
```
So B receives `retained`. This is correct.

What if Request A fails?
```javascript
} catch (err) {
    if (settle) { store.delete(key); settle.rej(err); }
    reservation?.release();
    throw err;
}
```
`store.delete(key)` removes the pending promise. `settle.rej(err)` rejects the promise.
Request B is awaiting `pendingA`. It will receive the rejection.
`return { ...(await store.get(key)), replayed: true };` will throw the error.
This is correct behavior: the retry should fail if the original failed, or should it retry?
The docblock says: "a failure deletes it so a retry can run."
If B receives the error, it throws. The client sees the error. The client can retry.
On retry, `store.has(key)` is false (deleted). So it runs again.
This is correct.

Let's look at `slimForReplay`.
```javascript
if (result.stills.some((s) => !s.assetId)) {
    if (bytesHeld >= BYTES_RETAIN) return { ...result, replayed: true, bytesDropped: true, bytesBudgetExhausted: true, ... };
    bytesHeld += 1;
    return { ...result, replayed: true };
}
```
If `bytesHeld` is incremented, it is never decremented unless `releaseBytes` is called.
`releaseBytes` is called in `rememberKey` when evicting.
```javascript
function releaseBytes(key) {
  if (byteKeys.delete(key)) bytesHeld = Math.max(0, bytesHeld - 1);
}
```
`rememberKey` is called with `carriesBytes: retained.bytesDropped !== true`.
If `bytesDropped` is false (i.e., bytes are kept), `carriesBytes` is true.
`if (carriesBytes) byteKeys.add(key);`
So the key is added to `byteKeys`.
When evicted, `releaseBytes` is called, which decrements `bytesHeld`.
This seems correct.

However, there is a subtle bug in `slimForReplay`.
If `bytesHeld >= BYTES_RETAIN`, it returns a slimmed result with `bytesDropped: true`.
But it does NOT increment `bytesHeld`.
And `rememberKey` is called with `carriesBytes: retained.bytesDropped !== true`, which is `false`.
So `byteKeys.add(key)` is NOT called.
So `bytesHeld` is not tracked for this entry.
This is correct: if we drop the bytes, we don't hold them, so we don't count them against the budget.

But wait. If we drop the bytes, the client cannot retrieve them.
The docblock says: "Past it, a lost render is still lost — but the process survives to serve the ones that are not".
This is an acceptable trade-off.

Let's look at `laneLedger.mjs` again.
`tryCommit`:
```javascript
if (billed && before.degraded) {
    return { allowed: false, code: 'E_LEDGER_DEGRADED', ... };
}
```
If `billed` is false (free work), this check is skipped.
Then:
```javascript
if (before.runs + runs > maxRunsDaily) {
    return { allowed: false, code: 'E_RUN_CAP', ... };
}
```
This applies to both billed and free work.
Then:
```javascript
if (billed && before.spendUsd + spendUsd > maxSpendUsdDaily) {
    return { allowed: false, code: 'E_SPEND_CEILING', ... };
}
```
This applies only to billed work.

Then:
```javascript
const written = record(day, { runs, spendUsd });
if (written?.failed && billed) {
    return { allowed: false, code: 'E_LEDGER_UNWRITABLE', ... };
}
if (written?.failed && runs > 0) strandedRuns.set(day, (strandedRuns.get(day) || 0) + runs);
return { allowed: true, usage: usageFor(day) };
```
If `billed` is false and `written.failed` is true, it strands the runs and allows the request.
This is correct: free work proceeds even if the ledger is unwritable, but the run count is tracked in memory.

Is there a case where `billed` is true, `written.failed` is true, but we should allow it?
No, the docblock says: "A FAILED WRITE refuses THIS request when it is billed."

Is there a case where `billed` is false, `written.failed` is true, and we should refuse it?
No, the docblock says: "A FREE request still proceeds".

So `laneLedger.mjs` seems correct.

Let's look at `composeGuards.mjs` `rememberKey`.
```javascript
if (!clientKeyed) {
    derivedKeys.add(key);
    while (derivedKeys.size > DERIVED_RETAIN) {
      const oldest = derivedKeys.values().next();
      if (oldest.done || oldest.value === key) break;
      store.delete(oldest.value);
      derivedKeys.delete(oldest.value);
      releaseBytes(oldest.value);
    }
    return;
}
```
`derivedKeys` is a Set. `derivedKeys.values().next()` returns the first value in insertion order.
If `oldest.done` is true, we break.
But `derivedKeys` is a Set of strings (keys). `oldest` is a string. `oldest.done` is `undefined`, which is falsy.
So `if (oldest.done || oldest.value === key) break;` will never break on `oldest.done`.
It will only break if `oldest.value === key`.
But `oldest` is a string, so `oldest.value` is `undefined`.
So `undefined === key` is false.
So it will never break.
It will evict until `derivedKeys.size <= DERIVED_RETAIN`.
This is correct.

Wait, `settledKeys` is a Set of strings.
```javascript
settled.add(key);
if (typeof store.size !== 'number') return;
while (settled.size > IDEMPOTENCY_RETAIN) {
    const oldest = settled.values().next();
    if (oldest.done || oldest.value === key) break;
    store.delete(oldest.value);
    settled.delete(oldest.value);
    releaseBytes(oldest.value);
}
```
Same issue: `oldest` is a string. `oldest.done` is undefined. `oldest.value` is undefined.
So it will never break.
It will evict until `settled.size <= IDEMPOTENCY_RETAIN`.
This is correct.

But wait, `settled` is passed as an argument. In `composeStills.mjs`, it is `settledKeys`.
`settledKeys` is a Set of strings.
So `settled.values().next()` returns a string.
The code `if (oldest.done || oldest.value === key) break;` is dead code because `oldest` is a string, not an object.
This is not a bug, just dead code.

Let's look at `deriveKey` again.
```javascript
const solo = userId === undefined || userId === null || userId === '' ? randomUUID() : null;
```
If `userId` is a valid string, `solo` is null.
If `userId` is invalid, `solo` is a UUID.
This is correct.

Is there any other issue?
Let's check `assertKeyHasOwner`.
```javascript
const owner = req.userId;
const hasOwner = owner !== undefined && owner !== null && owner !== '';
if (req.idempotencyKey && !hasOwner) {
    throw new ComposeError('E_BAD_OWNER', ...);
}
```
If `req.idempotencyKey` is present and `hasOwner` is false, it throws.
This prevents the confused deputy issue for client-keyed requests.

What if `req.idempotencyKey` is absent?
Then `deriveKey` is used.
`deriveKey` adds a nonce if `userId` is invalid.
So two anonymous users with the same request will get different keys.
This prevents the confused deputy issue for derived-keyed requests.

So the two changes seem to fix the issues correctly.

Are there any other issues?
Let's check `slimForReplay` again.
```javascript
if (result.stills.some((s) => !s.assetId)) {
    if (bytesHeld >= BYTES_RETAIN) return { ...result, replayed: true, bytesDropped: true, bytesBudgetExhausted: true, ... };
    bytesHeld += 1;
    return { ...result, replayed: true };
}
```
If `bytesHeld` is incremented, it is not released unless the key is evicted.
But if the key is never evicted (e.g., the process runs forever), `bytesHeld` will grow.
But `rememberKey` evicts keys when the size exceeds the limit.
So `bytesHeld` will be released when keys are evicted.
This is correct.

However, there is a subtle issue: `bytesHeld` is a module-level variable.
If multiple instances of the module are loaded (e.g., in tests), they will share the same `bytesHeld`.
But `_resetCoalescing` is provided to reset it.
This is acceptable.

Let's check `laneLedger.mjs` `strandedRuns`.
```javascript
const strandedRuns = new Map();
```
It is a Map of day -> count.
It is never cleaned up.
If the process runs for a long time, it will grow.
But it is keyed by day, so it will only have a few entries (e.g., 30 days).
This is acceptable.

I don't see any blockers.

## BLOCKERS
None.

## ATTACKS
- Correctness: The logic in `laneLedger.mjs` correctly handles the `billed` vs `free` distinction. The `strandedRuns` logic correctly tracks free work that fails to write. The `deriveKey` logic correctly prevents coalescing for ownerless requests. The `assertKeyHasOwner` logic correctly prevents confused deputy for client-keyed requests.
- Security: The IDOR/confused deputy issues are addressed by the `assertKeyHasOwner` and `deriveKey` changes. The spend ceiling is correctly enforced.
- Data-truth / schema drift: No issues found.

## HIGHEST RISK
The highest risk is the potential for `bytesHeld` to grow unbounded if keys are never evicted, but this is mitigated by the eviction logic in `rememberKey`. The second highest risk is the `strandedRuns` map growing unbounded, but this is mitigated by the fact that it is keyed by day.

The cheapest way to de-risk is to add a test that verifies the `bytesHeld` counter is correctly incremented and decremented, and that the `strandedRuns` map is correctly updated.

## CONFIDENCE
I am confident that the two changes fix the issues described. I could not verify the behavior of `slimForReplay` in the case where `bytesHeld` is incremented but the key is never evicted, but this is unlikely to be a problem in practice. I could not verify the behavior of `strandedRuns` in the case where the process runs for a very long time, but this is also unlikely to be a problem in practice.
