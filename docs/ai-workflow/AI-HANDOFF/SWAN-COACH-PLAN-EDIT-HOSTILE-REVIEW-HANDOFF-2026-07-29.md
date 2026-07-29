# HANDOFF — Swan Coach `plan_edit`: 40-round Dry-Loop hostile review + finish the master-level referee

**Date:** 2026-07-29 · **Author:** Claude (Opus 4.8) · **For:** the next agent
**Live anchor:** `origin/main` @ `2d2c12c28` (moves fast — re-verify, see §6)
**Board:** [SWA-46](https://linear.app/swanstudios/issue/SWA-46) (High) — the durable queue for the remaining build work

---

## 0. Your job, in one paragraph
Swan Coach can propose field-level edits to a client's saved workout plan; a **deterministic NASM referee** stamps each change; the trainer approves **per item**; only the approved subset applies. It shipped, then got a hostile-review trust fix (this chat). **Your PRIMARY task: run ~40 more Dry-Loop hostile-review rounds on this `plan_edit` subsystem until it's provably dry** (two consecutive rounds that find nothing fixable), fixing real defects you find and flagging Sean-gated ones to SWA-46. **Secondary:** if the subsystem goes dry before 40 rounds, continue the open build slices in §4 (the P1 CES/pain safety gap first). Do NOT re-do what's already verified (§3).

---

## 1. Full-chat context (how we got here)
This was a long multi-workstream session. In order:
1. **PDF white-label workstream** (earlier): client-facing PDFs (plan / session-log / progress-report) white-label by client type (Move Fitness vs SwanStudios); an "Approval Vault" preview-before-download modal was added to all three. Shipped. (Not your concern unless it collides.)
2. **Plan-on-client-home vision**: the client's home now shows a "Program Shelf" (active plan hero + sideways shelf of other plans) → tap → `ClientPlanDetailModal` shows the whole program (weeks/days/exercises, "you are here"). Backend `GET /api/workouts/:userId/plans/:planId` (full plan, IDOR-guarded). "Today's Assignment" card was absorbed into the shelf (anti-clutter). All shipped. (Adjacent; not your target.)
3. **Swan Coach plan editing** ← **YOUR AREA.** Sean's bar (verbatim): *"the brain must be completely smart… a truly scientific approach… I need to trust this brain… Swan Coach should be the smartest person in the room… I should be able to approve per exercise, per tempo, per set, per weight."* The backend "trust core" shipped (`374af5b64`), then other agents hardened the *apply* path (optimistic `contentRevision` lock, active-only gate, audited lifecycle, revision-bound PDF regen).
4. **This chat's hostile-review upgrade** (commits `01a7ee012` + memo `eb3eddf24`): found + fixed a real **trust hole** and added severity + magnitude guardrails (§2). Sean then asked for **40 more hostile rounds** via a fresh agent — that's you.

**Standing doctrine that governs every decision here:**
- **Trainer-indispensability** (Sean 2026-07-11): clients get *read + do*, never *decide*. Only trainer/admin may approve/switch/edit a plan. Client-side Coach is **propose-only**. Never add a client write path.
- **The science lives in frozen code, not the prompt.** Trust does NOT come from the LLM's confidence; it comes from deterministic referee code the proposal must pass through.
- **Swan Coach branding** — never say "AI" in user-facing copy.
- **Rules:** 8 (zero PII to LLMs), 42 (pre-push backend audit), 58 (schema drift), 67 (pair-coding lanes), 61 (hostile self-review), 51 (`[VERIFIED]` needs evidence).

---

## 2. What is LIVE on main (the subsystem you're attacking)

### The flow
`Coach chat → coach_action_proposal block (type "plan_edit") → encrypted proposal row (PENDING) → trainer GETs detail (review token minted, doctrine RECOMPUTED) → trainer POST /approve with approvedItemIds → deterministic apply of the approved subset under an optimistic lock → APPLIED`

### Backend files (attack these)
- **`backend/services/ai/planEditDoctrineService.mjs`** — THE referee (the file the whole trust claim rests on). Exports: `checkPlanEditItem(item, phase)`, `resolveItemPhase(plan, item)`, `stampDoctrineVerdicts(items, phase)` (legacy), `stampDoctrineVerdictsFromPlan(items, plan)` (the trust-fixed one), `PLAN_EDIT_FIELDS`. Verdict shape now: `{ verdict, severity, doctrine }` where verdict ∈ `in_doctrine|out_of_doctrine|unchecked|plan_unavailable` and severity ∈ `ok|info|caution` (reserved: `contraindicated`). Consumes frozen `training-cortex/policy/nasmOptPolicy.mjs` (`NASM_OPT_PHASES`, `resolveOptPhase`, `DEFAULT_OPT_PHASE`).
- **`backend/services/ai/coachPlanEditApprovalService.mjs`** — deterministic apply. `applyPlanEditProposal({proposal, req, models})` (per-item; only `req.body.approvedItemIds` applied), `resolveActiveEditablePlan({WorkoutPlan, payload})` (the shared "which plan is editable" contract; `where {id, userId, status:'active'}`; **plan id is a UUID**, clientId is an integer). Uses `mutateWorkoutPlanRecord` with `expectedRevision` (optimistic lock), dry-run-then-relock (protects a client's completion writes mid-approval), `pdfDerivativeIntent`.
- **`backend/services/ai/coachActionProposalApprovalService.mjs`** — `getCoachActionProposal` (loads the plan for plan_edit + passes to sanitizer; review-token gate), `approveCoachActionProposal` (type dispatcher; plan_edit branch claims PENDING→APPLYING, applies, APPLIED/FAILED, releases to PENDING on validation failure).
- **`backend/services/ai/coachActionProposalDetailService.mjs`** — `sanitizeProposalDetail({row, proposal, planEditPlan})` recomputes verdicts server-side on every read via `stampDoctrineVerdictsFromPlan`; returns `planEdit: { clientId, planId, planVerified, items[] }`.
- **`backend/services/ai/coachActionProposalPromptContract.mjs`** — the LLM's plan_edit block contract (what Coach is told to emit).
- **`backend/services/ai/coachActionProposalClassifier.mjs`** — Zod schema admits `plan_edit`.
- **`backend/routes/coachProposalRoutes.mjs`** — `protect` + `authorize(['admin','trainer'])`; `GET /:id`, `POST /:id/approve`, `/reject`, `/clarification-answer`. Mounted at `/api/coach/proposals`.
- **`backend/migrations/20260712120000-add-plan-edit-proposal-type.cjs`** — widened the `proposal_type` CHECK.
- Untapped safety science available to wire in: `backend/services/training-cortex/policy/nasmCesPolicy.mjs` (`NASM_CES_COMPENSATIONS` → overactive/inhibit muscles, `getCesStrategy`), `training-cortex/ontology/regionMuscleMap.mjs`, `backend/services/workoutBuilderService.mjs` (how the builder assembles `excludedMuscles`/`compensationTypes` from a client's pain), `backend/services/ai/deIdentifier.mjs` (privacy proxy).

### Tests (the current safety net — run + extend, don't duplicate)
`backend/__tests__/coachPlanEdit.test.mjs`, `backend/__tests__/planEditDoctrineTrust.test.mjs`, `backend/tests/unit/coachPlanEditMutationWiring.test.mjs`, `backend/tests/unit/coachPlanEditApprovalConflict.test.mjs`.

### What THIS chat's fix did (`01a7ee012`)
- **Closed the TRUST HOLE:** the referee validated against `payload.phase` — a phase the LLM supplied. A proposal could declare "Phase 1" while loading Phase-4 weights → all `in_doctrine`. Now phase is resolved from the SAVED PLAN (per-week `optPhase` → `plan.nasmPhase` → default), payload.phase ignored. Items carry `phaseUsed`/`phaseSource`/`planVerified`.
- **Severity axis** (ok/info/caution): a valid tempo that merely deviates = info (trainer's call), not visually equal to an out-of-range load = caution.
- **Magnitude guardrail:** an in-range change with an aggressive single-edit jump (>1 set, >10 %1RM — beyond NASM 2-for-2) → caution.
- **plan_unavailable** verdict when the plan can't be loaded; apply path independently refuses a missing plan (defense in depth).

---

## 3. Dry-Loop rounds ALREADY DONE (do NOT repeat these vantages)
The Dry-Loop Law: rounds repeat until one finds nothing fixable, then ONE more confirmation round (two consecutive CLEAN = dry). **Each round must gather NEW evidence from a vantage NOT yet tried** (different cwd/worktree, mode, flag, role, viewport, real caller path). Re-reading code is NOT a round. The round that applied fixes is the next round's primary attack surface. Sean-gated findings → SWA-46, not fixed.

Already run this chat (start your count AFTER these):
- **Pre-commit internal pass** — reasoned hostile checklist; drove the trust-hole fix.
- **Round 1 — broad-domain regression:** the full coach-proposal net (24 files / 123 tests) → green; my shared-service changes broke no other proposal type. CLEAN.
- **Round 2 — adversarial fuzz of the new pure functions** (hostile inputs: lying `payload.phase`, string ids, missing model, non-existent weeks, NaN). Trust-hole lock proven; contract degrades safe. CLEAN.

**Vantages NOT yet tried (candidate attack surfaces for your 40 rounds — pick a fresh one each round):**
1. **The real HTTP caller path** — drive `GET /api/coach/proposals/:id` then `POST /:id/approve` via supertest with a mounted router + mocked DB; assert the referee's phase truly comes from the loaded plan end-to-end (not just the pure fn). *(Round 2 only fuzzed pure fns; the integration path is unattacked.)*
2. **Concurrency / race:** two approvals of the same proposal; a client completion write landing between dry-run and lock; a `contentRevision` bump mid-approve. Does the optimistic lock hold? Does a partial apply ever leave the plan half-written?
3. **The apply's `applyItem` mutation correctness** — malformed planData vintages (legacy `weeklySchedule` vs `weeks[].days` vs `weeks[].sessions`), day matched by index vs dayNumber, exercise matched case-insensitively by name (two exercises same name in a day? the swap-desync bug — §4).
4. **Privacy (Rule 8):** does any plan_edit path send client names/PII to the LLM or store it in `summary_json` (which is CLEAR-TEXT)? Attack the summarize + prompt-context paths.
5. **Doctrine correctness vs real NASM:** are the `NASM_OPT_PHASES` ranges the referee trusts actually correct for all 5 phases (esp. Phase 5 dual-intensity, tempo grammar for phase 4/5 "explosive")? A wrong frozen number = a confidently-wrong referee.
6. **Authorization edges:** a trainer approving another trainer's proposal (ownership); the review-token gate (approve without GETting detail first → 428?); role escalation; a client-role hitting the routes.
7. **Reject/clarification/status-machine:** approving an already-APPLIED/REJECTED/FAILED proposal; rejecting mid-APPLYING; the CHECK constraint rejecting an unknown type.
8. **Fallow/static-intelligence** (`npm run code-health:audit` scoped to changed files) — dead exports, duplicated logic from my refactor.
9. **`git log` since anchor** — did another agent touch these files after `2d2c12c28`? Diff and re-attack their change (it's the newest attack surface).
10. **Frontend (none exists yet)** — if you build the UI (§4), attack it: 44px targets, contraindicated badge unmissable, `planVerified=false` banner, `approvedItemIds` wiring, responsive 320/414.

---

## 4. Open build work (SWA-46) — do after the subsystem is dry, P1 first
- **Slice 1 (P1 SAFETY — the biggest open gap):** the referee returns `unchecked/info` for an `exerciseSwap` — it does NOT screen the swap against the client's pain/compensation profile even though `nasmCesPolicy.mjs` exists. Wire CES + client pain (reuse the builder's `excludedMuscles`/`compensationTypes` assembly) into the referee so a contraindicated swap flags the reserved `contraindicated` severity. Plumb the client pain profile into the detail path alongside the already-loaded plan. **Also fix swap-desync:** `applyItem`'s `exerciseSwap` rewrites only the name string — `exerciseKey`/media/muscle metadata stay pointing at the OLD exercise → internally-incoherent plan. Carry the new exercise's key/identity.
- **Slice 2 (UI):** per-item review in `frontend/src/components/DashBoard/Pages/coach-assistant/CoachActionProposalCard.tsx` for `plan_edit`. Render each `data.planEdit.items[]` (has `field`,`fromValue`,`toValue`,`rationale`,`phaseUsed`,`phaseSource`,`doctrineCheck.{verdict,severity,doctrine}`) as checkbox · from→to · rationale · **severity-colored** badge; surface `planVerified=false` prominently. Pass checked ids as `approvedItemIds` through `approveCoachProposal` (`frontend/src/services/coachProposalService.ts`). Reference `CoachActionProposalSplitPlanPanel.tsx` + `admin-clients/components/CopilotDraftReview.tsx`.
- **Slice 3 (context feed):** feed the de-identified saved plan + pain profile into Coach chat context so items target REAL exercises and Coach avoids proposing contraindicated swaps up front.
- **Open question for Sean:** he asked whether next = the CES/pain safety slice **or** a dedicated rewrite of the Coach system-prompt contract (`coachActionProposalPromptContract.mjs`) itself. Confirm before Slice 3.

---

## 5. Traps that cost real time this session
- **`main` moves FAST** (moved ~19 commits during a single build; jumped days between turns). Always `git rev-list --left-right --count origin/main...HEAD` first; work on a fresh worktree off `origin/main`; **rebase right before push**.
- **Plan ids are UUIDs**, clientId is an integer. `normalizeWorkoutPlanId` is UUID-strict (returns null for a bare number). A malformed id degrades safe (review → `plan_unavailable`; apply → `PLAN_EDIT_IDENTITY_INVALID`). Test fixtures use UUID strings.
- **`coachActionProposalDetailService` + `coachActionProposalApprovalService` are SHARED across ALL proposal types** (onboarding, workout_log, nutrition, split_plan, …). Any change there must run the full ~24-file coach-proposal suite (123 tests) — editing them broke nothing this time only because that suite was run.
- **A node probe that imports the apply service pulls in `database.mjs` and HANGS** trying to connect (no DB password) — it prints results first then times out. For pure-fn fuzzing, import only `planEditDoctrineService.mjs` (no DB) or mock the DB. Run probes from **inside `backend/`** so relative imports resolve.
- **Worktree junctions:** a fresh worktree has no `node_modules` (gitignored). Junction root + `backend/node_modules` (and `frontend/` if UI). Git Bash eats `$var` in inline PowerShell — write a `.ps1` file and run it with `-File`.
- **Backend is `.mjs` (no TS)** — verify with `node --check <file>`, not tsc.
- **Rule 42:** before pushing backend, `git ls-files --others --exclude-standard backend/` AND `git diff --name-only HEAD backend/` — commit anything they surface (untracked/uncommitted backend crashes Render at boot).

---

## 6. Verification bar (Definition of Done for each round / slice)
- Run the plan_edit suite: `cd backend && npx vitest run __tests__/planEditDoctrineTrust.test.mjs __tests__/coachPlanEdit.test.mjs tests/unit/coachPlanEditMutationWiring.test.mjs tests/unit/coachPlanEditApprovalConflict.test.mjs` (must stay green).
- When touching the shared services, run the broad coach net (glob `coachActionProposal|coachProposal|coachPlanEdit|proposal|doctrine`).
- Each Dry-Loop round: gather NEW evidence, log what you attacked + verdict. Fix real defects; flag Sean-gated ones to SWA-46 (linear-todo Mode 1). End the campaign with the round ledger + the literal marker `DRY-LOOP: CLEAN×2 (rounds: N)` (N = total rounds you ran; the last two must be consecutively clean). Do not fabricate the marker.
- Rule 57 dual-tier closeout (plain-English first, then technical). Rule 60 next-slice recommendation. Hermes memo at closeout (`.ai-workflow/hermes-inbox/pending/`, IDs/roles only, secret-scan it). Batch-commit per slice, ONE Sean-gated push at the end.
- Confidence tags (Rule 51): `[VERIFIED]` needs reproducible evidence in-session; no "looks fine."

---

## 7. First moves for you (the next agent)
1. Read `CLAUDE.md`, this doc, `SWA-46`, and `.ai-workflow/coordination/*.lane.md` (Rule 67 — this chat's lane said Coach was "safe for you"; re-check).
2. Fresh worktree off `origin/main`; junction node_modules (root + backend); confirm the plan_edit suite is green as your baseline.
3. `git log --oneline 2d2c12c28..origin/main -- backend/services/ai` — see if anyone touched the surface since; if so, that diff is your Round-1 attack surface.
4. Run Dry-Loop rounds from the §3 candidate vantages, one fresh vantage each, up to ~40 or until `CLEAN×2`, whichever first. Fix real defects; flag Sean-gated to SWA-46.
5. If it goes dry early, build SWA-46 Slice 1 (CES/pain safety) — but ask Sean the §4 open question first.
