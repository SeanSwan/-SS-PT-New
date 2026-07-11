# Progress Command Center — DELTA: Codex Handoff & Hostile-Review Packet

**Date:** 2026-07-08 · **From:** Claude Opus 4.8 · **To:** Codex · **Purpose:** hostile-review the 2 shipped commits, then own the backend-heavy remaining delta.

---

## 0. TL;DR — read this first

1. A "Progress Command Center" plan was written, triangle-reviewed, and Fable-locked this session — **but its ground truth was audited on a branch 289 commits behind `origin/main`.** Roughly **40-50% of the plan was already shipped** by the launch-charter arc. **Do NOT build from the brief's §2/§4.** Build from the **gap-audit delta doc** (§2 below).
2. **Two slices already shipped to main.** Hostile-review them (§3).
3. **The remaining delta is yours where it's backend** — I have a hard verification blocker on Windows (§5).

---

## 1. Where every file is

**ON `main` (current):**
- `docs/ai-workflow/blueprints/PROGRESS-COMMAND-CENTER-GAP-AUDIT-DELTA-2026-07-08.md` ← **the operative doc. Build from this.**
- `docs/ai-workflow/AI-HANDOFF/PROGRESS-DELTA-CODEX-HANDOFF-2026-07-08.md` ← this file.

**ON branch `origin/wip/comms-notifications-2026-07-05` @ `7b774b52a`** (NOT on main):
- `docs/ai-workflow/blueprints/PROGRESS-COMMAND-CENTER-ORCHESTRATOR-BRIEF-2026-07-08.md` — the locked brief. Carries a ⚠️ stale-ground-truth banner, plus **§15 (Fable M1-M9)** and **§16 (Fable M10-M18)** — the binding rulings. **Its vision/wireframes/data-contracts are valid; its "what exists today" is NOT.**
- `docs/ai-workflow/AI-HANDOFF/PROGRESS-COMMAND-CENTER-FABLE-RULING-2026-07-08.md` — Fable ruling #1 (M1-M9).
- `docs/ai-workflow/AI-HANDOFF/PROGRESS-COMMAND-CENTER-FABLE-VERIFY-2026-07-08.md` — Fable ruling #2 (M10-M18), incl. the highest-risk de-risk mandate.
- `scripts/consult-fable.mjs` — new: pure Fable Final-Decider review via OpenRouter (`node scripts/consult-fable.mjs --document <path> [--seed <path>]`, ~$0.67).
- `config/MODEL_VERSIONS.md` — now records the **verified** `anthropic/claude-fable-5` OpenRouter slug.

**LOCAL / gitignored (this machine only):**
- `.ai-workflow/fusion/pcc-brief-review-20260708/synthesis.md` — the free-triangle verdict (F1-F11 + C1-C5).
- `.ai-workflow/coordination/review-queue.md` — my REQ for you is at the top (`2026-07-08T02:40`).
- Worktree `C:/tmp/ss-progress-delta-20260708` — branch `claude/progress-delta-20260708`, main-based, has installed frontend deps.

---

## 2. The ground-truth correction (CRITICAL)

The brief claimed 12 charts / no PR table / no drilldown. **Verified against real `origin/main`:**

| Brief said (stale) | Reality on main |
|---|---|
| 12 chart IDs; "15" is fabricated | **15** — `useClientProgressCharts.types.ts:9-25` adds `weightTrend`, `bodyFatTrend`, `estOneRm` |
| No `personal_records` table; PRs ephemeral | **Shipped** — `models/PersonalRecord.mjs`, migration `20260707010000`, `services/workout/workoutPrDetectionService.mjs` (Brzycki + idempotency key `pr:{user}:{ex}:{metric}:{date}` + reps-domain guard) |
| No chart expand modal | **Shipped** — `progress-proof/ChartExpandModal.tsx`, wired to client + admin cards |
| No exercise drilldown | **Shipped** — `ExerciseTimelineDrilldown.tsx` + `exercise-timeline` endpoint |

So Fable's **M1 / M11 / M12** (PR definition, Brzycki domain guard, unique key) were **already satisfied on main**. Only **M10** was genuinely outstanding — and I fixed it (§3).

---

## 3. What I shipped to main — HOSTILE-REVIEW THESE

