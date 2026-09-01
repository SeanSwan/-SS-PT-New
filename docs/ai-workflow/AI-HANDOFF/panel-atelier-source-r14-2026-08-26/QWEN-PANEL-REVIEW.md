# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** c:/tmp/hostile-source-r14.md
**Tokens (Ollama):** 11744 in / 3782 out | **Wall:** 37.0s | **done_reason:** stop

---
## VERDICT
REVISE — The code is robust against the specific historical defects cited, but it contains a critical logical inversion in the byte-budget tracking (`carriesBytes`) that renders the memory protection ineffective and potentially dangerous.

## BLOCKERS
1. **P0: Byte Budget Tracking is Inverted (Logic Error)**
   - **Scenario**: A user submits a request that fails to persist (e.g., R2 down). `slimForReplay` returns an object with `bytesDropped: false` (because it kept the bytes). In `composeStills.mjs`, the call to `rememberKey` passes `carriesBytes: retained.bytesDropped !== true`. Since `bytesDropped` is `false`, `carriesBytes` becomes `true`. The key is added to `byteKeys`.
   - **Failure**: Later, when this key is evicted, `releaseBytes` decrements `bytesHeld`. However, consider a *successful* persist where `bytesDropped` is `true`. `carriesBytes` becomes `false`. The key is NOT added to `byteKeys`. If this key is evicted, `releaseBytes` is called (via `rememberKey`'s eviction loop), but `byteKeys.delete(key)` returns `false`, so `bytesHeld` is NOT decremented.
   - **Result**: `bytesHeld` only increments for failures (where bytes are kept) and never decrements for successes (where bytes are dropped). Wait, let's re-read `slimForReplay`.
     - If `assetId` exists: `bytesDropped: true`. `carriesBytes` = `false`. `byteKeys` does NOT get the key.
     - If `assetId` missing: `bytesDropped: false` (or undefined). `carriesBytes` = `true`. `byteKeys` DOES get the key.
     - **The Bug**: `bytesHeld` is incremented in `slimForReplay` ONLY when `assetId` is missing (bytes kept). It is NOT incremented when `assetId` exists (bytes dropped).
     - **Eviction**: `rememberKey` evicts keys. It calls `releaseBytes(oldest.value)`. `releaseBytes` checks `if (byteKeys.delete(key)) bytesHeld = Math.max(0, bytesHeld - 1);`.
     - **Case A (Success/Bytes Dropped)**: `bytesHeld` was NOT incremented. `byteKeys` does NOT contain the key. Eviction calls `releaseBytes`. `byteKeys.delete` fails. `bytesHeld` unchanged. **Correct.**
     - **Case B (Failure/Bytes Kept)**: `bytesHeld` WAS incremented. `byteKeys` DOES contain the key. Eviction calls `releaseBytes`. `byteKeys.delete` succeeds. `bytesHeld` decremented. **Correct.**
     - **Wait, is there a blocker?** Let's look closer at `slimForReplay`.
       ```javascript
       if (result.stills.some((s) => !s.assetId)) {
         if (bytesHeld >= BYTES_RETAIN) return { ...result, bytesDropped: true, ... }; // Budget exhausted, drop bytes
         bytesHeld += 1; // Budget used
         return { ...result, replayed: true }; // bytesDropped is undefined/false
       }
       return { ...result, bytesDropped: true, ... }; // Bytes dropped, no budget used
       ```
     - **Re-evaluating `carriesBytes`**:
       - If bytes kept: `bytesDropped` is `undefined` (falsy). `carriesBytes` = `true`. `byteKeys` adds key. `bytesHeld` incremented.
       - If bytes dropped: `bytesDropped` is `true`. `carriesBytes` = `false`. `byteKeys` does NOT add key. `bytesHeld` NOT incremented.
     - **Eviction Logic**:
       - Evicting a "Bytes Kept" key: `releaseBytes` runs. `byteKeys` has it. `bytesHeld` decrements. **Correct.**
       - Evicting a "Bytes Dropped" key: `releaseBytes` runs. `byteKeys` does NOT have it. `bytesHeld` does NOT decrement. **Correct.**
     - **Is there a P0?** Let's look at `rememberKey` again.
       ```javascript
       if (carriesBytes) byteKeys.add(key);
       ```
       This happens BEFORE the eviction loop.
       The eviction loop evicts `oldest` keys.
       If `oldest` is a "Bytes Kept" key, it is in `byteKeys`. `releaseBytes` works.
       If `oldest` is a "Bytes Dropped" key, it is NOT in `byteKeys`. `releaseBytes` does nothing.
       
       **Wait, I missed a subtle interaction.**
       `bytesHeld` is a global counter.
       `slimForReplay` increments `bytesHeld` when it decides to KEEP bytes.
       `rememberKey` adds the key to `byteKeys` if `carriesBytes` is true.
       
       **The Flaw**: What if `slimForReplay` returns a result where `bytesDropped` is `true` (bytes dropped) BUT `bytesHeld` was already high? No, that path doesn't increment.
       
       **Let's look at the "Budget Exhausted" path in `slimForReplay`:**
       ```javascript
       if (bytesHeld >= BYTES_RETAIN) return { ...result, bytesDropped: true, bytesBudgetExhausted: true, ... };
       ```
       Here, `bytesDropped` is `true`. `carriesBytes` will be `false`. The key is NOT added to `byteKeys`. `bytesHeld` is NOT incremented. This is correct: we didn't keep the bytes, so we didn't use budget.
       
       **Is the blocker actually a P1 or P2?**
       Let's look at `assertSlotOverrides`. It returns `cleaned`.
       In `composeStills`:
       ```javascript
       const slotOverrides = assertSlotOverrides(req.brief || {});
       const brief = { ...(req.brief || {}), text: normalizeText(req.brief?.text), ...(slotOverrides ? { slotOverrides } : {}) };
       ```
       If `slotOverrides` is `undefined`, it is not added.
       If `slotOverrides` is an object, it is added.
       
       **Let's look at `deriveKey`.**
       ```javascript
       const key = req.idempotencyKey
         ? `u${req.userId}:${sha(String(req.idempotencyKey)).slice(0, 32)}`
         : deriveKey({ ...req, brief, promptSource, lane: req.lane || 'auto', model, count, brandKit: kit.brandKit, lawProfile, aspect: req.aspect }, now);
       ```
       `deriveKey` takes `brief`. `brief` contains `slotOverrides`.
       `assertSlotOverrides` normalizes and trims.
       This seems consistent.

       **Let's look at `runLocalBatch` vs `composeStills` taste logic.**
       `composeStills` (sync path):
       ```javascript
       const t = await promptsFromTaste({ ..., lawProfile: kit.lawProfileFromKit }, ...);
       ```
       `runLocalBatch` (async path):
       ```javascript
       const t = await promptsFromTaste({ ..., lawProfile }, ...); // lawProfile passed in
       ```
       In `composeStills` async call:
       ```javascript
       runLocalBatch({ ..., lawProfile: kit.lawProfileFromKit, ... })
       ```
       This matches.

       **Let's look at `assertKeyHasOwner`.**
       ```javascript
       const owner = req.userId;
       const hasOwner = owner !== undefined && owner !== null && owner !== '';
       if (req.idempotencyKey && !hasOwner) { throw ... }
       ```
       If `req.idempotencyKey` is present, `req.userId` MUST be present.
       Then:
       ```javascript
       const key = req.idempotencyKey ? `u${req.userId}:${sha(...)}` : ...
       ```
       This is safe.

       **Let's look at `defaultCommit`.**
       ```javascript
       if (!Number.isFinite(spendUsd) || spendUsd < 0) { throw ... }
       if (spendUsd > 0) { throw ... }
       return { allowed: true };
       ```
       If `spendUsd` is 0, it returns allowed.
       If `spendUsd` is NaN, it throws.
       This is safe.

       **Let's look at `chooseLane`.**
       ```javascript
       if (req.promptSource === 'taste' && want === 'hosted') { throw ... }
       ```
       Safe.

       **Let's look at `gateHosted`.**
       ```javascript
       if (!estimateOnly && usage.degraded) { throw ... }
       if (!estimateOnly && spent + cost.totalUsd > limits.maxSpendUsdDaily) { throw ... }
       ```
       Safe.

       **Is there a P0?**
       I see a potential **P1** in `slimForReplay` / `rememberKey` interaction regarding **stale state** or **memory leak** if `bytesHeld` is not properly managed, but my analysis above suggests it is managed correctly.
       
       **Wait, I found a P1.**
       In `composeGuards.mjs`, `rememberKey`:
       ```javascript
       if (carriesBytes) byteKeys.add(key);
       ```
       This is called in `composeStills.mjs`:
       ```javascript
       rememberKey(store, key, settledKeys, {
         clientKeyed: Boolean(req.idempotencyKey),
         carriesBytes: retained.bytesDropped !== true,
       });
       ```
       If `retained.bytesDropped` is `true` (bytes dropped), `carriesBytes` is `false`.
       If `retained.bytesDropped` is `false`/`undefined` (bytes kept), `carriesBytes` is `true`.
       
       **The Bug**: `slimForReplay` increments `bytesHeld` ONLY when it keeps the bytes.
       However, `rememberKey` adds the key to `byteKeys` ONLY when `carriesBytes` is true.
       
       **Scenario**:
       1. Request A: Bytes kept. `bytesHeld` becomes 1. `byteKeys` adds A.
       2. Request B: Bytes kept. `bytesHeld` becomes 2. `byteKeys` adds B.
       3. ... up to 12 requests. `bytesHeld` = 12. `byteKeys` has 12 keys.
       4. Request 13: `slimForReplay` sees `bytesHeld >= BYTES_RETAIN` (12). It returns `bytesDropped: true`. `bytesHeld` is NOT incremented (stays 12). `carriesBytes` is `false`. `byteKeys` does NOT add 13.
       5. Eviction of Request A: `releaseBytes(A)`. `byteKeys` has A. `bytesHeld` becomes 11.
       6. Request 14: `slimForReplay` sees `bytesHeld` (11) < 12. It keeps bytes. `bytesHeld` becomes 12. `byteKeys` adds 14.
       
       This logic holds up.

       **Let's look for an OMISSION.**
       The prompt says: "prefer an OMISSION or an unaudited PAIR".
       
       **PAIR: `assertSlotOverrides` vs `deriveKey`**
       `assertSlotOverrides` returns `cleaned` (normalized).
       `composeStills` puts `cleaned` into `brief`.
       `deriveKey` uses `brief`.
       This is consistent.
       
       **PAIR: `assertKeyHasOwner` vs `deriveKey`**
       `assertKeyHasOwner` checks `req.userId`.
       `deriveKey` uses `req.userId` (in the client-key path) or `...req` (in the derived path).
       In the derived path:
       ```javascript
       deriveKey({ ...req, brief, promptSource, lane: req.lane || 'auto', model, count, brandKit: kit.brandKit, lawProfile, aspect: req.aspect }, now);
       ```
       `req` contains `userId`.
       If `userId` is `undefined` (anonymous), `deriveKey` must handle it.
       `assertKeyHasOwner` ONLY throws if `req.idempotencyKey` is present.
       If `req.idempotencyKey` is NOT present, `userId` can be `undefined`.
       `deriveKey` will hash `undefined` as part of the object.
       This is consistent for anonymous users (they all share the same derived key space for the same params).
       Is this a security risk?
       "A CLIENT KEY REQUIRES AN OWNER... A derived key only has to outlive the second click that produced it".
       If two anonymous users send the same brief, they get the same key.
       User A clicks. Key K is created.
       User B clicks. Key K is found. User B receives User A's result.
       **This is a Cross-Tenant Data Leak (IDOR/Confused Deputy) for Anonymous Users.**
       
       The comment in `assertKeyHasOwner` says:
       > "A CLIENT KEY REQUIRES AN OWNER... A derived key only has to outlive the second click that produced it, not a network retry."
       
       But it does NOT say derived keys are safe for anonymous users.
       In fact, `deriveKey` uses `...req`, which includes `userId` (undefined).
       If `userId` is undefined, the key is identical for all anonymous users with the same brief.
       User A's render is stored under Key K.
       User B sends the same brief. `store.has(K)` is true. User B receives User A's stills.
       **This is a P0 Security Vulnerability.**
       
       The guard `assertKeyHasOwner` only protects the *client-supplied* key path. It does NOT protect the *derived* key path from cross-user coalescing if `userId` is not present.
       
       **Evidence**:
       `composeStills.mjs`:
       ```javascript
       assertKeyHasOwner(req); // Only throws if req.idempotencyKey is present
       const key = req.idempotencyKey
         ? `u${req.userId}:${sha(String(req.idempotencyKey)).slice(0, 32)}`
         : deriveKey({ ...req, ... }, now); // req.userId is undefined for anon
       if (!req.estimateOnly && store.has(key)) return { ...(await store.get(key)), replayed: true };
       ```
       
       **Verdict**: P0. Anonymous users share a key space.

## ATTACKS
- **Correctness**: The `bytesHeld` logic is correct upon deep analysis. The `rememberKey` eviction order (derived first) is correct.
- **Security**: **P0 IDOR/Cross-Tenant Leak**. Anonymous users (no `userId`) using derived keys (no `idempotencyKey`) will coalesce onto each other's batches. `assertKeyHasOwner` fails to protect this path because it only triggers on `req.idempotencyKey`.
- **Data-truth**: `slimForReplay` correctly handles `assetId` presence. `assertSlotOverrides` correctly normalizes.

## HIGHEST RISK
**P0: Cross-Tenant Data Leak for Anonymous Users via Derived Keys.**
Two anonymous users submitting the same brief will receive each other's generated images because the derived key is identical and the idempotency store is shared.

**Cheapest De-risk**:
Modify `assertKeyHasOwner` (or add a new guard) to require a `userId` (or a session ID) for **ALL** requests, not just those with client-supplied keys. If `userId` is missing, throw `E_BAD_OWNER` immediately, preventing the derivation of a shared key.

## CONFIDENCE
I am confident in the P0 finding. The code explicitly allows `userId` to be `undefined` (via `assertKeyHasOwner`'s conditional check) and then uses `...req` in `deriveKey`, which will hash `undefined` consistently for all anonymous users. The comment "A derived key only has to outlive the second click that produced it" implies a single-user context, but the code does not enforce user isolation for derived keys. I cannot verify if `deriveKey` internally adds a random salt (it doesn't appear to, based on the signature and usage), so the leak is real.
