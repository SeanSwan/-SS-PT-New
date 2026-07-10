# Progress Command Center — Gap-Audit vs `origin/main` + Re-Scoped DELTA

**Date:** 2026-07-08 · **Author:** Opus 4.8 · **Supersedes the ground-truth of** `PROGRESS-COMMAND-CENTER-ORCHESTRATOR-BRIEF-2026-07-08.md`
**Why this exists:** the orchestrator brief (and its triangle + 2× Fable reviews) was audited against branch `wip/comms-notifications-2026-07-05`, which is **289 commits behind `origin/main`**. The **launch-charter arc (SESSION-AD, shipped to prod main)** already built a large fraction of the plan. This doc corrects the stale facts and re-scopes to the genuine remaining delta. **Audit method:** 2 parallel Explore agents against a clean detached worktree of `origin/main` @ `91781a9d8`, file:line evidence.

---

## 1. Stale-fact corrections (the brief's §2/§4 were audited on a 289-behind branch)

| Brief claimed (stale) | Reality on `origin/main` (verified) |
|---|---|
| Registry = **12** charts; report's "15" is a *fabrication* | **15** — the 12 + `weightTrend`, `bodyFatTrend`, `estOneRm` (`useClientProgressCharts.types.ts:9-25`). The report was right. |
| **No `personal_records` table**; PRs ephemeral / undeclared-property latent bug | **Table shipped** (`models/PersonalRecord.mjs`, migration `20260707010000`), **`UNIQUE(userId, exerciseName, metric)`** [= brief's M12], FK `"Users"`, Brzycki est-1RM detection, **idempotency key** `pr:{user}:{ex}:{metric}:{date}`, **reps-domain guard** (est-1RM only `reps≤15`, skip `weight≤0`, cap 1500) [= M11], called at BOTH write paths. → **D3, M1, M11, M12 are ALREADY DONE.** |
| No chart expand/fullscreen (S4 new) | **`ChartExpandModal` shipped** and wired to all client + admin cards (`progress-proof/ChartExpandModal.tsx`). S4 DONE. |
| No canonical exercise drilldown | `ExerciseTimelineDrilldown.tsx` + `exercise-timeline` endpoint shipped (thin — heaviest set + set-count/day only). PARTIAL. |

**Nuance the brief got partly right:** the `ClientProgress.personalRecords` **ghost-write still exists** (`workoutService.mjs:559-621`, model declares no such column → silently dropped). Main added the real `personal_records` table *alongside* it → a dead dual-write. So brief **M10 is a real, live cleanup.**

---

## 2. DONE / PARTIAL / NOT-STARTED on `origin/main`

**✅ DONE (do NOT rebuild):**
- 15-chart registry incl. weight/body-fat/est-1RM (`estOneRm` Guardian-gated) + `body` lens.
- `personal_records` table + `workoutPrDetectionService` (Brzycki, idempotency key, reps-domain guard) at both write paths → **D3/M1/M11/M12**.
- `ChartExpandModal` (L2) on all client + admin cards → **S4**.
- 6-lens client-side filter; `ProgressChartStudio` per-chart share card; fixed one-tap branded PDF (`ProgressReportPdfButton`).
- Client + admin grids share ONE canonical spine (`CANONICAL_CHART_IDS` + `progressChartLens` + Cockpit/Cube/WarRoom/Observatory/Codex).
- `recovery_completions` + `history_backfill_runs` tables/models; Recovery Board.
- `exercise-timeline` + `chart-est-one-rm` endpoints.

**◐ PARTIAL (exists, below plan depth):**
- **Exercise drilldown** = heaviest-set + set-count/day only; NO per-set list, est-1RM trend, PR markers, or notes → the brief's "Exercise Detail Drawer" is a real upgrade.
- **PR display** = flat card list + est-1RM scatter; NO **PR Ladder** (current/previous/delta/droughts/next-target) → the table exists, the Ladder UI does not.
- **Lens system** exists but fetches **all 15 endpoints on mount** — no lens-lazy / `lens-summary` (**M3** open).
- **Registry unification** covers client+admin only; **the 3 competing paths still coexist** and `WorkoutsTab` **still maps `Other→Core`**; there is **no `ProgressProofRegistry`**.
- **Exercise Codex heatmap** = color-only cells (**M7** open).

**✗ NOT-STARTED (the genuine delta):**
- Single **`ProgressProofRegistry`** unifying all 4 roles + retiring the legacy `ClientProgressCharts`/`ClientAnalyticsPanel` and folding `WorkoutsTab` onto the canonical spine (kills `Other→Core`).
- **`summary-lifetime`** endpoint + **Workout Ledger** with lifetime totals (today: page-scoped only).
- **`plan-adherence`** endpoint + module.
- **`ExerciseClassificationService`** (still ILIKE-CASE) + optional `workout_logs.exerciseId` FK (**M2/D2**).
- **`Users.timezone`** + user-tz day-bucketing (today: all UTC/server-local → streak & calendar boundary bug) (**M6/M13**).
- **PR Ladder** UI, fuller **Exercise Detail Drawer**, **lens-summary**, heatmap a11y.
- New modules: **Volume Load Heatmap**, **Density Calendar**, **Effort Distribution**, **staff Risk Rollups**, interactive **Report Studio**.
- **M10 cleanup:** remove the dead `ClientProgress.personalRecords` ghost-write.

---

## 3. Re-scoped DELTA — what to actually build (priority order)

The original vision holds; ~40-50% already shipped. The real remaining work, ranked by value/risk:

**Tier 1 — the core thesis + truth bugs (highest value, lowest risk):**
- **Δ1 — Path consolidation → one `ProgressProofRegistry`.** Fold `WorkoutsTab` (fix `Other→Core`) + retire legacy `ClientProgressCharts`/`ClientAnalyticsPanel` onto the canonical spine with grep+mount evidence (Rule 34). *This is the brief's original consolidation thesis — still unbuilt and still the biggest coherence win.*
- **Δ2 — Timezone truth.** Add nullable `Users.timezone`; bucket streaks + any calendar by user-tz (DATE rows as-written; timestamp buckets tz-aware). Small, fixes a live gamified-surface trust bug.
- **Δ3 — M10 cleanup.** Delete/redirect the dead `ClientProgress.personalRecords` ghost-write; declare-or-drop the property. Small, real.

**Tier 2 — new-value modules:**
- **Δ4 — Workout Ledger + `summary-lifetime`** (lifetime totals; every-workout ledger reusing per-set richness).
- **Δ5 — Plan-adherence** (day-level via `workoutPlanDayId`; endpoint + module).
- **Δ6 — Taxonomy unification** (`ExerciseClassificationService` catalog-first + ILIKE fallback; optional `exerciseId` FK staged per the brief's ⟐D2/M2 — write-path, feature-flagged, async backfill).

**Tier 3 — depth upgrades on shipped surfaces:**
- **Δ7 — PR Ladder** UI (droughts/next-target) on the existing `personal_records` table.
- **Δ8 — Fuller Exercise Detail Drawer** (per-set, est-1RM trend, PR markers, notes) upgrading the thin `ExerciseTimelineDrilldown`.
- **Δ9 — lens-lazy + `lens-summary`** (perf, M3); **Δ10 — heatmap a11y** (M7).
- **Δ11 — optional new modules:** Volume Load Heatmap, Density Calendar, Effort Distribution, staff Risk Rollups, interactive Report Studio.

**Brief items now MOOT (already shipped):** S4 (expand modal), the PR *table*/Brzycki/idempotency/domain-guard half of S1.5 (D3/M1/M11/M12), the 15-chart deck, est-1RM canonicalization (⟐D8 — already Brzycki via the detection service; verify the one 1RM source), the weight/body-fat/est-1RM modules (10/11 of §7).

**Brief items still LIVE:** Δ1-Δ11 above map to the brief's registry-unification (S1), Ledger (S2), adherence (S7), classification (M2), timezone (M6/M13), PR Ladder (S5 UI), detail drawer (S3 depth), lens-summary (M3), heatmap a11y (M7), rollups (module 12), report studio (S9). Their **design/wireframes/data-contracts in the brief remain valid** — only the "what's new vs done" scoping changed.

---

## 4. Next slice (Rule 60)

**Recommended: Δ1 (path consolidation) as the first real slice** — it's the brief's core thesis, still unbuilt, pure frontend + one registry file, no write-path risk, and it kills the live `Other→Core` misclassification. It must be built **on a clean branch off current `origin/main`** (not the 289-behind branch). Alternatively Δ2 (timezone) or Δ3 (M10 cleanup) are smaller standalone truth-fixes if you want a tiny first win.

**Do NOT** start on `wip/comms-notifications-2026-07-05` — branch off `origin/main` @ `91781a9d8`.
