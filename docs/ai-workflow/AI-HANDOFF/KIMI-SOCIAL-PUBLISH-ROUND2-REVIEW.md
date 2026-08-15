# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/kimi-packet/packet2.md
**Seed:** (none)
**Tokens:** 9549 in / 12788 out | **Cost:** ~$0.2205 | **Wall:** 221.4s | **finish_reason:** stop

---

# Round 2 — Defects introduced by the fixes, ranked by user harm

## 1. `withTimeout` re-creates the token-reuse race and burns the single-use refresh token (Fix 2) — a healthy account gets demoted and its rotated credentials are unrecoverable

The timeout releases the waiter but the provider call stays live, and **nothing persists a late-arriving success**. `performRefresh` only builds `rotated` and calls `persistCredentials` on the awaited success path; the abandoned `adapter.refreshSession` promise has no `.then` attached. AT Protocol refresh tokens are single-use, so a slow-but-successful refresh consumes the stored token and the replacement pair is dropped on the floor.

Interleaving A (no concurrency needed):

1. Publish → 401 → `refreshCredentials` → `adapter.refreshSession` is slow (PDS overloaded).
2. t=30s: `withTimeout` rejects. Message "did not respond within 30000ms" doesn't match `GRANT_IS_DEAD` → transient throw, account left 'connected'. Map entry deleted.
3. t=45s: the PDS completes the refresh. The stored `refreshJwt` is now dead; the new pair exists only in a promise nobody is holding.
4. Next publish → 401 → refresh with the dead stored token → PDS returns `ExpiredToken` / "Token has expired" → matches `GRANT_IS_DEAD` (`expired ?token`) → `reconnect()` → account demoted to `needs_reconnect`.
5. The re-read guard — the fix's own defense against exactly this — **cannot fire**, because `readStoredCredentials` returns the unchanged row: `stored.refreshJwt === credentials.refreshJwt`. The rotation happened at the provider but never reached the DB. There is no copy of the live credential anywhere in your system; Sean must reconnect an account that was healthy.

Interleaving B (worse — the timeout re-creates the race single-flight exists to prevent):

1. As above through step 2. The single-flight map entry is gone, but R1 is still live at the PDS.
2. t=31s: the next worker tick (or a retry) publishes to the same account → 401 → starts R2 with the **same** stored `refreshJwt`. Two concurrent refreshes, one token — precisely what single-flight was built to stop, and the timeout dismantles the stop.
3. R1 arrives first and wins; its tokens are discarded (abandoned). R2 gets the reuse/expired error → re-read finds the unchanged row → `GRANT_IS_DEAD` matches → demotion of a healthy account.

This is the same shape as the wedge you cite: the fix converts the failure mode it removed into a rarer but permanent one. Before, a hung refresh wedged the account until restart; now a slow refresh kills the account until a human reconnects, and scheduled posts fail silently in the meantime.

## 2. The transient no-demotion path is defeated by the fan-out's `AUTH_FAILURE` re-test — the account is demoted on the path whose recorded error says "the connection was left untouched" (Fix 4 + fan-out interaction)

`AUTH_FAILURE` and `GRANT_IS_DEAD` disagree on exactly one term: **`authentication`** (in `AUTH_FAILURE`, absent from `GRANT_IS_DEAD`). "Authentication Required" is a real XRPC error string. Now trace it:

1. Refresh fails with `err.message = "Authentication Required"` (e.g., an edge/proxy auth blip in front of the PDS).
2. `GRANT_IS_DEAD.test(...)` → no match → the fix's new transient path throws with `reconnectRequired = false` and the message `"...session refresh could not be completed: Authentication Required — the post did not go out; the connection was left untouched"`.
3. Fan-out catch: `if (err.reconnectRequired || AUTH_FAILURE.test(err.message || ''))` — `reconnectRequired` is false, but the transient message **embeds the original provider string**, and `AUTH_FAILURE` matches "authentication" → `markAccountUnhealthy` → `needs_reconnect`.

The entire purpose of Fix 4 — transient refresh failures must not demote — is void for any provider message containing an `AUTH_FAILURE` term that `GRANT_IS_DEAD` lacks. Worse, the Attempt row and job history record the sentence "the connection was left untouched" next to an account that was just demoted, so the forensic trail actively lies about what happened.

