# Open findings register — 2026-09-13 session

Consolidated because this session produced findings across six documents, several
commit messages and a probe, and a reader should not have to reconstruct the open
set from all of them. **Everything here is OPEN unless the Status column says
otherwise.** Closed items are listed at the end so the register is also a record of
what this session finished.

Worktree: `tmp/worktrees/swan-coach-astra-owned-20260906`, branch
`codex/swan-coach-astra-owned-20260906`. Nothing in this session was pushed.

Severity is the author's judgement and is stated so it can be disputed, not
inherited as fact. Where a finding was later narrowed by a probe, the **narrowed**
severity is what appears, and the narrowing is recorded in the linked doc.

---

## A. Privacy / authorization

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| CA-3 | MINOR | Three modules re-derive `isClientEquivalentRole` locally instead of importing the canonical export: `scheduleController.mjs:20`, `onboardingController.mjs:26`, `workoutBuilderRoutes.mjs:53`. They currently agree, so there is no live defect — but hand-rolled copies are exactly how CA-1 happened. | [72](72-clientaccess-policy-and-caller-audit.md) | Open. Collapse onto the shared export when those files are next touched. |
| AUTHZ-1 | MINOR→policy | A raw role `user` actor is still admitted at the Coach conversation boundary (200-empty / 404) rather than 403 `COACH_READ_FORBIDDEN`, while plan 65 §5's contract table says "raw user or unknown → Conversation read forbidden". **Nothing is disclosed** — `AiConversation.mjs:32-39` forbids a stored `user` role so the audience filter matches nothing — which is why R3's wording still holds. | HR15 commit `2fd272bf4`; `coachConversationReadAccess.mjs:12,90` | Open, deliberately. Flagged so filter coincidence is not later mistaken for an explicit policy gate. One-line tightening available if §2 is read literally. |
| AUTHZ-2 | note | Because of AUTHZ-1, R3's "raw user/unknown role" case is enforced by the audience filter rather than by an actor-role gate. | same | Open as documentation debt. |

## B. Capability truth (declared-but-not-real)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| CT-1 | MAJOR | **The entire BullMQ video job queue is dead code.** `initVideoJobQueue()` (`videoJobQueue.mjs:328`) is the only reader of `REDIS_URL` and has **zero callers** — `git grep -n initVideoJobQueue` over all `mjs/js/ts/tsx` returns one hit, the definition. `queue` stays `null`, `addJob` short-circuits at `:424`, and **no video job has ever been enqueued**. `startWorker`/`routeJob` and all six processors are `TODO` stubs (`:231-264`). | [76](76-correction-phantom-bullmq-control.md) RESOLVED section | Open. Not fixed: implementing the queue is a feature, not a repair. |
| CT-2 | MAJOR | **False success log on the upload path.** `videoCatalogController.mjs:653-663` awaits `addJob` but never inspects the result; `addJob` returns `null` rather than throwing, so the `catch` at `:660` never fires and `:659` logs `"Enqueued checksum_verify job for video <id>"` unconditionally. The sibling `youtubeImportController.mjs:224` **does** check and returns an honest 503 — two callers of the same function disagree about whether silence is success. | same | **In progress** (bounded slice). |
| CT-3 | MAJOR | The admin health surface reports the queue as available while every enqueue no-ops: `videoCatalogController.mjs:41-45` sets `jobQueueAvailable = true` on *import* success and `:58-63` returns `available: true`. The import cannot fail for Redis reasons, so it is effectively hardcoded `true`. | same | **In progress** (same slice as CT-2). |
| CT-4 | MINOR | `/job-queue-health` appears shadowed by `/:id`: `videoCatalogRoutes.mjs:16` registers `router.get('/:id')` before `:22` `router.get('/job-queue-health')`. Registration order verified; runtime consequence `[LIKELY]`. The controller's own comment at `:56` names the wrong URL on both segments. | same | **In progress** (verify-or-refute in the same slice). |
| CT-5 | MAJOR→latent | Against a **reachable-but-silent** Redis (TCP accepted, never replies — the partition case, not the refusing case), `initVideoJobQueue()` was still pending after **16012 ms**; ioredis's 10 s `connectTimeout` does not bound the ready-check handshake and there is no RST to reject on. Unreachable today because nothing calls it. | same | Open, deliberately. **Bound this BEFORE anyone wires a caller to `videoJobQueue.mjs:328`** — that is the one item to escalate at that moment. |
| CT-6 | MINOR | `redisClient` is created with no `'error'` listener (`videoJobQueue.mjs:356`) → ioredis emits `[ioredis] Unhandled error event`. | same | Open. Not fixed: no test yet demonstrates the defect it causes. |

