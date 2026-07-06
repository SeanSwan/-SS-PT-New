# EQUIPMENT MICHELIN UPGRADE — REMAINING-SLICES HANDOFF & HOSTILE-REVIEW PROMPT (2026-07-05)

> **For the next AI (or Sean) picking this up.** This is a self-contained handoff: read it and you
> know exactly what shipped, what's left, in what order, how to build each slice safely, and what to
> hostile-review. It lives in the hostile-review folder on purpose — come back, review, fix, finish.
>
> **Source of truth:** `docs/ai-workflow/AI-HANDOFF/EQUIPMENT-SUBSYSTEM-DEEP-AUDIT-2026-07-05.md`
> (full evidence-backed audit — §2 canonical surface receipt, §5/§6 findings, §8 P0–P3 roadmap,
> §10 AI-Village packet, §12 free-triangle ratified verdict). Triangle synthesis (local, gitignored):
> `.ai-workflow/fusion/equipment-audit-triangle-2026-07-05/synthesis.md` — its deltas are folded into §12.

---

## 0. HOW TO PICK THIS UP (read first)

- **Build in an isolated worktree off origin/main, never the shared desktop tree** (it runs 100+
  commits behind with pre-staged files — unsafe to commit from). Pattern used for Slice 1:
  `git worktree add c:/tmp/ss-equipment-sliceN -b claude/equipment-sliceN origin/main`, then junction
  `node_modules` from the main checkout (`New-Item -ItemType Junction`), build, gate, commit to the
  branch, push to `main` only on Sean's go.
- **Re-verify audit line numbers against origin/main before editing** — the audit was authored from a
  stale tree; the structural findings held on origin/main, but always re-confirm the exact lines.
- **Gates every slice:** `npx tsc --noEmit` (0 errors, disclose baseline per Rule 56) · targeted
  `npx vitest run` (TDD: failing regression first where feasible) · `npm run build` before any push ·
  pre-commit secret scan · Rule 42 backend audit if backend files change · Rule 43 css-helper check.
- **Review chain (Rule 46):** Claude builds → Gemini/triangle reviews → Codex hostile review is the
  mandatory gate input → Fable/Opus is final decider. Post a Codex R7 request to
  `.ai-workflow/coordination/review-queue.md`. **Coordinate with Codex** — the scan-review pipeline is
  its fresh work (`codex/equipment-manager-release-20260630`).
- **Every slice closes with:** internal hostile review + fixes (Rule 61), Rule 57 dual-tier summary,
  Rule 60 next-slice line.

---

## 1. STATUS — WHAT SHIPPED