### Δ1 — `8b61cf84d` `fix(progress): preserve honest 'Other' bucket in WorkoutsTab`
- **Files:** `frontend/src/components/UserDashboard/components/WorkoutsTabTransformers.ts`, `WorkoutsTabData.ts`, new `WorkoutsTabTransformers.test.ts`.
- **What:** `GROUP_TO_CATEGORY` mapped `Other → 'Core'` and defaulted unknowns to `'Core'`, so any exercise without a keyword match was silently rendered as **Core** — a Data-Truth violation on the user-dashboard progress tab. Now preserves `'Other'` + added a `CATEGORY_META.Other` entry (`var(--text-muted,#b8c9db)`) so the bucket actually renders.
- **Verified:** RED→GREEN executed; 9/9 (2 new + 7 existing `WorkoutsTab` suite). Sibling sweep: only `Other→Core` instance in `frontend/src`.
- **Attack asks:** (a) does an `Other` category card render correctly at 320/375/414px? (b) `computeStats` can now report `mostActiveCategory: 'Other'` — is that acceptable UX (I judged it *honest*)? (c) any consumer of `CATEGORY_META`/`MOCK_CATEGORIES` that assumed exactly 8 keys? (d) full frontend suite regression.

### Δ3 — `38fa1d95d` `refactor(progress): remove dead ClientProgress.personalRecords ghost-write (M10)`
- **File:** `backend/services/workoutService.mjs` (+5/−60).
- **What:** `workoutService` wrote AND read a `personalRecords` field on `ClientProgress` that **has no DB column** — Sequelize silently dropped every write, and the read fed an always-falsy `+3` `scoreExercise` bonus. Removed all 6 dead spots: the `metrics.personalRecords` build, the `update()` write, the `updatePersonalRecords` helper **and its default export**, and the dead `scoreExercise` branch. `set.isPR` stays on the `Set` model for the real `personal_records` detector.
- **Verified:** `node --check` clean; 0 residual code refs; no external caller of the removed export (grep, backend-wide); `workoutService` suites **16/16** (`workoutServiceSessions`, `workoutServiceXpLedger`, `workoutRecommendationsLibraryMode`). Rule 42 clean.
- **Attack asks (priority):**
  1. Is `updateWorkoutSession` → `updateClientProgress` on **any live write path**? (Route calls at `workoutSessionRoutes.mjs:292,476` are **commented out** — confirm nothing else invokes it.) If it IS live, did removing the `personalRecords` build change any observable behavior?
  2. Any **other reader** of a `ClientProgress` instance's `.personalRecords` I missed? (I found only `workoutService`.)
  3. I removed a **public export** (`updatePersonalRecords` from `export default`). Confirm zero importers (I grepped `backend/**/*.mjs` → only `workoutService.mjs`).
  4. **Run the FULL backend suite** on your working env — I could not (see §5).

---

## 4. Remaining DELTA — what's left, and who should own it

Full specs + evidence in the gap-audit doc. Ranked:

**Tier 1 (truth/risk):**
- **Δ2 — Timezone truth** *(YOURS — backend)*: no `Users.timezone` column exists; all day-bucketing is UTC/server-local (`workoutService` streak, `DATE_TRUNC('week')`, PR `dateKey` via `toISOString()`). Late-night workouts can fall on the wrong day → trust bug on a gamified surface. Fable **M13**: S0 must *verify/add* nullable `Users.timezone`; DATE rows taken **as written** (no retroactive re-bucketing); TZ governs timestamp-derived buckets (`completedAt`/`startedAt`) + new writes only. **Schema migration + behavior change → wants a review gate.**

**Tier 2 (new value):**
- **Δ4 — `summary-lifetime` endpoint + Workout Ledger** *(backend + frontend)*: `ClientMyWorkoutsPage` stat cards are explicitly **page-scoped** ("On This Page") because no lifetime-totals endpoint exists.
- **Δ5 — `plan-adherence`** *(backend)*: none exists. Day-level via `workout_sessions.workoutPlanId/workoutPlanDayId` (real FKs). Fable **D5**: per-set adherence is *fiction with a percentage* until Δ6 converges — ship day-level only.
- **Δ6 — Taxonomy unification** *(YOURS — highest risk)*: muscle/movement classification is still SQL `ILIKE '%...%'` CASE on `exerciseName` (`chartDataController.mjs:579-647`, `services/analytics/movementPatternSql.mjs`); `workout_logs` has **no `exerciseId` FK**. Fable **M2**: one `ExerciseClassificationService` (catalog-first when `exerciseId` present, ILIKE fallback), consumed by charts #10/#11 + Rolodex + Volume Heatmap. Fable **⟐D2**: stage it — ① nullable column, ② write-time linking, ③ **separate idempotent background backfill**, with a **≥95%-linked exit gate**. **⚠ This hooks the workout-save path — Fable's §16 mandates: failing-test contract suite on the CURRENT save path locked green first, independent feature flags, never-fail wrappers (a link error logs + the save STILL commits), canary + one-flag rollback, backfill never inline.**

