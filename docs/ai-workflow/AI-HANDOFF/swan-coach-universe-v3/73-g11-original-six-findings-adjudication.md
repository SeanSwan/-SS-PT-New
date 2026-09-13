# G11 — adjudication of the six original HR1 findings

Version 1, 2026-09-13. Astra-owned. This is the explicit adjudication that
`final-review-original-findings-checkpoint.json` requires: *"Final combined Astra
review must explicitly adjudicate all six original findings against the final
source and new evidence. Earlier receipt still says open; do not infer resolution
from nested controller refs or structural readiness."*

It is a **source-and-existing-test adjudication**, not a runtime release gate.
The remaining G11 gates (frozen all-role/scenario/provider/privacy evaluation,
Redis/restart, migration/restore/rollback, performance) are tracked separately at
the end and are **NOT RUN**.

## Basis of adjudication

| Item | Value |
|---|---|
| Original review | `tmp/coach-astra-hostile-20260912/review-receipt-1.json`, verdict **REVISE**, `sha256 bb7278fe2c8ae58f60f05c7278302983606e10b6f45c48ab0b4d1b78da390e70`, digest `3e9f9ece…` |
| Checkpoint demanding this | `tmp/coach-astra-hostile-20260912/final-review-original-findings-checkpoint.json` — six findings `HR1-1..HR1-6`, all `status: open` |
| Source revision | worktree `swan-coach-astra-owned-20260906`, branch `codex/swan-coach-astra-owned-20260906`, HEAD `4345b86cf` |
| Working-tree caveat | Six concurrent slices are editing `backend/tests/**`, `frontend/**` and `AGENTS.md`. **None of the six files adjudicated below is among those edits** (confirmed by `git status`), so the source read here is the committed source, not another agent's in-flight work. |
| Method | Direct read of each cited location at current source, plus enumeration of the tests that exercise it. No provider call, no database, no browser, no spend. |

## Verdicts

| ID | Severity | Verdict | Confidence |
|---|---|---|---|
| HR1-1 | P1 | **SOURCE-FIXED; test coverage DIRECT** | [VERIFIED] |
| HR1-2 | P1 | **SOURCE-FIXED; test coverage DIRECT (incl. mid-flight revocation)** | [VERIFIED] |
| HR1-3 | P2 | **SOURCE-FIXED; test coverage DIRECT** | [VERIFIED] |
| HR1-4 | P2 | **SOURCE-FIXED; test coverage DIRECT** | [VERIFIED] |
| HR1-5 | P2 | **SOURCE-FIXED; test coverage DIRECT** | [VERIFIED] |
| HR1-6 | P2 | **SOURCE-FIXED; test coverage STRONG** | [VERIFIED] |

No finding is adjudicated REJECTED or NOT-FIXED. All six have both a source
repair and at least one direct behavioural test.

> **Method correction, recorded deliberately.** A first draft of this document
> reported HR1-1 as having no direct test and HR1-2's mid-flight revocation case
> as uncovered. Both claims were **wrong**. They came from enumerating tests with
> `grep "it\(|describe\("`, which does not match the `test(...)` / `test.each(...)`
> style that `coachInferenceBoundary.hostile.test.mjs` actually uses — so the
> entire file was invisible to that search and I read a search artefact as a
> coverage gap. The file was then read directly. Enumerate vitest files by reading
> them, or grep for `test(` as well; do not infer coverage from a single API-style
> grep.

---

## HR1-1 [P1] — staff general chat must not read the staff member's own records

**Original claim.** `coachInferenceBoundary.mjs:186` substituted `scope.actorId`
when `targetClientId` was null, overriding the mounted route's deliberate
no-client behaviour (`aiChatRoutes.mjs:746-749`); a synthetic admin request with
no selected client made context, recent-workout and progress reads with actor ID 7
and then called the provider.

**Required validate.** Mounted admin/trainer conversations without a target make
**zero** personal-record queries; explicit selected-client and authorized self
flows remain correct.

**Adjudication — source FIXED.** The substitution is gone and the no-target case
is now an explicit skip:

- `coachInferenceBoundary.mjs:187-190` — inside the evidence loop:
  `// Staff general chat has no personal subject. Self coaching must bind an explicit target; never silently substitute the actor's health records.` then `if (target === null && toolId !== 'exercise_lookup') continue;`
