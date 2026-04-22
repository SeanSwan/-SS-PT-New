# ACTIVE PRIORITIES

**Purpose:** Stable current priority board for SwanStudios production stability and the next implementation slices.
**Status:** Evergreen file. Update this when production priorities shift.
**Read after:** `CLAUDE.md`, `ACTIVE-INDEX.md`
**Last updated:** 2026-04-22 (post Phase 19.B, Phase B continuity bridge, and orchestrator drift fix)

---

## Purpose

This file is the canonical "what matters now" tracker.

- Use this for current production priorities and next-slice sequencing.
- Do not treat `CURRENT-TASK.md` as the live priority board; it is historical context.
- Keep `CLAUDE.md` compact and use this file for the active backlog.

---

## Current Production State

- Workout Logger, Workout Planner, and Clients & Team all have recent production hotfixes for live issues.
- Canonical `/dashboard/client/progress` and `/dashboard/client/progress/detailed` truth-restoration work is landed and regression-locked.
- BodyMeasurement read/write backing for Body Composition is verified and regression-locked.
- PLAUD strategy is now explicit:
  - Swan is the primary workflow.
  - PLAUD Desktop is optional.
  - Existing-account PLAUD cloud sync is not a production dependency.
- Remaining major risk before transcript-first rollout is stability drift, route drift, and transcript intake orchestration, not chart truth.
- Phase 19.A and 19.B `/dashboard/people/*` dead-route cleanup slices are shipped.
- Phase B continuity bridge is live across VS Code Claude, VS Code Codex, Hermes-Telegram Claude, and Hermes-Telegram Codex.
- AI Village orchestrator drift fix is shipped: non-design Chinese-provider model usage is removed from policy-constrained tracks and guarded fail-fast.

---

## Priority Stack

1. **P0 - Proactive frontend TDZ scan** ✅ **DONE** (Phase 9, 2026-04-14)
   - Scanned `coach-assistant/`, `admin-clients/`, `admin-workout-planner/`, `admin-dashboard/`, `workspaces/clients-team/`, `WorkoutLogger/`.
   - 150+ files, 180+ `useCallback`/`useMemo` declarations, **zero violations found**.
   - Both prior fixes (`WorkoutPlannerPage.tsx:240/268`, `WorkoutLogger.tsx:197/202`) re-verified intact.
   - Result: safe to touch Coach Assistant for transcript wire-up — done in same pass.