The latent reverse hole sits underneath this: if you fix the fan-out to honor `reconnectRequired === false`, then a genuinely dead grant that the PDS reports as "authentication failed" (rather than `invalid_grant`/`ExpiredToken`) will refresh-fail forever as "transient" — the account is never demoted, never flagged, and every scheduled post fails silently. The two regexes need to be one decision, not two.

## 3. `GRANT_IS_DEAD` demotes on infrastructure 401/403/"unauthorized" — the accepted #8 false-positive, moved onto the demotion trigger where the harm is far larger (Fix 4)

You asked what a real PDS returns. A PDS behind nginx/Cloudflare returns, during a restart, misconfiguration, or WAF event: "Request failed with status code 403" (axios-style, matches `\b403\b`), "401 Authorization Required" (matches `\b401\b` and `unauthorized`-class text). These say nothing about the grant — the request never reached the token endpoint — but `GRANT_IS_DEAD` treats them as a provider verdict of death.

This is not a re-report of #8. #8 was `AUTH_FAILURE` matching a bare 403, which only decides **whether to attempt a refresh** — a cheap, recoverable action. Fix 4 put the same patterns into the regex that decides **whether to demote the account and block every later publish**. A 60-second Cloudflare event during a refresh now flips the account to `needs_reconnect`, and per Fix 4's own comment, "blocks every later publish for it until he does." The fix narrowed false demotion on the network-error axis and widened it on the proxy-error axis.

## 4. Fix 6 was applied to the immediate path only — `retryJob`'s terminal write is still a guarded write whose result is ignored, which your own comment defines as "the same bug, quieter"

`socialJobRetry.mjs`:

```javascript
await JobModel.update({ status, platformResults: merged, ... },
  { where: { id: job.id, status: 'running' } });
return { status, results: merged, jobId: String(job.id), retried: pending };
```

No `[closed]` read, no divergence handling — while `socialImmediatePublish.mjs` carries a comment explaining exactly why that is a bug. Interleaving: retry claims into `'running'` → heartbeat writes start failing (DB pool exhaustion, or a reaper on a second instance with clock skew — heartbeat only protects against *staleness this instance's clock measures*) → reaper closes the job as `failed`/UNKNOWN → the fan-out finishes, posts went out, attempt rows exist → the guarded update no-ops → **the operator is returned `{ status: 'published', results: merged }` with no flag at all** while the job record says failed. The operator's obvious recovery is to publish again → duplicate posts to live accounts. The immediate path at least returns `recordedVerdictDiverged`; retry — the path whose entire user is a human recovering from a failure — returns unqualified success. The same applies to retry's catch-path update, which is lower harm (it only loses the failure record).

## 5. `recordedVerdictDiverged` is reachable and returns success-shaped data that nothing consumes (Fix 6)

Reachability: the reaper can only win the race if heartbeats fail for 15 minutes while the fan-out continues — DB write failures on the heartbeat (accepted #3 makes these silent), or a second-instance reaper with clock skew. Narrow but real, and it is the *only* close-loss path, so the flag exists precisely for it.

The defect is the response shape: `{ ...result, jobId, recordedVerdictDiverged: true }` still carries `status: 'published'`. No caller in this codebase reads the flag; any UI keyed on `status === 'published'` renders success while the durable record — the thing `getHistory` shows and the thing the user will act on — says failed with "outcome UNKNOWN, verify before retrying." The fix detected the divergence and then reported it in a channel nothing listens to, on the one path with a human synchronously waiting for the answer. If the verdicts diverge, the response should surface the *recorded* verdict (or a conflict), not the in-memory one with a boolean footnote.

---

**Checked and clean** (since you asked directly): `withTimeout` does not leak (the `finally` clears the timer on both settle paths), does not double-settle (`Promise.race` semantics), and does not produce an unhandled rejection when the abandoned promise later fails — the race's internal subscription counts as a handler. The late-*success* path is the defect (#1), not the plumbing. The new `catch` in `runDueJobs` interacts correctly with the heartbeat and `finally` (interval is cleared before `continue`; the guarded claim can't overwrite a reaper verdict), and its only reachable throw source, `loadAccounts`, fires before any provider call, so it cannot strand a partially-published job.
