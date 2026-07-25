# Codex Hostile Review Prompt — Swan Coach Hive-Mind

Everything between the `=====` lines is a self-contained copy-paste block.

---

===== COPY EVERYTHING BELOW INTO CODEX =====

You are performing a **hostile review** of work that is **already shipped to `origin/main` and deployed**. Read `CLAUDE.md` first. This is post-ship review: findings are **fixes-forward**, not blockers. Do not revert anything without Sean.

## What shipped

The Swan Coach Hive-Mind program, C0 through C5-core. **Range `c168f4138..d83b1cde9`** (44 commits, which also contains another agent's charts work — see fences).

Swan Coach is the Jarvis layer of a personal-training SaaS: a trainer drives it **by voice, hands busy, on a gym floor, with a client in front of them**. The program's stated catastrophic failure mode is **a write to the wrong client's record** — which was **live in production** on the destructive cancel-session command before C0.5 fixed it.

### Review surface — files I authored

**Backend**
```
backend/services/aiChatService.mjs               ← equipment subject fix + intake-coverage wiring (HIGHEST RISK)
backend/services/ai/intakeCoverage.mjs           ← new: absence markers
backend/services/ai/voiceConfirmationTier.mjs    ← new: 3-tier confirmation contract (DORMANT by design)
backend/services/ai/coachIntakeContextService.mjs ← header only
backend/services/ai/commandRegistry/index.mjs    ← docblock only
backend/eval/intentResolutionScenarios.mjs       ← new: 9 intent scenarios
backend/eval/{evalRunner,evalThresholds,runEval}.mjs ← intent_resolution category wiring
```

**Frontend**
```
frontend/src/utils/aiWorkoutEvents.ts            ← +9 lines at the single dispatch seam
frontend/src/utils/coachEventLog.ts              ← new: append-only intent log
frontend/src/utils/coachMemoryProjection.ts      ← new: memory as projection
frontend/src/utils/coachIntentRecorder.ts        ← new: seam binding + PII redaction
frontend/src/components/WorkoutLogger/offlineQueueStore.ts ← new: honest persistence
frontend/src/components/WorkoutLogger/useOfflineQueue.ts   ← silent-data-loss fix
frontend/src/components/WorkoutLogger/useWorkoutSubmit.ts  ← caller comment only
frontend/src/components/CoachIntentBar/intentBarState.ts   ← new: client-lock logic
```

**Also in range but NOT mine — do not attribute these to me, though flag anything you find:**
- `frontend/src/components/DashBoard/progress-proof/*` — another agent's charts work (SWA-68)
- SWA-64 admin/trainer normalization (`resolveAudienceFromPath.ts`, `AdminStellarSidebar.tsx`, `TrainerWorkoutForgePage.*`, `UniversalDashboardLayout.routes.tsx`, `ViewAsBanner.tsx`, `resolveExitViewAsPath.ts`, `EnhancedClientProgressView.tsx`, `dashboard-tabs.ts`) — authored by a different session; **I pushed it** (commit `4bad575e6`) and that push is item 5 below.

---

## Attack these, in this order — my weakest claims first

### 1. The equipment subject fix — HIGHEST RISK, never run against a real DB
`aiChatService.mjs` had **two** equipment queries, both filtering `WHERE ep."trainerId" = :userId` where `:userId` is the **client** being enriched (`aiChatRoutes.mjs:688-690`), while `trainerId` is the **owning trainer** (`models/EquipmentProfile.mjs:29`; sole creator sets `req.user.id`; unique index on `(trainerId, lower(name))`). Clients own no profiles → **zero rows, always**.

Both now resolve via the client's **active** `client_trainer_assignments`, keeping self-owned so a trainer asking about themselves is unchanged, and both are now `LIMIT 5` profiles / `LIMIT 40` items.

**Attack:**
- Is the subquery **correct SQL** against the real schema? Column casing is camelCase (`"clientId"`, `"trainerId"`) per the model's explicit `NO underscored` comment and two working read paths (`middleware/plaudAuthz.mjs:58-61`, `controllers/plaud/plaudMergeController.mjs:310-313`) — **but I never executed it.**
- **Multiple active trainers:** a client assigned to 2+ trainers now sees all their equipment. Correct, or a leak I rationalized?
- Are the LIMITs right, or did I trade one problem for silently truncated context?
- **Is there a THIRD instance I still missed?** I found the second only on the round-2 sweep. `grep -rn "equipment_profiles" backend/`.

### 2. The dispatch seam — 12+ consumers, timing-sensitive
`aiWorkoutEvents.ts#dispatchWithAcknowledgement` now tracks `acknowledged` separately from `handled`, to distinguish *"nobody listening"* (`unhandled`) from *"effector declined"* (`noop`).

I claim the **public boolean contract is unchanged** — the diff is purely additive (9 insertions, 0 deletions) and `return handled` is untouched. `useCoachCommand.ts:148,192` consume that value and it drives a user-visible receipt.

**Attack:** verify against every consumer — `useBootcampAiEvents`, `useWorkoutPlannerAiEvents`, `useWorkoutPlannerSequenceEvents`, `aiWorkoutEventReducers`, `BootcampCoachDockMount`, `PainChartCoachDockMount`, `useSurfaceCoachDock`. **My seam test used a stubbed DOM** — if a real listener acks asynchronously, or React batching changes ordering, I would not have caught it.

### 3. `recordCoachIntent` runs on EVERY dispatch
It is fail-open (try/catch → null, proven). But it executes synchronously inside the seam for all four `AI_*` families, allocating an object and running a shallow redaction pass each time.

**Attack:** perf on a rapid-fire dictation sequence; re-entrancy if an effector dispatches during its own handler; the ring buffer's `splice` under sustained load.

### 4. Offline queue read-back + PII redaction
`offlineQueueStore.writeQueue` now **verifies by reading back** (absence of a throw is not evidence of persistence — a silently no-op storage throws nothing). `coachIntentRecorder` strips free-text fields (`notes`, `painNote`, …) at record time so the log cannot carry client names.

**Attack:**
- Extra JSON parse on **every** write — acceptable for a queue holding a full session?
- `flush()` rewrite-failure path: can it **double-send**?
- Is my free-text field list complete? What payload field carries a name that I missed?
- I proved redaction is log-only (effectors still get the full note) against a **stubbed** DOM.

### 5. SWA-64 — I pushed it without full verification (my weakest evidence)
Commit `4bad575e6`, 18 files, 1004 insertions, authored by a different session.

`dashboardSupersetInvariant.test.ts` and `AdminStellarSidebar.iconCoverage.test.ts` **could not run locally** — transitive deps, and one reads its own directory via `__dirname` so a staged copy cannot work.

I justified the push on: zero file overlap (none of the 18 files touched on main since the branch base), `resolveAudienceFromPath` **5/5** on the rebased tree, and the branch's prior full-suite result (3116 passed / 1 pre-existing).

**Attack: if you can run those two tests, please do. This is the least-verified thing in the batch.**

### 6. Is C3's dormancy defensible, or is it dead code with a nice comment?
`voiceConfirmationTier.mjs` ships with **zero consumers**, deliberately — wiring it before a voice surface exists would gate commands behind a spoken confirmation nothing can collect. Labeled in-file and tracked as SWA-67.

**Argue the other side.** Should it have been held back entirely?

### 7. Anything I rationalized
I made several judgment calls and wrote reasons for each. **Attack the reasons, not just the code**:
- Stopping the SWA-64 harness chase instead of rebuilding the module graph
- Deferring The Console direction (C5) as "a later slice"
- Shallow rather than recursive payload redaction
- `LIMIT 5` / `LIMIT 40` as the chosen bounds
- Fixing the intake-coverage block ordering so an empty enrichment still returns `''`

---

## Evidence I actually have

- **87 committed assertions executed** (52 backend + 35 frontend), 0 failed.
- **RED→GREEN proven against pre-fix source** via `git show <base>:<path>` for C0.5 and C1.
- **Seam integration** proven against a stubbed DOM (5/5): effector receives the full payload, dispatch return value unchanged.
- Secret scan CLEAN on every commit. `/health` 200 across four deploy windows.

### How to run tests here — you will need this
**`backend/node_modules` and `frontend/node_modules` are EMPTY.** Neither runner installs. Three techniques recover real execution:
1. **Local `vitest` shim** — a minimal `describe`/`it`/`expect` module in gitignored `node_modules/vitest`, so real committed tests run **in place**. *Copying tests to a scratch dir does NOT work — relative imports break.*
2. **`node --experimental-strip-types <file>.ts`** — executes TypeScript directly.
3. **Staged specifier rewrite** — raw Node ESM needs explicit `.ts`; the repo uses extensionless (Vite). Rewrite in a staged copy, never in shipped source.

**The line:** stub to satisfy an **import**, never to fake a **behaviour**. I tried a `zod` stub, saw it make real validators return garbage, and **removed it**.

## Gaps I am disclosing, not hiding

- **No real-DB probe** — the equipment subquery is schema-verified, not executed.
- **No live authenticated browser** — no end-to-end journey exercised.
- **`tsc --noEmit` OOMs at 8GB** (pre-existing).
- Validator eval categories need real `zod` — not run.
- **No release marker exists in this repo**, so I cannot prove which commit is running in production. `/health` returns only `{status, timestamp, server, checks, message}`. Every deploy carries this blind spot.

## Fences

- Everything is on `main`. **Fixes-forward only. No revert without Sean.**
- No production DB mutation, no destructive migration, no force-push, no history rewrite.
- If you fix something, keep the 87 assertions green and add a test for what you fixed.
- Rule 8: IDs and roles only — no client names, no PII, in code, tests, or your report.

## Deliverable

**APPROVE / REVISE / REJECT**, with `file:line` evidence per finding, severity-ranked, most severe first. For each finding state whether it is **live** (affects users now) or **latent** (a hazard someone will trip later) — I found one of each in my own two rounds and the distinction shaped the fix.

Linear: **SWA-65** (program) · SWA-63 (intake) · SWA-64 (audience) · SWA-66 (over-cap splits) · SWA-67 (C3 consumer).

===== COPY EVERYTHING ABOVE INTO CODEX =====
