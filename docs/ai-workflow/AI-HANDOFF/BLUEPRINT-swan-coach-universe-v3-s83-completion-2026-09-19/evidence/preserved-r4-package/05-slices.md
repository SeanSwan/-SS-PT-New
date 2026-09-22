# Completion slices and exit criteria

All new acceptance work is **NOT RUN**. Counts below describe required scenarios, not claimed passing test totals.

## C0 — Bind the missing contracts

**Scope:** package source bindings and operator-supplied excerpts only.

**Decisions:** no source guessing; no deployment; current ownership replaces obsolete lane filenames.

**Acceptance:**

- All ten G0 input rows in `03-contracts.md` have supplied evidence or an explicit dependency-specific BLOCKED result.
- Coach/Settings/Logger each have route → mounted JSX → hook/service → exact API → backend mount → authoritative field receipt.
- Every overlapping backend mount for a touched path is ordered.
- Actual DB helper/loader/config and matrix runner authority are unambiguous.
- Dirty source hashes bind the handoff.
- Exact new/edit paths are allocated to one owner.
- No missing input is called N/A merely to advance.

**STOP:** Do not proceed to C1 until its database and runner bindings pass. Other slices remain blocked on their own missing inputs.

## C1 — Real PostgreSQL application suites

**Scope:** helper/loader/config, two persistence suites, verified matrix runner.

**Decisions:** real model classes; isolated database; serial runs; no unrestricted app boot or sync.

**Acceptance:**

- `coachMemoryPersistence.postgres.test.mjs`: atomic rollback, same-key replay, conflicting replay, concurrent correction, >500 ownership, forget races, pagination and context-priority scenarios.
- `coachConsentPersistence.postgres.test.mjs`: opt-out/snooze and opt-out/profile in both interleavings, combined rollback, invalid body and self-scope.
- Existing owned matrix runs through its correct mixed runners; report discovered counts instead of forcing historical 10/125.
- Each suite proves its own actual connection identity.
- No skipped suite, zero-test success or import failure counts as PASS.
- Owned cluster stops after the run; teardown result is recorded.

If a production defect appears, record behavioral RED and issue an exact bounded scope amendment. Do not silently convert this configuration slice into a broad service rewrite.

**STOP:** Do not proceed to C2 until C1 passes or the checkpoint explicitly records an independent C2 execution window without asserting C1 closure.

## C2 — Migration delivery, not merely migration readability

**Scope:** new migration integration test/fixtures; demonstrated junction repair; conditional forward migration.

**Acceptance:**

- Fresh UTF8 zero-table chain executes and exact repaired objects are queried.
- Second migrate is a no-op on applied history.
- `UserAchievements` fallback executes when `Users`/`Achievements` exist but the child does not.
- Installed-history fixture does not rely on editing old migration files to receive repairs.
- Interruption after table creation cannot leave the junction permanently without its required indexes.
- Synthetic fixture values survive any proposed forward repair.
- Unknown UUID-to-integer identity conversion is refused without data deletion.
- Restore verification compares relevant rows, types, FK targets and indexes.
- Three static guard files run; observed totals are recorded.

Fresh-chain 218/381 and 355-FK counts are historical diagnostics. A justified new migration changes counts; exact object assertions remain authoritative.

**STOP:** Do not proceed to C3 with an unreviewed migration or unresolved destructive conversion hidden as a successful upgrade.

## C3 — Created-thread completion and navigation integrity

**Scope:** named selection composition/hooks/tests.

**Acceptance:**

- Real composition: current first staff send → created thread → route and active thread independently settle → same generation adopted → one follow-on message.
- Route-only and active-thread-only matches do not settle.
- Wrong target/audience, actor A-B-A, independent selection, abort, deadline and unmount refuse adoption.
- Same tuple from another operation cannot satisfy the capture.
- First Discard after passive-effect flush behaves correctly.
- Malformed/duplicate query cannot obtain a surface-owned exemption.
- Stale/refused Discard never re-arms; Return and Leave remain usable.
- Return preserves exact pathname/search/hash; no `navigate` plus `proceed`.
- Existing 19 changed-hook tests remain, subject to actual current discovery.
- No extra selection owner, commit consumer or uncontrolled request fanout.

**STOP:** Do not proceed to C4 until composed tests pass and the mounted test’s exact route/fixtures are bound.

## C4 — Mounted completion

**Scope:** real existing UI, named browser tests; production edits only for reproduced failures.

**Acceptance:**

- Memory correct/forget persists after close/reopen and real server readback.
- Response-loss correction retry reuses key/body and creates no duplicate.
- Consent readback preserves opt-out under competing supported writers.
- First-message adoption is observed through actual mounted UI.
- Logger typed command reaches the actual receiver/deadline; no workout save or session decrement.
- Native Worker short real-time check plus interval fallback test.
- 375×812 and 1440×900 primary layouts; remaining matrix in `02-wireframes.md`.
- Required nodes exist, have positive size and belong to the admitted target.
- Closed-overlay geometry, safe-area obstruction and hit testing pass.
- Keyboard/focus, 200% zoom and retirement masking pass.
- Mocked-auth geometry and real-auth/application journeys are labeled separately.

If legacy dictation is disabled, that journey is BLOCKED. Do not switch production flags or substitute another command lane.

**STOP:** Do not proceed to C5 with a missing mounted boundary described as working.

## C5 — Baseline and evidence closure

**Scope:** verification and documentation, no broad cleanup.

**Acceptance:**

- Union manifest hash and exact batch membership recorded.
- Full repository test inventory identifies every package, runner and exclusion.
- Full run attempted where authorized; failures separated from suite-load errors and skips.
- No unrelated failures silently waived or assertions loosened.
- Canonical whole-project typecheck executes on a suitable existing environment, or remains BLOCKED.
- Corrected scoped config, if used, exits zero; still labeled scoped.
- Production frontend build result recorded.
- Repository line audit remeasures historical 786 and distinguishes unchanged debt.
- Every changed/new production module satisfies the cap or has an explicit unresolved finding.
- F3 disposition and current README agree.
- No new temp artifact is unindexed.

**STOP:** Do not proceed to C6 until the evidence bundle has complete statuses. BLOCKED is a valid recorded status, not a passing gate.

## C6 — Combined review and decision

**Scope:** frozen package, diff, evidence and resulting bounded repairs.

**Acceptance:**

- Combined hostile review checks actual frozen implementation and mounted evidence.
- Repairs receive focused regression and affected-boundary verification.
- Review receipt records source/test hashes and remaining unproven boundaries.
- Mandatory Codex hostile-review input is advisory.
- Packet’s Gemini/Fable final-decision requirements are reconciled with actual available identity/entitlement; no guessed model alias or paid fallback.
- Final Decider gate remains pending until an actual receipt exists.
- Sean’s separate commit/push authority remains required.
- Live production status remains **NONE** until a separately authorized deployment and live smoke.

**STOP:** No commit, push or deployment is a step of this package.