- `coachInferenceBoundary.mjs:173` — `if (targetClientId != null && target === null) return unavailable('CONTEXT_ACCESS_DENIED');` (a requested target that fails authorization is denied, not downgraded to self).
- `coachInferenceBoundary.mjs:193-197` — the personal readers are addressed by `userId: target` (`recent_workout`, `progress_evidence`); neither is reached when `target === null`. Only `exercise_lookup` — the non-personal library search — still runs.
- The previously cited line 186 is now `await verifyAccess();`; the offending substitution no longer exists at that location.

**Test coverage DIRECT.** `coachInferenceBoundary.hostile.test.mjs:37-45`:

```js
test.each(['admin','trainer'])('no-target %s does not read personal records', async (role) => {
  const readers = tools();
  const args = { ...input(readers), actor: { id: 7, role }, targetClientId: null };
  const out = await runCoachInference(args);
  expect(out.result.type).toBe('answer');
  expect(readers.context_summary).not.toHaveBeenCalled();
  expect(readers.recent_workout).not.toHaveBeenCalled();
  expect(readers.progress_evidence).not.toHaveBeenCalled();
  expect(JSON.stringify(args.providerGenerate.mock.calls[0][0])).not.toContain('Bound target client');
});
```

This is the HR1-1 validate clause executed, for **both** staff roles: zero
personal-record reads, the turn still answers, and the provider-bound prompt
carries no bound-target marker. That is a strictly stronger assertion than the
clause asked for, because it also proves the no-target path does not simply fail.

The nearest additional coverage is adjacent: `aiChatPromptPrivacy.test.mjs:58`
("does not alter history when there is no target client to protect") and
`workoutPostSaveHandoff.test.mjs:320` ("client self-log scopes to self (no
targetClientId)").

---

## HR1-2 [P1] — per-turn authorization must be refreshed before every dependent read and before egress

**Original claim.** `coachInferenceBoundary.mjs:179` treated the first
`context_summary` result as authorization for the whole turn; dependent readers
took only a target ID and did not recheck; there was no final recheck before
provider invocation at line 238. A probe that revoked access after context
collection still saw subsequent reads and provider egress. Violated contract 32's
current-access-at-read requirement.

**Adjudication — source FIXED.** Authorization is now a reusable check invoked at
every dependent point:

| Call site | Evidence |
|---|---|
| Helper definition | `:179-183` — `verifyAccess()` re-runs `authorize({ actor, targetClientId: target, sequelize, signal })` and throws `CONTEXT_ACCESS_DENIED` unless `access?.allowed === true` |
| Before the loop | `:186` |
| Before **each** tool call | `:192` (inside `for (const toolId of COACH_EVIDENCE_TOOL_IDS)`) |
| After the loop, before prompt assembly | `:215` |
| Handed to the provider transport | `:225` — `verifyAccess: () => verifyAccess(providerSignal)` |
| After provider generation, before returning content | `:227` |
| Failure handling | `:182` throws; `:237` converts to `unavailable('CONTEXT_ACCESS_DENIED')` so no evidence and no model output are disclosed |

**Test coverage DIRECT.** `aiChatExerciseAnalyticsTruth.test.mjs:88-89` injects
`const verifyAccess = async () => { if (!allowed) throw new Error('CONTEXT_ACCESS_DENIED'); }`
and asserts `enrichWithUserData(42, 'trainer', …, { verifyAccess })` **rejects**
with `CONTEXT_ACCESS_DENIED`. That is coverage of the recheck hook itself.
`coachInferenceBoundary.hostile.test.mjs:63-64` additionally asserts the boundary
returns `reasonCode: 'REQUEST_CANCELLED'` with `toolFindings: []` and that the
received signal was aborted — i.e. no evidence is emitted on the abort path.

**Test coverage DIRECT, including the mid-flight revocation case.**
`coachInferenceBoundary.hostile.test.mjs:46-55`:

```js
test.each(['context_summary','recent_workout','progress_evidence'])(
  'revocation during %s discards gathered evidence and prevents egress', async (toolId) => {
    const readers = tools(); const args = input(readers); let allowed = true;
    args.deps.authorizationCheck = vi.fn(async () => ({ allowed }));
    readers[toolId].mockImplementation(async () => {
      allowed = false;                                  // revoke WHILE the read is in flight
      return { toolId, state: 'ok', payload: { secret: 'TARGET_PRIVATE' } };
    });
    const out = await runCoachInference(args);
    expect(out.reasonCode).toBe('CONTEXT_ACCESS_DENIED');
    expect(out.toolFindings).toEqual([]);               // gathered evidence discarded
    expect(args.providerGenerate).not.toHaveBeenCalled(); // zero egress
    if (toolId === 'context_summary') expect(readers.recent_workout).not.toHaveBeenCalled();
  });
```

