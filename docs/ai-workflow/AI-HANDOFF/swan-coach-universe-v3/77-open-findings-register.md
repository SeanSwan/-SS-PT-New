# Open findings register — 2026-09-13 session

Consolidated because this session produced findings across seven documents, many
commit messages and several executed probes. A reader should not have to
reconstruct the open set from all of them. **Everything here is OPEN unless the
Status column says otherwise.** Closed items are at the end.

Worktree: `tmp/worktrees/swan-coach-astra-owned-20260906`, branch
`codex/swan-coach-astra-owned-20260906`. Nothing in this session was pushed.

**How to read severity.** Five items this session were *narrowed* after being
raised, and four were corrected outright (see "Corrections" at the end). In every
case the first reading was directionally alarming and the measured reading was
smaller. **Treat any severity here without a linked measurement as a hypothesis.**

**Re-verified after the citation audit (rule 53 sweep, 2026-09-13).** Because six
statuses in this register had already gone stale, root re-checked the remaining
OPEN rows against the tree rather than trusting them. Confirmed still open:
G09-R1 (`purgeDueFacts` is called only from `coachRuntimeEvidence.postgres.test.mjs`
and `coachFactMemoryPolicy.test.mjs` — no route, cron or worker invokes it),
G09-R2 (`detectFactConflicts` likewise has no production caller, and
`conflictMetadata` appears only in the `CoachFact.mjs:157` column definition and a
test fixture, so T37's writer is genuinely unbuilt), G10-R (zero frontend
references to `coach-nudges`/`coachNudges` anywhere under `frontend/src`, so the
consent surface remains API-only), and CT-7 (zero backend references to
`checksumVerified`; see that row for the corrected consequence). **A row that is
OPEN here has been checked, not merely carried forward.**

---

## A. The `'user'`-role class — FIVE instances, one root cause

`'user'` is the **default role minted by public self-registration**
(`backend/models/User.mjs:135`) and is client-equivalent per
`backend/utils/clientAccess.mjs:23 isClientEquivalentRole`. Five separate places
hand-roll a role check that forgets it. Three were fixed early (CA-1, CA-2, and
the photo/profile pair); a hostile review then found three more; the G10 consent
probe found a fifth.

**The ownership layer was never the bug — read this before proposing a fix.**
`assertAssignmentOrAdmin` already treats the two roles identically at
`middleware/verifyClientAccess.mjs:91-93`:

```js
if (userRole === 'client' || userRole === 'user') {
  return requesterId === targetClientId;
}
```

It is also fail-closed throughout — a missing target id or a non-admin with no
requester id returns `false` at `:89`, any role that is not admin/client/user/trainer
returns `false` at `:94`, and the trainer assignment lookup routes **any** throw
through `return false` at `:108-113`. Its own docstring lists `'user'` as a valid
role (`:81`).

So every instance of this class is a **coarse `authorize([...])` role list sitting
in front of a correct ownership check**. The guard that knows about `'user'` never
got to run, because a literal `roles.includes(...)` rejected the request first.
That is why the fix is always "add `'user'` to the list in front of it" and never
"change the ownership logic" — and why widening `authorize` globally would be the
wrong repair, since it would loosen gates that are currently the *only* thing
protecting paths where no ownership check follows (see §A3, where exactly that
mistake was measured and rejected).

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| F1 | **MAJOR — live privacy disclosure** | `clientDataOverviewQueryService.mjs:26` (was `:21` before `474b3524c` shifted the file — see [80](80-citation-drift-and-reanchoring-20260913.md)); the pre-fix form was `requesterRole !== 'client'`, which meant a `user` requester got trainer-note **existence, count and latest-note timestamp** where an explicit `client` got `0`/`null`. Probe: `client` → 0/null, 0 queries; `user` → 4/PRESENT, 2 queries; trainer/admin → 4/PRESENT. The file's own docstrings state the intent being violated. | reviewer probe `tmp/authz-review/probe-trainer-note-gate.mjs`; root read the line | **CLOSED** (`474b3524c`) — root re-verified `:26` = `!isClientEquivalentRole(requesterRole)`. |
| F1b | **MAJOR — a test pins the bug** | `backend/tests/api/clientDataOverviewPrivacy.test.mjs:32-38` is titled "does not expose internal trainer-note metadata to client-role requests" and asserts the **source text** of the broken predicate. Its only behavioural case injects `noteCount: 1` directly, bypassing the gate. Same class as the 2026-08-04 notes guard that "was PROTECTING A BUG". | same | **CLOSED** — converted to behavioural: `clientDataOverviewPrivacy.test.mjs:56` imports the real service and observes the gate decision, and `:43` is now a negative pin against the old source text. Root read the file. |
| F2 | **MAJOR — live 403** | `painEntryRoutes.mjs:35,38,39,40` `authorize(['admin','trainer','client'])` while `verifyClientAccessByUserId` on the same line maps `user → self`. Guards disagree; a fresh signup cannot log its own pain entry. Fail-closed, no disclosure. | reviewer probe `probe-painentry-guard-disagreement.mjs` | **CLOSED** — `'user'` is present in all four `authorize` lists (`painEntryRoutes.mjs:41,44,45,46`), each paired with `verifyClientAccessByUserId`. Root read the file. Note the probe still cannot observe this (§A4). |
| F3 | **MAJOR — live 500** | `aiChatRoutes.mjs:372-373` passes the raw `'user'` into `createPayload.role`; `AiConversation.mjs:36` validates `isIn:[['client','trainer','admin']]`; the create path returns a generic 500. Shipped UI never reaches it (`coachPublicationScope.ts:100-112` excludes `'user'`), so the harm is a 5xx on a public endpoint plus three different answers for one role at one boundary. | reviewer probe `probe-user-role-conversation.mjs` | **CLOSED** — explicit 403 emitted at `aiChatRoutes.mjs:390` (`code: 'COACH_CONVERSATION_AUDIENCE_UNAVAILABLE'`) before any create payload. Root read the file. |
| F3-PRODUCT | **product decision, needs Sean** | The chosen contract rejects a raw `'user'` actor with **403 before any create payload** — deliberately NOT aliasing it to `'client'`, because the same resolver drives the read path and `coachConversationReadAccess.mjs:135-137` (HR15-R1) forbids aliasing a raw `user` into the client audience; aliasing at the create site alone would write conversations the creating account could never read back. **Consequence: the database's DEFAULT self-registration role cannot use Coach conversations at all** — 403 on create, empty/404 on read, and the frontend already excluded it. That is now internally consistent, but it is a product decision rather than a bug fix. Several paths promote `user` → `client` (`onboardingController.mjs:146`, `sessionPackageManualGrantRoutes.mjs:150`, `SessionGrantService.mjs:124`, `sessionPackageCheckoutFulfillmentService.mjs:202`), which narrows the window without closing it. | F3 fix comment; reviewer's unverified note on promotion | **Open — flag for Sean.** |
| F5 | **MAJOR — delivery never reaches the default role** | `coachProactiveNudgeCron.mjs:220` and `:183` (was `:205`/`:168` before `474b3524c` shifted the file — see [80](80-citation-drift-and-reanchoring-20260913.md)) filtered on the literal `'client'`. Probe: two consented accounts (`client`, `user`) → `nudged 1`, notify targets `[11]` only. A `user` account can now consent, the predicate returns true, and delivery silently skips it. | G10 implementer probe | **CLOSED** — audience derived from the shared predicate at `:83`, consumed by both sites. Root read the file and the `474b3524c` diff, which changes exactly these two. |

