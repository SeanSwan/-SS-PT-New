# Unified Swan Brain + Workout Planner — Phase Audit Record

**Date:** 2026-07-16
**Branch:** `codex/unified-brain-20260715` (isolated worktree `C:/tmp/sspt-unified-brain-20260715`)
**Scope:** Slices 0–6 of the unified-brain arc — the fix + upgrade for "rearrange gave me a wall of text" and the surface-aware shared Swan brain.
**Reviewers:** Codex-lane session (Slices 0–4), Fable continuation session (Slice 5–6 + reconciliation), recursive hostile review each slice.
**Verdict:** SHIPPED-PENDING-PUSH (batch push at arc close per Rule 70).

## 1. What shipped, slice by slice

| Slice | Content | Commit | Evidence |
|---|---|---|---|
| 0–1 | Canonical Surface Receipt, hypothesis ledger, reproduction boundary (wall-of-text = missing typed rearrange intent + silent parser→chat fallback + no server envelope) | in `86cf5568a` | `UNIFIED-BRAIN-WORKOUT-PLANNER-SLICE-0-1-EVIDENCE-2026-07-15.md` |
| 2 | Server-derived, PII-minimized **context envelope** (`commandContextEnvelope.mjs`): surface, actor, role, plan access, capabilities, authoritative version; fail-closed on forged plan IDs / malformed client IDs | `86cf5568a` | 21 unit tests |
| 3 | **Strict typed outcomes** (`commandOutcomeContract.mjs`, classifier hardening): malformed classifier output and unknown intents become typed non-mutating errors — a mutation request can never silently degrade into chat prose | `86cf5568a` | 27 focused + 72 related tests |
| 4 | **Deterministic surface router** + **capability policy**: direct Planner imperatives bypass the LLM; Command Center stays conversational; forged/stale/cross-surface envelopes fail closed (`planner_` prefix policy) | `86cf5568a` | 119 tests across 18 files |
| 5 | **Sequencing brain** (`workoutPlannerSequenceEngine.ts`): pure NASM-aware ordering (power→compound→isolation→core; Phase 5 contrast pairing; supersets stay together; injection-safe — notes never parsed), applied to builder rows or the selected generated-plan day; compact before→after receipt with one-tap 44px **Undo**; one-level reference-fenced undo that expires honestly after any later edit; typed `planner_undo_last_change` command + deterministic Planner-only undo routing; page coach wiring extracted to `useWorkoutPlannerCoachSurface` (300-line contract) | `ca402d5b3` | backend 110/110; planner dir 65 files / 276 tests; engine/hook/dock RED-first |
| 6 | **Persistence truth lock**: rearranged draft order provably survives the HUMAN-triggered Save (`workoutPlannerSequencePersistence.test.ts` — manual mode `orderInWorkout` restamped, generated mode weeks carried structurally). No new persistence path was built (see §3) | this commit | 2 integration tests |

## 2. Architecture (end-to-end)

```
Trainer (typed or dictated) on /workout-planner
  → useWorkoutPlannerCoachDock.handleSubmit
  → POST /api/ai-command/execute  { message, routeContext.surface }
  → buildCommandContextEnvelope (server-derived; RBAC + plan access + capabilities)
  → deterministicSurfaceCommandRouter (rearrange/undo imperatives: no LLM, confidence 1)
      ↘ otherwise intentClassifier (strict JSON; malformed → typed error, never prose)
  → commandExecutor: registry lookup → capability gate (planner_ ⇒ workout-planner only)
  → FRONTEND_DISPATCH { event: AI_PLANNER_REARRANGE | AI_PLANNER_UNDO }
  → dispatchAIWorkoutEvent → useWorkoutPlannerSequenceEvents
  → workoutPlannerSequenceEngine (pure, deterministic) → local draft mutation
  → receipt (with Undo action) into the shared dock feed
  → trainer clicks Save (human, explicit) → buildPlanData serializes the new order
```

## 3. Reconciliation with CANONICAL-TRAINING-PLAN-FABLE-UPGRADED-2026-07-15 (the "new vision")

- **Outcome 9 alignment:** "AI may draft/suggest; only an explicit authorized action mutates an active plan." The sequencing brain mutates ONLY browser draft state; persistence stays behind the human Save. No AI path writes a saved plan.
- **No competing persistence:** Slice 6 was originally reserved for "saved-plan concurrency and persistence." That is now explicitly OWNED by the `codex/canonical-training-plan-20260715` lane (`workoutPlanRevisionService`, `expectedRevision` → 409, domain mutation boundary, content hash). This arc deliberately did NOT duplicate it. When that lane merges, the Planner's Save path adopts revision fencing there — the unified-brain envelope already carries `entity.version` for that future handshake.
- **Envelope forward-compat:** `commandContextEnvelope` uses `updatedAt` as the version candidate today; the canonical lane's `contentRevision` slots into the same field without contract change.

