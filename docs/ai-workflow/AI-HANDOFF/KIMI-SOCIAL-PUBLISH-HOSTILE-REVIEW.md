# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/kimi-packet/packet.md
**Seed:** (none)
**Tokens:** 8681 in / 11545 out | **Cost:** ~$0.1992 | **Wall:** 126.3s | **finish_reason:** stop

---

# Hostile review — findings ranked by user harm

## P1 — Duplicate-post defects (worst outcome)

### 1. Claim 3 is FALSE: retry still derives "what to re-send" from a ledger that is *allowed by design* to be incomplete
**Files:** `socialJobRetry.mjs` (`retryJob`), `socialPublishFanOut.mjs` (`recordAttempt`), `socialJobScheduler.mjs` (`reconstructResults` / `UNKNOWN_OUTCOME`).

`retryJob` computes `pending = platformAccountIds − accounts with a 'published' Attempt row`. But the ledger can be missing a success row in two ways the code itself acknowledges:

- `recordAttempt` wraps `AttemptModel.create` in try/catch and **swallows write failures** ("losing the record must not rewrite the outcome"). So a transient DB error on the success-path write leaves a post that went out with no Attempt row — no crash required.
- The reaper's own `UNKNOWN_OUTCOME` string exists precisely because "a crash in that window leaves a post that really went out with no Attempt to show for it."

`retryJob` never inspects the `UNKNOWN_OUTCOME` marker and never treats a missing attempt as "unknown — do not re-send." **Interleaving:** job fans out → account A publishes successfully → attempt write fails (or process crashes before it) → job lands in `failed`/`partial_failed` (via terminal write or reaper) → operator presses Retry → A is in `pending` → **second post to a live account**. The atomic claim and terminal-status restriction fix the *concurrent* double-click, but the crash/ledger-gap path — the exact harm the module header says is unfixable by cleanup — is still wide open. The claim "fixed by restricting retry to terminal statuses plus an atomic claim" addresses only the `running`-job race, not the incomplete-ledger case the reaper explicitly warns about.

### 2. Spread-order bug lets an adapter result clobber `status: 'published'`, converting a success into a recorded failure
**File:** `socialPublishFanOut.mjs`, success path:

```js
results.push({ provider: account.provider, status: 'published', ...result, accountId: account.id });
```

`...result` comes **after** `status: 'published'`. Any adapter whose return value carries a top-level `status` field (HTTP status, `'ok'`, a raw response body spread at top level) overwrites `'published'`. The comment claims this "normalizes the shape," but the order does the opposite for an adapter that *includes* a status. **Outcome:** a post that went out is rolled up as `failed`/`partial_failed` by `terminalStatus`, the job shows failed, and retry (finding no `'published'` attempt status either — the Attempt row *is* written as `'published'`, so this specific sub-case is partially shielded, but any adapter returning e.g. `status: 201` makes `result.status` truthy-but-not-`'published'` while the Attempt row says published — the *job-level* verdict and history are wrong, and any consumer of `platformResults` rather than the ledger will re-send). At minimum this is a wrong-verdict defect one adapter away from a duplicate post.

### 3. Reaper can close a *live* job and its verdict permanently wins
**File:** `socialJobScheduler.mjs` (`reapStuckJobs`, heartbeat in `runDueJobs`).

The heartbeat is fire-and-forget: `.catch(err => log.warn(...))`. If heartbeat updates fail for ≥15 min while the process and fan-out stay alive (DB failover, transient auth error on the write path, connection-pool exhaustion — all plausible on Render), the reaper selects the job, reads the Attempt ledger **before claiming**, and claims `running → failed/partial_failed`. The fan-out's later terminal `claim(job.id, 'running', …)` then affects 0 rows and only logs a warning — the reaper's verdict, computed from a snapshot taken before the in-flight accounts wrote their attempts, stands. Those accounts show `failed` with `UNKNOWN_OUTCOME`, and per finding #1, **retry re-posts them → duplicate**. The margin between `HEARTBEAT_MS` (60s) and `STUCK_AFTER_MS` (15min) only protects against *slow* jobs, not against *unrecorded* heartbeats. Claim 2 holds only while the heartbeat write succeeds; its failure mode is unhandled.

## P2 — Wrongly-demoted account (second-worst outcome)

### 4. Claim 1 is FALSE: the "harmless" persist-failure path kills the account, and the re-read has a race window
**File:** `socialCredentialRefresh.mjs` (`persistCredentials`, `performRefresh`).

The comment says: *"The cost of not persisting is that the next publish refreshes again, which is harmless."* That is wrong for a **single-use** token. Once `adapter.refreshSession` succeeds, the old `refreshJwt` is consumed. If `persistCredentials` then fails (it is best-effort and swallows all errors), the **stored** refreshJwt is dead. Next publish: stored accessJwt 401s → `canRefresh` true → refresh with the dead stored token → `invalid_grant` → `readStoredCredentials` returns the *same* dead token → `stored.refreshJwt === credentials.refreshJwt` → `reconnectRequired` → `markAccountUnhealthy` → **healthy account demoted to `needs_reconnect`, blocking all later publishing**. The re-read defence only works if the other instance's persist *committed*.

