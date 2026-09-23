# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 19373 in / 20200 out (reasoning: 14655) | total 39573
**Wall:** 500.6s

---

## VERDICT (3-5 sentences)

The ledger schema and the pure evaluation logic are competent; the composition is where it leaks. The single worst defect is that the monitor's only consumer is itself: every alarm, including "the digest stopped firing," is observable only by running the digest, and nothing external reads the ledger — so the slice's stated purpose ("silence becomes information") is achieved only for a human who is already watching for silence, which is the habit this slice claims to remove. The second-worst is `createPublishedProbe`: the silent-rot suppression signal is derived from the rows the failing pipeline writes, so it self-suppresses during exactly the outage it exists to catch. Third: all three staleness thresholds (26h/48h/72h) are unreachable through the shipped composition because the window is 24h — the alarms fire at ~24h with wrong detail messages, and the threshold config is a placebo that the tests-validate-pure-function-only approach hides. Ship-able core, but the headline claims are currently true of the test suite, not the system.

## Q1 SILENT-FAILURE PATHS

| # | Path | Trace | Verdict |
|---|------|-------|---------|
| 1 | Scheduler never invokes the heartbeat | Digest dies → no rows of kind `digest` → but `evaluateHeartbeat` contains **no alarm on digest recency**. The only reader of the ledger is the digest. Silence is detectable solely by a human checking "no Telegram message," which is the pre-slice habit. | **Design hole.** Needs an external dead-man switch (ping healthchecks.io-style on every run) or a second, independent reader. The blueprint comment "the absence of these rows is visible in exactly the same ledger" answers *where*, never *to whom*. |
| 2 | `runs.start()` throws (DB down) | `ingestHeartbeatRunner.ts` `run()`: the `start` call is outside any try/catch → propagates → entrypoint catch prints generic "ingest heartbeat could not complete", exit 1, **nothing delivered, no row**. Correct that no false-ok is possible, but the only signal is the scheduler's exit-code handling — which does not exist in this slice. | Half-blind. DB-down — the exact moment you want a heartbeat — produces zero messages by construction. Acceptable only if #1's watchdog exists. |
| 3 | `creatorsPublished` probe throws | Caught by the evaluation try/catch → run recorded `failed: evaluation failed` → rethrow → generic exit 1. No delivery. Same as #2. | OK-ish, same caveat. |
| 4 | Backward clock jump (NTP correction, manual change) | `hoursSince()` goes negative → every staleness and in-flight check passes (`-5 < 26`, `-5 < 6`). **The monitor is fully blinded for the skew duration**, and `no_successful_fetch` too (a fresh-looking success suppresses it). No `hoursSince < 0` sanity guard anywhere. | Real miss. One line: treat negative age as an alarm (`clock_skew`) or clamp+alert. Forward jumps cause the opposite (alarm storm) — less dangerous. |
| 5 | First run ever, empty table | Window contains only self (excluded) → `no_run` alarm + `canary_stale` attention on day one. True but noisy; bootstrap is undocumented. | Minor; document or seed. |
| 6 | Digest self-pollution | Self excluded by `r.id !== self.id` — correct. But **previous digest rows in the window** inflate `totals.runs` and the `low_success_rate` denominator. Reruns bias the rate toward passing (denominator up, good count up). | Cosmetic-to-minor; no self-alarm loop. The `crashed_run` scan correctly includes *other* digests. |
| 7 | Partially written ledger | Single-row insert/update; the only torn state is start-without-finish → in-flight row → `crashed_run` after 6h. This one is genuinely covered. | Sound. |
| 8 | Fail-closed delivery default | With `SWANGUARD_HEARTBEAT_DELIVERY` unset (the shipped default), **every** digest run records `failed: delivery is not configured`, exit 1, and no notification ever exists. The ledger is honest; the human sees nothing. The system as shipped does not do the one thing the slice is for. | See Q6. |

DST: irrelevant — everything is UTC via `toISOString`/`timestamptz`. That part is right.

## Q2 ALARM CORRECTNESS