## C. Test hygiene / Rule 4

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| T-1 | MINOR | Three P64/S66 test files exceed the Rule-4 300-line cap: `aiChatTtsPaywallParity.test.mjs` 346 (HEAD 172), `coachConversationReadAuthorization.test.mjs` 403 (HEAD 287), `coachIntentRoutes.test.mjs` 328 (HEAD 205). The implementer justified this by claiming packets 64/66 forbid new test files — **root checked and that claim is not supported**; neither packet contains such a prohibition. Recorded as a genuine unfixed violation. | commit `adf5e74c5`; [74](74-parent-adjudications-20260913.md) A5 | Open. Split the suites. |
| T-2 | MINOR | `known-failing-baseline.json` was recorded **2026-09-02** and is stale relative to the tree. A concurrent full-suite A/B observed 12 failing files against its 7; **5 have UNKNOWN status** — neither confirmed pre-existing nor confirmed flake: `clientPhotoUploadAuthzExecution`, `historyBackfill`, `phase1cXpIntegration`, `workoutPrDetection`, `unit/physicalConfirmChannelSplit`. | [72](72-clientaccess-policy-and-caller-audit.md) | Open. Do **NOT** grow the list — the file says "Shrink this list; never grow it casually", and the runs happened under three concurrent writers where flakes were directly observed. Needs a serialized quiet-tree run to classify each. |
| T-3 | MINOR | `tests/api/clientPhotoUploadAuthzExecution.test.mjs:158` is **pre-existing RED at pristine HEAD** — `assertAssignmentOrAdmin` (`middleware/verifyClientAccess.mjs:86`) returns a Number where the test pins a String. Confirmed, not inferred. | [72](72-clientaccess-policy-and-caller-audit.md) | Open. |

## D. Slice residuals (the real remaining work)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| G07-R | — | **Not the modules** — those are done and green (4 files / 33 vitest + 10 node:test). The gap packet 70 names is (a) **mounted integration** of the substitution and share paths against authoritative data, and (b) **exercise-matching quality** (still limited full-message matching). Neither is owned by plan 41. | [75](75-g07-g09-g10-residual-status.md) | Open. |
| G09-R | — | **Not the service** — `coachFactService.mjs` (545 lines) and `coachFactMemoryPolicy.mjs` (140) are done and green, and plan 43's model/migration scope is complete. The gap: the capability has **no HTTP surface at all** and no user-visible inspector. | [75](75-g07-g09-g10-residual-status.md) | Routes **in progress**; the UI inspector remains open. |
| G10-R | — | Wiring is now **done** (commit `c88fa7039`). The remaining gap is that the opt-in key `coachProactiveNudges` is written by **nothing**, so the capability is live-but-unreachable. | commit `c88fa7039`; [75](75-g07-g09-g10-residual-status.md) | Write path **in progress**. |
| M68-F3 | MINOR | The floating mobile command strip overlaps the `client-bar` card and clips the client name at 390×844. **Pre-existing, NOT caused by M68** — verified independent: the matrix gate passes at all 20 viewports and M68's own measurements put the intent bar and transcript fully inside `.chat-panel` with zero escapees. Neither the matrix `clipped` check (viewport escape) nor M68 could catch it, because it is an overlap between two elements, not an escape. | [71](71-m68-transcript-containment-exit.md) | Open. Needs a pairwise-overlap assertion in the mobile geometry gate. |
| HR12-T14 | — | The P58 browser gate. jsdom cannot prove browser timing, focus stability or the polite announcement. | plan 58; [74](74-parent-adjudications-20260913.md) A1 | **In progress.** |
| HR13 | — | Rest-adjust contracts. Deliberately not launched: plan 59 requires an **exclusive** `useCoachCommand.ts` window and collides with R60-A in `WorkoutLogger/`; it must also land **after** C1-C4 so it integrates with plan 55's fences rather than racing them. Plan 59 is marked "plan only, no implementation enqueue". | [74](74-parent-adjudications-20260913.md) A4 | Open, gated. |

## E. G11 release gates — all NOT RUN at this revision

Frozen all-role/scenario/holdout provider evaluation · privacy and provider-boundary
evaluation · Redis-unavailable/restart behaviour at the integration level ·
migration/restore/rollback · performance budgets · real authenticated role journeys ·
mounted substitution/share and dashboard adapters. See
[73](73-g11-original-six-findings-adjudication.md) for what the six-finding
adjudication did and did not settle, and [75](75-g07-g09-g10-residual-status.md) for
G07/G09/G10.

---

## Closed this session (for completeness)

M68 (± its hostile review round 1) · HR16 · CA-0, CA-1, CA-2 · P64 · S66 · HR14 ·
HR15 · G10 engine wiring · M68-F2 (via HR16) · the G11 six-finding adjudication ·
the phantom `USE_BULLMQ_RECONCILIATION` correction · the residual Redis question
(closed as **no defect on any request path**).

## How to read severity here

Four of the items above were **narrowed** after being raised: CA-0 (a claimed live
cross-client exposure that a probe showed is admin-gated with zero consumers), the
Redis concern (a claimed boot-blocker that a probe showed never dials Redis), HR16's
root cause (a claimed auth race that instrumentation showed is a StrictMode abort),
and doc 76's own "the subject does not exist" (the line references were real). In
each case the first reading was directionally alarming and the measured reading was
smaller. **Treat any severity here without a linked measurement as a hypothesis.**