**CA-3** (MINOR): three modules re-derive `isClientEquivalentRole` locally —
`scheduleController.mjs:20`, `onboardingController.mjs:26`,
`workoutBuilderRoutes.mjs:53`. They agree today, so no live defect; hand-rolled
copies are exactly how CA-1 happened. Collapse onto the shared export when next
touched.

### A2. THIRD WAVE — 10 sibling route registrations with the F2 shape — **FIXED**

Found by the F1–F5 implementer's own sibling sweep, after the second wave was
fixed. **The class was found in three independent passes** and is now closed by
measurement, not by assertion — see "Closure evidence" below.

**Two corrections to this section as first written.** Both were found by the
implementer and independently reproduced by root:

1. **It is 10 route registrations, not 11** — bodyMap 2 + `currentClientAccess` 2 +
   `clientReadAccess` 6. The table's own row already said 2 + 8 = 10; the heading
   disagreed with it.
2. **`currentClientAccess` is NOT a pairing.** The signature this section asserted
   — "pairs `authorize([...'client'...])` with `verifyClientAccessByUserId`" — does
   not hold for it. It was `[protect, authorize(['client','admin'])]` with **no**
   ownership guard at all. The stated *consequence* was real (a `'user'` was 403'd
   from its own current progress) but the *mechanism* was a sibling shape: a single
   guard on a self-scoped endpoint, not two guards disagreeing. It was fixed the
   same way, and the fact that **the pairing guard structurally cannot see it** was
   proven by mutation, not asserted — mutation M3 below leaves the guard GREEN while
   the behavioural suite goes RED.

| File | Lines (post-fix) | Routes | Consequence | State |
|---|---|---|---|---|
| `bodyMapEvidenceRoutes.mjs` | `:28` POST, `:31` DELETE | 2 | A `'user'` could not upload or delete its **own** body-map evidence. Byte-identical to the F2 defect. | **FIXED**, `'user'` appended |
| `clientProgressRoutes.mjs` | `:31` `currentClientAccess` (used at `:46` GET / and `:48` PUT /) | 2 | **Unpaired** — a single guard, no ownership check, on a self-scoped endpoint. `'user'` 403'd from its own current progress. Handler self-scopes on `req.user.id` (`clientProgressController.mjs:64,77`). | **FIXED**; invisible to the pairing guard by construction |
| `clientProgressRoutes.mjs` | `:36` `clientReadAccess` (used at `:52,:54,:56,:58,:60,:62`) | 6 | `'user'` 403'd from reading and updating its own history, goals and risk assessment. | **FIXED**, `'user'` appended |

Staff-only lists left untouched and verified to still exclude clients: bodyMap
`:29`/`:30`, `clientProgressRoutes.mjs:42` `targetClientAccess`.

**Recommended fix shape, as applied — do NOT widen `authorize` globally.**
`authorize(` has 101 call sites under `backend/routes` + `backend/controllers`
alone. Most are staff-only lists that a client-equivalence change would not affect,
but the review surface is all of them, and a global widening would silently admit
`'user'` to any future list containing `'client'`. The per-route lists were kept
and one repo-level guard was added:
`backend/tests/api/authorizeVerifyClientAccessPairingGuard.test.mjs` +
`backend/tests/helpers/authorizePairingScan.mjs`. It fails when a guard is paired,
contains `'client'`, and lacks `'user'`. Allowlist entries require `file` + `scope`
+ `reason` and a **stale entry fails**, so it cannot rot into a blanket; a coverage
assertion fails loudly if any `authorize(` role list is unreadable rather than
silently skipping it; and 15 synthetic can-fail cases prove the detector can fire.

**Closure evidence — two independent methods agree.** The implementer's
bracket-aware detector and root's own separately written single-line sweep both
report **12 `authorize([...'client'...])` lists in `backend/routes`/`controllers`,
of which 0 lack `'user'`**. Root's sweep is
`tmp/coach-astra-hostile-20260912/default-role-pairing-sweep.mjs`; it reads 94 of
101 `authorize(` occurrences (7 are written across lines and are **not** covered by
it), so its vouch is partial by construction — which is precisely why the
independent agreement on the offender count of 0 matters.