2. **P1 - `/dashboard/people/*` dead-route cleanup** (Phase 19)
   - **Phase 19.A ✅ DONE** (2026-04-21, commits `3fb88a9ed` + `30666aa49`)
     - Fixed 4 high-confidence live traps:
       - `AdminViewAsWrapper.tsx:330` `handleExit` → `/dashboard/admin/client-management`
       - `ContactNotifications.tsx:472` `new_user` notification destination → `/dashboard/admin/client-management`
       - `backend/controllers/orientationController.mjs:272` admin notification link → `/dashboard/admin/client-management`
       - `AdminWaiversManager.tsx:13` JSDoc pointer corrected (`UnifiedAdminRoutes` → `UniversalDashboardLayout`)
     - Corrected stale Phase 6 audit comment in `dashboard-tabs.ts:535-547` (landing surface: Coach Assistant → Overview; mount cite: `main-routes.tsx:909` → `DashboardRoutes.tsx:49-58`; catch-all lines: `856/861` → `869/874`).
     - Added `frontend/src/__tests__/no-dead-people-routes.test.ts` — vitest source-text guard with hard allowlist + existence sanity check, 2/2 passing.
     - Canonical Surface Receipt: `docs/ai-workflow/AI-HANDOFF/PHASE-19-CANONICAL-SURFACE-RECEIPT-2026-04-21.md`.
     - 3-brain review (Gemini skipped per Sean's direction): `docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-PHASE-19-DEAD-ROUTE-CLEANUP-2026-04-21.md` — Codex Round 1 APPROVE.
     - Rule-42 triage: 34 backend `let`→`const` WIP (ESLint auto-fix, pre-existing) committed separately as `30666aa49`. Backend tests: 1677/1677 passing.
     - Clarification: the trap ACTIVE-PRIORITIES previously described as "silent-redirect-to-Coach-Assistant" actually routes to `/dashboard/admin/overview` (Command Center) now — admin `defaultPath` was changed after Phase 6 from `coach-assistant` to `/overview`.
   - **Phase 19.B ✅ DONE** (2026-04-22, commit `f7abe03fb`)
     - Canonical Surface Receipt showed `MovementAnalysisWizard` is live inside the canonical Client Hub surface, not as a dedicated route.
     - Retargeted the two live-code `/dashboard/people/movement-screen` traps in `MovementAnalysisWizard.tsx:480,971`.
     - Cleaned dormant movement-screen string literals and tightened the dead-route guard allowlist.
     - Fixed the live wizard silent-prefill bug by passing the selected client id from the parent Client Hub context instead of relying on absent route params.
     - Codex Round 1 APPROVE, guard test 2/2 passing, full frontend vitest unchanged from known baseline.
   - **Phase 19.C DEFERRED** — optional movement-screen nested route architecture
     - Candidate route: `/dashboard/admin/client-management/:clientId/movement-screen`.
     - Requires its own planning doc + rule-15 gate. Do not fold into hygiene or Phase 18.B.
   - **Dormant cleanup deferred** — `UnifiedAdminRoutes.tsx` + `MasterDetailLayout.tsx` deletion pass needs Sean's approval per rule 34.

3. **P1 - Phase 18.B admin-as-client impersonation / measurements gate** 🔜 **NEXT PRODUCT BUILD LANE**
   - Scope: L6 admin view-as in `EnhancedAdminClientManagementView.tsx:1841,2130`; L7 measurements CTA in `ClientMeasurementPanel.tsx:365`.
   - Start with a Canonical Surface Receipt before code changes.
   - Decide whether the current admin-as-client impersonation surface should remain a route-level workflow, become a scoped Client Hub state, or be removed from the dead-route guard allowlist by retargeting to a canonical admin/client-management surface.
   - Keep separate from Phase 19.C nested movement-screen routing.

4. **P1 - Phase B continuity bridge** ✅ **DONE** (2026-04-22)
   - Shipped in commits `3620e4579`, `6b320579c`, `c667314c7`.
   - Adds append-only rolling continuity log, curated good-ideas file, sanitizer + secret-scan write gate, lock/trim/dedup handling, Codex startup wiring, and Hermes Path B daemon prepend record.
   - End-to-end smoke passed: VS Code Claude + VS Code Codex appended closeouts; Hermes startup context read the latest entries without tools.
   - Runtime/private identifiers stay in gitignored `scripts/continuity-config.local.json` and Pi-side config, not tracked docs.

5. **P1 - AI Village orchestrator drift fix** ✅ **DONE** (2026-04-22)
   - Shipped in commit `76a509e54`.
   - Removed MiniMax M2.7 from non-design code-review, planning, and escalation slots.
   - Kept MiniMax M2.7 only in Phase 2C UX/UI design debate code paths.
   - Added fail-fast guard over policy-constrained Phase 1 tracks + escalation models.
   - Cleaned stale Qwen/Step/MiniMax labels where they no longer matched runtime model assignments.

6. **P1 - Swan-first Coach Assistant transcript intake** ✅ **DONE** (Phase 9, 2026-04-14) + ⚠ **HOTFIXED** (Phase 9.1, 2026-04-14)
   - Coach Assistant accepts transcript-class file attachments (audio + text + pdf).
   - Current transcript upload cap is 20MB after Phase 10 alignment across frontend picker, multer, and Gemini inline-data handling.
   - Routes through `POST /api/workout-logs/upload` → review card → confirm → `POST /api/admin/clients/:clientId/workouts`.
   - Selected-client requirement enforced before upload.
   - Failure path preserves review state for retry.
   - Text-only Coach Assistant sends behave unchanged.
   - Phase 9 tests: 63/63 coach-assistant; 1471/1471 backend; 105/105 frontend scoped.
   - **Phase 9.1 (2026-04-14): local smoke test surfaced 3 real bugs + 1 UX defect, all fixed in-place on local commit `4d0e445b` (not yet re-committed):**
     - **BLOCKER-A**: `transcriptReviewsRef` ids not captured on no-client / upload-failure paths → Cancel and Apply buttons no-oped. **Fixed** by using new `appendTranscriptError` helper and storing error-entry ids in the same ref map.
     - **BLOCKER-B**: Client hydration bail-out when `GlobalClientProvider` loaded BEFORE Coach Assistant mounted. The `clientListFetchStartedRef` gate never flipped in the pre-loaded case, so `activeClient` was never adopted into `selectedClient`, and the picker showed "Select a client..." while the left rail correctly showed the real client. **Fixed** by adding state D: flip the ref when `clientList.length > 0` AND `!loadingClients` (implicit confirmation a fetch completed before mount).
     - **HIGH-A**: Validation / upload errors rendered as fake review cards with "0 parsed" and an active Apply button. **Fixed** by adding a new `transcriptError` metadata type and a dedicated `TranscriptErrorCard` render branch in `CoachMessage` — dismissible only, no fake Apply.
     - **HIGH-B**: `ContextChipBar` rendered as interactive buttons despite being perceived as dead controls. **Fixed** by redesigning as informational capability taxonomy — section heading "What Swan Coach Can Help With", list semantics (ul/li), no onClick, no button element, default cursor.
   - Phase 9.1 tests: 92/92 coach-assistant (+29 new); 134/134 frontend scoped; 1471/1471 backend.
   - Former parser-provider blocker is resolved by Phase 10 below. Next unknown should be found by a fresh local smoke test against current `main`.

7. **P2 - Parser-provider rewrite** ✅ **DONE** (Phase 10, 2026-04-14)
   - `backend/services/workoutLogParserService.mjs` rewritten as Gemini-first with optional OpenAI fallback.
   - Local/dev users with only `GOOGLE_API_KEY`/`GEMINI_API_KEY` can now parse transcripts end-to-end without `OPENAI_API_KEY`.
   - Uses direct fetch to `generativelanguage.googleapis.com` matching the proven `voiceTranscriptionService.mjs` pattern (NOT the `geminiAdapter.mjs` in the provider router — that adapter is purpose-built for workout-draft generation and reusing it would require restructuring into `AiGenerationContext` shape, wider than this slice warranted).
   - Enforces `responseMimeType: 'application/json'` in Gemini generationConfig.
   - Defensive JSON extraction (`extractJson`) handles fenced markdown / leading commentary / nested braces as a safety net.
   - Fallback order: Gemini first → OpenAI fallback ONLY when `OPENAI_API_KEY` exists AND Gemini failed. Inverted from Phase 9, which required OpenAI.
   - **20MB size-limit mismatch aligned**: frontend picker (`useFileAttachment.ts:63`), multer (`workoutLogUploadRoutes.mjs:55`), and Gemini inline-data cap (`voiceTranscriptionService.mjs:16`) are now all 20MB. Previously frontend+multer allowed 50MB and silently failed at the Gemini upload step.
   - New test file: `backend/tests/unit/workoutLogParserService.test.mjs` — 30/30 passing. Covers provider chain routing, JSON extraction edge cases, error paths, output contract preservation, key-resolution priority.
   - Test results: backend full 1501/1501 (+30); frontend coach-assistant 98/98 (+0 net — 3 tests updated from 50MB → 20MB assertions but count unchanged).
   - **Narrow claim:** transcript intake is now locally smoke-testable with a Gemini-only env. This does NOT make transcript intake production-ready — it removes the parser-provider blocker and nothing more. The next real blocker is unknown until Sean reruns the local smoke test against `bc21a4ab` + Phase 10 changes.

8. **P3 - Writer-side default-value fix**
   - Fix `formRating`, `set.rpe`, and `overallIntensity` default-value persistence so charts reflect explicit interaction instead of seeded neutral defaults.

9. **P4 - Optional unofficial PLAUD bridge**
   - Only behind an internal feature flag.
   - Not a production-critical dependency.

10. **Later — Official PLAUD OAuth/webhook integration**

11. **Later — Gemini File Upload API for transcripts > 20MB**
   - Current cap is 20MB (Gemini inline-data limit), enforced at all 3 layers.
   - Real Plaud exports of long sessions can exceed this.
   - Requires swapping `voiceTranscriptionService.mjs` inline-data path for the Gemini File Upload API with two-step upload + reference. Separate slice.
   - Only when public and stable.

---

## Blocked / Deferred

- Official PLAUD existing-account sync is still private beta / in-progress, so it is not a near-term dependency.
- The unofficial PLAUD web/API bridge is useful only as an optional adapter after the Swan-first workflow is stable.
- `CURRENT-TASK.md` remains historical and should not be revived as the live priority board.

---

## PLAUD / Swan Intake Decision

The platform decision is locked:

- Swan is the primary workflow.
- Coach Assistant is the intended primary intake surface.
- PLAUD Desktop is optional.
- Existing-account PLAUD cloud sync is not a production dependency.
- Near-term implementation should assume:
  - direct Swan audio upload
  - pasted transcript text
  - manual PLAUD export upload
- Treat the unofficial PLAUD bridge as a later internal connector, not the foundation.

---

## Latest Verified Commits

- `76a509e54` - fix(ai-workflow): remove non-design Chinese model use from orchestrator
- `c667314c7` - feat(continuity): Phase B closeout — 4-surface end-to-end smoke passed
- `6b320579c` - fix(continuity): keep local scrub identifiers out of git
- `3620e4579` - feat(continuity): add Phase B chunk 1 append bridge
- `f7abe03fb` - fix(phase-19b): retarget movement-screen cluster + wizard silent-prefill bug
- `f14cd0de8` - fix(ai-workflow): consult-gemini.mjs argv parser bug + regression test
- `a9008d600` - docs(phase-18): add canonical surface receipt
- `fde6b28c1` - test(user-dashboard): lock ActivitySection post-type filtering
- `c73197825` - refactor(frontend): prefer const in lint cleanup
- `10d3bb19e` - docs(priorities): mark Phase 19.A complete + Phase 19.B pending movement-screen canonical decision
- `30666aa49` - refactor(backend): prefer const in lint cleanup (rule-42 triage, 34 files, 1677/1677 tests)
- `3fb88a9ed` - fix(phase-19a): retarget live /dashboard/people links + guard test (Codex APPROVE)
- `0f5d8fe4` - fix(workout-logger): hoist loadClientData wrapper to fix TDZ crash on every mount
- `19931c25` - fix(admin-nav): point Clients & Team sidebar to canonical client-management route
- `1c039619` - fix(workout-planner): hoist addExercise above ExerciseRowRenderer to fix TDZ crash
- `8d5ab1aa` - test(progress-detailed): lock writer-default-value read behavior
- `dd5a223c` - test(progress-detailed): lock BodyMeasurement writer chain
- `12634b01` - fix(progress-detailed): restore canonical client analytics truth

---

## Next Claude Prompt Source

Future sessions should start with:

1. `CLAUDE.md`
2. `ACTIVE-INDEX.md`
3. `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`
4. Relevant continuity handoff docs

Use this file as the current source of truth for sequencing the next bug-fix or implementation slice.
