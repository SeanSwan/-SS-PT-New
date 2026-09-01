# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/hostile-source-r2.md
**Tokens:** 13974 in / 17264 out (reasoning: 14984) | total 31238
**Wall:** 331.6s

---

## VERDICT
REVISE — Fixes 1 and 2 are sound; Fix 3 introduces phantom run-accounting and Fix 4's bound is both unsafe when enforced and unenforced on the default lane, plus one binding house-rule violation (326-line file).

## BLOCKERS

1. **P1 — Fix 4: FIFO eviction can drop IN-FLIGHT keys, and the bound only runs on the hosted path.** Two facets, both provable from the file:
   - `rememberKey` (composeStills.mjs, ~L108–125) evicts by insertion order with no settled/pending distinction. Keys are inserted at reservation (GATE 3a) and, on the default local-async path, retained until batch terminal (~2 min for a 4-up at ~27s/frame, per the file's own async comment). Scenario: batch K reserved → 500 subsequent requests complete → their `rememberKey` evicts K while still rendering → client retry after a dropped connection finds `store.has(K) === false` → a **second batch runs and the hosted analogue double-charges** — the exact failure Fix 4's comment claims to prevent ("evicting would double-charge a client retry after a dropped connection"). Bounded eviction doesn't fix that failure; it relocates it under load.
   - `rememberKey` is called exactly **once**, on the hosted/sync-local success path (`rememberKey(store, key); return result;`). The default local-async path never calls it — keys are only deleted at batch terminal. A local-only workload with arrival rate × 2-min hold time > 500 grows the map past the cap with nothing enforcing it. The claim "small enough that the map cannot grow for the life of the process" is false for the lane that is THE DEFAULT.

2. **P1 — Fix 3: refused billed runs consume free-lane volume headroom they never used.** In laneLedger.mjs `record`'s catch, `if (runs > 0) strandedRuns.set(day, ...)` executes *before* `tryCommit` decides refusal: `written?.failed && billed` → `{allowed: false}` — but the runs were already stranded. Those runs never happened (commit precedes the provider call — the file's own correction). Concrete scenario: disk flapping (fail, success, fail — never 3 consecutive, so `unwritable` never latches); every failed billed write strands `count` phantom runs; over a day the free lane hits `E_RUN_CAP` on runs that never executed. Bounded at 2×count per latch-run, unbounded under flapping. Fix: don't strand when the caller will be refused (flag on `record` or compensate in `tryCommit`).

3. **P1 — Fix 2 is half-closed: the VOLUME gate still fails open.** `defaultCommit` refuses spend but permits free work, and `usage` defaults to `{runs: 0, spendUsd: 0}`. A route that wires neither `commit` nor `usage` gets: GATE 2 comparing against zero forever (the file next door documents this exact defect shipping **twice** — `render-agent.mjs` passing `{api}`, Atelier returning literal zeros) + `defaultCommit` allowing spend=0 → **the default LOCAL lane runs uncapped**. The fix's own words — "a control that can be dropped by accident is not a control" — apply verbatim to the run cap that protects the one GPU. Cheap fix: refuse or warn loudly when `commit === defaultCommit` AND lane resolves local, or have `defaultCommit` also enforce `maxRunsDaily` against injected usage.

4. **P2 — Binding house-rule violation: composeStills.mjs is 326 lines (>300).** Stated in its own header. Worse, the file's history comment ("moved to composeLaneChoice.mjs when this file hit its cap") shows the rule was known and the fix overshot — the re-exports block and `runBatch` are the natural next extraction.

5. **P2 — Fix 1 closed the front door but the override still weakens the judging profile on taste renders.** The gate now correctly reads `kit.lawProfileFromKit`, but `promptsFromTaste(..., lawProfile)` (composeStills.mjs, work block) receives the **merged** profile. Scenario: `brandKit: 'swanstudios'` + `lawProfile: 'minimal'` (or any weaker profile) → gate passes (kit profile is 'full') → Swan-corpus taste prompts generated and law-checked under the caller-weakened profile. Provenance records the override, so it's answerable — but if the corpus is Swan-rated *because* Swan laws apply, taste should force `lawProfile = kit.lawProfileFromKit` or refuse `promptSource === 'taste' && kit.lawProfileOverridden`.

## ATTACKS