**Verified by root, not taken from the report:** 8 suites / 115 tests, exit 0,
covering the two behavioural suites, the pairing guard, the cross-user invariant,
the edited legacy suite and three siblings. Root also confirmed
`git diff --stat backend/controllers/` is empty, so the two controllers the
implementer probe-mutated were restored byte-identically.

### A3. Two same-class sites — the obvious fix is a security opening

`aiWorkoutController.mjs:288` (`Invalid role for workout generation`) and
`longHorizonController.mjs:201` (`Invalid role for plan generation`) both reject
unless `requesterRole === 'admin' || requesterRole === 'client'` — the same
hand-rolled class, failing closed.

**The naive fix is not a fix.** Adding `'user'` to those role whitelists would let a
`'user'` account generate a plan **for another user**. Root verified this by reading
both controllers directly, and the mechanism matches the implementer's executed
counterfactual:

- the role gate is the **only** thing stopping a `'user'` (`:288`, `:201`);
- the self-isolation check runs earlier but is **`'client'`-only**
  (`requesterRole === 'client' && targetUserId !== requesterId` — `:252`, `:174`);
- `targetUserId` falls back to self **only** for `'client'` (`:243`, `:162`), so an
  explicitly supplied foreign `userId` survives as-is for a `'user'`;
- `checkAiEligibility` is called **after** the role gate (`:295`, `:210`).

So widening the whitelist removes the only guard on that path and the request
reaches plan generation for someone else's account. The implementer demonstrated it
by mutation (`reachedEligibility` flipped false→true, 2 failed | 8 passed on each
controller) and restored both controllers byte-identically.

**Recommendation: leave as-is (fail-closed).** If a human decides these routes are
client-facing, change all three sites per handler together via
`isClientEquivalentRole` — never the whitelist alone.
`backend/tests/api/aiPlanGenerationCrossUserInvariant.test.mjs` pins the cross-user
property that holds under **either** human decision and goes red under a partial
fix, so the trap cannot be walked into silently later.

### A3b. A THIRD instance of "a test pins the bug"

`clientProgressRoutesSecurity.test.mjs:29,41` asserted the exact broken strings
`authorize(['client', 'admin']),` and `authorize(['client', 'trainer', 'admin']),`
via `expect(routeSource).toContain(...)`. GREEN was **impossible** without editing
them. Root verified this against `HEAD` before accepting the edit.

This is the same mechanism as F1b, and it is the reason the class survived two
sweeps: a source-text assertion on hand-rolled role code does not merely fail to
catch the defect, it actively prevents the repair. **Any `toContain` assertion
whose argument is a role list should be treated as suspect.** The two lines were
updated as part of this slice; it is the only pre-existing test file the
implementer touched, and it flagged the edit rather than hiding it.

### A4. WARNING — two of this session's probes CANNOT observe route-level fixes

`tmp/authz-review/probe-painentry-guard-disagreement.mjs:18` hard-codes
`authorize(['admin','trainer','client'])`, and `probe-user-role-conversation.mjs:19-25`
copies `resolveConversationAudienceRole` byte-for-byte and calls the model
directly. **Re-run after the fixes, both still print their pre-fix conclusions.**
The evidence for F2 and F3 is therefore the route-mounted suites, not the probes.
Anyone re-verifying from those probe scripts will get a false "still broken" — the
same failure mode as the two Vite hazards in §E, arriving by a different route.


## B. Capability truth (declared-but-not-real)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| CT-1 | MAJOR | **The entire BullMQ video job queue is dead code.** `initVideoJobQueue()` (`videoJobQueue.mjs:328`) is the only reader of `REDIS_URL` and has **zero callers**; `addJob` short-circuits and **no video job has ever been enqueued**. `startWorker`/`routeJob` and all six processors are `TODO` stubs. | [76](76-correction-phantom-bullmq-control.md) | Open — implementing the queue is a feature, not a repair. |
| CT-2 | MAJOR | False success log on the upload path — **FIXED**. | `d05e9eaa0` | Closed. |
| CT-3 | MAJOR | Health surface reported `available:true` while every enqueue no-opped — **FIXED**, now fails closed; production truth is `available:false`. | `d05e9eaa0` | Closed. |
| CT-4 | MINOR | `/job-queue-health` shadowed by `/:id` — **FIXED**, upgraded from `[LIKELY]` to measured (404 before, 200 after; in production it would be a 500 from an invalid-UUID PK). | `d05e9eaa0` | Closed. |
| CT-5 | MAJOR→latent | Against a **reachable-but-silent** Redis, `initVideoJobQueue()` was still pending after **16012 ms**. Unreachable today because nothing calls it. | [76](76-correction-phantom-bullmq-control.md) | Open. **Bound this BEFORE wiring any caller to `videoJobQueue.mjs:328`.** |
| CT-6 | MINOR | `redisClient` has no `'error'` listener (`videoJobQueue.mjs:356`). | same | Open; no test demonstrates the defect it causes. |
| CT-7 | MINOR | **Dangling read:** `frontend/src/hooks/useR2Upload.ts:203` reads `result.checksumVerified ?? false`, and the backend **never sets the field anywhere** — root grepped all of `backend/**/*.mjs` and found zero occurrences. Precise consequence: because of the `?? false` default the normalised value is permanently `false` (not an `undefined` that propagates), so the upload UI reports "not verified" on every successful upload and no integrity signal is ever surfaced. Also note the read is normalised at `:203` into a `checksumVerified: boolean` field declared at `:31` with a `false` default at `:47`. | P77-B report; root re-verified | Open. |

