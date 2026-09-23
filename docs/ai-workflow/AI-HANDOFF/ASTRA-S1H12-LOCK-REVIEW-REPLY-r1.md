# Astra Reply — subscription transport — 2026-09-23T08:21:20.060Z

**Provider:** openai-codex
**Billing:** chatgpt-subscription
**Authentication:** chatgpt_subscription
**Transport:** codex-cli
**Requested model:** gpt-6-astra
**Served model:** NOT OBSERVABLE on codex-cli (see SERVED_MODEL_UNVERIFIABLE_NOTE)
**Reasoning effort:** xhigh
**Tokens:** in=2662271 out=14961 reasoning=6726
**Packet:** `docs/ai-workflow/AI-HANDOFF/ASTRA-S1H12-LOCK-REVIEW-PACKET-r1.md`
**Wall:** 852.0s
**Mega Blueprint:** not armed

> Marginal cost $0 — this leg rides the ChatGPT subscription, not OpenRouter.

---
I’ll check the working-tree bytes, prior reviews, caller chains, and lock behavior. I’ll follow your exact output contract; this session’s read-only sandbox limits test execution and archive filing.

The sandbox denies launching Git, Node, Bash, and `rg`, but file reads work. I’ll continue with direct source inspection and hashes, using the verification-before-completion skill to keep runtime claims separate from what I can prove here.

All 11 packet hashes match the working tree, and the branch ref matches `226491323`. The race test covers the fresh re-read as claimed. I’m now tracing lock ownership and release failures, including whether the synchronous launcher handles the new busy refusal.

I found an omitted registry writer: subscription sync saves a snapshot taken before network awaits and never takes the store lock. I also found that `/api/run` treats any held lock as a daily-run acknowledgment, so a new creator-write lock can clear the startup reservation prematurely. I’m checking those paths and release-failure handling before assigning severities.

The in-memory probe confirms the reservation issue: a creator lock clears the pending daily-run reservation, allowing a second reservation. The new writers also ignore failed lock releases and discard the retryable handle. HEAD advanced during the review; the two changed source files still match the packet hashes.

## PART A — FINDINGS

### F01 — HIGH — Subscription sync bypasses the new registry lock

CLAIM: The fix leaves a shipped catalog writer able to overwrite successful locked mutations.  
EVIDENCE: `scripts/creator-brains/commands.mjs:111` calls `syncSubscriptions`; `scripts/creator-brains/lib/subs.mjs:198` reads the registry, awaits network work at `:220` and `:232`, then saves that original snapshot at `:252–255` without acquiring a lock.  
REPRODUCTION: read-only, no execution  
EXPECTED: Subscription sync merges into a fresh registry under the same mutex as add and enable/disable.  
ACTUAL: With OAuth configured, sync can read first, a locked enable/add can commit, and sync can subsequently overwrite that change; this omitted writer defeats store-wide exclusion.  
REMEDY: Keep subscription retrieval outside the lock, then acquire the mutex, re-read and validate the registry, apply the snapshot, and save; add a deterministic sync-versus-toggle regression.

### F02 — MEDIUM — Creator locks falsely acknowledge daily-run startup

CLAIM: A creator-write lock can prematurely release the pending daily-run reservation.  
EVIDENCE: `packages/creator-brains-console/lib/run-reservation.mjs:168–174` clears the reservation for any held lock; `lib/status.mjs:174` projects creator locks identically to run locks; `routes.mjs:94` passes that projection to `noteRun`; the in-memory probe returned `{held:null, secondAccepted:true}`.  
REPRODUCTION: Node REPL: `const { createReservation: makeReservationProof } = await import('file:///<repo>/packages/creator-brains-console/lib/run-reservation.mjs'); const proof = makeReservationProof({timeoutMs:0}); proof.reserve('run/daily',{seenRunId:'old'}); proof.noteRun({journal:{runId:'old'},lock:{held:true,pid:123,alive:true}}); nodeRepl.write({held:proof.held(),secondAccepted:proof.reserve('run/daily').ok});`  
EXPECTED: The reservation persists until its spawned child acknowledges acquisition or refusal.  
ACTUAL: During startup, a worker’s creator lock can clear the reservation; after that lock releases, another daily request can spawn before the first child acquires the store.  
REMEDY: Bind acknowledgment to the spawned child’s identity and acquisition evidence; unrelated locks must leave the reservation intact.