Same hole, cross-instance timing: instance B's refresh succeeds but its `row.update` hasn't committed when instance A's refresh fails; A's re-read still sees the old token (equal to what A presented) → A demotes the account. The re-read covers only *completed* rotations, not in-flight ones.

Additionally, `performRefresh`'s catch treats **any** refresh error as conclusive when the stored token matches: a transient network reset, DNS failure, or PDS 500 during `refreshSession` (after a genuine 401 on publish) throws `reconnectRequired` and demotes an account that would have recovered on the next attempt. And `readStoredCredentials` returns `null` on any read error, which the caller treats as "no rotation happened" — so a transient DB read failure during the re-read converts "refreshed elsewhere" into a demote. Three distinct paths to a false `needs_reconnect`, none covered by the claimed fix.

## P3 — Wrong/lost post content, permanently stuck jobs, resource leaks

### 5. Regression: `runDueJobs` drops media from scheduled posts
**File:** `socialJobScheduler.mjs`. The scheduler calls `publishToAccounts({ content, accountIds, jobId })` — **no `mediaUrl`**. The immediate path passes `payload.mediaUrl` and retry passes `job.media?.[0]?.url`. Every scheduled job with an image publishes **text-only**, silently. Real user harm: the wrong post goes out, and it can't be un-posted.

### 6. No timeout anywhere: a hung provider call = permanently stuck job + leaked timer/socket/map entry
**Files:** `socialPublishFanOut.mjs` (`adapter.publish` awaited with no timeout), `blueskyPublisher.mjs` (`fetch` with no `AbortSignal`), `socialCredentialRefresh.mjs` (`refreshInFlight`).

A hung PDS socket leaves `publishToAccounts` awaiting forever. The heartbeat then does its job *too* well: `updatedAt` is bumped every 60s forever, so the reaper never closes the job. The job sits in `running` indefinitely; `retryJob` refuses with "still publishing"; the heartbeat interval and socket leak for the process lifetime. Worse, if the hang is inside `performRefresh`, the `refreshInFlight` entry is never deleted and **every later publish for that account on this instance awaits a promise that never settles** — one hung refresh permanently wedges the account instance-wide. Flagged as requested: permanently stuck job, unbounded timer/socket/memory.

## P4 — Lower-severity correctness defects

### 7. `runDueJobs` has no catch around `publishToAccounts`
**File:** `socialJobScheduler.mjs`. Unlike the immediate path (which has a catch that writes `failed`) and retry (same), a throw out of the fan-out — reachable via `loadAccounts` on a deleted account id — propagates out of the loop: the claimed job is left in `running` with the heartbeat cleared (reaper closes it ~15 min later with all-`UNKNOWN_OUTCOME` results, telling the user "the post may have gone out" when nothing was ever sent), the remaining due jobs in the batch are skipped for the tick, and the exception escapes into the worker tick. Whether the in-process re-entry guard survives a throw is not shown; if it isn't exception-safe, **the worker never ticks again** — all scheduled publishing stops. Claim 4 ("all three writers … write terminally through a single guarded conditional UPDATE") is false for this path: the scheduler has no terminal write at all when the fan-out throws.

### 8. `AUTH_FAILURE` matches bare `403` → false demotes on non-auth rejections
**File:** `socialCredentialRefresh.mjs`. `/\b(401|403)\b/` classifies any 403 — including provider-side content/permission rejections that have nothing to do with token validity — as an auth failure, and the fan-out demotes on `AUTH_FAILURE.test(err.message)`. The comment claims the regex is "deliberately narrow"; including 403 makes it broad enough to demote a healthy account over a policy rejection.

### 9. Immediate publish ignores the guarded write's `affectedCount`
**File:** `nativeSocialPublishingService.mjs`. The scheduler logs and preserves the reaper's verdict when its terminal claim affects 0 rows; the immediate path's identical guarded `JobModel.update(..., { where: { status: 'running' } })` discards the result. If the reaper closed the job (heartbeat failure, finding #3), the HTTP caller is returned `{ status: 'published', … }` while the database and history say `failed`/unknown — a wrong outcome reported to the user, and inconsistent with the module's own "one rule."

## Deadlocks
None found. All mutual exclusion is single-statement conditional UPDATEs; the in-process map holds no locks across awaits in a way that can cycle.

## Verdict on the four claims
1. **False** — re-read covers only committed rotations; persist failure, persist-lag, transient refresh errors, and re-read failures all still demote healthy accounts (finding #4).
2. **Mostly true, incomplete** — heartbeat fixes the slow-job case but its write failures are swallowed, reopening the reap-live-job hole (finding #3), and it creates the inverse problem with no fan-out timeout (finding #6).
3. **False** — the terminal-status gate and atomic claim stop the concurrent-retry race, but retry still trusts an Attempt ledger that `recordAttempt` is explicitly allowed to lose and that the reaper itself labels UNKNOWN; the duplicate-post hole survives (finding #1).
4. **Mostly true, with exceptions** — the scheduler's throw path writes nothing (finding #7), the immediate path's guarded write is unchecked (finding #9), and the retry no-op path uses an unguarded `row.update`.