## C. Slice residuals (the real remaining work)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| C2C3 | **the big one** | **C2 (`useCoachSessionSelection` + target-access) and C3 (controller/page/pin wiring + `CoachSelectionDecision.tsx`) are NOT STARTED.** Consequence: **C4 and C1 are DORMANT** — `CoachCommandCenter.controller.ts:173-177` passes no binding, and nothing registers a selection interceptor or calls `commitClientReference`. Neither slice reaches users; neither is "connected selection". The test that would have caught the dormancy cannot exist until C3 does. | C1-C4 reports; `b36f874d7` | Open. Highest-value remaining work. |
| C1-FALSEOPEN | — | Two fail-closed predicate branches **were already fail-open**, proven by revert: removing `isPublicationAdmitted`'s neither-dimension line **admitted a bindless request**; forcing `hasLivePublication` to `true` made the food query **send an unowned legacy payload while blocked**. | C1 can-fail proof | **Closed** — both now have direct tests. |
| G07-R | — | **Not the modules** — all four plan-41 deliverables are present and green (33 vitest + 10 node:test). The gap packet 70 names is (a) **mounted integration** of substitution and share against authoritative data and (b) **exercise-matching quality**. Neither is owned by plan 41. | [75](75-g07-g09-g10-residual-status.md) | Open. |
| G09-R1 | MAJOR | **Nothing called `purgeDueFacts` in production.** T35's 24 h purge clock is stamped by `forgetFact` and the policy's purge is unit-tested, but no route, worker or cron invoked it — so forgotten rows were never actually destroyed. **Partially addressed:** `backend/services/coachFactPurgeCron.mjs` now exists, is registered in `core/startup.mjs` beside the other schedulers, and has a 20-test suite with two proven can-fail mutations. **But it is default-OFF (`ENABLE_COACH_FACT_PURGE=true` required), so the purge still does not happen in production until an operator flips it.** This row therefore stays OPEN. What changed is the class of gap: it is no longer "no code path exists" but "a tested code path exists and is not switched on". | G09 report; `coachFactPurgeCron.mjs` | **Open — narrowed.** Do not report closed because the file exists. Flipping the switch destroys rows, so it should follow a real run of the disposable-Postgres gate (§F1). |
| G09-R2 | — | **`detectFactConflicts` and the `conflictMetadata` column have no writer anywhere** — T37's "mark conflict" write path is unbuilt (satisfied only at the pure-function level). **Reclassified after reading it: this is an UNBUILT FEATURE, not a missing caller like G09-R1 — do not "just wire it".** Three pieces of evidence. (1) The detector is pure **by design**, and says so: `coachFactMemoryPolicy.mjs:115-118` — *"Pure: returns the conflict report and the authoritative values to use; it NEVER mutates rows or silently rewrites facts."* (2) The schema already declares the intended writer: `CoachFact.mjs:157-161` documents `conflictMetadata` as *"T37 conflict annotations; written only by an explicit reconcile step."* (3) **No such reconcile step exists and nothing specifies what it should do** — there is no defined behaviour for a conflicted fact (annotate it? invalidate it? surface it to the client? block approval?), no route, no job and no UI. Also do not be misled by `coachFactService.mjs:374` `COACH_FACT_STATUS_CONFLICT`: that is a **409 status-transition error** ("Cannot {action} a fact with status X"), unrelated to fact-content conflicts. | G09 report; root read the detector, the model column and the service | Open. **Needs a product decision on conflict behaviour before any code**, which is why root did not implement it. |
| G09-R3 | — | The S9 memory **drawer does not exist**; the routes now exist but no UI consumes them. | G09 report | Open. |
| G10-R | — | The consent surface exists but has **no frontend consumer** — consent is reachable by authenticated API call, not by any button. | `c6de0d021` | Open. |
| G10-R2 | MINOR | The consent merge is non-transactional read-modify-write (lost-update window; same class as `PUT /api/profile`). Blast radius is a stale toggle, not unauthorized consent. | G10 report | Open. |
| G10-R3 | MINOR | `profileController.mjs:384/:477-486/:560` is a **generic unvalidated whole-object `notificationPreferences` writer** — probed: persists coach keys verbatim, stores the string `"true"` as junk without complaint, and **replaces** the object, dropping sibling `sms`/`quietHours`. | G10 report, probed | Open. |
| M68-F3 | MINOR | The floating mobile command strip overlaps the `client-bar` card at 390×844. **Pre-existing, NOT caused by M68** — a different element pair from the one M68 fixed; the matrix `clipped` check covers viewport escape, not element-to-element overlap. | [71](71-m68-transcript-containment-exit.md) | Open. |
| HR13 | — | Rest-adjust contracts. Deliberately not launched: plan 59 requires an **exclusive** `useCoachCommand.ts` window, collides with R60-A's lane, and must land **after** C1-C4 so it integrates with plan 55's fences. Plan 59 is marked "plan only, no implementation enqueue". | [74](74-parent-adjudications-20260913.md) A4 | Open, gated. |
| HR16-E2E | MINOR | The HR16 retry cap had **no real test** — deleting the guard left the suite GREEN, because the test's mock always resolved successfully so the retry branch was never taken. | hostile review F4 | **CLOSED** — `CoachCommandCenter.controllerEffects.routedThreadHydration.test.tsx:159-179` now makes the guarded load genuinely fail and asserts exactly `ROUTED_THREAD_LOAD_ATTEMPT_LIMIT` GETs, re-reading after a 50 ms settle so an uncapped loop would show a 4th. Root read the file. (`:147-148` remains the weaker success-path bound; only `:159` is the can-fail case.) |
| MEM-WAIVER | — | `middleware/waiverGate.mjs:41` lists `/api/coach` in `GATED_API_PREFIXES`, so client-equivalent callers need a linked `WaiverRecord` or they get 403 `WAIVER_REQUIRED` before any coach memory handler. A UI must handle that. | G09 report | Open. |

## D. Test hygiene / Rule 4