| Alarm | False-fire risk | Miss risk |
|---|---|---|
| `no_run` | (a) Desktop sleeps 12h → no run for 26h → alarm on wake even though nothing is broken (the code itself names sleep/reboots as expected; nothing suppresses for sleep). Repeated per sleep cycle → mute. (b) The `hoursSince > maxHoursSinceRun` branch is **dead in composition**: with a 24h window, a 25h-old ingest is simply absent, so the `!lastWorkRun` branch fires instead with the detail "the fetch step never fired" — **a lie** when the fetch ran yesterday. Message/reason rot trains the reader to distrust the alarm. | Covered: empty window and no-ingest-window both fire at alarm severity. Except: if the heartbeat itself is dead — circular, see Q1 #1. |
| `crashed_run` | Backfill is explicitly a "catch-up lane (separate rate budget)" across 51 creators. A legitimate multi-hour backfill in flight >6h alarms **every digest during the catch-up** — precisely when the operator is paying attention. No per-kind in-flight threshold. | Runs whose `start()` threw write no row → invisible (falls back to `no_run` at 24h). Acceptable. |
| `canary_failed` | Low. Requires `finishedAt`, so in-flight canaries don't trip it (good negative control). | **Nothing in this slice creates canary runs.** If no scheduler fires them [UNSURE — not in packet], `canary_failed` can never fire and its positive test is unfalsifiable in production. |
| `canary_stale` | Threshold says 48h; window is 24h → any window without a canary alarms *attention*, i.e. effectively at 24h. If the canary job isn't wired, this fires **every day forever from install** → guaranteed alert fatigue → the owner mutes the whole channel, and now the real alarms are muted too. | Same threshold-deadness: the `hoursSince > 48` branch is unreachable via the runner. |
| `no_successful_fetch` | Fires at 24h, not the declared 72h (see Q1/threshold analysis): `lastSuccessfulFetch` can be at most 24h old, so `hours > 72` is satisfiable only by "none found in window". The 72h continuity story ("three dead days") does not exist — it's a 24h-existence test. | **The big one.** `creatorsPublished` reads `creator_item.published_at` — rows written *by the pipeline being monitored*. Pipeline dead >24h ⇒ no new items ⇒ probe returns false ⇒ alarm suppressed. The comment about `fetched_at` vs `published_at` rearranges deck chairs: both live in the same failure domain. The suppression only works if the publishing signal is external (Data API activities check on a separate quota lane) or if another lane (backfill) writes items independently [UNSURE whether backfill runs during ingest outages]. Additionally, `counts.fetched` semantics are undefined: newly-stored? videos-seen? post-dedupe? The alarm's soundness depends entirely on this convention and nothing enforces it. |
| `low_success_rate` | n≈3–4 completed runs/day: **one** canary flake → 2/3 = 67% → attention. Any real deployment with daily cadence will see this weekly → mute. Also conflates notification-health (failed digest deliveries) with pipeline-health in one number, undifferentiated in the message. | Crashed runs are excluded from the denominator (`finishedAt` required) — deliberate, but it means a crash-heavy week with two clean successes shows 100%. Covered by `crashed_run`, so acceptable. |

Threshold/table summary: `maxHoursSinceRun: 26`, `maxHoursSinceCanary: 48`, `maxHoursWithoutSuccessfulFetch: 72` are all **unreachable through the shipped runner** (`since(now − 24h)`). The alarms still fire — earlier and with wrong detail text — so this is not a silence hole, it is a config-placebo plus message-honesty hole. The "NEGATIVE CONTROL: stays quiet at 25h" test passes only because it feeds the pure function by hand; production cannot produce that input (Q5).

## Q3 SQL

