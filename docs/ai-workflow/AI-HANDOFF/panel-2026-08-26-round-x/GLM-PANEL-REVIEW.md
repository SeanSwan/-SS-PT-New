# GLM Consult

**Model:** glm-5.3
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\b1665dfe-5ffd-4d87-ae33-8d2609ea2d94\scratchpad\round-X.md
**Tokens:** 5866 in / 19779 out (reasoning: 17008) | total 25645
**Wall:** 285.9s

---

## VERDICT
REVISE — the two core guards each still leave one door open: the sync-miss invariant dies on the expiry path (the miss arrives from behind an `await`), and the opportunistic prune can delete a *live* claim because it deletes by key name, not by identity.

This is not consensus-hedging and not filler: every blocker below is derived from shown source plus the settled list, and I name the exact interleaving in each.

## BLOCKERS

1. **P1 — Concurrent retries of an expired key both run (the sync-miss invariant only covers the absent-key miss).**
   Scenario: client key K's stub is present but expired (batch finished >TTL ago, stub not yet evicted). Two identical requests arrive concurrently (retry storm after a network partition, double-submit). Both call `replayIfFresh` → `has(K)` is true for both → both receive a *promise* from `resolveReplay` → both `await` → both observe `expired` → both delete (idempotent) → both resolve `null`. The orchestrator must `await` that null (it cannot know synchronously that a returned promise will resolve to null — even the ideal shape `if (prior) { body = await prior; if (!body) claim(); }` still claims from a microtask continuation). First continuation claims K; second continuation's `store.set(key, pending)` **overwrites the first pending claim unconditionally**; both `startLocalBatch` calls run; two full GPU renders, two bites of the run cap — the exact harm the header says the synchronicity exists to prevent. Evidence: `composeReplay.mjs` — `replayIfFresh` returns null synchronously *only* on `!store.has(key)`; every expired-path null exits `resolveReplay` behind `await store.get(key)`. The header documents the race for one path and the extraction reintroduced it on the other.
   Fix: make miss→claim atomic — a synchronous compare-and-set (`store.claimIfAbsent(key, pending)`) used on **both** miss paths, with expired-stub takeover as delete→CAS-retry. A hairline `has→get` window is acknowledged in the doc; this is not that window — it is a full duplicate run whenever two post-TTL retries overlap.

2. **P1 — The opportunistic prune deletes whatever currently lives at an expired row's key, including an in-flight claim.**
   Scenario: batch B1 (client key K, deterministic `u${userId}:${sha(ik)}`) finishes at F1; stub retained with `replayExpiresAt: F1+TTL`. At F1+TTL+2s the client reuses the same idempotency key (fixed per-operation keys do this); `replayIfFresh` sees expired, deletes the stub, returns null → new claim `pendingB2` under K, batch B2 in flight. Now *any other* local-lane request calls `startLocalBatch` → `batches.prune()` drops B1 (`now − F1 > TTL`) → reports B1's key K → `store.delete(K)` **kills B2's live claim**. A third concurrent same-key request now misses and starts B3: duplicate render mid-flight. Evidence: `startLocalBatch` first loop — `for (const goneKey of (batches.prune?.() || [])) store.delete(goneKey)` is unconditional; key determinism is settled; prune is finishedAt-based (settled), so in-flight rows are safe but *old rows sharing a reused key* are not. The comment claims this "keeps a retained client key from outliving the batch it points at" — it also lets a dead row kill a live batch's coalescing.
   Fix: the stub carries `batchId` (via the `...accepted` spread) — only delete when the current store entry's `batchId` matches the pruned row's id. Three lines.

