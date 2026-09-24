# SS-PT selective release and worktree audit — 2026-09-12

Canonical release/hygiene report. This follows packet 69 and does not supersede the Universe V3 architecture or certify unfinished slices. Release status changes are recorded in the dated outcome addendum below.

## Plain-English Summary

The reviewed release consists of three independent runtime fixes, one evaluation fixture correction, and a native Node installation repair, eleven files total, extracted onto current main. It is published for CI in [PR 118](https://github.com/SeanSwan/-SS-PT-New/pull/118). The full Coach branch is deliberately not merged or published.

Unfinished Coach work is preserved locally in commit 346373264f84e00e392914fdb035d8ac5a1ca8ef (108 files; 12,824 insertions and 1,931 deletions at checkpoint). Source remains in the original worktree. Two pre-existing local items remain visible: AGENTS.md and frontend/.hermes/environment.json. Neither is concealed with assume-unchanged, skip-worktree, or ignore rules.

The original 167 registered worktrees were inventoried: 90 dirty, 77 clean. 165 stale Git pointers were repaired after reciprocal metadata verification; all heads stayed unchanged, and no source file was moved or deleted. The added release tree initially brought the total to 168. A concurrent full-site-repair task created one more tree during the release; the final inventory is 169 trees, 91 dirty and 78 clean. The source inventory is complete; the other tasks are not collectively certified for release.

The primary shared checkout alone has 2,956 dirty/untracked entries. This is separate from the Coach worktree. Claiming the entire repository is now clean would be false. Of the original clean trees, 28 have no commits absent from current main; this is only a future archival candidate list, not authority to remove their directories or ignored data.

## Technical Summary

Base: 53120649f356c3efccee32872b530096d386642f. Final reviewed release head: 46e581d0d10640f90d93c32ddaa7ebb45e025aa8. Earlier checkpoints bf7be6e and a96e768 remain preserved. Release tree: C:/tmp/sspt-selective-release-20260912. Coach preservation tree: C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906. GitHub repository is public; private fixture logs/configuration and the WIP branch history were excluded.

| Released area | Result and limits |
|---|---|
| Workout permissions | Verification exceptions deny client-info and submission flows; configured grants and successful zero-row default allowance remain. No new schema/migration or grant expansion. Database/storage/auth are mocked in tests. |
| SessionProvider | Bounded startup reads, actor/role admission, stale read/save fences and cleanup. Existing endpoints, role strings and storage keys retained. Already-issued server writes are not undone. |
| Microphone capture | Late permission/callback retirement and track cleanup; native normal stop, cancel and SPA unmount observed. No claim of background-tab cancellation, transcription retirement or physical microphone compatibility. |
| Native Node startup | Backend install now installs the linked schema package from its existing lock. No dependency versions change. Native import failed with the exact production zod error before repair and passed afterward; clean Linux Node 22 backend CI passed. |
| Deterministic evaluation fixture | Complete the 600-second rest fixture with valid tempo/set/rep fields. Keep warningCount=0, knownGap=false, thresholds and production validators unchanged; 601 rejection remains tested. |

## Evidence and hostile review

- 47 backend tests PASS across five files: permission regression, route security, schema drift, schedule/billing and planned-assignment compatibility. Earlier main-source regression run: 2 FAIL / 3 PASS, including erroneous 200 allowance after lookup failure.
- 40 frontend tests PASS across four files, including positive recording/retry and active-recording unmount. Initial main-source run: 32 FAIL / 5 PASS; these are expected regressions and missing-contract failures, not 32 unique security bugs.
- Canonical frontend TypeScript PASS. Vite build PASS, including a separate production NODE_ENV build. Frontend package locks and configuration retained.
- Local actual production-build browser PASS: sessions/analytics remained 3/1 at 2.5, 5 and 7.5 seconds. Chromium synthetic microphone produced one 7,906-byte multipart upload. Native tracks ended after stop, cancel and SPA unmount; no page errors; source hashes stayed fixed. Transcription was stubbed and external writes denied.
- Browser harness failures are preserved separately: production API hostname routing, stale locator for an unmounted composer, and synthetic microphone permission setup. They were not presented as product fixes. CSP was bypassed only for loopback fixture routing, so this is not a production CSP proof.
- Main and initial PR both failed warnings_02 (one unwanted self-heal warning); local RED reproduced. Corrected evaluation: 57 gated scenarios PASS, five known gaps, no threshold failures. This is a deterministic fixture evaluation, not a live model quality benchmark.
- Two independent full-surface clean reviews covered the seven-file candidate. The fixture addition has separate independent expansion/confirmation reviews; verdict summaries and source hashes are retained in independent-review-receipts.json. Two further independent reviews cleared the final eleven-file candidate. Original collaboration responses remain in the task transcript; the JSON does not attest provider identity.
- Normal commit hooks passed: secrets, frontend guards, constitution scope and token registry. SessionContext remains above the advisory 300-line cap (733); this is retained debt, not silent compliance.

Local evidence root: C:/Users/BigotSmasher/.codex/visualizations/2026/09/12/01a09491-2083-74a0-a075-227a0d19cc0f/release-audit. Key receipts: release-commit-receipt.json, release-browser-receipt.json, backend-green.log(.json), frontend-green.log(.json), frontend-types.log.json, frontend-build-production.log.json, eval-red.log, eval-green.log, checkpoint-preservation.json, pointer-repair-receipt.json, worktree-inventory.json, after-pointer-repair/worktree-inventory.json.

## Held work and executable agent handoffs

Existing builder/reviewer assignments persist: Luna Extra High builds bounded slices; Astra owns architecture, review and repair. Other worktree owners are unverified. The task list showed no other actively loaded SS-PT task, but that does not prove there is no external editor or CLI agent.

| Priority / packet | Owner role | Next work and exit evidence |
|---|---|---|
| M68 / 68 | Luna implementation; Astra review | Fix chat-panel column geometry; assert transcript width/text bounds on 390x844 and desktop. Body overflow alone missed real clipping. Keep Desk unmounted until integration. |
| HR12 / 58 | Astra repair; no new builder assignment | Retire asynchronous Planner callbacks on actor/client/route changes; prove old responses cannot mutate current plan. |
| HR13 / 59 | Luna; Astra | Make rest-adjust contracts exact; distinguish absolute values from deltas, validate boundaries and actual receiver result. |
| HR14 / 62 | Luna; Astra | Resolve duplicate context-hook runtime/type resolution; prove Vite and TypeScript use the same owner. |
| R60-A / 60 | Luna; Astra | Reject legacy/unbound AI submit before mutations; preserve manual Save. Connected binding/readback remains later R60 work. |
| C1-C4 / 49,51,55,61,63 | Luna; Astra | Connect one admitted actor/client/thread/route/pin selection through chat, command, TTS, Desk and receivers. Prove A-B-A, late responses, cancellation, retry, approval and saved-result journeys. |
| P64 / 64 | Luna test repair; Astra | Replace two obsolete source-guard failures with real route privacy regressions. Previous broader local backend result was 1086 PASS, 2 FAIL, 4 speech SKIP; do not call it all green. |
| HR15 / 65 | Luna; Astra | Repair normal client null-target conversation list/detail. Actual local reproduction was 3 PASS / 2 FAIL. Preserve other-client/staff denial. |
| S66 / 66 | Luna test repair; Astra | Replace four obsolete speech skips with existing access/PII contract tests. Sean selected current speech access; do not add chat subscription parity or change generation policy. |
| Shared clientAccess helper | Astra policy/caller audit, then Luna if needed | Normalize authenticated IDs without unintentionally widening staff-only profile-photo route. Existing photo test expects string query ID; explicit role policy and self-photo control must be settled in code/tests before separate release. |
| G07 evidence/substitution | Luna; Astra | Complete mounted interpretation/substitution/share paths against authoritative data; limited full-message exercise matching still has quality gaps. |
| G09 memory / G10 proactive help | Luna; Astra | Finish user-visible inspect/edit/forget and consent-gated delivery with rechecks, dedupe, quiet hours and restart behavior. Helpers/models alone are not completed products. |
| G11 / 45,48 | Astra adjudication | Resolve original six review findings explicitly and execute frozen all-role/scenario/provider/privacy, Redis/restart, migration/restore/rollback and performance gates. No blanket Jarvis superiority claim. |
| Governance local edit | Instruction owner / Astra | AGENTS.md remains unstaged. Its unrelated inherited constitution-reference guard fails because CLAUDE.md cites missing scripts/hooks/dry-loop-gate.mjs. Preserve the user override; repair the canonical source/mirror deliberately, not by bypassing hooks. |
| Private local configuration | Local operator | frontend/.hermes/environment.json stays in place and out of public Git. Decide its intentional local configuration handling in a separate hygiene step. |

Do not run the ordinary backend suite against the shared .env: database.mjs loads repository environment files. Reuse isolated runners that disable dotenv and deny database/external sockets. Existing fixture database/listener evidence belongs to the isolated local review only. Do not clean or repurpose unrelated databases.

## Blueprint applicability and operational controls

Requirements SR1-SR6, contracts, source preservation, test traceability, release/recovery flow and N/A decisions are in [69](69-selective-release-audit.md). No UI layout is redesigned in this release; wireframes, new ERD and migration are N/A. The existing clipped mobile layout remains held. Mermaid source is provided there; rendered preview was not generated.

This selective operational track does not advance the original M68 controller. Its evidence/counters and deferred full Coach review remain intact. A structural plan receipt checks evidence references only; it is not a claim that the original full-program implementation workflow has completed.

Production integration requires reviewed exact commit, current-main comparison and completed release CI adjudication. Render CLI token was expired; existing authenticated browser access succeeded. The pre-release live backend is 86e66cd, frontend 3887c8e. Backend main deploy 5312064 failed on native zod resolution. Exact settings and failure are in render-baseline-receipt.json. The account displays a payment-failed warning; no payment action is authorized or performed here. Do not sync the inert render.yaml or provision services. For a behavior rollback, retain the native shared-schema installation repair: the previous main revision 5312064 is a confirmed failing backend boot target. Revert only the affected runtime change after review, or deliberately restore a previously verified Render deployment (backend baseline 86e66cd) after assessing compatibility. Never blindly revert the entire release to the broken base, reset/delete the WIP branch, or run package reseeding as rollback. Existing startup migrations and non-package seeders remain unchanged; this release does not claim zero startup database writes.

## Non-destructive hygiene disposition

All other dirty trees: keep source in place, assign an owner, hash/snapshot work, audit explicit dependency-complete slices, then make a local WIP checkpoint or reviewed release. Never blindly git add -A / reset / stash / prune / remove across all trees. Clean but unmerged trees retain commits; clean and already-contained trees still require ignored-file and ownership checks before any later archival approval.

Root-level file inventory is preserved in root-inventory.json. Runtime/reference files remain in place. Existing archive conventions (archive/, docs/archive/, docs/ai-workflow/archive/, qa-screenshots/, playwright-report/test-results) are proposals for later scoped review; no relocation or .gitignore changes were made. New test logs/screenshots/scripts are confined to the local release-audit area and ignored release tmp paths. No release evidence is silently discarded.


## Coach capability assessment and review limits

Existing application surfaces include conversation, typed/voice input, proposal review and workout/planner entry points. The command registry declares domain-specific routes with role and confirmation requirements. A declaration is not proof that every command completes successfully or publishes a truthful saved receipt.

The held Universe V3 branch's recorded inventory classifies 139 definitions: 112 server dispatch, 18 frontend events, four asynchronous debates, four manual-only paths and one chat fallback. These figures belong to that preserved audit, not a claim of 139 verified production capabilities. The new frontend command catalog, Session Desk, memory inspector, proactive delivery and connected selection work are outside this release. No arbitrary computer or screen manipulation is implemented. The system is a bounded training assistant; superiority to fictional Jarvis has not been measured.

The full original Coach dirty-path set and branch history are inventoried below; 48-capability-truth-and-release-gaps.md remains the detailed product truth ledger. All other registered worktrees were inspected for location, Git health, dirty paths and divergence. Their entire application changes were not semantically reviewed, and they are not approved for release. This distinction prevents another task's partially finished work from entering production through a blanket commit.

### Additional production handoffs found during this audit

- Backend deployment: native shared-schema dependency resolution is repaired in this release. Render's prior successful backend was behind main; source review of the intervening runtime changes found no further unconditional blocker. Migrations/startup scripts/seeders were unchanged across that delta.
- Queue owner: USE_BULLMQ_RECONCILIATION must stay OFF until unreachable Redis has bounded startup, tested interval fallback and continued event-bus initialization. Existing tests cover missing URL, not a configured unavailable Redis. ReconciliationQueue lines 70-72 and 104, startup lines 647-658 are the handoff.
  **CORRECTED 2026-09-13 — see [76](76-correction-phantom-bullmq-control.md). This row merges three unrelated things and cannot be acted on as written.** `USE_BULLMQ_RECONCILIATION` appears only in packets 69/70 and is read by no code; no `BULLMQ`/`RECONCIL` env var is read anywhere in the repo; and there is no `ReconciliationQueue` identifier in `backend/`. **However, the line references in this row are REAL** — `checkoutReconciliationService.mjs:70-72` and `:104` are substantive reconciliation logic, and `startup.mjs:647-658` lands in the sweeper-cron block (`startRenderLeaseSweeper` at :651-659, `startCheckoutReconciliationSweeper` at :661-669). What is wrong is the naming: this is a **DB-backed cron sweeper over `ShoppingCart`**, not a queue, and it is **deliberately NOT behind a kill switch** — `checkoutReconciliationCron.mjs:6-12` records why disabling it would lock customers out of their carts. So the instruction to keep a flag OFF for it contradicts the recorded design intent. The real Redis/BullMQ surface is `backend/services/videoJobQueue.mjs`, which this row does not mention, and it is lazily imported with graceful degradation rather than loaded at boot. The genuine open Redis question is narrower and is being investigated separately.
- Deployment owner: retain a safe package pre-deploy policy. The existing seeder can delete packages and dependent cart/order rows if FORCE_RESEED is true. Synthetic verification proves DISABLE_PROD_SEEDER=true exits before DB imports even when the force flag is set. No production reseed should be run for this code release.
- Account owner: resolve Render's payment-failed warning through the billing page. This audit has not changed cards, paid invoices, or purchased services.

Local test preview on port 5010 has been stopped after its browser evidence was recorded. Other task processes and fixture databases were not stopped or repurposed.

## Final-head CI failure adjudication and follow-up

Final source head 46e581d0d10640f90d93c32ddaa7ebb45e025aa8 passed backend CI: 1,208 files passed and one skipped; 9,832 tests passed and 11 skipped, plus 179 native Node tests passed. The exact install lifecycle and the new native shared-schema test passed on Linux Node 22.

The first final-head frontend run completed all 323 batches and failed three pre-existing tests. Their source, components, configuration and frontend lockfile are unchanged from main. The frontend tree is identical to the earlier fully passing a96e768 candidate; the final three-file backend installation patch runs in a separate CI job and cannot change the frontend install.

- Equipment has a confirmed test readiness race: a transient empty CTA can appear between profile resolution and the item-fetch effect. The failure DOM contains Loading your gear. A follow-up test should defer listItems, await loading, resolve an empty result inside asynchronous act, and retain the CTA, narrative and footnote assertions together.
- Nutrition lazy completion is a plausible timing explanation, not proven: the failure DOM is truncated before the relevant panel. Investigate if repeated, keeping the awaited content assertion.
- Exercise diary exceeded five seconds without a demonstrated content mismatch. The unchanged local rerun completed that test in 2,103 ms. Runner contention remains an inference.

All 15 files from the three failed batches passed unchanged locally: 64 tests. Astra independently reviewed causality and admitted one unchanged-SHA retry. No assertions, timeouts, skips or production code were changed to obtain that retry. Original failures remain in final-ci-failure.log; local result is failed-ci-shards-local.log; adjudication is ci-failure-adjudication.json. The retry result is recorded in the final outcome below. If it fails, investigate the new failure rather than blindly retrying or waiving CI.

For the next Coach implementation task, use a fresh isolated tree based on the final production main, then import the next bounded, dependency-complete slice from the local preservation branch. Keep its existing architecture, builder/reviewer roles and gate history. Do not merge all 81 preserved WIP commits into main as a shortcut.

## Every original Coach dirty path

Hash inventory: checkpoint-preservation.json (110 entries after adding packet 69). The initial audit had 109 entries. A local checkpoint contains 108; the two pre-existing exceptions above remain. Three local files changed after their original snapshot: two held stylesheet fallbacks were moved to existing CSS tokens, and unchanged Session notification palette literals received supported compatibility annotations. All originals survive in source-before-checkpoint/.

| Path | Disposition |
|---|---|
| AGENTS.md | Pre-existing policy edit; held unstaged |
| backend/middleware/aiRateLimiter.mjs | HOLD with chat disconnect cleanup consumer |
| backend/routes/aiChatRoutes.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/routes/dailyWorkoutFormRoutes.mjs | Selected release; see exact release hashes |
| backend/services/ai/coachEvidenceTools.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/ai/coachInferenceBoundary.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/ai/coachProactiveNudge.mjs | HOLD memory/consent, delivery and final review |
| backend/services/ai/coachProgressEvidence.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/ai/coachProgressRecordReader.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/ai/coachSubstitutionDraft.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/ai/contextEngine/clientAccess.mjs | HOLD shared photo/Coach authorization policy closure |
| backend/services/ai/contextEngine/coachContextEngine.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/aiChatService.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/coachFactMemoryPolicy.mjs | HOLD memory/consent, delivery and final review |
| backend/services/coachFactService.mjs | HOLD memory/consent, delivery and final review |
| backend/tests/api/aiChatConversationListTarget.contract.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/api/aiChatConversationTargetGuard.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/api/aiProviderRouterIntegration.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/aiChatConversationLifecycleSafety.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/aiChatExerciseAnalyticsTruth.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/clientAccess.test.mjs | HOLD shared photo/Coach authorization policy closure |
| backend/tests/unit/coachCallerInventory.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachContextEngine.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachEvidenceTools.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachFactMemoryPolicy.test.mjs | HOLD memory/consent, delivery and final review |
| backend/tests/unit/coachFactService.test.mjs | HOLD memory/consent, delivery and final review |
| backend/tests/unit/coachInferenceBoundary.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachProactiveNudge.test.mjs | HOLD memory/consent, delivery and final review |
| backend/tests/unit/coachProgressEvidence.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachProgressEvidenceTool.t33.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachProgressRecordReader.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachSubstitutionDraft.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/README.md | Local canonical plans/evidence summaries; not release certification |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachActionProposalSplitPlanPanel.identity.test.ts | HOLD privacy/evidence/runtime dependency closure and combined gates |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterNotebook.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.context.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.deskMount.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.shell.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.test.harness.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterVoice.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionDesk.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionDeskGate.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionDraftContext.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachWorkoutDraft.test.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachWorkoutDraft.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/coachSessionDraftState.test.ts | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/coachSessionDraftState.ts | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/hooks/usePremiumTTS.ts | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useVoiceRecorder.ts | Selected release; see exact release hashes |
| frontend/src/components/DashBoard/Pages/coach-assistant/useCoachWorkoutDraftSubmit.test.ts | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/useCoachWorkoutDraftSubmit.ts | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/WorkoutLogger/NASMExerciseRolodex.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/context/SessionContext.tsx | Selected release; see exact release hashes |
| frontend/src/hooks/useAIChat.conversationIsolation.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/hooks/useAIChat.proposals.test.ts | HOLD integrated actor/thread/selection adoption |
| frontend/src/hooks/useAIChat.sendFailureCleanup.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/hooks/useAIChat.ts | HOLD integrated actor/thread/selection adoption |
| frontend/src/hooks/useCoachCommand.frontendDispatch.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/hooks/useCoachCommand.ts | HOLD integrated actor/thread/selection adoption |
| _g02_registry_audit.cjs | Local audit utility, checkpoint only |
| backend/services/ai/coachConversationReadAccess.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/services/ai/coachExerciseLibraryReader.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/api/coachConversationReadAuthorization.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/api/dailyWorkoutFormPermissionFailure.test.mjs | Selected release; see exact release hashes |
| backend/tests/helpers/coachReadAuthorization.postgres.config.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/helpers/coachRuntimeEvidence.postgres.config.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/integration/coachReadAuthorization.postgres.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/integration/coachRuntimeEvidence.postgres.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachInferenceBoundary.hostile.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| backend/tests/unit/coachProviderMounted.hostile.test.mjs | HOLD privacy/evidence/runtime dependency closure and combined gates |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/47-astra-runtime-hostile-review.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/48-capability-truth-and-release-gaps.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/49-g04-connected-session-desk.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/49-wireframe.html | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/50-runtime-session-isolation.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/51-g04-selection-owner.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/52-coach-read-authorization.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/53-coach-exercise-reader.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/54-editor-numeric-entry.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/55-coach-selection-and-transport.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/56-ui-command-hostile-audit.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/57-conversation-target-integrity.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/58-planner-async-retirement.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/59-rest-adjust-contract.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/60-confirmed-logger-submit-binding.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/61-global-client-reference.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/62-surface-context-compatibility-shim.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/63-g04-selection-adapter.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/64-route-privacy-regression-tests.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/65-client-self-conversation-read.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/66-speech-access-contract-tests.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/67-coach-current-state.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/68-coach-transcript-layout-repair.md | Local canonical plans/evidence summaries; not release certification |
| docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/69-selective-release-audit.md | Local canonical plans/evidence summaries; not release certification |
| frontend/.hermes/environment.json | Private local configuration; never published |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionDesk.g04connection.test.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionDesk.styles.ts | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionDeskGate.hostile.test.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionDraftContext.hostile.test.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachSessionLibraryPrivacy.g04connection.test.tsx | HOLD privacy/evidence/runtime dependency closure and combined gates |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachWorkoutDraft.g04connection.test.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachWorkoutDraft.numericInput.test.tsx | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/CoachWorkoutDraft.styles.ts | HOLD G04 selection, editor and Logger integration |
| frontend/src/components/DashBoard/Pages/coach-assistant/hooks/usePremiumTTS.retirement.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useVoiceRecorder.generation.test.tsx | Selected release; see exact release hashes |
| frontend/src/context/SessionContext.runtime.test.tsx | Selected release; see exact release hashes |
| frontend/src/hooks/coachPublicationScope.ts | HOLD integrated actor/thread/selection adoption |
| frontend/src/hooks/useAIChat.retirement.test.tsx | HOLD integrated actor/thread/selection adoption |
| frontend/src/hooks/useCoachCommand.retirement.test.tsx | HOLD integrated actor/thread/selection adoption |

## Registered worktree inventory

Snapshot after pointer repair, before release commit; release row was subsequently committed clean. Behind/ahead is relative to fetched main at 53120649f356c3efccee32872b530096d386642f. A branch label is an ownership hint only. Detailed changed paths are in the JSON inventory, not omitted from preservation.

| Worktree | Branch / detached | Dirty entries | Behind / ahead | Next disposition |
|---|---|---:|---|---|
| C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT | wip/comms-notifications-2026-07-05 | 2956 | 2397 / 598 | Owner audit + local checkpoint needed |
| C:/tmp/gov-worktree | gov/closeout-unify | 0 | 112 / 3 | Preserve unmerged commits; owner review |
| C:/tmp/ss-aftertaste | claude/aftertaste-p0-20260825 | 1 | 125 / 28 | Owner audit + local checkpoint needed |
| C:/tmp/ss-apex | feat/apex-dashboard-redesign | 0 | 2107 / 3 | Preserve unmerged commits; owner review |
| C:/tmp/ss-arcb-batch1-20260722 | claude/arcb-mobbin-batch1-20260722 | 2 | 1356 / 5 | Owner audit + local checkpoint needed |
| C:/tmp/ss-atelier-v2 | feat/atelier-v2-compose | 19 | 168 / 106 | Owner audit + local checkpoint needed |
| C:/tmp/ss-autoreview | detached | 0 | 675 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-badge-forge-20260804 | claude/badge-forge-20260804 | 0 | 777 / 16 | Preserve unmerged commits; owner review |
| C:/tmp/ss-bootcamp-s2-reintegrate-20260802 | claude/bootcamp-s2-reintegrate-20260802 | 0 | 976 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-bootcamp-v2-20260731 | claude/bootcamp-v2-20260731 | 5 | 859 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-brain-20260708 | claude/brain-cockpit-slice2-20260708 | 2 | 2099 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-build-swan-lens | claude/build-swan-lens | 1 | 1044 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-cart-role-20260816 | claude/refund-lifecycle-20260819 | 0 | 239 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-charts-panel-20260821 | codex/charts-panel-build-20260821 | 200 | 239 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-charts-unify-20260903 | claude/chart-system-unification-20260903 | 46 | 8 / 8 | Owner audit + local checkpoint needed |
| C:/tmp/ss-coach-audit | claude/swancoach-operator-blueprint-20260722 | 3 | 1322 / 5 | Owner audit + local checkpoint needed |
| C:/tmp/ss-coach-cc-20260716 | claude/coach-command-center-rebuild-20260716 | 1 | 1668 / 1 | Owner audit + local checkpoint needed |
| C:/tmp/ss-coach-cc-v2-20260717 | claude/codex-findings-20260717 | 0 | 1663 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-coach-facts-s1 | feat/coach-facts-s1 | 0 | 94 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-coach-gate0-20260812 | claude/coach-v3-slices-20260813 | 0 | 538 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-coach-hostile-fix-20260725 | codex/coach-hive-hostile-fixes-20260725 | 12 | 1257 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-coachv3-packet-20260814 | claude/coach-v3-packet-skill-20260814 | 0 | 460 / 31 | Preserve unmerged commits; owner review |
| C:/tmp/ss-constitution-20260814 | claude/constitution-repair-20260814 | 0 | 460 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-darkcode-20260814 | claude/activation-debt-audit-20260814 | 0 | 467 / 15 | Preserve unmerged commits; owner review |
| C:/tmp/ss-dash-trust-20260821 | claude/dashboard-trust-repair-20260821 | 0 | 227 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-designbrain-s1 | claude/design-brain-s1-20260821 | 0 | 239 / 11 | Preserve unmerged commits; owner review |
| C:/tmp/ss-econ-s1 | feat/trainer-economics-s1 | 0 | 1305 / 7 | Preserve unmerged commits; owner review |
| C:/tmp/ss-fable-vision-20260705 | fable/vision-arc-20260705 | 39 | 2192 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-forge-variantrun | claude/ex2-learning-packet | 0 | 0 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-gate-integration | integration/spend-and-fable-gates | 0 | 28 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-gates-main | claude/hostile-review-gates-slice1 | 0 | 531 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-grillme | claude/grillme-values-20260825 | 6 | 112 / 10 | Owner audit + local checkpoint needed |
| C:/tmp/ss-handoff-skill | feat/handoff-skill | 0 | 303 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-harden-20260815 | claude/constitution-harden-20260815 | 2 | 450 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-hermes-cosmic-os-20260807 | codex/hermes-cosmic-os-20260807 | 17 | 675 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-homepage-v2-20260804 | claude/homepage-redesign-20260804 | 19 | 879 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-jarvis-audit-20260821 | claude/jarvis-audit-correction-20260821 | 2 | 239 / 19 | Owner audit + local checkpoint needed |
| C:/tmp/ss-kimi-blueprints-20260717 | claude/kimi-design-blueprints-20260717 | 1 | 1629 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-lane-v2-20260812 | claude/lane-v2-20260812 | 0 | 562 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-lane1-20260713 | claude/lane1-batch2-20260713 | 1 | 1836 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-launch-audit-lane4-20260803 | claude/launch-audit-lane4-20260803 | 30 | 779 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-launch-audit-lane5-20260803 | claude/launch-audit-lane5-20260803 | 0 | 965 / 35 | Preserve unmerged commits; owner review |
| C:/tmp/ss-lens-finish-20260714 | detached | 24 | 1455 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-main-audit | detached | 0 | 673 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-mediasync | claude/media-sync-20260812 | 0 | 231 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-mega-audit-20260715 | claude/mega-audit-20260715 | 0 | 1768 / 6 | Preserve unmerged commits; owner review |
| C:/tmp/ss-mic45 | detached | 0 | 321 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-moneypath | claude/rescue-moneypath-20260825 | 0 | 115 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-orient-land | feat/orient-block-swa223 | 0 | 99 / 2 | Preserve unmerged commits; owner review |
| C:/tmp/ss-p47 | detached | 0 | 313 / 5 | Preserve unmerged commits; owner review |
| C:/tmp/ss-plan-conformance-20260814 | feat/plan-conformance-2026-08-14 | 0 | 464 / 11 | Preserve unmerged commits; owner review |
| C:/tmp/ss-planpdf-fixes | claude/plan-pdf-cheap-fixes-20260813 | 0 | 571 / 8 | Preserve unmerged commits; owner review |
| C:/tmp/ss-plaud-build | feat/plaud-capture-slice-0-1 | 17 | 27 / 42 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-client-dashboard-release-20260623-01 | detached | 15 | 2526 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-client-dashboard-release-20260623-03 | detached | 6 | 2523 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-creative-release-20260625 | codex/creative-dashboard-release-20260625 | 3 | 2502 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-design-wt | feat/design-brain-style-intelligence | 3 | 18 / 33 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-four-surface-clean | codex/user-dashboard-v3-style-ownership | 24 | 3756 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-review-pr7-merge | detached | 31 | 2648 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-review-pr8-merge | detached | 2 | 2648 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-review-pr8-merge2 | detached | 2 | 2648 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-user-dashboard-restore-20260623 | detached | 4 | 2519 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-video-library-v3-release-20260623 | detached | 2 | 2519 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-pt-workout-clienthub-unify | codex/workout-clienthub-unify | 1 | 2649 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-publish-truth-20260812 | claude/publish-truth-p0-20260812 | 3 | 617 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-publish-truth-land | claude/publish-truth-p0-land | 0 | 601 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-qa-harness-slice0 | claude/qa-harness-slice0-20260811 | 1 | 272 / 6 | Owner audit + local checkpoint needed |
| C:/tmp/ss-recovery-compass | claude/recovery-compass-20260721 | 0 | 1450 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-retry-land | claude/publish-retry-land | 0 | 598 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-rule12-repeal | claude/repeal-rule-12-20260820 | 0 | 260 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-s0-hostile-20260814 | claude/s0-hostile-fixes-20260814 | 0 | 467 / 2 | Preserve unmerged commits; owner review |
| C:/tmp/ss-s2review | claude/slice2-panel-review-20260820 | 2 | 267 / 1 | Owner audit + local checkpoint needed |
| C:/tmp/ss-social-distribution | claude/social-distribution-plan-20260811 | 1 | 666 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-spendguard-port | claude/spend-guard-port-20260823 | 0 | 193 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-store-inquiry | claude/store-inquiry-button | 0 | 2010 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/ss-swa224-sheen | ogpswan/swa-224-forge-sheen-pack | 0 | 23 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-swan-collect-20260812 | claude/swan-collect-scout-20260812 | 0 | 618 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-swan-guide-20260716 | claude/swan-guide-20260716 | 0 | 1705 / 2 | Preserve unmerged commits; owner review |
| C:/tmp/ss-trainer-dash | fix/trainer-dashboard-pixel | 133 | 1251 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-trainer-g0-20260822 | claude/trainer-authz-g0-20260822 | 0 | 206 / 0 | Contains no unique commits; archival review only |
| C:/tmp/ss-trust-triple-20260706 | claude/wave16-compliance-buttons-20260706 | 2 | 2224 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-user-dashboard-audit-20260714 | detached | 570 | 1809 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/ss-world-engine-20260712 | codex/world-engine-20260712 | 9 | 1878 / 1 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-aftertaste-hardening-20260830 | codex/aftertaste-hardening-20260830 | 82 | 125 / 88 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-arctic-dawn-contrast-20260715 | codex/arctic-dawn-contrast-20260715 | 4 | 1807 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-atelier-studio | feat/front-page-atelier-run | 12 | 272 / 53 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-backend-recovery-20260822 | codex/backend-recovery-20260822 | 0 | 226 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-base | detached | 0 | 2014 / 2 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-challenge-render-20260630 | codex/challenge-render-20260630 | 187 | 2369 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-challenge-render-core-20260630 | codex/challenge-render-core-20260630 | 6 | 2368 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-client-onboarding-handoff-20260628 | codex/client-onboarding-handoff-20260628 | 2 | 2426 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-coach-command-release-20260627 | codex/coach-command-center-pro-ux-20260627 | 30 | 2440 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-coach-release-20260630-111620 | detached | 1 | 2371 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-coach-v2-hostile-20260717 | codex/coach-v2-hostile-20260717 | 9 | 1689 / 1 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-coderabbit-codex-slice-20260708 | detached | 12 | 2397 / 1 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-codex-launch-core-20260728 | codex/launch-core-audit-20260728 | 1 | 1190 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-comms-recovery-20260715 | codex/comms-recovery-20260715 | 212 | 1761 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-context-gateway-20260721 | codex/context-gateway-phase0-20260721 | 15 | 1450 / 2 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-cortex-p1 | codex/cortex-phase1 | 6 | 1818 / 2 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-dash-audit-20260713 | detached | 0 | 1840 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-dashboard-fable-audit-20260704 | detached | 1 | 2294 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-dashboard-hostile-audit-20260814 | codex/dashboard-hostile-repair-20260814 | 102 | 467 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-degate-baseline-20260721 | detached | 0 | 1450 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-degate-design-20260721 | codex/degate-design-overhaul-20260721 | 0 | 1399 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-egress-hostile-20260826 | detached | 17 | 2397 / 487 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-fable-canonical-final-20260715 | codex/fable-canonical-plan-final-20260715 | 0 | 1752 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-fable-training-plan-review-20260715-wt | detached | 163 | 1785 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-five-day-hostile-review-20260712 | codex/five-day-hostile-review-20260712 | 0 | 1949 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-google-linking-20260730 | codex/google-linking-20260730 | 34 | 1037 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-gpt-claude-review-20260812 | detached | 51 | 610 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-gymops-extract-20260901 | claude/gymops-extract-20260901 | 0 | 94 / 6 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-hermes-privacy-router-20260731 | codex/hermes-privacy-router-20260731 | 47 | 1013 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-jarvis-s2-20260731 | codex/jarvis-s2-vocab-bias-20260731 | 12 | 984 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-kimi-after-opus-20260726 | detached | 0 | 1251 / 3 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-kimi-panel-runtime-20260814 | codex/kimi-panel-runtime | 0 | 530 / 4 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-launcher-render-release-20260828 | codex/launcher-icons-render-release-20260828 | 0 | 95 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-launcher-review-20260827-glm53 | codex/launcher-icons-review-fixes-20260828 | 0 | 2397 / 489 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-lens-world-fusion-20260714 | codex/lens-world-fusion-20260714 | 34 | 1812 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-mcp-lifecycle-20260808 | codex/mcp-lifecycle-hygiene-20260808 | 0 | 675 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-messaging-group-release-20260626 | codex/messaging-group-release-20260626 | 18 | 2460 / 1 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-mobbin-proof-origin-main-20260719 | detached | 2 | 1535 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-mobbin-resume-proof-20260719 | codex/mobbin-resume-proof-20260719 | 0 | 1515 / 5 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-model-queue-20260904 | codex/model-queue-20260904 | 0 | 0 / 5 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-native-mobile-20260714 | codex/native-mobile-20260714 | 0 | 1824 / 13 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-nutrition-origin-main-20260625 | codex/nutrition-aaa-release-20260625 | 53 | 2494 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-nutrition-staged-replay-20260626 | codex/nutrition-staged-replay-20260626 | 47 | 2464 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-nutrition-staged-review-20260625-01 | detached | 108 | 2672 / 6 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-opus-then-kimi-20260725 | codex/opus-then-kimi-review-20260725 | 5 | 1251 / 2 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-pearl-reader-20260813 | codex/pearl-reader-packet-20260813 | 0 | 552 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-planhome-20260711 | claude/client-plan-home-2026-07-11 | 1385 | 2014 / 2 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-pr18-render-mergecheck-20260702 | detached | 16 | 2357 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-prelaunch-audit-20260716 | codex/prelaunch-audit-20260716 | 1793 | 1761 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-prelaunch-integration-20260716 | codex/prelaunch-integration-20260716 | 1756 | 1713 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-qwen-kimi-privacy-20260726 | codex/qwen-kimi-privacy-review-20260726 | 0 | 1251 / 5 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-recovery-mobbin-phase2-20260721 | codex/recovery-mobbin-phase2-20260721 | 47 | 1450 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-recursive-audit-slice1-20260629 | codex/recursive-audit-slice1-20260629 | 383 | 2380 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-render-hostile-20260718 | detached | 0 | 1621 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-render-postreview-20260719 | detached | 0 | 1510 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-selective-release-20260912 | release/coach-safe-fixes-20260912 | 7 | 0 / 0 | Reviewed release |
| C:/tmp/sspt-site-audit-20260812 | detached | 27 | 626 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-speed-to-lead-email-20260716 | claude/speed-to-lead-email | 0 | 1700 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-style-lens-village-20260711 | detached | 56 | 2074 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-swan-coach-voice-20260629 | codex/swan-coach-voice-20260629 | 5 | 2388 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-swan-design-brain-upgrade-20260809 | codex/swan-design-brain-upgrade-20260809 | 18 | 675 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-swan-kernel-auth-containment-20260830 | codex/swan-kernel-auth-containment-20260830 | 20 | 94 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-swan-lens-direction-a-release-20260801 | codex/swan-lens-direction-a-release-20260801 | 87 | 979 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-swan-lens-runner-audit-20260801 | codex/swan-lens-runner-audit-20260801 | 51 | 984 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-traineco-extract-20260901 | feat/trainer-onboarding-frontend | 0 | 99 / 3 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-trainer-home-shell-release-20260625 | codex/trainer-home-shell-release-20260625 | 25 | 2479 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-trainer-onboarding-baseline-20260827 | detached | 0 | 99 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-user-dashboard-carousel-pan-20260626 | codex/user-dashboard-carousel-pan-release-20260626 | 9 | 2440 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-verify-until-dry-20260808 | codex/verify-until-dry-20260808 | 0 | 675 / 22 | Preserve unmerged commits; owner review |
| C:/tmp/sspt-workout-circuit-release-20260828 | detached | 0 | 94 / 0 | Contains no unique commits; archival review only |
| C:/tmp/sspt-workout-suite-audit-20260709 | codex/workout-concept-lab-20260709 | 20 | 2100 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/sspt-workout-unified-20260628 | codex/workout-unified-20260628 | 53 | 2411 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/swan-cardiac-clamp | fix/cardiac-phase-clamp | 0 | 975 / 10 | Preserve unmerged commits; owner review |
| C:/tmp/swan-cart-obs | claude/cart-observability-swa92 | 0 | 12 / 2 | Preserve unmerged commits; owner review |
| C:/tmp/swan-fable-gate | feat/spend-guard-tests | 8 | 74 / 0 | Owner audit + local checkpoint needed |
| C:/tmp/swan-gates-pr | fix/instruments-r4 | 0 | 152 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/swan-hookwire-20260821 | detached | 0 | 201 / 0 | Contains no unique commits; archival review only |
| C:/tmp/swan-mkt-s2l | claude/marketing-readiness-s2l-clean-2026-08-14 | 0 | 471 / 12 | Preserve unmerged commits; owner review |
| C:/tmp/swan-p1a | claude/coach-endpoint-truth-v2-20260824 | 0 | 94 / 62 | Preserve unmerged commits; owner review |
| C:/tmp/swan-prune | docs/deterministic-turn-handoff | 0 | 142 / 1 | Preserve unmerged commits; owner review |
| C:/tmp/swan-repave | claude/design-brain-repave-20260816 | 0 | 304 / 3 | Preserve unmerged commits; owner review |
| C:/tmp/swan-s18 | claude/constitution-s18-20260816 | 0 | 374 / 0 | Contains no unique commits; archival review only |
| C:/tmp/swan-safety-floor | feat/ai-provider-allowlist | 0 | 292 / 2 | Preserve unmerged commits; owner review |
| C:/Users/BigotSmasher/.hermes/runner-repo | detached | 0 | 1152 / 0 | Contains no unique commits; archival review only |
| C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906 | codex/swan-coach-astra-owned-20260906 | 2 | 27 / 82 | Coach checkpoint; two pre-existing exceptions |

## Branch backlog inventory

All 81 original Coach-only commits are preserved. Titles are historical claims, not current certification. The release extracts specific current source bytes; it does not merge any of these commits wholesale. goldenDataset correction originates in f541417b7, and the recorder race regression also originates in held history; stale report/temp artifacts were excluded.

| Commit | Historical subject | Current disposition |
|---|---|---|
| c9032974f17c | docs(coach): SWAN JARVIS beyond-blueprint — fused audit + dual GLM hostile review | Local preservation; no wholesale release |
| 8b884c7c8b03 | docs(hermes): learning packet — an audit that ends in a report has not ended | Local preservation; no wholesale release |
| 467fe973aa0a | test(backend): S0.0a — 16 green node:test files stop masquerading as vitest failures | Local preservation; no wholesale release |
| f541417b7b39 | fix(eval): S0.0b — warnings_02 tests the rest boundary, not a tempo it forgot | Local preservation; no wholesale release |
| 4a52f6af37fe | fix(qa,ci): S0.0c — env-honest driver check, un-swallowed SDK errors, honest bodymap gate | Local preservation; no wholesale release |
| 0d02e158d45b | docs(hermes): learning packet — a red suite is a measurement claim | Local preservation; no wholesale release |
| caa932bab2ca | docs(coach): corrected Jarvis readiness report - 5-seat panel kills 4 false findings, surfaces the real P0 | Local preservation; no wholesale release |
| 5076ca984020 | test(coach): S11 adversarial approval-lane lock - 14 executed proofs | Local preservation; no wholesale release |
| c56732c5f731 | fix(test): S4a make the backend suite green so it can become a required check | Local preservation; no wholesale release |
| a8da100676e3 | ci(coach): S4b add the Coach Gate workflow - every blocking step verified green first | Local preservation; no wholesale release |
| 093d803874f4 | docs(coach): correct S4a's overclaim + record that 3 existing CI checks are red | Local preservation; no wholesale release |
| 057ba9ad7741 | feat(coach): S2 put the approval store behind a seam + make the prod defect loud | Local preservation; no wholesale release |
| 07132d471e96 | test(coach): S2 hostile round - A22 proves expiry is ENFORCED, not just finite | Local preservation; no wholesale release |
| 9de17e99b4d4 | fix(coach): S5 stop the catalog advertising commands Swan Coach cannot do | Local preservation; no wholesale release |
| 87f5842f883b | fix(coach): S5 hostile round - badge was stretching full-width in the grid | Local preservation; no wholesale release |
| bd9c82867e11 | fix(coach): S6 AI rate limiter - resetAll under-cleared, and the sweep forgot two maps | Local preservation; no wholesale release |
| 4aecab3f58f7 | test(coach): S6 hostile round - prove the 5-minute sweep actually fires | Local preservation; no wholesale release |
| b284ee019e89 | fix(coach): apply the 4-seat house-style review - 1 blocker, 6 majors, 8 minors | Local preservation; no wholesale release |
| 0b0145f1239d | feat(coach): F1 unhandled-utterance pipeline - stop discarding the roadmap signal | Local preservation; no wholesale release |
| 6079b1eeec4b | fix(scripts): consult-grok streams - a >600s reasoner no longer loses its entire reply | Local preservation; no wholesale release |
| 4270af011bb7 | fix(coach): H1 client-role callers are self-scoped in the command lane (IDOR) | Local preservation; no wholesale release |
| 0966c135c93a | fix(coach): hostile round 1 - H2-H5 + three F1 corrections (7 seats, verified at source) | Local preservation; no wholesale release |
| 8df996ace6d6 | fix(coach): H6 command-lane frontend dispatch now passes the chat lane's safety gate | Local preservation; no wholesale release |
| 629a1610bfb6 | fix(coach): H7 command lane gets a global per-minute ceiling (was per-user only) | Local preservation; no wholesale release |
| edfc0eeaceb5 | fix(coach): H8 the '50-record bulk cap' is a preview cap - say so, and lock the premise that makes it safe | Local preservation; no wholesale release |
| 7d34fc262acb | fix(ci): S0.2a — integrate the rebased Coach Gate with the baseline-gate mechanism | Local preservation; no wholesale release |
| 5e7457162ad3 | fix(test): S0.2b — isolate surface-disambiguation tests from the H6 dispatch gate | Local preservation; no wholesale release |
| 6f5dda735643 | fix(test): S0.2c — explicit 120s hook budget for the app-booting lateral probe | Local preservation; no wholesale release |
| 117e329a5ad0 | feat(coach): S0.3/0.4a — the signing key is required and the HMAC signs what the human reads | Local preservation; no wholesale release |
| 059fd17b6d40 | feat(coach): S0.4b — Redis behind the approval-store seam; mint on A confirms on B | Local preservation; no wholesale release |
| 726a44674458 | fix(coach): S0.4c — Fable 5.1 hostile pass: the boot gate was decorative and the scope law over-refused | Local preservation; no wholesale release |
| d31841650eee | docs(coach): SWAN JARVIS blueprint v2 — Fable 5.1 hostile pass + decision-complete build cards for Opus | Local preservation; no wholesale release |
| 52f5a71c3b44 | docs(hermes): learning packet — a gate lives in a region, not a file | Local preservation; no wholesale release |
| eedc565e7aec | feat(coach): v2 card 1.0 — approval lifecycle is countable, and the app-boot probe class is guarded | Local preservation; no wholesale release |
| 3a18202408be | feat(coach): v2 card 1.1 — read-back endpoint + proof-of-render digest (M1) | Local preservation; no wholesale release |
| f87aae62657b | feat(coach): v2 card 1.2 — server-side tiers, refusal rank, and the two holes GLM found | Local preservation; no wholesale release |
| 4d82b2ecf036 | feat(coach): v2 card 1.3 — ONE ConfirmationSheet, and the surface docks confirm in place | Local preservation; no wholesale release |
| 177c974be13e | feat(coach): v2 cards 1.4 + 1.5 — The Lane renders the wrong-client guard; the kill switch actually kills | Local preservation; no wholesale release |
| fdc6f9b8064f | fix(test): v2 card 1.5 follow-up — A14 asserted the defect FF23 removed | Local preservation; no wholesale release |
| 1ec107167c4e | fix(coach): self-review round 1 — an expired approval said 'does not match', and half the funnel was uncounted | Local preservation; no wholesale release |
| f09bd8044d9d | fix(coach): self-review round 2 — Escape on a finished sheet, and the enforce gate is now written down | Local preservation; no wholesale release |
| 2e422c8af20f | fix(coach): self-review round 3 — my refusal-tier claim was wider than the code | Local preservation; no wholesale release |
| 8e4dd7ba634c | fix(coach): apply GLM round-1 findings — enforce the M3 channel split end to end | Local preservation; no wholesale release |
| c5a5a6d6ce45 | fix(coach): give Cmd+K one owner — N bars registered N global listeners (F-20) | Local preservation; no wholesale release |
| 6156d1ad1dcd | fix(coach): the SECOND confirm caller never declared a channel — sweep + hatch | Local preservation; no wholesale release |
| 2afc96a88885 | chore(coach): clear the Rule 4 line cap by both counters, not just one | Local preservation; no wholesale release |
| ae4c2a2bdce1 | test(coach): cover the non-destructive confirmation lane — it had zero tests | Local preservation; no wholesale release |
| 02418e58edfd | fix(coach): the M3 rule was INERT — the tier read ctx.routeContext, which does not exist | Local preservation; no wholesale release |
| 5844156cbe39 | test(coach): guard the bug CLASS, not just the instance — typo'd ctx properties | Local preservation; no wholesale release |
| 873cf9283149 | fix(coach): M3 was STILL inert after the last fix — the safe default was the rest of it | Local preservation; no wholesale release |
| f69e9117be36 | fix(coach): correct a comment I wrote today that described a field the server has never had | Local preservation; no wholesale release |
| b966ff2cf193 | fix(coach): GLM round 2 — three more controls that could not fire, and a lie in the UI | Local preservation; no wholesale release |
| df5ed3058832 | fix(coach): GLM round 2 remainder — the scope law, the digest's wire parity, the mint guard | Local preservation; no wholesale release |
| cdc9594d37f9 | docs(coach): round-2 hostile review packet + both GLM seat reviews | Local preservation; no wholesale release |
| bfc7a7898693 | fix(coach): /health advertised a flag that gates nothing, to the one reader who acts on it | Local preservation; no wholesale release |
| bb577250514f | feat(coach): wire universe v3 provenance and durable intent foundation | Local preservation; no wholesale release |
| b98ccb2c086a | feat(coach): expose bounded durable intent receipts | Local preservation; no wholesale release |
| 350e80c8dc5c | feat(coach): publish server-owned command policy | Local preservation; no wholesale release |
| 12047784e066 | feat(coach): add workout readback verification contract | Local preservation; no wholesale release |
| c1eaadbc6d85 | feat(coach): bind workout receipts to writer transaction | Local preservation; no wholesale release |
| c4a83185bc8c | feat(coach): preserve degraded context evidence | Local preservation; no wholesale release |
| 8b5e07884b84 | feat(coach): enforce provider and response boundaries | Local preservation; no wholesale release |
| 21f3c2cea3ca | feat(coach): add verified progress evidence contract | Local preservation; no wholesale release |
| ad593e4f28dc | docs(coach): refresh universe readiness receipt | Local preservation; no wholesale release |
| 0a0da33603ad | fix(coach): close hostile review gaps | Local preservation; no wholesale release |
| c7161f628d08 | chore(coach): honor frontend file cap | Local preservation; no wholesale release |
| 37fed2bf3292 | chore(coach): keep action module below cap | Local preservation; no wholesale release |
| a58145d6cec0 | docs(coach): refresh repaired evidence | Local preservation; no wholesale release |
| 2266fb653c50 | fix(coach): close second hostile review gaps | Local preservation; no wholesale release |
| b88dd9e5c894 | chore(coach): keep controller below file cap | Local preservation; no wholesale release |
| 0c96142f242c | feat(coach): continue Swan Coach Universe V3 through G05 | Local preservation; no wholesale release |
| d9d7dfe615cf | feat(coach): implement G06 foreground speech lifecycle (T30-T32) | Local preservation; no wholesale release |
| 93b7b9d2872e | feat(coach): implement G07 real evidence + deterministic metrics (T33/T34/T48) | Local preservation; no wholesale release |
| 54d5f6dc50ad | feat(coach): implement G08 dashboard surface adapter registry | Local preservation; no wholesale release |
| d4ab6ae72b57 | feat(coach): implement G09 CoachFact scoped memory (T35/T36/T37) | Local preservation; no wholesale release |
| b42fd972b393 | feat(coach): implement G10 opt-in proactive nudge engine (T38/T39) | Local preservation; no wholesale release |
| 1a5f4118bed8 | feat(coach): implement G11 release readiness — clean candidate verified | Local preservation; no wholesale release |
| 8b94a988ea81 | fix(coach): hostile review round 1 — four findings, no breaking changes | Local preservation; no wholesale release |
| f485b5a705d6 | fix(coach): hostile review round 2 — races, dedupe window, cap honesty | Local preservation; no wholesale release |
| 45d72ad71622 | fix(coach): hostile review round 3 — reader-context validation tightened | Local preservation; no wholesale release |
| 48d792da5351 | docs(coach): hostile review rounds 1-3 record — 9 findings fixed, round 4 dry | Local preservation; no wholesale release |

## Concurrent worktree discovered at final inventory

The final read-only inventory (2026-09-12T20:14:55.027Z) discovered C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/full-site-repair-20260912, branch codex/full-site-repair-20260912, at 53120649f356c3efccee32872b530096d386642f. It has 23 untracked planning/evidence/regression-test paths, no commits absent from current main, and is four commits behind the deployed main. Its owner is not verified by this audit; none of its files was changed, staged or committed here.

That owner should reconcile its bounded full-site repair with deployed main c0cbe538d8ed2ca519bb494cdf3282bf43b76699 before implementation/release, preserve its current tests and artifacts, and avoid duplicating the permission-error fix already released. Existing task authority and tests still govern its remaining logger/offline repairs. Source inventory is in final-worktree-inventory/worktree-inventory.json; this addendum accounts for the one new tree beyond the earlier 168-row table. Final counts are 169 total, 91 dirty, 78 clean. This is a timestamped inventory, not a claim that concurrent tasks have stopped.

## Closeout evidence lock

Claim scope: selective release source/tests and local preservation only. Canonical mounted path: UniversalDashboardLayout.routes.tsx -> CoachCommandCenterPage -> CoachConsoleDock -> VoiceRecordingOverlay -> useVoiceRecorder; App -> SessionProvider. Browser receipt verifies the selected lifecycle boundaries, not the whole Coach workflow.

Security review covered permission-error denial, stale actor publication, recorder lifecycle and dependency closure. No new role grants, SQL, provider calls, schema, billing or secret values entered the release. Actual initial REDs and harness corrections are retained. Scope/gate source was unchanged; the original unfinished program gate is not mislabeled passed.

Future re-review triggers: actor-role representation changes, API response/storage formats, microphone callbacks/browser lifecycle, permission default policy, pending database schema changes, or any new integration of held Coach source. Re-run focused tests and mounted boundaries then inspect the actual diff; do not rely on this dated report alone.

## Outcome addendum

VERIFIED SELECTIVE RELEASE — 2026-09-12T20:14:16.940Z. [PR 118](https://github.com/SeanSwan/-SS-PT-New/pull/118) merged to main as c0cbe538d8ed2ca519bb494cdf3282bf43b76699; its tree exactly equals reviewed head 46e581d0d10640f90d93c32ddaa7ebb45e025aa8. All final-head PR checks passed. The frontend required one unchanged-SHA retry after the three documented failures; neither original failure nor the 11 backend skipped tests is concealed.

Render backend dep-dair2k9594qs739s3ks0 and frontend dep-dair20ou01pc738jk8sg both report Live at that exact main commit. Public read-only checks returned HTTP 200 for backend /health (healthy), /health/ready (ready=true, store=ready and matching build commit), and the application homepage. Production authenticated role journeys, physical-device microphone behavior and real transcription/provider calls were not exercised by this release smoke.

Backend auto-deploy was restored to On Commit and read back. Pre-deploy remains DISABLE_PROD_SEEDER=true npm run production-seed; start remains USE_BULLMQ_RECONCILIATION=false npm start. The normal build command and existing startup migration/non-package seeder code are unchanged. No manual production DB operation or package reseed was run. Render's payment-failed warning remains an account-owner action; deployment success does not resolve billing.

> **CORRECTED 2026-09-13 — the start command recorded above is not what the repo says.** `render.yaml` (worktree line 69, main line 23) reads `startCommand: cd backend && npm start` — with **no** `USE_BULLMQ_RECONCILIATION` prefix, and that variable is read by no code anywhere. Either the deployed service diverges from `render.yaml`, or this sentence was written from memory. **Do not treat either document as the authority**: read the Render service settings directly. See [76](76-correction-phantom-bullmq-control.md). The pre-deploy line was not independently checked here.

Unfinished Coach source remains local in checkpoint 346373264f84e00e392914fdb035d8ac5a1ca8ef. The final documentation checkpoint is recorded in final-audit-report-checkpoint.json; it is not pushed. The clean release tree contains only the reviewed eleven-file patch. The original Coach tree retains two visible local exceptions: AGENTS.md and frontend/.hermes/environment.json. Latest complete inventory: 169 registered trees, 91 dirty and 78 clean, including the release tree. The shared primary tree still has 2,956 dirty/untracked entries. No other task's work was committed, stashed, deleted or certified for production.

Authoritative local receipts: github-production-merge-receipt.json, final-pr-ci.json, final-ci-retry.json, ci-failure-adjudication.json, render-production-deploy-receipt.json, render-release-settings.json, public-postdeploy.json and selective-release-plan-receipt.json. The latter remains a structural plan/reference check; this operational release does not complete the original M68/Universe controller or its held requirements.
