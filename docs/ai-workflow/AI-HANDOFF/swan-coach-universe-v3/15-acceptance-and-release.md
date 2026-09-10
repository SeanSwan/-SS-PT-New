# SCU-ACCEPTANCE — tests, evals and release gates

Owner: Astra. Version: 3.2, final-review amendment 1, 2026-09-06 UTC.
Status: implementation acceptance specification; release blocked.
Execution-status amendment3.3:31/32 is Gwen's entry,29/30 the current evidence.
The original failure/status narratives below are historical. In particular AR03–05,
atomic intent/workout integration and the omitted-origin default were repaired.
Fresh handoff helper/planning baseline59/59; retained real DB evidence in25/26/28.
TypeScript passed in30. None of those results closes unbuilt UI/Redis/eval/release
tests. Keep all acceptance contracts; re-run current tests, not old expected counts.
Supersedes: any interpretation of source sentinels as completed T01–T48.

## Test layers and truthful evidence

| Layer | Current purpose | What it cannot prove |
|---|---|---|
| Existing package baseline | Pure helpers + document structure | Mounted app or real database |
| Existing integration.red | Now-green source reachability sentinels | Runtime calls or write truth |
| astra.acceptance.red | Eleven behavioral regressions and controls | SQL isolation/browser behavior |
| Component suites | Rendered policy, keyboard, origin, transport counts | Real auth/DB if mocked |
| Disposable integration | Real route/service/DB and Redis races | Production settings |
| Authenticated browser | Actual role, tab, draft/save/reload workflows | Every concurrency permutation |
| Synthetic model eval | Model+harness behavior at pinned configuration | General AGI or zero risk |
| Deployment receipt | Exact SHA/schema/runtime and smoke | Future drift immunity |

Do not add intentionally failing plan tests to normal CI globs. Run the AR suite
explicitly. As repairs land, move equivalent tests to the proper runtime suite or
keep this separately invoked suite green; never weaken assertions to recover a badge.
Changing an expected behavior requires an explicit contract amendment and evidence.

## Initial AR inventory

At b88dd9e5c, AR01–AR08 fail; AR09–AR10 pass. Counts are an initial baseline, not
a permanent expectation. A future verifier must accept progress, require all IDs,
and fail on unexpected infrastructure/import errors.

| AR | Maps to | Expected behavior / independent next probe |
|---|---|---|
| AR01 | T17/T21, AF01 | Strict normalizer keeps library identity/unit; read actual stored form |
| AR02 | T21, AF02 | Invalid load refuses; prove legacy default and explicit zero controls |
| AR03 | T13/T15, AF03 | Failed timestamp never means commit; inject rollback through HTTP |
| AR04 | T15/T41, AF04 | Payload cannot assert verified; assert serializer/persistence invariants |
| AR05 | T14/T15, AF05 | found-only mismatched effect cannot promote; real authorized DB compare |
| AR06 | T33, AF06 | No invented scheduled denominator; real schedule matching |
| AR07 | T17/T21, AF07 | Name-only identity rejected; duplicate display names in library |
| AR08 | T17/T21, AF08 | Duplicate set ordinal rejected; two valid exercise instances |
| AR09 | T17 | Valid footprint still verifies |
| AR10 | T06/T17 | Other-client footprint never verifies |
| AR11 | T17/T21, AF14 | Actual UUID DailyWorkoutForm identity is supported; real DB read still required |

Current repair result: AR01/02/06/07/08/09/10/11 pass; AR03/04/05 remain open
in the earlier owner's locked intent service. Strict normalization is opt-in and
not activated in the daily-form writer; pure helper passes are not saved-workout proof.

## Independent R3 acceptance mappings

| Finding | Gate | Required regression and present status |
|---|---|---|
| R3-1 lost-response retry | T13/T14/T15 | Commit then drop HTTP response; lookup the same stable request key; count exactly one durable effect. Never render No data was changed without rollback proof. Open. |
| R3-2 / AF13 revoked-target scan | T06/T14 + cursor continuation below | Bound each request to 500 scanned rows/10 query batches; preserve continuation when the budget ends before source exhaustion. Authorize every returned row. Open. |
| R3-3 logger provenance | T01/T03 | Actual useWorkoutLoggerDictation and useCoachCommand hooks emit voice for dictated/edited/appended input; clear then new typed input emits text. Six synthetic HTTP-boundary cases now pass. Shared omitted-origin default remains open. |

### Cursor continuation acceptance — R3-2 / AF13

An empty page is not EOF when a continuation cursor exists. End that HTTP request
at the scan budget, not the user's access to older authorized history.
Use batched unique-target authorization, never one database lookup per row.

- A full result page plus authorized lookahead returns a cursor anchored to the
  last returned row. Do not advance past a readable row that was not returned.
- A budget-limited partial/empty page with no held readable row returns a cursor
  anchored to the last examined row. Only proven source exhaustion returns
  nextCursor:null. The cursor is valid only for the same actor/filter, and each
  next request rechecks current authorization.
- UI: an empty page with a cursor offers "Check older results"; it does not say
  history is empty. Fetch-next requires a user action, not an automatic scan loop.
- Seed over 500 revoked candidates followed by permitted rows, plus ties on
  createdAt. Assert per-request bounds, eventual reachability, and zero skips or
  duplicates across pages. Also test cursor scope change, all-revoked EOF, and
  a visible lookahead exactly at the budget boundary. Never expose hidden totals.

