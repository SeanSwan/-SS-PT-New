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
| F1 | **MAJOR — live privacy disclosure** | `clientDataOverviewQueryService.mjs:21` `requesterRole !== 'client'` means a `user` requester gets trainer-note **existence, count and latest-note timestamp** where an explicit `client` gets `0`/`null`. Probe: `client` → 0/null, 0 queries; `user` → 4/PRESENT, 2 queries; trainer/admin → 4/PRESENT. The file's own docstrings state the intent being violated. | reviewer probe `tmp/authz-review/probe-trainer-note-gate.mjs`; root read the line | **Fix in progress.** |
| F1b | **MAJOR — a test pins the bug** | `backend/tests/api/clientDataOverviewPrivacy.test.mjs:32-38` is titled "does not expose internal trainer-note metadata to client-role requests" and asserts the **source text** of the broken predicate. Its only behavioural case injects `noteCount: 1` directly, bypassing the gate. Same class as the 2026-08-04 notes guard that "was PROTECTING A BUG". | same | **Fix in progress** (must become behavioural). |
| F2 | **MAJOR — live 403** | `painEntryRoutes.mjs:35,38,39,40` `authorize(['admin','trainer','client'])` while `verifyClientAccessByUserId` on the same line maps `user → self`. Guards disagree; a fresh signup cannot log its own pain entry. Fail-closed, no disclosure. | reviewer probe `probe-painentry-guard-disagreement.mjs` | **Fix in progress.** |
| F3 | **MAJOR — live 500** | `aiChatRoutes.mjs:372-373` passes the raw `'user'` into `createPayload.role`; `AiConversation.mjs:36` validates `isIn:[['client','trainer','admin']]`; the create path returns a generic 500. Shipped UI never reaches it (`coachPublicationScope.ts:100-112` excludes `'user'`), so the harm is a 5xx on a public endpoint plus three different answers for one role at one boundary. | reviewer probe `probe-user-role-conversation.mjs` | **Fix in progress** (contract must be chosen, not left inconsistent). |
| F3-PRODUCT | **product decision, needs Sean** | The chosen contract rejects a raw `'user'` actor with **403 before any create payload** — deliberately NOT aliasing it to `'client'`, because the same resolver drives the read path and `coachConversationReadAccess.mjs:135-137` (HR15-R1) forbids aliasing a raw `user` into the client audience; aliasing at the create site alone would write conversations the creating account could never read back. **Consequence: the database's DEFAULT self-registration role cannot use Coach conversations at all** — 403 on create, empty/404 on read, and the frontend already excluded it. That is now internally consistent, but it is a product decision rather than a bug fix. Several paths promote `user` → `client` (`onboardingController.mjs:146`, `sessionPackageManualGrantRoutes.mjs:150`, `SessionGrantService.mjs:124`, `sessionPackageCheckoutFulfillmentService.mjs:202`), which narrows the window without closing it. | F3 fix comment; reviewer's unverified note on promotion | **Open — flag for Sean.** |
| F5 | **MAJOR — delivery never reaches the default role** | `coachProactiveNudgeCron.mjs:205` and `:168` filter on the literal `'client'`. Probe: two consented accounts (`client`, `user`) → `nudged 1`, notify targets `[11]` only. A `user` account can now consent, the predicate returns true, and delivery silently skips it. | G10 implementer probe | **Fix in progress.** |

**CA-3** (MINOR): three modules re-derive `isClientEquivalentRole` locally —
`scheduleController.mjs:20`, `onboardingController.mjs:26`,
`workoutBuilderRoutes.mjs:53`. They agree today, so no live defect; hand-rolled
copies are exactly how CA-1 happened. Collapse onto the shared export when next
touched.

### A2. THIRD WAVE — 11 more sibling routes with the F2 shape, still unfixed