| Slice | Scope | Status |
|---|---|---|
| **Audit** | 3-agent deep audit + self-verified headlines + free-triangle ratify | ✅ shipped (`AI-HANDOFF/EQUIPMENT-SUBSYSTEM-DEEP-AUDIT-2026-07-05.md`) |
| **Slice 1** | Discoverability + stability: 8 silent `catch{}` → real error/empty/loading states (list + detail + inline approval-modal error + clear-on-switch + logging) **AND** de-orphan trainer Equipment nav (covers **P0.1 + P2.1**) | ✅ committed + **deployed to main 2026-07-05**; gates vitest 35/35, tsc 0 (baseline clean), build PASS, secret scan CLEAN. Codex R7 review PENDING (pushed on Sean's direction ahead of the gate — Rule 46 gap recorded). |

**Files Slice 1 touched:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`,
`frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerStellarSidebar.tsx` (+ `.navigation.test.ts`),
new `EquipmentManagerPage.errorStates.test.tsx`.

---

## 2. REMAINING SLICES (in order). Each = one reviewable unit.

> Phase order is **risk-then-value** and was ratified by the triangle. P0 = safety/correctness,
> P1 = the accuracy engine (the marquee value), P2 = reach, P3 = Michelin polish.

### P0 — Backend safety bundle (**RECOMMENDED NEXT = "Slice 2"**)
Do as ONE backend slice, each fix with a regression test. Coordinate commit timing with Codex.
- **P0.2 — Atomic multi-item scan write.** Wrap the per-candidate `EquipmentItem.create` loop +
  `EquipmentExerciseMap.bulkCreate` + `persistEquipmentScanReviewSession` in a `sequelize.transaction`
  (`backend/routes/equipmentRoutes.mjs` ~541-615). Prevents partial-write corruption. *Test:* forced
  mid-loop failure leaves zero rows.
- **P0.3 — Partial unique indexes.** Convert `equipment_items (profileId,name)` and
  `equipment_profiles (trainerId,name)` unique indexes to `WHERE "isActive" = true` (migration).
  Fixes the "can't re-add a rejected/archived item" 409/500. *Test:* reject "Barbell" → re-add succeeds.
  **Data-order note (triangle):** existing soft-deleted duplicate rows may block the new partial index
  build — reconcile/clean before or during the migration.
- **P0.4 — FK → `"Users"`.** ALTER `equipment_profiles_trainerId_fkey` from stale lowercase `users`
  to `"Users"` (migration `…000001.cjs:16` targets the wrong table). Align the model.
- **P0.5 — variationRoutes IDOR.** Add the trainer/admin ownership gate to
  `backend/routes/variationRoutes.mjs:103-106` (copy the correct pattern at `aiChatRoutes.mjs:239`).
  Stops cross-trainer equipment-inventory enumeration. *Test:* trainer B's profileId → 403.

### P1 — The accuracy engine ("solid/valid suggestions") — the marquee work
- **P1.1 — Resolve AI `suggestedExercises` → canonical `Exercise`/`CustomExercise`** on scan/manual-add
  (`equipmentRoutes.mjs:590-599`): populate `customExerciseId`/`isCustomExercise`, flag `needsReview`
  on no-match. **Triangle-mandated:** include a **one-off backfill script** for ALL existing free-text
  `EquipmentExerciseMap` rows (same matcher).
- **P1.2 — candidate generation READS the confirmed `EquipmentExerciseMap`** (today it's write-only —
  `workoutBuilderCandidateService.mjs`). This is the single highest-value integration fix.
- **P1.3 — Equipment as a RANKING signal**, not just a gate (`scoreCandidate`
  `workoutBuilderCandidateService.mjs:150-158`). Dynamic/configurable weight by goal/phase (§12 decision b).
- **P1.4 — AI post-generation equipment validator** — check each Coach-proposed exercise against the
  selected profile (reuse `matchesEquipmentProfile`); turn `aiChatService.mjs`'s soft prompt into a hard check.
- **P1.5 — Unify the exercise universe** — bridge the 81-row hardcoded `variationEngine.mjs`
  `EXERCISE_REGISTRY` onto the 840-row DB loader used by candidate-gen. Removes split-brain.
- **P1.6 — Lower/remove the 0.65 no-confidence auto-promote** (`equipmentScanV2Result.mjs:29-33`);
  route unscored detections to `possibleItems`.
- **P1.7 — Feed the trainer's existing inventory + canonical vocab INTO the scan prompt** (model-side
  dedupe + naming discipline).
- **Fuzzy-match strategy (§12 decision c):** alias table (primary) → embeddings (fallback) → offline
  LLM for backfill + proposing new aliases (human-approved). No real-time LLM matching.

### P2 — Reach
- ~~**P2.1 — de-orphan trainer nav**~~ ✅ **DONE in Slice 1.**
- **P2.2 — Client/user "Train with what you have."** A client-safe **read** endpoint
  (`/api/equipment-profiles/for-me`, own/assigned location) + a "Where are you training today?" location
  chip in client `WorkoutLogger`/`ClientMyWorkoutsPage`. **GATE FIRST:** re-opens what Phase 16.2
  deliberately closed — confirm product intent (grill-me/chromie). §12: **read-only + feature-flagged**
  (read-only ⇒ clients don't upload ⇒ bystander-photo risk stays on the trainer path). Minors amplify —
  ship the trainer consent gate (see P3/privacy) first.
- **P2.3 — Admin stale/empty-location visibility** in the admin equipment view (reuse the stats endpoint)
  — feeds the admin "what needs intervention" loop.
- **P2.4 — Delete dead `TRAINER_DASHBOARD_TABS` / `CLIENT_DASHBOARD_TABS`** (`dashboard-tabs.ts`) — never
  rendered; misleads future agents (Rule 34 approval before deleting).

### P3 — Michelin polish
- **P3.1 — Decompose the >300-line `EquipmentManagerPage.tsx`** (now ~1,875 lines). Extract
  `useEquipmentScanFlow`, `useEquipmentManager`, view components, `equipment.styles.ts`. Do the surgical
  `useEquipmentScanFlow` extraction early if a P1 slice touches the scan flow.
- **P3.2 — Rule-6 token migration** (main page is hardcoded hex) + reconcile off-palette warning/error/
  success colors + add the **Dual-Button Glow**. The newer `EquipmentScanBatchPanel.styles.ts` is the
  correct pattern to copy.
- **P3.3 — Visual equipment cards** (photo thumbnails from the captured `photoUrl`, exercise-count /
  confidence / `needsHumanReview` badges, category grouping, quantity steppers).
- **P3.4 — Unified review tray** (inline approve/reject, keyboard shortcuts, optimistic UI, undo,
  filters/search — the API already supports category/status/pagination).
- **P3.5 — Accessibility:** modal Escape + focus trap + focus return; remove nested interactive elements;
  `role="progressbar"` on the confidence meter; `prefers-reduced-motion`; GPU-safe `scanLine`
  (`transform` not `top`).
- **P3.6 — Progress-loop tie-in:** stamp `equipmentProfileId`/location on logged sessions so charts can
  answer "what can this client progress with at home vs gym."

### Cross-cutting (triangle-mandated, weave into the phases above)
- **Testing:** P0 regression tests (IDOR, atomic write); P1 unit tests (ranking, validator, fuzzy-match)
  + E2E "scan → approve → ranked workout".
- **Observability:** replace silent failures with structured logging **+ alerting** (Sentry/Datadog),
  not only UI states.
- **DB performance:** composite/FK indexes on `equipment_exercise_map` before candidate-gen reads/ranks
  on it at scale.
- **Feature flags:** client access (P2.2) ships flagged + phased, not big-bang.

---

## 3. OPEN DECISIONS (recommended verdicts from §12 — escalate to paid Village only if must-be-right)

Tier-C triggers legitimately fire (multi-tenant IDOR, minors' data via client access, cross-service
exercise-universe change) → a paid AI Village run is justified but needs Sean's per-run permission
(Rule 16), run as **Village → free-triangle ratify → final**.
- **(a) Client access:** re-open **READ-ONLY + feature-flagged**.
- **(b) Ranking weight:** dynamic/configurable by goal/phase; conservative default.
- **(c) Fuzzy-match:** alias table → embeddings → offline LLM (no real-time LLM).
- **(d) OLD `Equipment`/`ExerciseEquipment` family + 81-row registry:** retire via 4-step deprecation
  (migrate → dual-write → remove old writes → drop tables).
- **(e) Privacy:** P0 = trainer consent/ack gate + retention/policy; automated face-detection+blur is a
  P1/P2 feature and a **hard gate before any client-side capture**.

---

## 4. HOSTILE-REVIEW HOOKS (why this doc lives in the hostile-review folder)

Come back and attack these — each is a specific thing to verify/fix/finish:
1. **Slice 1 review (Codex R7, OPEN):** does any error path still swallow/mislead (false-empty)? Is the
   approval-modal inline error + retry-clear correct? Does `itemsLoading` (gated on `items.length===0`)
   flash/regress during batch review? Trainer nav path `/dashboard/trainer/equipment` vs route
   (`routes.tsx:165`).
2. **P0.3 migration:** will the partial-index build fail on pre-existing soft-deleted duplicate rows?
3. **P1.1/P1.2:** confirm the backfill matcher and the read-path don't resurrect rejected mappings or
   point at inactive items.
4. **P2.2:** re-audit the client read endpoint for IDOR + minors'-data exposure the moment it's built.
5. **P3.5:** verify the modal focus-trap doesn't trap the scan-queue live region.

---

## 5. SAFETY / COORDINATION LEDGER
- Slice 1 built + committed in isolated worktree `c:/tmp/ss-equipment-slice1`
  (branch `claude/equipment-slice1-discoverability-stability`), integrated with origin/main, pushed to main.
- Shared desktop tree was NOT used for any code (unsafe — behind + pre-staged).
- Rule 46 gap: Slice 1 deployed ahead of Codex's hostile review on Sean's explicit direction; the R7
  request is open in the review queue — **fold Codex's findings back here when it reviews.**
- Do NOT touch the scan-review pipeline files without coordinating with Codex.