This is precisely the clause the original review demanded — *"change assignment or
consent while a deferred evidence read is pending and prove zero subsequent
reads/egress and no disclosed target details"* — and it passes over all three
evidence tools. The tool's own in-flight return of `secret: 'TARGET_PRIVATE'` is
asserted **not** to reach the provider.

The consent variant has its own test at `:68-73` ("consent withdrawal is checked
after pending context collection"), which omits the injected `authorizationCheck`
so the real consent query runs, withdraws consent inside the pending read, and
asserts `CONTEXT_ACCESS_DENIED` with no egress and no findings.

**Residual nuance.** The test drives revocation via the injected
`deps.authorizationCheck` (and, for consent, the real consent query). It does not
mutate `ClientTrainerAssignment` rows in PostgreSQL mid-flight. The property is
therefore proven at the boundary contract level, not against the live assignment
table; a real-database mid-flight test would strengthen it but is not required to
establish that the boundary rechecks and discards.

---

## HR1-3 [P2] — a valid context over 8 KB must not disable the whole Coach

**Original claim.** `coachEvidenceTools.mjs:71` turned an authorized valid result
into `unavailable`; the boundary then terminated at lines 202-208. Ten valid
active goals with 631-character descriptions produced 8,960 bytes with
`ok:true`, then `context_payload_limit`.

**Adjudication — source FIXED.** Size no longer decides authorization:

- `coachEvidenceTools.mjs:60-80` `compactContextPayload` replaces the old
  terminate-on-oversize behaviour. It deletes optional context fields
  largest-first (`:70-71` sort by byte length) and returns the compacted payload
  as soon as it fits (`:76`), carrying
  `truncation: { reason: 'context_payload_limit', complete: false, originalBytes, omittedFields }` (`:65`).
- `:57-59` states the rule: *"Remove whole optional fields instead of cutting a
  sentence or silently taking a numeric subset. Authorization success is
  independent of evidence size."*
- `:69` protects `clientAlias`, `painEntries`, `restrictions`, `contraindications`,
  `injuryConstraints`, `medicalRestrictions` from compaction.
- `:78-79` still fails closed, but only when the **protected authority/quality
  metadata alone** exceeds the cap — the deliberate safety case, not the
  valid-large-context case.
- `:131` returns `state: 'ok'` with the compacted payload, so the boundary no
  longer terminates at the old 202-208 path for this reason.

**Test coverage DIRECT.** `coachEvidenceTools.test.mjs:311` asserts
`out.payload.truncation` matches `{ reason: 'context_payload_limit', complete: false }`
— i.e. an oversized payload now yields a bounded authorised response with explicit
omission markers rather than `unavailable`.

---

## HR1-4 [P2] — missing repetitions/load must never become verified zero volume

**Original claim.** `coachProgressEvidence.mjs:14` converted `null` and empty
strings through `Number()`, yielding zero; lines 52-63 published a volume and
marked the exercise comparable with no usable set. Repro produced
`status:"verified", volumeByExercise:{squat:{lbs:0}}, comparability:{squat:"comparable"}, missingInputs:[]`,
and a blank string was reported as invalid.

**Adjudication — source FIXED.** Absent data is now rejected before conversion and
recorded as a missing input:

- `coachProgressEvidence.mjs:14-18` — `asPositiveNumber` returns `null` unless the
  value is a non-blank string or a number, and then requires `Number.isFinite`
  and `>= 0`. So `null`, `undefined`, `''`, `'  '`, booleans and `NaN`/`Infinity`
  all yield `null`; a **recorded** `0` or `'0'` still yields `0`, which preserves
  the legitimate-zero case.
- `:59-62` — if either `reps` or `load` is `null`, it adds `'workout_set_values'`
  to `missingInputs` and `continue`s; no volume is accumulated.
- `:66-69` — if `recordedSets === 0`, it adds the same marker and `continue`s, so
  the exercise is **omitted from `volumeByExercise` and `comparability`** rather
  than published as a verified zero.
- `:8-12` documents the status semantics (`empty` vs `unavailable` vs
  `no_verified_records` vs `verified`), so a real zero session count is still
  distinguishable from missing inputs.

**Test coverage DIRECT, and EXECUTED.** `coachProgressEvidence.test.mjs` is a
`node:test` file (not vitest), so it is collected by `npm run test:node` rather
than by `vitest run` — which is why it did not appear in the vitest pass below
and had to be run separately. It contains assertions named for this finding:

- `null load or reps never counts as zero volume`
- `HR1-4 absent and malformed set values never publish comparable zero volume`
- `HR1-4 recorded zero load remains a real zero, with partial records disclosed separately`

Executed under the reviewed isolated runner (dotenv disabled by preload, sensitive
env scrubbed, non-loopback TCP denied):

```
node --test tests/unit/coachProgressEvidence.test.mjs
ℹ tests 10   ℹ pass 10   ℹ fail 0   NODE_TEST_EXIT=0
```

That covers all four cases the original review's validate clause named —
all-missing, partially-missing, legitimate zero-load, and complete sets — and it
proves the third-party assertion directly: a **recorded** zero load stays a real
zero while absent values never become one.

---

## HR1-5 [P2] — future-dated completed workouts must not reach the provider

**Original claim.** `coachEvidenceTools.mjs:127` filtered completion status but had
no upper date bound, and the context engine's workout query had the same omission
at `coachContextEngine.mjs:58`. A future-dated completed record excluded by the
repaired progress reader stayed eligible for "recent workout" evidence and
`lastWorkoutDate`.

**Adjudication — source FIXED at both cited sites, and the binding is supplied.**

| Site | Evidence |
|---|---|
| Recent-workout tool | `coachEvidenceTools.mjs:187-188` — `WHERE ws."userId" = :userId AND ws.status = 'completed' AND ws.date <= :now`; replacement supplied at `:197` (`now: new Date().toISOString()`) |
| Context engine workouts reader | `coachContextEngine.mjs:58-59` — `WHERE ws."userId" = :clientId AND ws.status = 'completed' AND ws.date <= :now`; replacement supplied at `:171` (`const replacements = { clientId, now: new Date().toISOString() };`) |

The second read was the important one: a `:now` placeholder that was never bound
would have thrown rather than silently passed, so I checked the binding explicitly
rather than assuming it from the SQL text.

**Test coverage DIRECT.** `coachProgressRecordReader.test.mjs:61` asserts
`db.queries.every((sql) => sql.includes('ws.date <= :now'))` — every reader query
carries the temporal bound, which is the "apply the authoritative temporal policy
to **every** workout evidence reader" clause of the repair.

**Residual gap.** The finding's validate clause asked for *"real PostgreSQL fixture
containing future, current, edited and deleted workouts; inspect the complete
provider-bound prompt."* The SQL-bound coverage above is structural. A real
PostgreSQL fixture asserting the complete provider-bound prompt contains no
future-dated workout is **NOT RUN** at this revision and remains owed.

---

## HR1-6 [P2] — a cancelled request must cancel the mounted inference

**Original claim.** `aiChatRoutes.mjs:942` passed no request-lifecycle signal; the
only abort controller was the deadline controller; evidence tools received no
signal at `coachInferenceBoundary.mjs:194`; closing the request could leave reads
and provider generation running, followed by conversation persistence, while the
route released its concurrency lock on response close.

**Adjudication — source FIXED, end to end.**

| Layer | Evidence |
|---|---|
| Route signal created | `aiChatRoutes.mjs:533-537` — `new AbortController()`; `cancelRequest` aborts only if `!res.writableFinished`; wired to **both** `req.once('aborted')` and `res.once('close')` |
| Signal threaded through the handler | `requestSignal.throwIfAborted()` at `:519, 629, 673, 725, 745, 779, 833, 872, 881, 942, 951, 1004, 1013` |
| Signal reaches inference | `:839` and `:896` pass `signal: requestSignal`; `:842` re-runs `checkCoachInferenceAccess` with the live signal |
| Provider transport opts in | `:910, 912` re-check `options.signal` |
| Post-cancellation publication suppressed | `:1055` — `if (requestSignal.aborted || res.destroyed) return;` before any error response or persistence path |
| Cleanup | `:1059-1061` — both listeners removed and `releaseConcurrency?.()` called in `finally` |
| Boundary honours the signal | `coachInferenceBoundary.mjs:172` early `REQUEST_CANCELLED`; `:181` `activeSignal?.throwIfAborted()`; `:201` tools receive `signal: toolSignal`; `:225` provider receives `signal: providerSignal`; `:235` `REQUEST_CANCELLED` on the abort path |

**Test coverage STRONG** — five independent files:

- `coachEvidenceTools.test.mjs:321` — `aborted %s evidence never starts the reader`
- `coachEvidenceTools.test.mjs:328` — `aborted %s evidence is discarded after its uncancellable reader resolves` (this is the important one: it covers the case where the underlying driver cannot be cancelled, so the result is discarded rather than delivered)
- `coachInferenceBoundary.hostile.test.mjs:63-64` — `reasonCode === 'REQUEST_CANCELLED'`, `toolFindings` empty, received signal aborted
- `coachProviderMounted.hostile.test.mjs:22` — `fetcher.mock.calls[0][1].signal.aborted === true` (the abort actually reaches the transport)
- `coachContextEngine.test.mjs:243` — `does not start authorization or domains for an already aborted request`
- `aiChatConversationTargetGuard.test.mjs:479` — `providerSignal.aborted` becomes true
- `coachConversationReadAuthorization.test.mjs:324,332` — asserts the `aborted` listener count is restored, i.e. no listener leak across requests

**Residual gap.** The validate clause asked for a synthetic transport with
deferred evidence/provider work, a mid-request disconnect, then a retry, proving
*"no late conversation overwrite"*. The abort delivery and discard-after-resolve
paths are covered; the specific **late conversation overwrite** assertion is not
one I could find. Line `:1055` is the guard that should provide it, but the
observation is owed.

---

## What this adjudication does and does not settle

**Settled.** All six original findings have their source repair present at the
current revision, at the cited locations, in the shape the original review
prescribed, **and** at least one direct behavioural test exercising the property
the review demanded. The strongest evidence is concentrated in
`coachInferenceBoundary.hostile.test.mjs`, which covers five of the six
(HR1-1, HR1-2 + consent variant, HR1-6) directly.

**Not settled — the honest list:**

1. **HR1-2 and HR1-5 real-database variants.** HR1-2's revocation is proven at the
   boundary contract level (injected `authorizationCheck` and the real consent
   query), not by mutating `ClientTrainerAssignment` rows mid-flight in
   PostgreSQL. HR1-5's SQL bound is proven structurally
   (`coachProgressRecordReader.test.mjs:61`) rather than by capturing the complete
   provider-bound prompt against a real fixture of future/edited/deleted workouts.
2. **HR1-6 late conversation overwrite.** Abort delivery, discard-after-resolve and
   listener cleanup are all covered; the specific assertion that a departed caller
   cannot cause a late conversation write is guarded by `aiChatRoutes.mjs:1076` but
   is not itself asserted by a test I found.
3. **This adjudication is partly executed, not purely static.** The cited suites
   were run at this revision under the reviewed isolated runner (dotenv disabled
   by preload, sensitive env scrubbed, non-loopback TCP denied):

   | Suite | Command | Result |
   |---|---|---|
   | HR1 boundary + evidence + context + progress-reader + analytics | `vitest run` (isolated) over 6 files | **6 files / 108 tests passed, exit 0** |
   | HR1-4 progress calculator | `node --test tests/unit/coachProgressEvidence.test.mjs` (isolated) | **10 tests / 10 passed / 0 failed, exit 0** |

   What was **not** executed: any running server, any provider call, any database,
   any browser. The six-finding adjudication rests on source reading plus these two
   executed suites; it is not a runtime release gate.

**Remaining G11 gates, all NOT RUN at this revision** (unchanged from the original
review's own closing paragraph): frozen all-role/scenario/holdout provider
evaluation, privacy and provider-boundary evaluation, Redis-unavailable/restart
behaviour, migration/restore/rollback, performance budgets, real authenticated
journeys, memory UI/routes/purge worker, mounted substitution/share and dashboard
adapters, and proactive delivery. Removing the unfinished Session Desk from the
default mount is a containment change and does not complete the Desk. Registry
classifications still do not establish 139 usable capabilities.

> **UPDATE 2026-09-13 — one gate has since been partially executed.** The
> disposable-Postgres gate ran for the first time: **7 of 10 suites pass** against a
> freshly recreated database (107 tests, exit 0 per file). **3 cannot run under
> isolation** — `coachIntent`, `coachIntent.proof` and `coachIntentListing` are
> `node:test` files that bypass `coachTestDatabase.mjs` and resolve the app's own
> `localhost:5432/swanstudios`, which the preload denies. The purge-worker item in
> the list above is also now partly addressed: `services/coachFactPurgeCron.mjs`
> exists and is registered, but is **default-OFF**, so the purge still does not
> happen in production. Everything else in this list remains NOT RUN. Details:
> register §F2 and §A2.

## Next

The two real-database variants and the late-overwrite assertion above are small and
named. Everything else in the six-finding adjudication is settled. A final combined
review should close those three, run the cited suites rather than cite them, and
then address the remaining G11 release gates — not re-litigate whether the six
repairs exist.
