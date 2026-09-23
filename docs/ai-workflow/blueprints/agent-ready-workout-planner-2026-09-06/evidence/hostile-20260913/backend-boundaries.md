# Backend remaining-boundary audit — Brain, attendance, commands, timed-run records

Status: **REVISE at the specific boundaries below; preserve existing architecture.** Baseline: `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`. Evidence date: 2026-09-13. Scope requested by parent: one bounded follow-up after `backend-audit.md`.

Repository: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-bootcamp-planner-20260913`.

All source references are relative to this repository. No application edits, DB access, real provider calls, network requests, secrets, runtime environment inspection, or deployment operations occurred. The completion functions used by probes are local synthetic callbacks. Actual flags/provider availability remain NOT VERIFIED. This report adds boundary findings without repeating the save/Sprint/pain findings in `backend-audit.md`.

## B1 — P1 before enabling providers: freeform Sprint day type bypasses prompt minimization

Opaque exercise tokens successfully keep raw exercise names/keys off the Brain prompt. However, `backend/services/bootcamp/bootcampBrain.mjs:95-111` directly interpolates `dayTypeId` into the prompt. The regular Bootcamp route normalizes day types (`backend/routes/bootcampRoutes.mjs:91`), but the Sprint route accepts arbitrary `focusRotation`, persists its entries as `slot.dayType` (`sprintService.mjs:57-63,88-98,139`), and passes that to generation (`sprintGenerator.mjs:128`). `SprintClassSlot.dayType` is a general STRING(30), not a canonical enum. The generation service forwards `dayType` to the Brain (`bootcampGenerator.mjs:644-650`) without normalizing that field at the provider seam.

A synthetic callback captured the marker `SYNTHETIC_PRIVATE_NOTE` in its prompt when supplied as `dayTypeId`. No real PII was used and no egress occurred. This proves the free-text path, not production exposure. Even short free text can identify a person or carry an instruction; opaque exercise keys do not close this separate input.

**Repair:** validate day type at the Brain boundary against canonical IDs, and validate Sprint focus/day values when creating/updating. Keep the prompt constructed from known enums, bounded numeric aggregates, and opaque row tokens. Do not dispatch unsupported input merely because another caller normally normalizes it.

**Tests:** arbitrary/freeform day types never reach completion callback; canonical types do; malicious exercise keys stay tokenized; Sprint invalid focus/slot values fail before persistence and provider dispatch. Do not enable/configure a provider to test this.

## B2 — P2: Brain has no facts for the judgment it is asked to make

`bootcampBrain.mjs:95-123` sends only `ex_0..ex_N`, day type, headcount, and mode. The prompt asks it to alternate movement patterns, push recently used items later, and choose quick setup. No token-to-pattern, recency flag, or setup measure is included. `recentKeys` only reaches the deterministic heuristic (`:148-152`).

Probe: changing every movement pattern, swapping which exercise is recent, and changing setup time from 0/20 to 99 produced **byte-identical prompts**. Raw exercise keys were correctly absent. A valid arbitrary reordering is nevertheless attributed as `brainUsed:'llm'` (`:195-199`), and the generator explanation says the coach ordered by fatigue, freshness, and setup (`bootcampGenerator.mjs:653-658`). Privacy protection currently strips the very information required for those judgments.

**Repair:** retain opaque tokens but attach bounded, canonical, nonidentifying facts such as pattern ID, recent boolean/age bucket, and setup-time bucket. Use the same facts in heuristic and LLM evaluations. Do not transmit names, private notes, raw exercise keys, or client history text. Alternatively retain the deterministic engine and avoid claiming the optional LLM has evaluated unavailable signals.

**Tests:** prompts differ when relevant sanitized facts change; irrelevant names/notes do not change the wire payload; no identifying fields escape; returned tokens remain a legal unique ordering; judgment quality is compared on representative fixtures rather than inferred from valid JSON.

## B3 — P2 before enabling providers: timeout ends waiting but does not cancel work

`bootcampBrain.mjs:170-173` uses `Promise.race` with a timeout. The completion callback receives only a string; no abort signal or request handle exists. Cleanup at `:204-207` clears the timer, not the provider operation. A synthetic callback finishing at 1100ms outlived the 1000ms timeout: fallback returned first, then the operation still completed. This is a lifecycle fact; no real provider cost/concurrency measurements were made.

**Repair:** extend the provider adapter contract with cancellation and bounded request/output controls, keep one attempt, and use a request-scoped abort signal on timeout/disconnect where supported. If an adapter cannot cancel, make that capability explicit and bound its concurrency independently. Do not assert provider cancellation from a timeout response alone. Provider module import at `bootcampGenerator.mjs:814-823` is outside the Brain timeout; no configured module was inspected.

**Tests:** fake provider sees abort on timeout; response after abort cannot change delivered result; no unhandled rejection; concurrent hung operations remain within a chosen cap; disabled mode performs zero calls. Any future provider activation remains separately authorized; this audit does not authorize spend or fallback providers.

## B4 — P1 when attendance is enabled: alternative boards become completed extra exercise

`backend/services/bootcamp/bootcampAttendance.mjs:71-79` excludes only `board === 'alternative'`. A `lowImpact` record is retained and each retained exercise gets `completed:true`. A synthetic class with main/alternative/lowImpact rows produced completed names `['Main Squat','Board Three']`. There is no participant-specific chosen-board contract in this mapper.

The current mounted taught-log UI already submits main-board rows only, so its normal payload does not trigger this particular duplicate. The backend `/log` route accepts exercise rows containing boards without equivalent validation (`bootcampRoutes.mjs:164-176`), and attendance can consume such records from other accepted callers. The backend invariant is still missing.

**Repair:** use a canonical performed-exercise contract, defaulting to explicitly identified main rows only. If attendees can choose alternatives, accept an authorized per-attendee selected variant and emit one actual exercise per slot. Never count all offered alternatives as completed work.

**Tests:** main/alternative/lowImpact mixture does not produce duplicate completed slots; old records without a board follow an explicit compatibility policy; per-person modifications preserve source and target identity; the actual HTTP log→attendance path enforces the contract.

## B5 — P1 when attendance is enabled: bulk writer bypasses canonical model validation

The attendance mapper permits an empty exercise result from malformed class-log rows, and preserves arbitrary class dates (`bootcampAttendance.mjs:71-95`). Probe: an accepted input generated a registered attendee's form with `date:'2099-01-01'` and zero exercises.

The production route calls `DailyWorkoutForm.bulkCreate(..., { transaction, returning:true })` (`bootcampRoutes.mjs:236-246`). Installed Sequelize source confirms bulk defaults `validate:false` and `individualHooks:false` (`backend/node_modules/sequelize/lib/model.js:1566-1568`). Consequently the canonical model validations for client/trainer separation, future dates, and non-empty exercises (`backend/models/DailyWorkoutForm.mjs:401-425`) are not executed by this call; its instance `beforeCreate` duration derivation (`:431-435`) also does not run. The mapper explicitly allows trainer self-attendance (`bootcampAttendance.mjs:158-159`), conflicting with the model's client/trainer-different validation.

This is source-verified bypass of application validation, not a claim that every malformed fixture was inserted into PostgreSQL. Isolated DB validation remains required.

**Repair:** define one canonical attendance-form validator and run it before write; use model validation appropriately without inadvertently enabling hooks that create duplicate side effects. Derive duration explicitly from time-based performed entries. Resolve the self-attendance contract: either the canonical model supports this source explicitly, or reject it consistently. Do not silently rely on bulk insertion skipping a model invariant.

**Tests:** reject empty/malformed/future forms without writes; validate duration type/range; prove self-attendance behavior; persisted durations follow actual time-based work; failure rolls back forms and receipt. Use isolated PostgreSQL for transaction/hook verification. Current route source-string tests do not prove these behaviors.

## B6 — P2: coach command options do not describe generation behavior

The registry accepts duration 10-120 (`backend/services/ai/commandRegistry/bootcampCommands.mjs:43-45`), arbitrary nonempty `classStyle` (`:62-65`), and `optPhase` 1-5 (`:63`). The browser acknowledges these commands as applied. The generation route instead clamps 20-90 minutes (`bootcampRoutes.mjs:92`), coerces unknown styles to standard (`:106`), and neither reads nor forwards `optPhase` (`:63-69,100-117`). The generator also lacks an optPhase input. This means the accepted command may not survive the next generate action.

Synthetic schema/source probes: command accepts 120 minutes, route computes 90; command accepts `synthetic_unknown_style`; command accepts optPhase 3 while generation route contains no optPhase handling. `useBootcampAiEvents.ts` was read only to verify the handoff: duration limits match registry (lines 26-27,91-100), style setter accepts any string (lines 114-117), and acknowledgements therefore do not close the backend mismatch.

**Repair:** share canonical option/range contracts across command schema and generation route. Reject unsupported values with a reviewable error rather than acknowledging a silently different class. Decide whether phase is a generation feature or limited to another mode; wire it or report that limitation truthfully. Empty optional-object commands should also fail validation before receiving an apparent successful dispatch.

**Tests:** each accepted option roundtrips command→browser state→generation; unsupported style/range/phase returns explicit failure; no successful receipt for an empty structure/format payload; keep admin/trainer RBAC.

## B7 — P2: timed-run completion is not a backend record or idempotency boundary

No Bootcamp runner state/command relay endpoint was found in the bounded backend search. The current runner boundary is intentionally browser-side: `runner/runnerChannel.ts:8-11,32-33` uses same-origin BroadcastChannel; `runner/runnerCheckpoint.ts:23-37` stores browser-local plan/state. A local checkpoint is not a server class record or cross-device backend receipt.

The actual persistence boundary is the explicit taught-log action. `frontend/src/hooks/useBootcampTaughtLog.ts:43-57` builds it from the generated class, using expected participants, main-row prescribed durations, and no stable runner-session/operation ID. `bootcampRoutes.mjs:164-182` and `bootcampCrud.mjs:219-221` append a class log per request. The frontend hook itself documents that backend deduplication is absent (`useBootcampTaughtLog.ts:16-17`). Attendance idempotency is per class-log ID (`bootcampAttendance.mjs:84,142-143`); retrying `/log` creates distinct class identities, so it can defeat end-to-end attendance deduplication even when each attendance transaction is correct.

**Repair:** preserve the local runner design, but introduce a stable class-run/log operation identity if server history must be retry-safe. Deduplicate the explicit taught-log write with a unique constraint and transactional receipt. Clearly distinguish trainer-attested planned exercise list from measured intervals/rounds actually run. If actual duration/skip/replay history is needed, define that separate finalization payload; do not claim existing timers already persist those facts.

**Tests:** lost `/log` response followed by retry returns the same log ID; two attendance calls after such retry create one set of forms; local pause/skip/replay never mutates backend history implicitly; finalization accurately labels planned versus actual durations. Backend remote phone control is NOT VERIFIED and must not be claimed from BroadcastChannel tests.

## Verified strengths and prior-review update

- Brain opaque tokens keep raw exercise keys out of the prompt. Invalid/unknown token orderings fall back; disabled mode makes zero callback calls; enabled mode without a provider reports `no_provider`. These positive controls were rerun with synthetic callbacks.
- Attendance route keeps an executable default-off gate (`bootcampRoutes.mjs:210`), transaction, class-row `FOR UPDATE` lock, batched active-assignment check, form bulk insertion, and receipt save in one transaction (`:225-265`). Do not replace this with an in-memory lock.
- Attendance service denies foreign logs with 404, denies unassigned registered clients with 403 before writes, and preserves the original attendance on retry. Synthetic positive controls produced one total write, secondAlreadyRecorded=true, foreignStatus=404, unassignedStatus=403. Real PostgreSQL concurrency was NOT RUN.
- Bootcamp commands have admin/trainer roles and Zod input schemas. Command execution validates schemas (`commandExecutor.mjs:322-340`) and roles (`:364-373`). `FRONTEND_DISPATCH` is explicitly not a server DB mutation (`:584-591`), and discovery labels it `frontend_event` (`commandExecutionLane.mjs:40-47`). No backend write-authority bypass was found in those three registry entries.
- The old review's claim that Bootcamp class logs/history have zero UI callers is now **STALE/FIXED**: mounted `BootcampTaughtPanel` calls `useBootcampTaughtLog`, which calls `logClass`/`getHistory` (`useBootcampTaughtLog.ts:63,78,103`). This resolves the initial report's NOT RECERTIFIED disposition. Sprint confirmation remains a separate unclosed history path, as documented in the main report.

## Evidence invocation and actual observations

```powershell
node tmp/rolodex-audit-evidence/backend-boundary-probes.mjs | Tee-Object -FilePath tmp/rolodex-audit-evidence/backend-boundary-probes-output.json
```

Actual execution: exit **0**, about 1.23 seconds. [Probe source](backend-boundary-probes.mjs). [Exact JSON output and source hashes](backend-boundary-probes-output.json).

| Diagnostic | Actual output |
|---|---|
| Changed movement, recency, setup facts | identicalPrompt=true; rawExerciseKeyVisible=false |
| Synthetic freeform day type | syntheticMarkerPresent=true |
| Disabled Brain | disabledCalls=0; heuristic |
| Missing provider / invalid token | no_provider / invalid_ordering |
| Timeout lifecycle | timeout; operation incomplete when fallback returned; completed later |
| Attendance variant selection | Main Squat and Board Three both completed |
| Empty future form | date=2099-01-01; exerciseCount=0 |
| Attendance positive controls | writes=1; secondAlreadyRecorded=true; foreign=404; unassigned=403 |
| Command drift | accepts120=true; generationClamp=90; unknownStyle=true; phaseAccepted=true; routeReadsPhase=false |

Probe imports are limited to pure Brain/attendance modules, command schemas, and their local schema/taxonomy dependencies. `completionFn` is always a local callback. No application server, real model, DB, or network boundary was exercised. These are diagnostic observations, not a passing application regression suite.

## Bounded inspected inventory

Fully read: `bootcampBrain.mjs`, `bootcampAttendance.mjs`, `commandRegistry/bootcampCommands.mjs`, Brain unit tests, attendance unit-test relevant sections, attendance route contract tests. Read relevant boundaries in `bootcampRoutes.mjs`, `bootcampGenerator.mjs`, `sprintService.mjs`, `sprintGenerator.mjs`, `DailyWorkoutForm.mjs`, installed Sequelize bulkCreate implementation, `commandExecutor.mjs`, `commandDispatcher.mjs`, `commandExecutionLane.mjs`, and `baseSchemas.mjs`.

Cross-boundary frontend reads only: `useBootcampAiEvents.ts`, `BootcampTaughtPanel.tsx`, `useBootcampTaughtLog.ts`, runner channel/checkpoint headers and persistence calls. No duplicate frontend UX audit was attempted. Bounded backend grep checked Bootcamp runner/command/state/pairing names; no server relay was identified. Actual hardware/browser runner behavior, provider entitlement/configuration, attendance production gate state, database constraints/concurrency, and migration execution remain NOT VERIFIED.
