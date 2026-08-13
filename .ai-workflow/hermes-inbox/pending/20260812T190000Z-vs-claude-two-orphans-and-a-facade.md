# Two orphaned subsystems, one lying endpoint, and three bugs that read fine today

**Surface:** Creator render pipeline · **Agent:** vs-claude (Opus 5)
**On main:** `15eba8b05`, `ec94f372b` · deploy verified (health 200, site 200) · 130/130 creator suites

Slices A+B of the creator pipeline. The audit that produced them found something worth
recording on its own: **the pipeline had two fully-built, fully-tested subsystems that
nothing called, plus an endpoint that reported success for work it never started.**

## The shape of the problem: "built" is not "reachable"

- `videoRenderJobService.mjs` — complete queue API (create/lease/heartbeat/complete/fail/
  sweep), unit-tested. **Zero consumers.** Only its own model and its own test referenced it.
- `sweepExpiredLeases()` — the reaper the entire lease design depends on. **Wired to
  nothing.** A worker takes a lease, extends it by heartbeat, and if `kill -9`'d the lease
  "expires" — but with no sweeper, expiry means nothing happens. The row sits in `leased`
  forever at 47% and the retry the retry-count column exists to allow never fires.
- `POST /api/content-studio/render-job` — validated a template id, best-effort wrote to an
  unrelated log table, returned `success: true, status: 'waiting'`. **Nothing rendered.**

**Rule: building a mechanism and not scheduling/calling it is indistinguishable from not
building it — except that it LOOKS handled in code review, and its tests pass. Ask of
every new subsystem: who calls this, and can that caller actually reach it?**

This is the sibling of a rule already in the corpus ("is there a consumer?" needs "can the
consumer reach it?"). I wrote that rule, and then shipped a reaper wired to nothing.

## The half-fix I refused to ship

Making the endpoint do a real insert fixes the WRITE but not the PROMISE. Verified against
production: `{"live":0,"total":0}` — zero workers enrolled. A genuine row in a queue with
no worker is the SAME false claim in better clothing, and **harder** to detect because the
row really exists. So enqueue and expectation shipped together: the response reports
whether anything will actually pick the job up, distinguishing three cases with different
operator fixes (none enrolled / enrolled but offline / online but lacking the capability).

**Rule: when you replace a lie with a mechanism, check that the mechanism does not restate
the lie at a lower level. "Queued" implies motion; if nothing can move it, saying only
"queued" is the same deception with better provenance.**

A commit fixing the identical class landed on main from another agent while I wrote this:
`fix(marketing): publish reported success when every platform failed`.

## Three bugs found by hostile rounds — all of which read CORRECTLY today

The through-line: each returns a plausible value under current conditions and goes wrong
only when the feature is actually used.

1. **The sweeper ran and said nothing.** `sweepExpiredLeases()` returns
   `{requeued, failed}`; my cron did `Number(result || 0)` → **NaN**, and `NaN > 0` is
   false. It would have reclaimed correctly and logged ZERO lines forever — a crash-looping
   agent stranding jobs every minute would look exactly like a healthy quiet system. I
   wrote defensive handling for two shapes I GUESSED (array, number); the real shape was a
   third. Reading the service would have taken ten seconds.
2. **The presence query counted capabilities, not agents.** `COUNT(*)` after
   `LEFT JOIN LATERAL jsonb_array_elements_text(capabilities)` counts JOINED ROWS. Verified
   on synthetic rows: 3 agents / 2 live reported as **5 / 4**. It read correctly against
   production **only because zero agents exist** — so it would have gone live undetected and
   broken the instant the first worker connected, inflating `live` until the module claims a
   capable worker exists when none does. That is the exact failure the module was written to
   prevent.
3. **Idempotency without a window means "render once, ever."** `createJob` matches
   `{userId, key}` with no time bound, so a content-derived key returns the FIRST job
   forever — no deliberate re-render, and no retry after a FAILED render, because the replay
   hands back the failed row. Now bucketed at 60s.

**Rule: a value that is correct because a table is EMPTY is not verified — it is untested.
Zero rows make aggregate bugs invisible. Verify aggregate SQL against synthetic rows that
exercise multiplicity, exclusion, and empties, because production will not have them until
the day it matters.**

## Mistakes I made

- **Shipped a reaper wired to nothing**, three hours after writing the rule about consumers
  being able to reach what you build.
- **Guessed a function's return shape and wrote defensive code for two wrong guesses**
  instead of reading it. The defensiveness made it look careful while being silent.
- **Wrote fail-OPEN logic inside the one function whose job is to fail closed.**
  `describePresence` tested `presence.live === 0`, which is FALSE for `undefined`, so a
  malformed object returned `startable: true`. Caught by my own unit test — one of the few
  times this session the code, not the test, was the defect.
- **My test contaminated its neighbours.** A per-user isolation test used
  `vi.resetModules()` + `doMock`; that re-registered the auth mock globally and every later
  test in the file ran as the wrong user, so owner-scoped assertions started failing.
  **Tenth cycle this workstream where my harness, not the shipped code, was the defect.**

## Dry-loop ledger

| Round | Vantage | Result |
|---|---|---|
| 1 | sweeper contract — what does the service actually RETURN | **FOUND** — NaN, reaper mute forever |
| 2 | presence SQL vs synthetic multi-capability rows | **FOUND** — counts inflated 5/4 vs 3/2 |
| 3 | idempotency key semantics over time | **FOUND** — permanent replay, no retry after failure |
| 4 | full backend regression | CLEAN — 8795 pass, same 6 pre-existing failures |
| 5 | route shadowing + mount-order (Rule 31) | CLEAN — mounted at api.mjs:46, no capture |

`CLEAN x2 (rounds 4, 5)`

## Open

- **Nothing renders yet.** The queue is real and truthful, but zero workers are enrolled and
  no agent exists. The endpoint now says so out loud instead of implying progress.
- **Remotion is still a decision, not a build** — the templates the endpoint accepts have no
  renderer behind them.
- The sync engine (`mediaSync`) still has zero consumers; the ingest endpoint is the next
  slice that gives it one.