## 4. Security posture

- **Server-derived context only** — the browser's surface hint is sanitized; capabilities, role, plan access, and version come from server state (defeats forged-envelope mutation attempts; tested with forged/stale/cross-surface cases).
- **Fail-closed gates** — malformed selected-client IDs, cross-plan ID substitution, and non-planner surfaces all deny (`commandCapabilityPolicy`, envelope tests).
- **No prose masquerade** — classifier/parser failures produce typed `action_error` outcomes; `fallbackToChat` is impossible for mutation intents (Slice 3 tests).
- **Prompt-injection resistance** — the sequencing engine classifies from `exerciseType`/`bodyPartCategory`/name only; exercise `notes` are never parsed (locked by test: a note saying "Move me first" does not move it, and is preserved byte-for-byte).
- **Zero PII to the engine** — sequencing is fully local/deterministic; no model call, no client names.
- **Undo cannot destroy newer work** — reference fencing + identity-guarded functional state updates; stale undo returns an honest failure receipt.

## 5. Known limitations / non-goals

- Rearrange/undo phrases are deterministic-router imperatives ("rearrange/reorder/optimize/organize/sequence…", "undo…"). Paraphrases ("flip the order around") fall to the classifier; unknown intents return an honest typed error, not prose. Extending classifier vocabulary is a future slice.
- Undo is one-level by design (matches the receipt UX; deeper history belongs to a future revision-aware planner).
- Saved-plan revision fencing (409 conflicts) intentionally deferred to the canonical-training-plan lane.
- The `AI_PLANNER_GENERATE` event still ignores instruction detail (pre-existing H4 finding) — unchanged in this arc; candidate for the next planner slice.

## 6. Test coverage summary

- Backend: 11 suites / 110 tests green (envelope, outcome contract, capability policy, deterministic router incl. undo, registry lock, executor strict outcomes, classifier strict failure, route dispatch incl. undo end-to-end).
- Frontend: planner directory 65 files / 276 tests green, including new `workoutPlannerSequenceEngine.test.ts` (6), `useWorkoutPlannerSequenceEvents.test.tsx` (6), dock receipt-action test, dispatcher registration tests, and `workoutPlannerSequencePersistence.test.ts` (2).
- Tier-A: ESLint clean on changed files; `tsc --noEmit` slice-clean — full baseline has 2 pre-existing errors in untouched `src/hooks/useBarcodeCamera.ts` (`@zxing/browser` types missing) `[VERIFIED not from this arc]`.
- Full backend suite + browser smoke: recorded in the final push gate (§8 of the closeout chat report).

## 7. Rollback plan

- Frontend/browser behavior: `git revert ca402d5b3` (Slice 5) and the Slice 6 commit — the planner returns to add/swap/remove/update/generate only; no schema, no migration, no flag involved.
- Backend: same reverts remove the undo command + router entry; `86cf5568a` revert removes envelope/outcome/router foundation (only if the whole arc must go).
- No DB change shipped in this arc — rollback is purely git + redeploy.

## 8. Future review hooks

- When `codex/canonical-training-plan-20260715` merges: wire `expectedRevision` from the envelope's `entity.version` into the Planner Save path and re-run `workoutPlannerSequencePersistence.test.ts` against the revision-fenced writer.
- Re-audit `DIRECT_UNDO_IMPERATIVE` if new undo-like commands ship elsewhere (avoid the deterministic router shadowing a future classifier intent).
- Consider promoting Phase-5 contrast ordering to all phases for mixed supersets once Sean rules on agonist/antagonist ordering preferences.
- H4 (generate ignores instruction detail) remains open — highest-value next planner intelligence slice.
- Verify the `@zxing/browser` baseline tsc errors get resolved by an `npm install` or a dependency fix in the nutrition lane.

## 9. Review log

- Round 1 (Slice 5): full-suite run caught `WorkoutPlannerPage.tsx` at 306 lines against the 300-line structural contract → extracted `useWorkoutPlannerCoachSurface`.
- Round 2 (Slice 5): race-hardening — rearrange/undo state writes made functional with identity guards so a same-tick concurrent update can never be clobbered; re-ran suites green.
- Round 3 (Slice 6): persistence lock added; save-path order truth proven at `planDataBuilder.ts:121-135` (manual, `orderInWorkout` restamp) and `:74-87` (generated, structural carry).