Found by the F1–F5 implementer's own sibling sweep, after the second wave was
fixed. **The class is not closed; it has now been found in three independent
passes.** The specific defect signature is not "a role list mentions `'client'`" —
it is **a route that pairs `authorize([...'client'...])` with
`verifyClientAccessByUserId` on the same line**, because those two guards then
disagree about whether a `'user'` account owns its own record: `authorize` is a
literal `roles.includes(...)` (`authMiddleware.mjs:459-489`) while
`verifyClientAccessByUserId` explicitly maps `user → self`
(`middleware/verifyClientAccess.mjs:91-93`).

| File | Lines | Routes affected | Consequence |
|---|---|---|---|
| `bodyMapEvidenceRoutes.mjs` | `:28` POST, `:31` DELETE | 2 | A `'user'` account cannot upload or delete its **own** body-map evidence. Byte-identical to the F2 defect. |
| `clientProgressRoutes.mjs` | `:23` (`currentClientAccess`, used at `:38` GET / and `:40` PUT /) and `:28` (`clientReadAccess`, used at `:44,:46,:48,:50,:52,:54`) | 8 | `'user'` is 403'd from reading and updating its **own** current progress, history, goals and risk assessment. |

**Recommended fix shape — do NOT widen `authorize` globally in a bugfix slice.**
`authorize(` has ≥100 call sites across ~40 route files (the grep hit its
100-match cap on `backend/routes` alone). Most are staff-only lists that a
client-equivalence change would not affect, but the review surface is all of them,
and a global widening would silently admit `'user'` to any future list containing
`'client'`. Keep the per-route lists and instead add **one repo-level regression
guard that fails when a route pairs `authorize([...'client'...])` with
`verifyClientAccessByUserId`** — that pairing is the actual disagreement, and it is
mechanically checkable without reading data flow. This is a better guard than the
"generalised requester-side role check" proposed elsewhere in this register,
because it targets the falsifiable condition rather than a syntactic pattern that
also matches legitimate target-side checks.

### A3. Two more same-class sites, intent UNVERIFIED

`aiWorkoutController.mjs:288` (`Invalid role for workout generation`) and
`longHorizonController.mjs:201` (`Invalid role for plan generation`) both reject
unless `requesterRole === 'admin' || requesterRole === 'client'` — the same
hand-rolled class, failing closed. **Not called defects**: whether these are
meant to be client-facing is unverified. They need a probe **and an intent read**
before anyone changes them.

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
| HR16-E2E | MINOR | The HR16 retry cap had **no real test** — deleting the guard left the suite GREEN, because the test's mock always resolved successfully so the retry branch was never taken. | hostile review F4 | **Fix in progress** (a gap in root's own committed work). |
| MEM-WAIVER | — | `middleware/waiverGate.mjs:41` lists `/api/coach` in `GATED_API_PREFIXES`, so client-equivalent callers need a linked `WaiverRecord` or they get 403 `WAIVER_REQUIRED` before any coach memory handler. A UI must handle that. | G09 report | Open. |

## D. Test hygiene / Rule 4

| ID | Sev | Finding | Status |
|---|---|---|---|
| T-1 | MINOR | **Six files exceed the Rule-4 300-line cap and are queued for splitting:** `aiChatTtsPaywallParity.test.mjs` 346; `coachConversationReadAuthorization.test.mjs` 555; `coachIntentRoutes.test.mjs` 328; `coachMemoryRoutesAuthz.test.mjs` 524; `notificationSettingsCoachNudgeConsent.test.mjs` 475; `GlobalClientContext.selectionReference.test.tsx` 332. All are **test** files, and none was caught at commit time — the frontend pre-commit guard enforces the 300-line check (G6) on **staged frontend files only**, so backend test files are never seen by it. **Fixing that guard gap is worth more than the six splits.** | Open. Split queued. |
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

## Closed this session (for completeness)

M68 ± hostile review round 1 · HR16 · CA-1 · CA-2 · P64 · S66 · HR14 · HR15 ·
R60-A · HR12/P58 ± its browser gate · C4 admission boundaries · C1 client
reference API · G09 memory HTTP surface · G10 nudge wiring · G10 consent surface ·
P77-B truth fixes · M68-F2 · the G11 six-finding adjudication · the phantom
`USE_BULLMQ_RECONCILIATION` correction · the residual Redis question (closed as **no
defect on any request path**).