| ID | Sev | Finding | Status |
|---|---|---|---|
| T-1 | MINOR | **Six files this session touched exceed the Rule-4 300-line cap and are queued for splitting:** `aiChatTtsPaywallParity.test.mjs` 346; `coachConversationReadAuthorization.test.mjs` 555; `coachIntentRoutes.test.mjs` 328; `coachMemoryRoutesAuthz.test.mjs` 524; `notificationSettingsCoachNudgeConsent.test.mjs` 476; `GlobalClientContext.selectionReference.test.tsx` 332. All six are **test** files and none carries the `swan-guard-allow-long-file` opt-out. | Open. Split queued. |
| T-1-BASELINE | **correction — this row previously overstated the guard gap and gave unsafe advice** | **Rule 4 is not a six-file problem. Measured across tracked code: 786 files exceed the 300-line cap — 438 backend / 348 frontend, of which 594 are runtime and 192 are tests.** Largest: `sessionRoutes.mjs` 5331, `gamificationController.mjs` 4099, `sessions.mjs` 3184. The earlier row said "none was caught at commit time" and that "fixing that guard gap is worth more than the six splits". Both were wrong. (1) `frontend-guards.mjs:14` marks G6 **ADVISORY — "warns, never blocks"**, so the cap never gates a commit for anyone; the frontend test file above *would* have produced a WARN when staged, and warnings nobody must read are the reason it was missed. (2) The frontend-only scope is **deliberate**, documented at `frontend-guards.mjs:5` as "never the whole repo", and consistent with Rule 34 — so it is a designed boundary, not an oversight. (3) The advice was therefore unsafe as written: making a 300-line check *blocking* over `backend/` would block commits across **438** backend files immediately, and making it advisory over `backend/` adds warnings to a mechanism that already warns on 348 frontend files of which **zero** use the opt-out. Recommend instead: split the six as ordinary debt, and treat repo-wide Rule-4 debt as its own migration with an explicit owner. Measured by `git ls-files -- backend frontend/src` filtered to code extensions, counting lines per file; no probe is committed, so re-measure rather than trust these numbers. | Recorded; recommendation reversed. |
| T-1b | MINOR | The P64/S66 implementer justified its three overflows by claiming packets 64/66 forbid new test files. **Root checked; no such prohibition exists.** Recorded as a genuine unfixed violation, not a packet-constrained one. | Recorded (`adf5e74c5`, [74](74-parent-adjudications-20260913.md) A5). |
| T-2 | MINOR | `known-failing-baseline.json` was recorded **2026-09-02**. **Reconciled 2026-09-13 by a serialized quiet-tree run — see §D1 below.** The baseline is accurate (7/7 still failing, none recovered) and there are **no regressions**: nothing that used to pass now fails. Five unbaselined failures exist and are **pre-existing**, not caused by this session. | Open as burn-down, not as risk. Do **NOT** grow the list casually. |
| T-3 | MINOR | `tests/api/clientPhotoUploadAuthzExecution.test.mjs:158` is **pre-existing RED at pristine HEAD** (`assertAssignmentOrAdmin` returns a Number where the test pins a String). Confirmed, not inferred. | Open. |
| T-4 | — | The G09 mounted-authz suite's RED was an `ERR_MODULE_NOT_FOUND` import error, which the implementer correctly **declined to count as RED**; the behavioural RED came from the mounted file. Recorded because the distinction is the whole point. | Closed as a disclosure. |

### D1. Baseline reconciliation — serialized quiet-tree run, 2026-09-13

Root ran the whole backend suite once, alone, through the isolated runner with
`--maxWorkers 1 --no-file-parallelism --retry 0`, after confirming `git status` had
no modified `backend/` files. Result:

```
Test Files  13 failed | 1265 passed (1278)
     Tests  14 failed | 10714 passed (10728)
  Duration  377.47s
```

| Set | Files | Status |
|---|---|---|
| Recorded baseline | 7 | **All 7 still fail** — the baseline is accurate and nothing recovered |
| Documented separately as T-3 | 1 (`clientPhotoUploadAuthzExecution`) | Pre-existing RED, already recorded, correctly absent from the baseline |
| Unbaselined, **now diagnosed** | 3 | `historyBackfill`, `phase1cXpIntegration`, `workoutPrDetection` — see below |
| Unbaselined, **still unclassified** | 2 | `consoleRedaction` (`expected false to be true`), `physicalConfirmChannelSplit` (`expected 403 to be 200`, ×4) |

**Headline: there are no regressions.** Nothing that used to pass now fails. The
five unbaselined failures were previously "UNKNOWN status"; three are now explained
and all five are shown to predate this session.

**The three diagnosed failures are all source-text assertions.**
`historyBackfill` expects `/awardPoints: !sourcePolicy\.suppressEngagementSideEffects/`,
and `phase1cXpIntegration` / `workoutPrDetection` expect
`/detectAndRecordPersonalRecords\(\{/`, all read with `readFileSync` from
`dailyWorkoutFormRoutes.mjs`. Root checked that file directly:
`runWorkoutXpAwardStep` **0 occurrences**, `awardPoints` **0**, and
`suppressEngagementSideEffects` **0** — which is exactly why
`phase1cXpIntegration:245`'s `lastIndexOf('runWorkoutXpAwardStep')` returns `-1` and
the test reports `expected -1 to be greater than 11356`.
`detectAndRecordPersonalRecords` does appear **2** times, but not in the `({` call
shape the regex demands. Nothing about these can be an artifact of the isolated
runner: `readFileSync` is not affected by environment or network.

