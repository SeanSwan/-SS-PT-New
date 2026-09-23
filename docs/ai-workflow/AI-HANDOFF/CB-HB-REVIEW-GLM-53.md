# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 19373 in / 22711 out (reasoning: 18440) | total 42084
**Wall:** 533.2s

---

## VERDICT

The skeleton is sound — write-before-work, the `failed`-until-proven-otherwise in-flight default, and fail-closed delivery are real design wins and the crash-distinction tests are genuine. But two defects gut the commissioning purpose. First, `createPublishedProbe` derives `creatorsPublished` from `creator_item` rows whose *existence* is mediated by the fetch pipeline it monitors, so the `no_successful_fetch` alarm — the exact yt-dlp-green-empty scenario this slice was funded to catch — is structurally suppressed in the only state that matters; the probe's comment defends against `fetched_at` self-suppression while missing that `published_at` rows cannot exist without a fetch either. Second, the default evaluation window (24h) is narrower than three of the five thresholds (26h/48h/72h), making those thresholds unreachable and converting documented slack (a 25h machine sleep, one missed nightly canary) into premature alarms with factually wrong messages. Worst single defect: the vacuous `creatorsPublished` suppression.

## Q1 SILENT-FAILURE PATHS

| # | Path | Trace | Detected? |
|---|------|-------|-----------|
| 1 | Scheduler never invokes the CLI | Nothing in this slice registers a cron/launchd/Task job; verification only proves the command *can* run. [UNSURE whether a scheduling slice exists elsewhere in the repo] | No. Detectable only by a *working* digest noticing missing `digest` rows — circular. The repo's own named death ("machinery shipped, feeding never wired") now applies to the monitor itself. |
| 2 | `runs.start()` throws (DB down) | `ingestHeartbeatRunner.run()` — `const self = await runs.start(...)` is outside both try blocks; propagates to `runHeartbeatEntrypoint` catch → generic message + `exit(1)`. | Only via scheduler exit-code — which is destroyed by #3. |
| 3 | Default delivery unconfigured → **every normal day exits 1** | `resolveHeartbeatDelivery` fails closed; entrypoint exits 1 on `!delivered`. Baseline failure = real failure on the exit-code channel. The fail-closed honesty purchase destroys the only out-of-band signal the slice has. | No — indistinguishable from #2. |
| 4 | Crash between a digest and the next digest | `crashed_run` fires only for unfinished rows *inside the 24h window*. A run crashing at digest+ε is 24h+ε old at the next digest → excluded by `runs.since()` → **never alarmed**. Same for ingest crashes just after a digest. | No. `ingest_run_unfinished_idx` was built for exactly the unbounded `finished_at is null` sweep and **no shipped query uses it**. |
| 5 | Threshold > window inversion | `since = at − 24h` in the runner; `maxHoursSinceRun=26`, `maxHoursSinceCanary=48`, `maxHoursWithoutSuccessfulFetch=72` can never be evaluated against a run older than 24h. See Q2. | N/A (causes false fires, wrong messages). |
| 6 | `creatorsPublished` vacuous | See Q2 — alarm suppressed in the commissioned failure state. | No. |
| 7 | First run, empty table | `no_run` fires at `alarm` on install day — noise, not silence, but trains "day-one alarms are normal." | Inverse-direction issue. |
| 8 | Clock/time | All comparisons via `toISOString()` (UTC ms) — DST-safe, skew-safe between start/finish (same injected `now`). Digest prints raw `…Z` timestamps to a human at 07:00 local — readability, not correctness. | — |
| 9 | Malformed row from DB | `toRunRecord`'s `iso()` throws `RangeError` on unparseable strings and `JSON.parse(counts)` can throw — inside the read path, contradicting its own "tolerate rather than throwing inside a monitor" comment. Caught by the evaluation try → failed row + rethrow. | Yes, degraded. |
| 10 | Prior digest rows entering/leaving the window on scheduler jitter | `filter(r => r.id !== self.id)` excludes only *self*; yesterday's digest flickers in/out of `totals` by minutes of jitter. | Cosmetic. |

## Q2 ALARM CORRECTNESS

