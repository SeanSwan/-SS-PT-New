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

---

## A. The `'user'`-role class — FIVE instances, one root cause

`'user'` is the **default role minted by public self-registration**
(`backend/models/User.mjs:135`) and is client-equivalent per
`backend/utils/clientAccess.mjs:23 isClientEquivalentRole`. Five separate places
hand-roll a role check that forgets it. Three were fixed early (CA-1, CA-2, and
the photo/profile pair); a hostile review then found three more; the G10 consent
probe found a fifth.

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
| CT-7 | MINOR | **Dangling read:** `frontend/.../useR2Upload.ts:196-204` reads `result.checksumVerified`, which the backend **never sets** — always `undefined`. | P77-B report | Open. |

## C. Slice residuals (the real remaining work)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| C2C3 | **the big one** | **C2 (`useCoachSessionSelection` + target-access) and C3 (controller/page/pin wiring + `CoachSelectionDecision.tsx`) are NOT STARTED.** Consequence: **C4 and C1 are DORMANT** — `CoachCommandCenter.controller.ts:173-177` passes no binding, and nothing registers a selection interceptor or calls `commitClientReference`. Neither slice reaches users; neither is "connected selection". The test that would have caught the dormancy cannot exist until C3 does. | C1-C4 reports; `b36f874d7` | Open. Highest-value remaining work. |
| C1-FALSEOPEN | — | Two fail-closed predicate branches **were already fail-open**, proven by revert: removing `isPublicationAdmitted`'s neither-dimension line **admitted a bindless request**; forcing `hasLivePublication` to `true` made the food query **send an unowned legacy payload while blocked**. | C1 can-fail proof | **Closed** — both now have direct tests. |
| G07-R | — | **Not the modules** — all four plan-41 deliverables are present and green (33 vitest + 10 node:test). The gap packet 70 names is (a) **mounted integration** of substitution and share against authoritative data and (b) **exercise-matching quality**. Neither is owned by plan 41. | [75](75-g07-g09-g10-residual-status.md) | Open. |
| G09-R1 | MAJOR | **Nothing calls `purgeDueFacts` in production.** T35's 24 h purge clock is stamped by `forgetFact` and the policy's purge is unit-tested, but no route, worker or cron invokes it — so forgotten rows are never actually destroyed. | G09 report | Open. |
| G09-R2 | — | `detectFactConflicts` and the `conflictMetadata` column have **no writer anywhere** — T37's "mark conflict" write path is unbuilt (satisfied only at the pure-function level). | G09 report | Open. |
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
| T-2 | MINOR | `known-failing-baseline.json` was recorded **2026-09-02** and is stale. A concurrent full-suite A/B saw 12 failing files against its 7; **5 have UNKNOWN status**. | Open. Do **NOT** grow the list — it says "Shrink this list; never grow it casually", and the runs happened under three concurrent writers where flakes were observed directly. Needs a serialized quiet-tree run. |
| T-3 | MINOR | `tests/api/clientPhotoUploadAuthzExecution.test.mjs:158` is **pre-existing RED at pristine HEAD** (`assertAssignmentOrAdmin` returns a Number where the test pins a String). Confirmed, not inferred. | Open. |
| T-4 | — | The G09 mounted-authz suite's RED was an `ERR_MODULE_NOT_FOUND` import error, which the implementer correctly **declined to count as RED**; the behavioural RED came from the mounted file. Recorded because the distinction is the whole point. | Closed as a disclosure. |

## E. Shared infrastructure hazards (they mimic code regressions)

| ID | Sev | Finding | Status |
|---|---|---|---|
| INF-1 | MAJOR for diagnosis | The shared Vite dev server on **4990 was killed** by another agent's file-write pattern: `EBUSY` watching a transient `.globalClientPin.ts.<pid>.<uuid>.tmpdir/…tmp` that chokidar tried to watch. Restarted and verified up. | Recorded (`0f9a9fd0f`). |
| INF-2 | MAJOR for diagnosis | Port 4990 breaks any **planner-mounting** browser gate — `deps/react-window.js` 504s with `Outdated Optimize Dep` while `_metadata.json` advertises a different `browserHash`; the stale reference is served from the untouched `WorkoutPlannerRolodexPanel.tsx`. M68 and HR16 gates still pass, so it is scoped. Use a task-local server for planner gates. | Recorded (`0f9a9fd0f`). |

Both produce the same wrong conclusion — *"my change broke the browser gate"* —
which is why they live here rather than in a job log.

## F. G11 release gates — all NOT RUN at this revision

Frozen all-role/scenario/holdout provider evaluation · privacy and
provider-boundary evaluation · Redis-unavailable/restart at integration level ·
migration/restore/rollback · performance budgets · real authenticated role
journeys · mounted substitution/share and dashboard adapters. See
[73](73-g11-original-six-findings-adjudication.md) for what the six-finding
adjudication did and did not settle.

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