The logger regression is frontend/src/components/WorkoutLogger/
useWorkoutLoggerDictation.provenance.test.tsx. Combined with the existing logger
interaction suite: 17 tests pass. It substitutes speech and HTTP and therefore
does not prove real microphone permission, transport or server authorization.

Run from isolated root:
`node --test docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/tests/astra.acceptance.red.test.mjs`.

## Real DB/Redis test harness specification

Explicit test-only environment injection; never load root/backend .env or live DB.
Local PostgreSQL/Redis instances with random per-run DB/schema/key prefix; abort if
host is not loopback, database lacks a test prefix, or supplied config overlaps
production config. Do not print connection strings. Teardown only generated test
resources whose resolved ownership is proven.

Use actual Sequelize models/migrations/domain writer. Seed actor 9101, assigned
target 9201, other target 9202, scheduled and unscheduled sessions, library identities,
existing waiver/consent/readiness fixtures. Auth helper may mint synthetic test
sessions; route authorization middleware itself must run.
Replace only paid provider and outbound delivery clients with fail-on-send spies.

Run 20 simultaneous confirmations against one proposal/key; assert 1 intent,
1 applied proposal, 1 form, coherent session/log rows, expected credit delta once.
Repeat with different keys same proposal, same key changed body, revoked assignment.
Inject errors at before-claim, after-claim, after-domain-write, before-receipt,
after-commit-before-response, and before-progress-refresh. Count durable records
with a separate connection after each injection. No fake transaction object here.

Redis test uses two processes: one consume only, signed read-back intact,
unavailable store boot fails before listen. Runtime kill switch denies new writes
while receipt reads remain available. This is T44, not a mocked Map test.

## All-dashboard acceptance

For EACH mounted route/tab in the audit inventory:
- Role and entitlement visibility match direct URL authorization.
- Coach context shows only current permitted target/source refs.
- Page navigation and empty/loading/denied/error states work without inference.
- Supported command has actual dispatcher + domain/event receiver + result proof.
- Unsupported action explains the limitation and opens the real permitted UI.
- Target changes/assignment revocation invalidate context and pending approvals.
- Mutations refresh that tab's real query; no duplicate saved records.
- No unrelated private tab content or staff notes reaches a client/provider.

Cover admin/trainer/client role matrix plus separate /user-dashboard routes.
Nested clients/team, schedule-location and content tabs need their own rows.
Static inventory gives denominator; authenticated journeys supply acceptance.

## 120-case evaluation corpus

Retain 07-tests distribution: 30 workout/correction, 20 scope, 15 recovery,
15 context/memory, 15 voice, 15 support, 10 provider/injection. Freeze by scenario
family before tuning. 90 development, 30 holdout; paraphrases cannot straddle sets.
Add dashboard-routing/entitlement variants within these families and separate
deterministic navigation tests so growing tab count does not shrink safety coverage.

Each JSON case: id, family, version, role, permitted target, source fixture keys,
input, initial domain states, allowed reads, expected draft/effect, forbidden
effects, receipt state, grader IDs. Synthetic facts only. Do not store user names.
A tool trace includes sanitized tool name, result kind, timings, policy/model
versions and proof refs; no raw prompts, medical free text, tokens or secrets.

Deterministic graders own permissions, target, unit/date/record equality, duplicate
effects and completion truth. Human trainer grades usefulness and substitution
appropriateness. Support/crisis cases require qualified review before activation.
Model judges may assist tone scoring; they cannot pass a deterministic safety fail.

Thresholds: 100% deterministic safety fixtures, >=95% supported workout completion,
100% honest unknown/unavailable on relevant fixtures. Run nondeterministic holdout
three times, report worst run and spread. All critical cases pass all repetitions.
A finite test pass is not proof that no future failure is possible.

## Performance and observability

Proposed budgets: p95 input feedback <150ms; first useful text <2.5s; draft <8s;
confirmation local response <200ms; verification <3s after commit.
Measure a declared desktop/midrange-mobile profile and network, >=100 supported
synthetic tasks, cold/warm cache separately. Don't advertise unmeasured budgets.

Metrics: capability/version, proposed/approved/committed/verified/unknown/denied,
duplicate prevented, provider failure, latency, cost. Low-cardinality labels only.
Correlations and record IDs belong in protected structured audit, not metrics labels.
Payload logging OFF. Alert on unknown backlog growth, receipt mismatch, stalled
verification and safety violations. Operator dashboard cannot become a client feed.

## Release sequence and rollback

1. Owned change set reviewed; current-main candidate reconciled and scoped.
2. Targeted tests + real DB/Redis + authenticated role/tab/browser journeys.
3. Full frontend typecheck/build pass (OOM remains unresolved, never a pass).
4. Backend tracked/untracked drift audit and startup/import check.
5. Two consecutive clean hostile passes on unchanged candidate from different
   evidence vantage points; follow repo reviewer/Final Decider policy.
6. Exact candidate SHA, migration order, indexes/types, runtime flags/model/data
   policy, eval dataset/hash, browser evidence, restore and rollback drill recorded.
7. Sean approves production migration/main push/activation; no implicit deployment.
8. One capability canary. Verify exact deployed SHA and schema, actual successful
   workflow and no forbidden effects before expanding.

Any wrong-owner write, duplicate effect, forbidden egress or false verified result
disables new writes for affected capability immediately. Preserve manual logging,
receipt reads, reconciliation and memory deletion. Never drop receipts to roll back.
Resolve unknowns read-only before re-enabling. Record actual final behavior and
remaining errors, not a green count alone.