| Alarm | False-fire risk | Miss risk |
|---|---|---|
| `no_run` | **High.** Window 24h < threshold 26h: an ingest 25h old (the documented sleep/reboot slack the 26h threshold exists to tolerate) is *excluded* by `runs.since()` → falls into the `!lastWorkRun` branch → **alarm** with message "the fetch step never fired" — factually false; it fired 25h ago. The `hoursSince > maxHoursSinceRun` branch is dead code under runner defaults. | Only via Q1 #1 (heartbeat itself dead). |
| `crashed_run` | Low — 6h < 24h window, in-flight rows visible. | **Real.** Crash at digest+ε ages past the window before the next evaluation (Q1 #4). Also nothing ever finalizes stale in-flight rows; they don't accumulate alarms, they evaporate. |
| `canary_failed` | None found — in-flight exclusion is correct and negatively tested. | The canary producer does not exist in this slice [UNSURE if shipped elsewhere] — nothing writes `kind='canary'`, so this alarm cannot fire in production yet. A canary that crashes before `finish` surfaces as `crashed_run`, not `canary_failed` (defensible). |
| `canary_stale` | **High, chronic.** With a 48h threshold and 24h window, a canary 25–47h old is invisible → the `!lastCanary` branch fires "no canary run in the window" *attention* at 24h, not 48h. Until the canary slice ships, this fires **every single day** — attention fatigue from day one. | Attention-only by design; acceptable. |
| `no_successful_fetch` | Essentially none — the alarm is close to unfireable (see miss). | **Fatal.** Green runs with `fetched: 0` (the yt-dlp empty-200 signature) produce zero new `creator_item` rows → probe returns `false` → suppressed. `creatorsPublished === true` *requires* recent rows, which require a fetch that found something, which suppresses the alarm anyway — the suppression is **vacuous**: the alarm cannot fire in any state distinguishable from a quiet week. Additionally `maxHoursWithoutSuccessfulFetch=72` is unreachable (`lastSuccessfulFetch` is either ≤24h old or `Infinity`). And `counts.fetched` semantics are defined by unwritten slices (CB-FSM) [UNSURE what it will count — items vs transcripts], so the proxy is unproven even in principle. |
| `low_success_rate` | Moderate: includes prior digest rows; one failed-delivery digest against a 2-run window → 0.67 → attention noise stacked on the real alarm. Small samples make the ratio volatile. | Attention-only severity; refusals correctly excluded. |

## Q3 SQL

- **Unused indexes (shipped):** `ingest_run_kind_started_idx` — no production query filters by kind (`recent({kind})` is test-only; the heartbeat filters in memory). `ingest_run_unfinished_idx` — no shipped query has `where finished_at is null`. Both are speculative; the one built for the scariest query (unbounded crashed sweep) serves nothing.
- **Queries that scan:** none at this scale; `since()`/`recent()` use `ingest_run_started_idx` correctly. The `($1::text is null or kind = $1)` pattern risks a generic plan; irrelevant at 1–3 rows/day.
- **Missing constraints the comments claim exist:** migration says reason is "required for anything that is not a plain success" — there is no `check (outcome = 'success' or reason is not null)`, and both stores accept `finish({outcome:'failed'})` with no reason. Also missing: `check (finished_at is null or finished_at >= started_at)`. `counts` jsonb has no non-negativity check while `quota_units_spent` does.
- **Update semantics:** `finish()` has no `and finished_at is null` guard — a replayed/duplicate finish silently rewrites `outcome` and `finished_at` (Q4). `coalesce` prevents nulling but not overwriting. No upsert exists, so the `(xmax = 0)` pattern is not applicable — noting for completeness.
- **Timezone:** `timestamptz` + always-UTC ISO strings from the store — correct. `created_at` is dead weight (no reader).
- **Doc drift:** migration comment example `20260903T0630Z-…` doesn't match `buildRunId` output `20260903T063000Z-…` (seconds retained). Sorting is unaffected.

## Q4 CONCURRENCY AND CRASH SEMANTICS

- **`buildRunId` collision resistance:** 16 bits (`0xffff`). Different-kind same-second (the documented ingest+canary case) can *never* collide — the kind is in the id. The real case, same-kind same-second (manual CLI + scheduler overlap): memory store `rows.set()` **silently overwrites** — destroys evidence of a run with no error; Postgres raises a PK violation → `start()` throws → the run is never recorded, detectable only as absence. `Math.random`'s predictability is irrelevant for a single-owner desktop; the 2¹⁶ space is the defect. Fix: `crypto`-sourced 8–12 hex chars plus on-conflict retry.
- **Two processes:** no advisory lock, no dedup — two schedulers produce duplicate digest rows and duplicate deliveries. Acceptable for one desktop, but nothing documents or detects it.
- **Crash between start and finish:** works as designed (in-flight `failed`/`in flight` row survives) — subject to the Q1 #4 window escape.
- **Finish on an already-finished row:** permitted, last-write-wins; a timeout-retry after a committed finish rewrites history with a new `finished_at`.
- **Restart mid-run:** new row starts; the orphaned in-flight row alarms `crashed_run` at the next digest (if aged 6–24h) — arguably correct, but it will repeat in no window thereafter.

## Q5 TEST SUITE HONESTY

- **Fake test:** `buildRunId` "does not collide for two runs that start in the same second" uses *different kinds* (`creator_ingest` vs `canary`) — the ids differ by the kind segment alone; the test passes with the random suffix **deleted entirely** or with `() => 0` for both. The named property (suffix prevents collision) is never exercised.
- **Misleading control:** "NEGATIVE CONTROL: stays quiet at 25h, just inside the 26h limit" calls `evaluateHeartbeat` directly. Under the runner, `since(24h)` excludes that row and the alarm fires via the `!lastWorkRun` branch. Honest at unit level, but the suite contains zero runner-level test proving the threshold and window compose — which they don't.
- **Weak assertion:** "the failure becomes visible to the NEXT evaluation" asserts `totals.failed > 0` — not any alert, not severity. Delete `low_success_rate` entirely and this test still passes. The visibility it names is unproven.
- **Untested dangerous logic:** `createPublishedProbe` has zero tests. The quiet-week control injects the boolean; the vacuity documented in Q2 passes silently through the suite.
- **Zero Postgres coverage:** `createPostgresIngestRunStore` — the SQL, the `coalesce` semantics, `toRunRecord` Date handling, the double-finish update — all untested. Every store test is memory-mode.
- **Tautology:** "an in-flight run reads as NOT successful" second assertion (`not.toBe('success')` after `toBe('failed')`) adds nothing.
- **Missing:** canary band 24–48h control at 47h; prior-digest-in-window totals stability; crash-outside-window (would fail today); double-finish; `resolveHeartbeatDelivery` whitespace (' log '); any test that an ALARM-severity verdict behaves differently from OK anywhere downstream.

## Q6 DELIVERY DESIGN

- **The fail-closed default destroys the exit-code channel.** Unconfigured → every run records `failed` and exits 1. The scheduler cannot distinguish "heartbeat broken" (Q1 #2) from "heartbeat fine, adapter pending." Worse: the ledger *has* the right vocabulary — `refused` is defined in migration 0030 as "declined to run, on purpose, with a reason… NOT an error." Unconfigured delivery is precisely a refusal; recording it `failed` pollutes `low_success_rate` (which excludes refusals) with daily baseline noise.
- **"Visible to the next evaluation" is a comforting story as shipped.** The mechanism (failed digest row → next run's `low_success_rate`) exists, but: (a) it's attention severity with no dedicated alert code; (b) it's only *delivered* once an adapter exists; (c) the window means only the last 24h of delivery failures are ever visible — a multi-day outage before the adapter is wired leaves no trace in the first delivered digest. Fix: a `delivery_failed` alert plus a one-time lookback beyond the window when the adapter first appears.
- **Severity is invisible to the scheduler.** A delivered ALARM verdict exits 0; only `delivered` affects the exit code. The worst possible day and a quiet one are process-identical.
- **Not rethrowing in the runner is right; exit(1) is right; their interaction isn't costed:** a retrying scheduler will re-run and mint duplicate digest rows/deliveries. No idempotency key, no dedup window.
- **Adapter-day issues:** `send` must throw to record failure, so a delivered-but-timed-out send (Telegram 429/timeout after acceptance) records `failed` while the owner actually received the message — the next digest reports a delivery failure that didn't happen. Nothing in the interface handles this.
- Minor: in `log` mode the digest is printed twice (delivery `write` + entrypoint `output.info(result.message)`).

## Q7 WHAT WAS MISSED

1. **Scheduling.** The slice ships a CLI and an npm script; nothing establishes that anything runs it daily. [UNSURE whether a separate scheduling slice exists — if not, this is the repo's named death pattern applied to the anti-death-pattern.]
2. **No dead-man's switch for the digest itself.** "Absence of digest rows is visible in the same ledger" is circular — visible to whom, if the only reader is the dead digest? An external absence-detector (even a phone-side "no 07:00 message" rule) is the actual closure; nothing plans for it.
3. **The canary doesn't exist.** [UNSURE if elsewhere] Two of six alarms reference a kind nothing writes; `canary_stale` attention will fire daily from day one — the suite's own "cries wolf gets muted" warning, scheduled.
4. **The digest never says what was found.** Migration rule 2 promises "it ran, and here is what it found"; `renderHeartbeatDigest` shows runs/quota but never sums `counts.fetched` — `totals` sums only quota. The positive heartbeat is thinner than its own spec.
5. **`counts.fetched` semantics are undefined** until CB-FSM ships — the rot alarm's evidence doesn't exist yet, so the alarm was shipped before it can be validated even in staging.
6. **Probe edge:** with zero *enabled* creators (the repo's birth state — creators are born disabled), the probe returns false forever, which is fine for suppression but means the rot alarm is dead until the owner enables creators — worth a digest line, not silence.

## RANKED FIX LIST

| Sev | File | Change | Why |
|---|---|---|---|
| CRITICAL | `ingestHeartbeatEntrypoint.ts` (`createPublishedProbe`) | Replace the probe with an exogenous signal (YouTube RSS/channel-page check) or delete the suppression and alarm on `fetched: 0` whenever enabled creators exist | The commissioned failure mode (green runs, empty payloads) is exactly when the probe returns false — the flagship alarm cannot fire |
| CRITICAL | `ingestHeartbeatRunner.ts` / `DEFAULT_HEARTBEAT_WINDOW_HOURS` | Make the window ≥ largest threshold (e.g., `maxHoursWithoutSuccessfulFetch + margin`, or 96h) | 24h window makes 26/48/72h thresholds unreachable; premature `no_run`/`canary_stale` alarms with wrong messages under documented slack |
| HIGH | `ingestRun.ts` store | Add `unfinished(since?)` query against `ingest_run_unfinished_idx`; evaluate crashed runs outside the digest window | Crash at digest+ε currently escapes detection forever; the index exists for a query nobody wrote |
| HIGH | `ingestHeartbeatEntrypoint.ts` | Exit-code taxonomy: `not configured` → exit 0 + `refused` row; delivery failure → exit 1; **alarm severity → non-zero** | Fail-closed default currently makes every day exit 1, destroying the scheduler signal; alarms exit 0 today |
| HIGH | `0030_ingest_run.sql` | Add `check (outcome = 'success' or reason is not null)` and `check (finished_at is null or finished_at >= started_at)` | The migration's rules 1/epitaph semantics are comment-only; both stores violate them today |
| MED | `ingestRun.ts` (`finish`) | `where id = $1 and finished_at is null`; on `start` PK violation, retry with a fresh id | Prevents silent history rewrite on double-finish; makes same-second collision self-healing instead of run-erasing |
| MED | `ingestRun.ts` (`buildRunId`) | Crypto-sourced 8–12 hex suffix; fix the fake collision test to use same-kind runs | 2¹⁶ space + memory `Map.set` silent overwrite is an evidence-destroying failure mode |
| MED | `ingestHeartbeat.ts` / runner | Add a `delivery_failed` alert scanning digest rows; classify unconfigured delivery as `refused` per migration rule 1 | Makes "next evaluation sees it" an alarm, not an unasserted success-rate side effect |
| MED | `ingestHeartbeat.ts` (`renderHeartbeatDigest`) | Sum `counts.fetched` into totals; render local-time timestamps | Migration rule 2 promises "here is what it found"; `Z` timestamps at 07:00 are unreadable |
| LOW | `0030` / store | Drop `ingest_run_kind_started_idx` until a query uses it (or ship the per-kind recency query it was built for); fix the id-format comment drift | Dead index; doc lies about id shape |
| LOW | tests | Fix fake collision test; assert the alert (not `totals.failed`) in next-evaluation test; add probe tests; add Postgres-store integration tests; add a 47h canary control and a runner-level 25h control | The suite's negative controls pass for reasons unrelated to the behavior they name (Q5) |