**Tier 3 (depth):**
- **Δ7 — PR Ladder** *(mostly frontend; `personal_records` table already exists)*: current/previous/delta/days-between/droughts/next-target. Today PRs render as a flat list + est-1RM scatter.
- **Δ8 — Fuller Exercise Detail Drawer**: `ExerciseTimelineDrilldown` shows only heaviest-set + set-count/day. Needs per-set list, est-1RM trend, PR markers, notes. Fable **M4**: key it by **query-param** (`?name=`, `?exerciseId=` post-backfill), **not** a path segment (free-text names carry `%`/`+`/unicode); every new staff twin explicitly mounts `requireOwnershipOrTrainer`.
- **Δ9 — lens-lazy + `lens-summary`** (Fable **M3**): the grid `Promise.all`s **all 15** endpoints on mount; the lens filter is pure client-side show/hide. Add one `lens-summary` endpoint + fetch only the active lens.
- **Δ10 — Heatmap a11y** (Fable **M7**): `ExerciseCodexMatrix` cells encode magnitude by **color only** (`$status`+`$intensity`, `title` tooltip) → WCAG 1.4.1 fail. Needs a value label + non-color channel.
- **Δ11 — optional:** Volume Load Heatmap, Density Calendar, Effort Distribution, staff Risk Rollups (⚠ Fable **C3**: trainers must be assignment-scoped via `ClientTrainerAssignment.status` — **never** `.isActive`, which is a METHOD), interactive Report Studio (⚠ Fable **M8/F6**: photos excluded from shares by default; **PII-redaction layer mandatory before any LLM call** — "IDs only" is insufficient for free-text `notes`).

**Also still open (Fable §16, not yet done):** M14 (no dead Command-Strip buttons — slice-gate `[Report]`/`[Share]`), M15 (one canonical streak source), M16 (**quote camelCase in raw DDL** — `"sessionId"`, `"exerciseName"`, or Postgres lowercase-folds), M17 (D7 route is an SPA `<Navigate replace>`, **not** an HTTP 301), M18 (no `loggedBy` column — derive `sessionType==='trainer-led' ? trainerId : userId`, export as `loggedByUserId`).

---

## 5. Environment gotchas (cost me real time — save yourself)

- **`npm ci` in `backend/` FAILS on Windows:** `npm error notsup Unsupported platform for dcraw-vendored-linux@9.28.2 (wanted os:linux, current win32)`. It leaves `node_modules` **empty** while still exiting 0 through a pipe. **This is why I could not run the full backend suite.**
  - Workaround I used: junction the main repo's backend deps —
    `cmd /c mklink /J "<worktree>\backend\node_modules" "<mainrepo>\backend\node_modules"`
- **`node_modules/.bin/` is empty in the main repo's frontend** → `npx vitest` fails with "not recognized". Invoke directly: `node node_modules/vitest/vitest.mjs run <file>`.
- **`--reporter=basic` is gone in vitest 4.x** (tries to load a module named `basic`). Use the default reporter.
- A junctioned 289-behind `frontend/node_modules` is **missing** origin/main's newer test deps (`@adobe/css-tools`, `cssstyle`) → jsdom component tests break. A real `npm ci` in `frontend/` works fine.

---

## 6. House rules that bind this work (CLAUDE.md)

styled-components only (no MUI) · **Victory charts only (no Recharts)** · Crystalline Swan palette via `var(--token, #fallback)` · Dual-Button Glow · 44px touch targets · dark-first · WCAG 4.5:1 · **≤300 lines/file** · zero PII to LLMs (IDs only) · no "yoga/meditation" (use "stretching"/"flexibility") · credentials = "26+ years / NASM-protocol", **never** "NASM-certified" · Rule 42 pre-push backend audit · Rule 58 schema-drift vigilance (per-model casing differs; `rest` not `restSeconds`; `fat` not `fats`; `measurementDate` not `date`).

**Superseded — do NOT follow:** `docs/ai-workflow/blueprints/CLIENT-DATA-ENRICHMENT-PROGRESS-GRAPHS-PLAN.md` (prescribes **Recharts** = rule violation, targets the legacy taxonomy, uses wrong column names).

---

## 7. Your ask, in one line

**Hostile-review `8b61cf84d` + `38fa1d95d` (run the full suites), then take Δ2 and Δ6 (backend, where my env is blocked), honoring Fable's §16 save-path de-risk mandate. Report APPROVE / REVISE / REJECT per Rule 46.**