| Item | Finding |
|---|---|
| Types/constraints | `timestamptz` everywhere, UTC in/out — correct. No `check (finished_at is null or finished_at >= started_at)` — a caller bug (or clock jump) can produce negative durations silently. Cheap to add. |
| `counts jsonb` | No `check (jsonb_typeof(counts) = 'object')`. A string ('"x"') is storable; `toRunRecord` even has a tolerance branch for it — the code expects its own schema to be violated. Constrain it. |
| Upsert semantics | None used — `start` is a plain `INSERT`, so a same-second id collision is a PK violation, not an upsert (Q4). `finish` is an unconditional `UPDATE ... where id = $1`: no `and finished_at is null`, so double-finish is last-writer-wins with no detection, and `finished_at` can be moved backwards. |
| `ingest_run_started_idx` | Used by `recent`/`since` (`order by started_at desc limit`, `started_at >= $1`). Correct. |
| `ingest_run_kind_started_idx` | **Likely dead.** The only per-kind query is `recent({kind})`, written as `where ($1::text is null or kind = $1)`. Under generic plans the planner cannot prove `$1` non-null and cannot use the kind index [UNSURE on exact planner behavior across PG versions — but the OR-null anti-pattern is why the index probably goes unused]. The heartbeat's per-kind logic is all in JS over `since()` results, so nothing else needs this index. Fix: build the predicate conditionally in SQL, or accept the index is decorative. |
| `ingest_run_unfinished_idx` | **Definitively dead.** The migration comment claims it exists for "crashed-run detection" — but detection happens in JS over the 24h window; **no shipped query filters `finished_at is null`**. Decorative index, justified by a consumer that doesn't exist. Either write the "list crashed runs" query that uses it or drop it. |
| `started_at default now()` | Unused in practice — both stores always supply it. Harmless. Divergence note: `created_at` uses DB clock while `started_at` uses caller clock; benign. |
| `quota_units_spent` cross-check | Aspirational: nothing in this slice sums the ledger against the CB5 ledger. The "difference is the bug" sentence describes a check that nobody performs. |
| DOWN block | Consistent with the stated convention; idempotent; ordering (table last) correct. |
| id format | Migration example says `'20260903T0630Z-...'` (minute resolution); `buildRunId` emits seconds (`20260903T063000Z-...`). Cosmetic doc lie in a file whose whole job is honest records. |

## Q4 CONCURRENCY AND CRASH SEMANTICS

| Scenario | Behavior | Assessment |
|---|---|---|
| Two runs, same second, same kind | `buildRunId`: second-resolution stamp + **16 bits from `Math.random`** → 1/65536 collision. Memory store: `Map.set` silently overwrites — destroying exactly the evidence row, as the code's own comment admits. Postgres: PK violation → `start()` throws → **the run leaves no row at all** and the caller (future ingest job) sees an exception whose relation to "id collision" is opaque. | Inadequate. Uniqueness is the requirement; `Math.random` is the wrong primitive — `crypto.randomUUID()` slice or a DB-side default. The failure is rare, catastrophic, and trivially preventable. The in-repo test for collision is vacuous (Q5). |
| Two processes concurrently | Both `start` fine (distinct randoms), both evaluate, both deliver — duplicate digests, no lock. For a one-owner desktop, tolerable; but nothing documents "singleton expected." No lease/`pid`/`host` column, so a "who is running this?" question is unanswerable from the ledger. | Acceptable, undocumented. |
| Crash between `start` and `finish` | Row survives with `outcome='failed'`, `finished_at null` → `crashed_run` after 6h. **This is the slice's core mechanism and it works.** | Sound. |
| `finish` for a row another process finished | Unconditional UPDATE, last writer wins, both callers see success. A zombie process resuming after laptop sleep can overwrite the "crashed" narrative with a late success — which is arguably *correct* (the work did complete), but it's silent history rewriting; `finished_at` gets the resume time and the earlier `crashed_run` alarm is never retracted or annotated. | Add `where finished_at is null` + detect zero-row update, or accept and document. |
| Restart mid-run | New process starts a *new* row; the orphaned row trips `crashed_run` at 6h even though the work resumed. No claim/resume linkage between rows. | False alarm per restart-after-crash; contributes to mute risk. |
| `maxHoursInFlight: 6` vs legitimate long runs | See Q2 `crashed_run` — backfill lane has no exemption. | Per-kind thresholds needed. |

## Q5 TEST SUITE HONESTY

Weak tests, named:

1. **`buildRunId` "does not collide for two runs that start in the same second"** — uses different *kinds* *and* different random draws. It proves the kind is embedded in the id and nothing else. The actual collision case (same kind, same second, same draw) is untested and would fail.
2. **`NEGATIVE CONTROL: stays quiet at 25h, just inside the 26h limit`** — misleading green. Through the runner, a 25h-old run is *outside the 24h window*; production hits the `!lastWorkRun` branch (different code path, different message, fires *earlier*). The test validates a branch that composition cannot reach, and masks the threshold-deadness in Q2. Same defect in the 60h `canary_stale` test.
3. **`the failure becomes visible to the NEXT evaluation`** — asserts `totals.failed > 0`, not that any *alert* fires. The blueprint's claim "an undelivered heartbeat becomes visible" is proven only at the totals level. With this seed set the rate is 2/3 and `low_success_rate` would fire — assert that, or the claim is unproven.
4. **Zero Postgres-store tests.** The shipped SQL — column lists, `$4::jsonb`, the three `coalesce`s, the OR-null predicate, `toRunRecord`'s string-counts and epoch-fallback branches — is exercised only by `createMemoryIngestRunStore`. The memory and PG stores are behaviorally different artifacts (overwrite vs throw on collision; no `finished_at` guard equivalence). The mutation-test claim covers one memory-store default.
5. **No test for `createPublishedProbe`** — the one piece of real creator-data SQL, the self-suppression hotspot, and the `published_at`-not-`fetched_at` claim, all unverified.
6. **No composition-level window/threshold consistency test** — nothing runs the *runner* with a stale-but-in-window boundary and asserts which message appears. That is exactly where the 24h/26h mismatch lives.
7. **`ingestHeartbeatCli.ts` has no regression proof** — the "proof it runs" is a manual `npm run` assertion in a comment. The repo's own inert-runner precedent (`retention:command-receipts`) shows exactly how this rots. A CI test spawning the CLI and asserting non-silent exit is cheap [UNSURE whether the contrast test claimed in the packet is automated or was a one-off].

Not tested that should be: PG id-collision behavior, double-finish, negative-age (clock skew) suppression, digest-rerun effect on totals, `toolVersion` selection taking a non-canary run's version, render truncation, partial-injection footgun (`runs` without `creatorsPublished` silently falls through to `loadConfig`).

## Q6 DELIVERY DESIGN

- **Fail-closed default is principled and wrong-by-outcome.** As shipped, every run records `failed: delivery is not configured`, exit 1, and no message exists anywhere except cron stdout. The slice's KPI — "the owner is told" — is unmet by the shipped configuration. The honest-ledger argument is fine; the missing piece is that fail-closed without a watchdog (Q1 #1) means the *only* observable is an exit code nothing is watching.
- **"Visible to the NEXT evaluation" is half-true.** True for *transient* delivery failure: run N's failed row enters run N+1's window, drops the rate to 2/3 < 0.8, `low_success_rate` fires attention — and, crucially, run N+1's delivery works, so the owner hears about it. False for *persistent* failure: every subsequent digest also fails to deliver, so the attention verdict renders into a message that goes nowhere, forever. The mechanism self-corrects only when the failure is already over — which is when you least need it. The runner test proves the half that works and stays quiet about the half that doesn't.
- **Not rethrowing on delivery failure is right** — the ledger row must survive, and `exit(1)` covers the scheduler layer. But note the asymmetry: evaluation failure rethrows *and* the row is written; delivery failure swallows *and* the row is written. Consistent enough.
- **What breaks when the real adapter arrives:** (a) `resolveHeartbeatDelivery` needs a new mode + test — fine; (b) `renderHeartbeatDigest` has no length cap — Telegram's 4096-char limit will eat alarm-day messages with many alerts [UNSURE if Telegram is the intended target]; (c) `HeartbeatDelivery.send(message, severity)` already carries severity — good; (d) the day the adapter lands, `low_success_rate` will fire once with the accumulated backlog story — harmless.
- **`severity` param is unused by `createLogHeartbeatDelivery`** — fine today, but nothing tests that severity actually reaches the adapter, so a future adapter that ignores severity will pass the suite.
- Minor: `process.exit` immediately after `console.log` on the undelivered path can truncate piped stdout on Windows [UNSURE — platform-dependent]; flush before exit or write via `output.error`.

## Q7 WHAT WAS MISSED