3. **P1 — `releaseWhenSettled` called twice with one reservation releases twice; the once-guard is per-call, not per-reservation.**
   Scenario (the document's own attack premise): the catch path and the runner both call it with the same reservation. Each invocation mints its own `released` flag and its own timer; the earlier fires `reservation.release()`, the later fires it **again**. If `release()` is non-idempotent (slot counter / handle free), the pool is over-released → two future acquires granted against one card → mid-frame GPU contention, the exact harm this file exists to prevent; if it throws on the second call, the error is logged as "the card may be stranded" — a misdiagnosis pointing ops the wrong way. Evidence: `composeGpu.mjs` — the `released` boolean lives inside the per-invocation closure; nothing ties it to the reservation.
   Fix: hoist the guard to the reservation — `WeakMap` of released reservations, or a reservation-owned `releaseOnce`.

4. **P1 — The try/catch around `reservation.release()` cannot catch an asynchronously rejected release, and the file's own comment says Node exits on that.**
   Scenario: `reservation.release()` returns a promise (plausible for GPU teardown — driver/context calls) that rejects with EBUSY/driver error. The synchronous `catch` never sees it; the rejection is unhandled; per the file's own words ("Node exits on both"), the process dies mid-render of every other in-flight batch. The guard covers precisely half of the failure mode it documents. Evidence: `composeGpu.mjs` `releaseOnce` — `try { reservation.release(); } catch` with no handling of a returned thenable.
   Fix: `Promise.resolve(reservation.release()).catch(...)` routed to the same `onReleaseError`.

5. **P2 — Synchronous setup throws strand the idempotency key and/or orphan the batch row; no cleanup path exists before the runner chain is attached.**
   Scenarios: (a) `batches.createBatch` throws (store corrupt/DB blip) — if the claim was set before this call (per the architecture the claim is a pending promise under K), nothing settles it and nothing deletes it: every same-key retry `await`s a promise that never settles → per-key permanent hang, and the original client got no 202. (b) `settle` null or `settle.res` throws — batch row already created, runner never started → statusUrl reports `queued` forever. (c) `runLocalBatch` throws synchronously — the `.finally`/`.catch` that would clean up are attached to its *return value* and never get attached, post-202. Evidence: `startLocalBatch` body — no try/catch anywhere before the runner chain; the terminal `.finally` is the only cleanup and is unreachable on all three paths. Conditional on claim-before-call ordering (orchestrator unseen).
   Fix: wrap setup in try/catch → `store.delete(key)` + reject/settle with error. Fail the key open, not closed.

6. **P2 — The `replayExpiresAt` fallback fails unsafe.**
   `replayExpiresAt: (snap.finishedAt || Date.now()) + BATCH_TTL_MS` — if a terminal snapshot ever lacks `finishedAt` (schema drift), the stub's life is measured from *now*, silently outliving its row: the confident-success-payload-with-404ing-statusUrl bug this field exists to kill. A defensive default should expire early (`0`), never late. Evidence: `startLocalBatch` retention branch.

7. **P2 — Idempotency is process-scoped, silently.** Process exit between 202 and the terminal handler: in-memory store loses row, stub, and claim; 202'd clients hold dead statusUrls; retries re-render and re-bite the run cap. Inherent to the local lane, but the retention branch's money rhetoric ("the one mechanism whose whole purpose is to promise that cannot happen") is only true within a process lifetime. Document it or accept it explicitly.

## ATTACKS

- **Correctness:** Blockers 1, 2, 3, 5, 6. Additionally: `resolveReplay`'s expired-delete racing a concurrent re-claim is bounded only by the same microtask gap as Blocker 1 (subsumed). `syncWatchdog`'s late rejection after `Promise.race` settles is *safe* — race subscribes to all inputs — I checked and it is not a finding. The NaN/negative grace silently defaulting (vs. out-of-band clamped loudly) is documented as deliberate; a misconfigured NaN is indistinguishable from "unset," so I accept it.
- **Security:** No new authn/authz findings. `batches.getBatch(batch.id, req.userId)` scopes the terminal read correctly; key format prevents replay IDOR (settled, and I agree). The `key` field echoed in the `accepted` body discloses the key format plus the client's own hashed material to that client — benign, noted only for completeness. `console.error` in cleanup logs `err.message` only — no PII vector visible. Replay payloads carry IDs only — house-compliant.
- **Data-truth / schema drift:** The sharpest item here is **`slimForReplay` vs `replayExpiresAt`**: if `slimForReplay` is a field whitelist (the name says it is) and the new `replayExpiresAt` field isn't in its list, it is stripped before storage and the entire expiry guard is dead code — silently, with the 404-statusUrl bug resurrected and no reddening test unless one asserts the field survives the slim. Second: `snap.stills.length` / `snap.failures.length` are assumed snapshot fields — verify against the batch schema. Third: the retained stub serves `accepted: false, replayed: true` — confirm the client's replay branch tolerates `accepted: false` (frontend response-shape drift; unverifiable here). The thirteenth pair, if it exists, is most likely the **sync-lane stub construction**: every correction in the terminal stub (count-from-snapshot, cost-from-snapshot, `replayExpiresAt`, kit-profile) landed here, and the sync lane's equivalent builder is not shown — one shared stub-builder for both lanes would kill the pair class at the root, which is this file's own thesis.

## HIGHEST RISK
Blocker 1: the coalescing invariant — the mechanism the whole module advertises — is structurally inoperative on the expired-retry path, and no test can see it if the coalescing test only exercises the absent-key miss. Cheapest de-risk before ship: a deterministic test — prime an expired stub via injected clock, fire two identical requests without awaiting the first, assert exactly one `createBatch` — plus the `claimIfAbsent` CAS as the real fix. If the test goes green today, the orchestrator is doing something the document doesn't show; either way you learn the truth in one run.

## CONFIDENCE
Could not verify from this document, with the evidence that would settle each:
- **composeStills (orchestrator)** — claim-set ordering relative to `startLocalBatch`, presence of try/catch around it, whether `settle` doubles as the claim resolver, and the sync lane's stub construction. Settles Blockers 1 and 5 and the thirteenth-pair question.
- **`withGpu` / reservation implementation** — is `release()` idempotent, and does it return a promise? Settles whether Blockers 3 and 4 are P1-live or latent.
- **`batchStore.prune` contract** — does it return store keys or batch ids, and how does it treat `finishedAt: null` rows? (If it returns ids, Blocker 2's delete is a silent no-op and the prune coupling is dead code — a different defect.) Settles Blocker 2.
- **`slimForReplay` field list** — whether `replayExpiresAt` survives it. Settles the dead-guard hazard.
- **`runLocalBatch` internals** — synchronous-throw surface, and the `localBatchRunner:151` claim resolution. Settles Blocker 5c.
- **Client replay contract** — `accepted: false` tolerance.
- House rules: no violations present in this document — no UI/chart/palette code, shown files well under 300 lines, replay payloads are IDs-only, no prohibited language, no credential phrasing. Backend-only scope means the UI rules are untestable here, not confirmed.

I am most confident in Blockers 1 and 2 (derivable from shown source plus settled facts alone); Blockers 3–5 are conditional on unseen collaborators and I have labeled them as such rather than inflating them. If the orchestrator and reservation sources contradict the premises, I would rather be corrected by those files than have approved on an assumption.