**These are pre-existing, verified.** `git log 4345b86cf..HEAD` — this session —
shows **zero** commits touching any implicated file. Their last changes are
2026-07-06 (`phase1cXpIntegration`), 2026-07-07 (`historyBackfill`), 2026-07-12
(`workoutPrDetection`), 2026-07-29 (`consoleRedaction`), 2026-09-03
(`physicalConfirmChannelSplit`), and **2026-09-12** for `dailyWorkoutFormRoutes.mjs`
itself (`346373264`, "wip(coach): preserve hostile repairs and selective release
handoff locally") — the day before this session began. That last commit is the
likely moment the source text moved out from under the three tests.

**Note the mechanism.** Three of five unbaselined failures, plus F1b, plus
`clientProgressRoutesSecurity.test.mjs:29,41` (§A3b), are all tests asserting on
**source text rather than behaviour**. That is now four independent instances of one
anti-pattern in this repo, and it fails in both directions: it hides defects when it
pins broken code, and it manufactures red when the code is legitimately refactored.
`historyBackfill`, `phase1cXpIntegration` and `workoutPrDetection` are the second
kind — green tests that turned red purely because a 2621-line route file was edited.

**Recommended disposition, in priority order:** (1) convert the three source-text
suites to behavioural assertions — they are currently red for a reason that carries
no information about product correctness; (2) classify the remaining two, since
`expected 403 to be 200` in particular could be either a real auth regression or a
fixture gap and should not stay ambiguous; (3) only then decide whether the baseline
list changes. **Do not add these five to `known-failing-baseline.json` before step
(1)** — the list says "shrink this list; never grow it casually", and growing it
would hide three failures that are fixable today.

**Reproduce** (the run is safe; see §F1 for why the disposable-DB question is
separate): confirm `git status -- backend/` is clean, then
`tmp/coach-astra-hostile-20260912/p64s66-isolated-run.ps1 -LogPath <absolute>` with
no file arguments. Log: `tmp/baseline-reconcile-full-20260913.log`. **Do not run
`backend/scripts/test-baseline-gate.mjs` on a machine whose `.env` holds production
credentials — read §E INF-4 first.**

## E. Shared infrastructure hazards (they mimic code regressions)

| ID | Sev | Finding | Status |
|---|---|---|---|
| INF-1 | MAJOR for diagnosis | The shared Vite dev server on **4990** is killed by a same-directory atomic-write pattern. **It has now happened twice, and the second occurrence is fully captured.** First: `EBUSY` watching a transient `.globalClientPin.ts.<pid>.<uuid>.tmpdir/…tmp` (`0f9a9fd0f`). Second, 2026-09-13 02:58, killing that restarted server with an unhandled `FSWatcher` error: `EBUSY: resource busy or locked, watch '…/coach-assistant/.CoachCommandCenterVoiceLifecycle.test.tsx.84500.<uuid>.tmpdir/CoachCommandCenterVoiceLifecycle.test.tsx.tmp'`. **Mechanism:** tooling writes `.<name>.<pid>.<uuid>.tmpdir/<name>.tmp` *inside the watched source directory*; chokidar's `fs.watch` on that transient file raises `EBUSY`, and because `FSWatcher` emits it as an `error` event Node exits the process. It is **not** agent-specific and not caused by the file's content — it is caused by *where the temp file is created* while a watcher is armed. **As of this writing the 4990 server is DOWN.** Any browser gate needing it will fail for this reason, not because of the change under test. | Recorded (`0f9a9fd0f`); second occurrence 2026-09-13 |

**Proposed fix for INF-1 (not applied — it is a config change, not a bugfix).** Add the
temp pattern to Vite's watcher ignore list so the transient `.tmpdir` tree is never
watched, e.g. `server.watch.ignored: ['**/.*.tmpdir/**', '**/*.tmp']` in
`frontend/vite.config.*`. That addresses the cause rather than restarting the server
after each occurrence, and it is the only remedy on this list that makes the failure
stop recurring. A second option — making the writer place temps outside the watched
tree — belongs to the tooling, not this repo. Prefer a task-local server for
planner-mounting browser gates regardless, for the separate INF-2 reason.
| INF-2 | MAJOR for diagnosis | Port 4990 breaks any **planner-mounting** browser gate — `deps/react-window.js` 504s with `Outdated Optimize Dep` while `_metadata.json` advertises a different `browserHash`; the stale reference is served from the untouched `WorkoutPlannerRolodexPanel.tsx`. M68 and HR16 gates still pass, so it is scoped. Use a task-local server for planner gates. | Recorded (`0f9a9fd0f`). |

| INF-3 | **MAJOR for diagnosis — root's own probe** | A probe of root's reported **`"0 files scanned"` and `coverageComplete: true`** — a clean-looking result from a run that inspected nothing. The hardcoded Windows root had been written with inconsistent escapes (file text `C:\\Users\BigotSmasher\\...`), so JS parsed the `\B` away and the probe walked a non-existent `C:\UsersBigotSmasher\...`. A `catch { return out; }` swallowed the ENOENT, so the failure printed as success. **Two fixes, both applied:** derive the root from `import.meta.url` instead of hardcoding it, and fail loudly (unreadable directory → report + non-zero exit; empty scan → FATAL). The stale rule: a scan that cannot distinguish "found nothing" from "read nothing" is not evidence. | Recorded; probe fixed |

Both produce the same wrong conclusion — *"my change broke the browser gate"* —
which is why they live here rather than in a job log.

INF-3 is the same family arriving by a third route: *"my check passed"* when the
check never ran. The general lesson is that a diagnostic must **prove it looked**.
The pairing guard added with the third-wave fix asserts `>150 files` and `>0
pairings` for exactly this reason, and this register treats a silent `catch` in a
probe as a defect rather than a convenience.

### INF-4. PRODUCTION-SAFETY — the pre-push baseline gate runs the suite with no isolation `[LIKELY risk, mechanism VERIFIED; no incident observed]`

`backend/scripts/test-baseline-gate.mjs` is the repo's own push gate: it runs the
suite, compares failing test **files** against `known-failing-baseline.json`, exits
1 on a file that used to pass, and reports baseline entries that now pass as
"prune them" (`:102-103`, `:108-122`). The design is good and the comment at
`:108-111` — *"a baseline nobody prunes becomes a place to hide new breakage"* — is
correct.

**Its isolation is the problem.** At `:43` it spawns `npx vitest run --reporter dot`
**inheriting the ambient environment**, with no dotenv-disabling preload and no
network restriction. Three verified facts combine:

1. Two backend modules call `dotenv.config()` at module scope, so importing them
   loads `.env`: `authController.mjs:249` and `userManagementController.mjs:328`.
2. `tests/setup.mjs` does **not** load dotenv (it assigns test-only values directly
   at `:10-16`) — so nothing in the normal test path guards this either way. The
   exposure comes from the imported application modules, not the setup file.
3. CLAUDE.md states plainly that local dev uses the **production** database via
   `DATABASE_URL`.

So a test that imports either controller can acquire the production connection
string, and nothing in the gate prevents subsequent egress. **Root did not observe
an incident** — no test was run this way and no production query was made. This is
recorded as a mechanism-verified hazard, `[LIKELY]` risk rather than a confirmed
breach, because the missing piece is proof that some test actually reaches a DB
call on that path.

**Why this session never hit it.** Every backend run here used the isolated runner
(`tmp/coach-astra-hostile-20260912/p64s66-isolated-run.ps1`), whose preload
"disables dotenv BEFORE the backend base imports, and denies any TCP connect that is
not loopback on a high ephemeral port". That runner is the mitigation. **Prefer it
over `test-baseline-gate.mjs` for any run on a machine whose `.env` points at
production**, and treat the gate as a convenience for CI-like environments where
`DATABASE_URL` is known not to be production.

Related, and safe: `backend/vitest.config.mjs:35` excludes `tests/integration/**`,
which is why the 10 `.postgres.test.mjs` files need their own configs and never run
in a default suite. Note also `retry: 1` at `:80` — a default that can mask a flaky
failure, which is why the isolated runner overrides it with `--retry 0`.

## F. G11 release gates — one gate partially executed, the rest NOT RUN

**Executed:** the disposable-Postgres gate — see §F2 for the 7-of-10 result.
**Still NOT RUN:** frozen all-role/scenario/holdout provider evaluation · privacy and
provider-boundary evaluation · Redis-unavailable/restart at integration level ·
migration/restore/rollback · performance budgets · real authenticated role
journeys · mounted substitution/share and dashboard adapters. See
[73](73-g11-original-six-findings-adjudication.md) for what the six-finding
adjudication did and did not settle.

### F1. Why the real-database gate did not run — measured, not assumed

Earlier wording said "no real PostgreSQL was exercised". Root established the
precise reason, and it is **not** that no database exists:

- **Two PostgreSQL instances ARE listening** on loopback ports **5432 and 5433**.
- The disposable test database is a **separate, deliberately isolated** container.
  `backend/tests/helpers/coachTestDatabase.mjs` is explicit at `:1`: "Never reads
  application .env/DB URLs. Test runner supplies the port of its owned container;
  fixed loopback/test DB." It requires `SWAN_COACH_TEST_PORT` and **throws** if the
  port is unset or out of range (`:5-7`), then connects to a fixed database
  `coach_test_20260906` as `coach_test_admin` on `127.0.0.1` (`:8-10`).
- That container is **not currently running**. Root probed `5432`, `5433`, `54320`
  and `55432` as `coach_test_admin`: 54320 and 55432 are closed, and 5432/5433 are
  listening but reject that user (`SCRAM-SERVER-FIRST-MESSAGE: client password must
  be a string`) — i.e. they are **some other** PostgreSQL, not the test database.
  No credentials were attempted against them.

**So the gate is blocked on a missing disposable container, not on a missing
database** — and it is one `SWAN_COACH_TEST_PORT` away from being runnable.

**Two safety facts a future runner must know before touching it.** The 10
`.postgres.test.mjs` files run `TRUNCATE "Users" CASCADE` and truncate
`body_measurements` and `ai_privacy_profiles` in `beforeEach`. That is destructive
by design and is only safe because `coachTestDatabase.mjs` refuses to read
`DATABASE_URL`. **Do not "fix" that helper to fall back to the application
connection string, and do not point `SWAN_COACH_TEST_PORT` at 5432 or 5433** —
CLAUDE.md states local dev uses the production database via `DATABASE_URL`, so
either change converts this suite into a production-data wipe.

Root also did **not** run `npm run test:db` (`backend/scripts/test-db.mjs`): it
loads `.env` (`:22-28`) and connects via `DATABASE_URL` when
`NODE_ENV=production` (`:41-50`), so it is not a safe way to answer this question.

Re-run the probe with
`node tmp/coach-astra-hostile-20260912/find-test-db-port.mjs`; it is read-only
(`SELECT 1` / `current_database()` / an information_schema count) and exits
non-zero when no disposable container is found.

### F2. The real-database gate — PARTIALLY EXECUTED, with a precise split

Root ran it. This is the first time this session the disposable-Postgres gate has
actually executed, and the result is a split, not a pass or a fail.

**A fresh container is required, and it now exists as a recipe.** The container
`swan-coach-review-01a09491` on port 55439 *is* the coach test DB
(`coach_test_admin` / `coach_test_20260906`, `postgres:17-alpine`), but it was
created **2026-09-12 by a previous session**, and the session's preload
deliberately denies that exact port (`backend-post-hr11-preload.cjs`, `port===55439`)
— a cross-contamination guard. Root respected it rather than circumventing it, and
created its own container instead:

```
docker run --rm -d --name swan-coach-test-20260913 \
  -p 127.0.0.1:55440:5432 \
  -e POSTGRES_USER=coach_test_admin \
  -e POSTGRES_DB=coach_test_20260906 \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine
SWAN_COACH_TEST_PORT=55440
```

Loopback-only, synthetic user, no production credentials. The container was stopped
afterwards; the review container was verified still `Up` and untouched.

**Result: 7 of 10 suites PASS under isolation, against a freshly recreated database.**

| Suite | Result |
|---|---|
| `coachReadAuthorization` | 18 passed |
| `coachRuntimeEvidence` | 27 passed |
| `coachWorkoutAtomic` | 13 passed |
| `coachWorkoutDraft` | 7 passed |
| `coachWorkoutDraft.astraHostile` | 3 passed |
| `coachWorkoutIntent` | 24 passed |
| `coachWorkoutReadback` | 15 passed |
| **Total** | **107 tests, exit 0 per file** |

**3 suites CANNOT run under isolation.** `coachIntent`, `coachIntent.proof` and
`coachIntentListing` are `node:test` files (`import { before, after, test } from
'node:test'`) that **do not use `coachTestDatabase.mjs`** and ignore
`SWAN_COACH_TEST_PORT`. They resolve the application's own default connection
(`Host: localhost`, `Port: 5432`, `Database: swanstudios`, `User: swanadmin`), which
the preload then denies: **7 of 8 tests fail with
`COACH_UNIT_EXTERNAL_OR_DATABASE_NETWORK_DENIED`**, and the one pass is a
model/schema assertion that needs no live query. The earlier recorded matrix shows
`coachIntent.postgres.test.mjs` green (8/8, exit 0) with `"runner": "node:test"`.
**Under the isolation boundary that result is not reproducible** — so it was
obtained by some other route, and nobody should treat those three as a passing gate
until they honour the disposable-DB contract like the other seven.

**Two traps found while running this, both worth not repeating.**

1. **Running all 10 in ONE vitest invocation is invalid and produces false
   failures.** It yielded `4 failed | 6 passed`, every failure being
   `column "bodyMapHeadPhoto" of relation "Users" does not exist`. These suites
   share a database and are not mutually isolated: an earlier suite creates `Users`
   with a narrower column set, so a later suite's `User.sync()` emits
   `CREATE TABLE IF NOT EXISTS` (silently skipped) and then
   `COMMENT ON COLUMN "Users"."bodyMapHeadPhoto"` (fails, 42703). **Proven by
   experiment, not inferred:** `coachReadAuthorization` fails in the batch and
   passes **18/18 alone on a fresh database**. One file per reset, always.
2. **The `Host: localhost / Port: 5432 / Database: swanstudios / User: swanadmin`
   banner is a CONFIG ECHO printed at import, not evidence of a connection.** Root
   read it as a successful connection to the application database and nearly
   recorded a production-data breach. It was not: all seven failures were the
   preload's `DENIED` error, i.e. the connection never happened. Recorded because
   the banner is genuinely misleading and the next reader will meet it.

**The isolation boundary itself was verified, with a control.** With the preload,
port 5432 throws `COACH_UNIT_EXTERNAL_OR_DATABASE_NETWORK_DENIED` and 55440 connects;
without the preload both connect. So the guard is sound and the probe is meaningful
— the boundary held in every run above. Probe:
`tmp/coach-astra-hostile-20260912/verify-preload-boundary.mjs`.

**Recreate and re-run:** start the container above, then
`tmp/coach-astra-hostile-20260912/run-postgres-matrix-serial.ps1 -OutDir <abs> -Port 55440`.
Per-file logs land in the OutDir. **Do not use the single-invocation config** for a
verdict, and **do not run the three `node:test` files unisolated** to make them pass
— that is the INF-4 hazard.

---

## Corrections this session (each one is a lesson, not an embarrassment to bury)

| Claim | Correction | Where |
|---|---|---|
| HR16 was an auth-binding race | **No** — `React.StrictMode`'s dev double-invoke aborts the load before dispatch, and a latch made it permanent | [71](71-m68-transcript-containment-exit.md) |
| CA-0 was a live cross-client exposure | **No** — the mounted URL is admin-gated and the endpoint has zero consumers | [72](72-clientaccess-policy-and-caller-audit.md) |
| Packet 70's queue handoff "cannot be taken — the subject does not exist" | **Too strong** — its *line references are real*; only its names are wrong | [76](76-correction-phantom-bullmq-control.md) |
| The clientAccess sweep found "69 hits" | **Not reproducible** — an independent re-derivation got 99 raw / 76 runtime; the count is pattern-dependent and should not have been stated as a fact | [72](72-clientaccess-policy-and-caller-audit.md) |
| A wrapper reported "min-width: 0 fixes the layout" | **It is inert** — measurement showed every rect identical with it forced back to `auto` | [71](71-m68-transcript-containment-exit.md) |
| "The guard gap that let [the six over-cap files] through matters more than the splits" | **Reversed by measurement.** G6 is advisory-by-design and frontend-scoped on purpose, so extending it catches nothing here; and Rule 4 is violated by **786** tracked files, not six — the six were a slice-local count presented as the repo's state (a Rule-56 baseline-disclosure failure). | §D T-1-BASELINE below |

## Closed this session (for completeness)

M68 ± hostile review round 1 · HR16 · CA-1 · CA-2 · P64 · S66 · HR14 · HR15 ·
R60-A · HR12/P58 ± its browser gate · C4 admission boundaries · C1 client
reference API · G09 memory HTTP surface · G10 nudge wiring · G10 consent surface ·
P77-B truth fixes · M68-F2 · the G11 six-finding adjudication · the phantom
`USE_BULLMQ_RECONCILIATION` correction · the residual Redis question (closed as **no
defect on any request path**) · **F1, F1b, F2, F3 and F5** (`474b3524c`; statuses in
§A were stale and were corrected on 2026-09-13 — see
[80](80-citation-drift-and-reanchoring-20260913.md) §4).