1. **No dead-man switch.** The recursion problem is acknowledged in a comment and then treated as solved. It isn't. One HTTP ping to an external watchdog per run closes it for ~zero cost; the migration's own rhetoric ("the absence of a row is the highest-severity signal") demands a reader that isn't the row-writer.
2. **No canary, no backfill, no scheduler.** This slice watches three kinds (`canary`, `backfill`, `digest`) that nothing in the packet produces, and defines no cadence for the one it does. Until they're wired, `canary_stale` fires attention *daily from install* — the monitor ships pre-ruined for the mute-training the file's own header warns about. [UNSURE whether canary wiring lives in another slice; nothing here references it.]
3. **`tool_version` is unenforced.** Rule 4's whole story ("yt-dlp broke" becomes "a diff between two rows") depends on canary rows carrying it; no constraint, no writer, no check that the canary's finish includes it.
4. **The probe's failure domain** (detailed in Q2) — the fix is an external publishing signal or accepting quiet-week noise with an honest message.
5. **No alarm ever reads digest recency.** Even granting the recursion, a `maxHoursSinceDigest` check would at least let *any other* consumer (health endpoint, the brief builder) detect a dead digest from the ledger. Right now `kind='digest'` rows are write-only.
6. **No retention story for `ingest_run`** — ~1.8k rows/yr, trivial, but this repo has an explicit retention-lane precedent; the omission will surface as a lint complaint later.
7. **Digest timestamps are raw UTC ISO strings** rendered "for a phone at 07:00". The rendering rationale is human-first; `2026-09-03T06:30:00.000Z` is not.
8. **Partial injection footgun:** `runHeartbeatOnce` requires `runs && creatorsPublished` to take the injected path; passing only `runs` silently drops into `loadConfig` and throws about database mode — a confusing diagnostic for a test-authoring typo. Throw on partial injection.

## RANKED FIX LIST

| # | Severity | File | Change | Why |
|---|----------|------|--------|-----|
| 1 | High | `ingestHeartbeatRunner.ts` (+ new) | Ping an external dead-man switch (or any out-of-band reader) on every successful `run()`; document that in-ledger digest staleness is unreadable by design | Silence must be detectable by something that isn't the silenced thing — the slice's entire thesis |
| 2 | High | `ingestHeartbeatEntrypoint.ts` | Replace `createPublishedProbe` with a publishing signal that does not depend on the ingest pipeline's output (Data API activities on a separate quota lane), or drop the suppression and make the message honest about a possible quiet week | The rot alarm currently self-suppresses during the rot it exists to catch |
| 3 | High | `ingestHeartbeat.ts` / `ingestHeartbeatRunner.ts` | Make `windowHours ≥ max(thresholds)` structurally true (derive window from thresholds or vice-versa), and fix the `!lastWorkRun` detail to say "not seen in window" rather than "never fired" | Three shipped thresholds are dead config; the messages lie about the failure mode |
| 4 | Med-high | `ingestRun.ts` | Replace the 16-bit `Math.random` suffix with `crypto.randomUUID().slice(0,8)` (or DB-generated id); retry once on PG conflict | A collision destroys evidence rows or aborts a run with no row — cheap, permanent fix |
| 5 | Med-high | `ingestHeartbeat.ts` | Add a small-n guard to `low_success_rate` (skip below ~5 completed, or widen floor) and split notification-failures from pipeline-failures in the detail | One canary flake/day = permanent attention = muted channel |
| 6 | Med | `ingestHeartbeat.ts` | Per-kind `maxHoursInFlight` (exempt or raise for `backfill`); add `clock_skew` alarm when any `hoursSince` is negative | Backfill catch-ups and NTP corrections both false-fire or blind the monitor |
| 7 | Med | migration `0030` / `ingestRun.ts` | Add `check (finished_at is null or finished_at >= started_at)` and `check (jsonb_typeof(counts) = 'object')`; add `where finished_at is null` to `finish` and handle zero-row update | Enforce invariants the JS currently trusts; make double-finish detectable |
| 8 | Med | tests | Add a PG-store suite (or throwaway-container tests) covering `finish` coalesce paths, collision→throw, OR-null filtering, `toRunRecord` branches; fix the vacuous collision test; assert `low_success_rate` fires in the next-evaluation test | The shipped SQL is currently untested; several "negative controls" pass for the wrong reasons |
| 9 | Med | `ingestHeartbeat.ts` | Gate `canary_failed`/`canary_stale` behind "canary job configured" or suppress until first-ever canary row exists | Pre-wired permanent attention trains the mute the header warns about |
| 10 | Low | migration `0030` | Drop `ingest_run_unfinished_idx` or ship the query that uses it; rewrite the kind query without OR-null or drop the kind index | Dead/decorative indexes in a table whose comment block claims each index earns its keep |
| 11 | Low | `ingestHeartbeatEntrypoint.ts` | Throw on partial injection (`runs` xor `creatorsPublished`); localize timestamps in `renderHeartbeatDigest`; cap message length | Footguns in the two places a future maintainer will first touch |