- **Correctness:**
  - `E_ALL_FAILED` throws after `commit` already counted runs+spend, and the catch deletes the idempotency key — a client retrying an all-failed hosted batch re-charges each attempt (monotonic ledger, no reconciliation) until the ceiling stops it. Pay-many-receive-nothing loop; at minimum the error should carry the charge receipt.
  - A custom `commit` returning `undefined` crashes at `!verdict.allowed` (TypeError, not ComposeError). Use `verdict?.allowed`.
  - `key = u${req.userId ?? 'anon'}:...` — all anonymous callers share one idempotency namespace; if any anon-reachable route exists, user B's header replays user A's batch. Confirm no anon compose route.
  - `has(key)` then `get(key)` is race-safe only because both are synchronous — worth a comment, since someone will "fix" it with an await between.
  - Reservation double-release is unverifiable: the catch calls `reservation?.release()` for the sync path, and local lane internals may also release on error. (See CONFIDENCE.)
  - `decodeCursor` with no `|` yields `slice(0,-1)`/`slice(0)` weirdness — happens to be caught by the NaN-date check; a length cap on cursor input would make the intent explicit and bound Buffer work.
  - `assetView` `seed: Number(tag('seed'))` can emit `NaN` → serialized as `null`; harmless but sloppy.
- **Security:**
  - **Unverified and potentially the worst item in the document:** the header claims hosted "never carries taste prompts" and taste is "Local only," but `chooseLane({ ...req, promptSource })` passes the caller's `lane` through and nothing in THIS file refuses `taste + hosted`. If composeLaneChoice.mjs doesn't hard-refuse it, a caller forcing `{promptSource:'taste', lane:'hosted'}` ships Swan-corpus prompts to a third-party billed provider — brand-scope leak *and* prompt exfiltration. One grep settles it.
  - IDOR: `ownerUserId` forced with an allowlisted filter set — clean. Cursor contents are parameterized comparisons only — clean. `previewUrl` exposing the object key in the SigV4 path is disclosed honestly — accepted trade, same as the published-reference endpoint.
  - No rate limit on `listAssets`; every page is a sequential scan of an unindexed table (self-documented). A tight polling loop is a cheap self-DoS at modest table sizes. MAX_PAGE 100 is the only brake.
- **Data-truth / schema drift:**
  - **`kitHash` omits `aspectDefault`** (registry.mjs): it hashes `[id, lawProfile, paletteWords, styleAnchors, negativeSlot]`. Editing a kit's default aspect changes rendered output while leaving `kitHash` unchanged — defeating the hash's entire stated purpose ("the hash says which VERSION of it"). Add `aspectDefault` (and arguably `name`) to the hashed tuple.
  - `KINDS` mirror is claimed pinned by a drift test — the test is the only thing making the copy safe; existence unverified.
  - `usageFor` returns `{runs, spendUsd, degraded, ledger, reason?}` while composeStills' `usage` dependency is documented as `{runs, spendUsd}` — compatible today, but nothing pins the contract; a route passing a raw snapshot object instead of `ledger.usageToday()` silently reintroduces the stale-read race the ledger was built to close.

## HIGHEST RISK
The idempotency bound (Blocker 1): it silently converts the fix's own protected scenario — client retry after dropped connection — into a duplicate bill/GPU burn, and its "cannot grow" guarantee doesn't hold on the default lane. Cheapest de-risk: wrap stored values as `{p, done}`; mark `done` in `settle.res/rej` and in the async path's `.finally`; make `rememberKey` skip unsettled entries (with a hard cap at 2×RETAIN plus a loud `console.error` if even that is exceeded), and invoke the bound check on the async-accept path too. ~15 lines, fully testable with a stalled generator and 501 fired requests.

## CONFIDENCE
Could NOT verify from this document, in priority order: (1) whether composeLaneChoice.mjs actually refuses `taste + hosted` — the single most consequential unknown; reading that file settles it. (2) `makeFileLedger` semantics — whether `inner.record` throws vs. reports, whether it is fully synchronous (the no-await atomicity claim for `tryCommit` rests on this), and what a corrupt read returns for `runs` (the free-lane cap under degradation is only as good as that value). (3) Route wiring — whether the real Atelier route passes `ledger.tryCommit` and `ledger.usageToday()`; Blocker 3 is only live if a route can omit them, and this codebase has done so twice. (4) The drift test pinning `KINDS`, and `deriveKey`/`seedFor`/`sha` implementations (key-collision behavior for derived keys). (5) Actual line counts — the headers claim 260/245/134/326; if `wc -l` disagrees, Blocker 4 changes. (6) Whether reservation release is idempotent across `withGpu`/catch. Evidence that would settle each: the composeLaneChoice source, the spendLedger source, the route file, the test files, and one integration test firing 501 requests against a stalled generator to observe eviction of an in-flight key directly.