### F03 — MEDIUM — Failed release discards the recovery handle

CLAIM: Both new mutation paths can report success while leaving the store locked indefinitely.  
EVIDENCE: `scripts/creator-brains/lib/registry.mjs:259` and `lib/lock.mjs:277` ignore `release()`’s result; `lock.mjs:250–254` returns false on exhausted deletion retries; `:172–173` refuses reclamation while the bridge PID remains alive.  
REPRODUCTION: read-only, no execution  
EXPECTED: Failed cleanup retains an ownership-bound recovery path and reports the committed write separately from cleanup failure.  
ACTUAL: The earlier E4 repair makes the handle retryable, but these callers discard it; the worker can then exit normally while its lock still names the live bridge PID.  
REMEDY: Retain failed-release handles for bounded recovery and surface unresolved cleanup without falsely reporting that the committed mutation was refused; test exhaustion through both registry callers.

### F04 — MEDIUM — The normal timeout can strand a worker-owned lock

CLAIM: The acknowledged crash risk is also reachable through the shipped timeout mechanism.  
EVIDENCE: `packages/creator-brains-console/lib/creator-add.mjs:81` sets a 60-second deadline; `:118` terminates the worker on timeout via `:122–124`; `scripts/creator-brains/lib/registry.mjs:167–184` now places lock ownership inside that terminable worker.  
REPRODUCTION: read-only, no execution  
EXPECTED: Request timeout cannot interrupt an owned registry transaction without a recovery mechanism.  
ACTUAL: If resolution finishes near the deadline and the worker enters its critical section, timeout termination can interrupt ownership before release; the surviving bridge PID prevents reclamation.  
REMEDY: Have the worker resolve only, then perform the validated, locked commit in the parent after deadline checks; alternatively provide a termination-safe ownership protocol.

## PART B — ADJUDICATION OF THE CLAIMS C1–C8

C1 — CONFIRMED — The barrier runs inside resolution before acquisition (`registry.mjs:159,167`; `barrier-add.worker.mjs:52–64`), so this interleaving establishes freshness without establishing exclusion.
C2 — REFUTED — The exported `runDaily({lock:false,only:['discover']})` path skips acquisition (`run-lock.mjs:100`) and still reaches discovery (`passes.mjs:147–149`), although I found no shipped CLI/console caller selecting that bypass.
C3 — CONFIRMED — The inspected production chains call add/setEnabled without an enclosing store lock (`commands.mjs:56,78`; `launch.mjs:148`; console `routes.mjs:109–119`; `creator-add.worker.mjs:64`).
C4 — CONFIRMED — Preserving current callers requires synchronous results at `commands.mjs:78–79`, `launch.mjs:148–149`, and console `creators.mjs:194–215`; making only the setter async breaks those consumers.
C5 — REFUTED — Registry resolution can remain outside the store lock, but “no shared state” is too broad because the uvx fallback uses shared cache/tool directories (`ytdlp.mjs:156–164,217–218`).
C6 — CONFIRMED — The inspected consumers support the new mapping: `http.mjs:44` maps RUN_LOCKED to 409, adapter `errors.ts:24,64` recognizes it, and `Roster.tsx:94–95,109–110` displays either refusal generically.
C7 — CONFIRMED — Exclusive creation and the same-host live-PID check prevent either thread stealing the other’s lock (`lock.mjs:150,171–176`), while also causing the recovery problems above.
C8 — INCONCLUSIVE — `scripts/creator-brains/test/live.test.mjs:34–102` contains six environment-gated live tests, but I could not independently verify the pre-change baseline or reported execution totals.

## PART C — WHAT YOU COULD NOT CHECK

- Full suites, mutation runs, real filesystem contention, and worker termination during ownership were not executed; shell-launched Node was denied and filesystem writes are prohibited.
- File-list landing remains unverified: Git execution was denied, and HEAD advanced from `226491323` to `24c30254a` during inspection; all 11 packet hashes still matched at the final check.
- OAuth-enabled sync concurrency and the frequency of timeout/release failures remain unmeasured.
- Rule 86 archive filing is **BLOCKED** by the read-only session; this report has not been filed to `Z:\HostileReviews`.
