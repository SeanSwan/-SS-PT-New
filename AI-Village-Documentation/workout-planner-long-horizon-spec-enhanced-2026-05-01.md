# SwanStudios Workout Planner — Long-Horizon Plans, Logger Integration & Client Gating
## Enhanced Spec REV 2 (combined hostile reviews — Claude + Codex)

**Type:** Pre-implementation product spec — distillation of Sean's raw direction into structured, phased work that respects already-shipped infrastructure (Plan Library, W1A) and the Crystalline Swan design discipline.
**Purpose:** Working document for the next code arc. Once approved by Sean, this becomes the brief for receipts/code.
**Status:** REV 2 — corrected for Claude + Codex combined hostile review (2026-05-01).

---

## REV 2 changes (combined hostile-review fixes)

REV 1 (the original) had directionally-correct phasing but contained contract errors that would have sent the implementation into the wrong path. Both Claude (self-pass) and Codex flagged 8 issues; this REV 2 incorporates all of them.

| # | Fix | Source |
|---|---|---|
| F1 | Pick ONE canonical "current plan for logger" endpoint. The real logger uses `/api/workouts/:userId/current` (`WorkoutLogger.tsx:635`, `useCurrentWorkout.ts:74`); spec claimed it used `/api/workout-plans/client/:userId`. Fixed: the logger endpoint stays at `/api/workouts/:userId/current` AND that endpoint is upgraded to return `currentSession` via the same extractor as `workoutPlanRoutes`. | Codex H1 + Claude H1 |
| F2 | Add **explicit canonical `planData` JSONB schema** for long-horizon plans (§3.5 NEW). Current `generatePlan()` returns `mesocycles + weeklySchedule`, NOT the populated `weeks[i].days[j].exercises[]` shape the spec assumed. L1 is a contract definition + populator, not just a populator. | Codex H2 |
| F3 | Define duration math: **1 month = 4-week mesocycle month**, NOT calendar month. 12 months = 48 weeks. 3x/week × 48 = 144 sessions. PDF/UI sectioning matches mesocycle months for periodization clarity. | Codex H3 + Claude H1 |
| F4 | L4 logger completion path: WorkoutLogger submits to `/api/workout-forms` via `dailyWorkoutFormService.submitWorkoutForm()` — NOT `/api/workout-logs`. L4 must specify atomic submit + advance OR ordered two-call with rollback. | Codex H4 |
| F5 | L4 has a hard dependency on L1's contract (currentSession + populated planData). State explicitly. L4 ships AFTER L1 (already in §5 order, just lacked the dependency callout). | Codex H5 + Claude H4 |
| F6 | PDF phase L3 has explicit asset/licensing prerequisite checklist before code: exact logo paths, MF approval, fallback behavior, library decision (Puppeteer vs pdfkit on Render). | Codex H6 + Claude H6 |
| F7 | Add round-trip schema tests: planData survives Plan Library load + `/api/workouts/:userId/current` + WorkoutLogger prefill + PDF export with same structure. | Codex F7 |
| F8 | §3 G3 made-up data sources removed. Replaced with `[VERIFY-PRE-CODE]` placeholders; receipt phase audits `clientIntelligenceService.getClientContext()` for actual returned fields. | Claude H5 |
| F9 | §0 Trainer/Admin "default access" reframed: trainer access is gated by EXISTING assignment check; admin bypasses; client access is additionally gated by `canGenerateWorkoutPlans`. | Claude H2 |
| F10 | §6 PDF light theme variant of Crystalline Swan flagged as a Phase L3 PREREQUISITE design pass (no documented light variant exists today). | Claude H3 |
| F11 | New §4.6 Backwards-compat audit: existing pre-L1 saved plans without populated days; existing logger users mid-flight; data-shape compat. | Claude H7 |
| F12 | §4 L5 explicit gate ordering: client-self-bypass → assignment check → permission flag check. Self-supervised clients (no assigned trainer) need clear handling. | Claude H8 + Codex (implicit) |
| F13 | §6 PDF cert chips on cover page → marked `[VERIFY]` (User schema may not have cert data). | Claude H10 |
| F14 | §7 risk register additions: legacy logger UX collision; client expectation on 12-month "is this all the work my trainer is doing for me?"; equipment mismatch with actual training environment; pain context drift over 12 months. | Claude H11 |
| F15 | §10 PDF UX review: use Gemini direct consult, not AI Village (Phase 2C still degraded from Gemini quota 429). | Claude H13 |
| F16 | Phase estimates marked `[ESTIMATE]` to set expectation that they're rough. | Claude H9 |

---

## 0. Executive Summary (REV 2)

The Workout Planner needs to evolve from "single-day workout generator" into a **full periodization platform** with:

1. **Long-horizon plan generation** — 1 day, 1 week, 1 month, 3 months, 6 months, 9 months, 12 months. **1 month = 4-week mesocycle month** (so 12 months = 48 weeks; 3 sessions/week × 48 weeks = 144 sessions). Each day is **pre-populated with NASM-aligned exercises** (not empty stubs).
2. **Drill-down navigation** — click any day in any week of any month → see full workout (sets/reps/tempo/rest/intensity per exercise) and edit it.
3. **Branded PDF export** — month → week → day, with Swan Studios + Move Fitness logos, professional layout.
4. **WorkoutLogger ↔ Plan binding via `/api/workouts/:userId/current`** — the existing logger endpoint, upgraded to return `currentSession`. Logger pre-fills exercises from currentSession; trainer/client only records actuals (reps, weight, tempo, form, notes).
5. **Trainer access** = restricted to assigned clients (existing); **Admin** = bypass; **Client access** = additionally gated by per-client `canGenerateWorkoutPlans` flag.
6. **Polish gaps**: desktop Rolodex text density, comprehensive AI Recommendations (data-driven not generic), week-grouped weekly schedule view.

This spec preserves the **Plan Library slice** (Active Plan Semantics) — long-horizon plans are saved as Plan Library rows, the active-plan invariant continues to hold.

---

## 1. Existing infra Sean's spec must build ON (do NOT redo)

| Component | Status | File:line evidence |
|---|---|---|
| `WorkoutPlan` model with `planData` JSONB | Live | `backend/models/WorkoutPlan.mjs:124-130` |
| `generateWorkout()` (single workout, goal+phase steering) | Live (commit `42566ccc9`) | `backend/services/workoutBuilderService.mjs:332` |
| `generatePlan()` (multi-week periodized plan — **returns `mesocycles + weeklySchedule`, NOT populated days yet**) | Live (incomplete contract) | `backend/services/workoutBuilderService.mjs:~668` |
| Plan Library: `PUT /:id/activate`, `POST /:id/duplicate` | Live (commit `f8d841e75`) | `backend/routes/workoutPlanRoutes.mjs` |
| Partial unique index "exactly one active plan per client" | Live (migration `20260501180931`) | DB-level invariant enforced |
| `SavedPlanCard` with stopPropagation matrix | Live | `frontend/.../admin-workout-planner/SavedPlanCard.tsx` |
| W1A safety bundle: stable skeleton, isDirty, sanitized errors, panel boundary | Live (commit `8172f7777`) | `WorkoutPlannerPage.tsx` |
| `clientIntelligenceService.getClientContext()` | Live | reads pain entries, equipment, baseline, prior workouts, goals, measurements |
| **WorkoutLogger reads `/api/workouts/:userId/current`** (NOT `/api/workout-plans/client/:userId`) | Live | `WorkoutLogger.tsx:635`, `useCurrentWorkout.ts:74`, served by `clientWorkoutRoutes.mjs:152` |
| WorkoutLogger submits via `submitWorkoutForm()` to `POST /api/workout-forms` | Live | `frontend/src/services/nasmApiService.ts` (verified — `nasmApiService.submitWorkoutForm.test.ts` is the test sibling) |
| `extractCurrentSession(plan)` helper | Live | `backend/routes/workoutPlanRoutes.mjs:114` (used inside `GET /client/:userId`); MUST be reused inside `clientWorkoutRoutes.mjs` `GET /:userId/current` per F1 |

**Locked decisions (do not relitigate):**
- `planData` is canonical JSONB. No normalized child tables.
- One active plan per client is a DB-level invariant.
- No Material-UI. styled-components + token+fallback (rule 6).
- Crystalline Swan palette only. Galaxy-Swan retired.
- Victory only for charts (rule 10). 44px touch targets (rule 2). 4.5:1 contrast (rule 7). Zero PII to LLMs (rule 8).
- Plan Library remains the saved-plan shell.

---

## 2. The product flows (REV 2 — endpoint corrected)

### Flow A — Trainer creates long-horizon plan for new client

1. Trainer selects client, picks **Plan Duration** (1 day | 1 week | 1 month=4w | 3 months=12w | 6 months=24w | 9 months=36w | 12 months=48w).
2. Trainer picks **Sessions per Week** (1-5).
3. Trainer picks **Primary Goal** + optional **Starting OPT Phase**.
4. Click "Generate Plan."
5. Backend produces **fully-populated periodized plan per the §3.5 canonical schema** — every session has exercise list, mesocycle structure with deload weeks.
6. Trainer reviews in navigable view (Month tabs → Week tabs → Day cards). Click day → detail panel; edit inline.
7. Trainer clicks one of the existing Plan Library save buttons (Save Draft / Save & Make Current / Update Plan / Update & Make Current / Save as Copy — already shipped in `f8d841e75`).
8. Optional "Export PDF" → branded PDF (see §6).

### Flow B — Trainer creates single-day workout (existing flow preserved)

Existing single-day generation (`/api/workout-builder/generate`) stays. Saves as `status='draft'` Plan Library row.

### Flow C — Daily trainer/client workflow (logger) — REV 2 corrected endpoint

1. Logger opens for client X.
2. Logger reads **`GET /api/workouts/:userId/current`** (NOT `/api/workout-plans/client/:userId`).
3. **Endpoint contract upgrade required for L1/L4**: response body MUST include `plan` and `currentSession` (extracted via `extractCurrentSession()`). Today the endpoint returns `plan.days` but not `currentSession`. **L1 includes the upgrade to clientWorkoutRoutes.mjs.**
4. Logger pre-populates form: one row per exercise from `currentSession.exercises`, target sets/reps/tempo/rest/intensity prefilled, actuals blank.
5. Trainer/client fills actuals.
6. Click "Complete Session" → frontend calls `dailyWorkoutFormService.submitWorkoutForm()` → `POST /api/workout-forms`. **L4 contract decision needed**: see §4 L4.

### Flow D — Client self-service (NEW, gated)

1. Admin opens client settings for client X.
2. Admin toggles **"Allow client to generate workout plans"** → ON.
3. Client logs in, sees Workout Planner tab on their dashboard.
4. Client can generate plans for themselves but is **constrained to their own user id**.
5. Admin toggle OFF → tab disappears.
6. **Self-supervised clients** (no assigned trainer): allowed if `canGenerateWorkoutPlans=true` AND `clientId === user.id`. Backend gate-ordering: self-bypass → assignment check → permission flag check.

---

## 3. Gap analysis (REV 2)

### G1 — Long-horizon `generatePlan()` does NOT populate days with exercises

**Evidence:** Sean's screenshot — "Click exercises in the Rolodex to populate this day." Backend `generatePlan` returns `mesocycles + weeklySchedule` describing parameters per phase, **not exercise selections per day**.

**Fix scope:** REV 2 — add **canonical `planData` schema** (§3.5) AND extend `generatePlan` to populate per the schema. Reuses existing `selectExercises` + `applyOPTParams` from single-workout flow but emits the new shape.

**Risk:** registry-of-840 may not provide enough exercises for 144 sessions in a category × phase × equipment combination without repetition. See G10 rotation rules.

### G2 — UI has Day 1/2/3 but no Week context

**Fix scope:** restructure WeeklySchedule view: Month tabs → Week tabs → Day cards. Click day → DayDetailPanel.

### G3 — AI Recommendations bullet-tier (vague placeholders)

**Fix scope:** populate from `clientIntelligenceService.getClientContext()`. **`[VERIFY-PRE-CODE]` step in L1 receipt: audit what fields the service actually returns** before drafting recommendation copy. Possible categories (subject to verification): pain-aware, equipment-aware, baseline-aware, goal-aware, progression-aware. Each recommendation cites its data source.

### G4 — PDF export does not exist

**Fix scope:** new endpoint `GET /api/workout-plans/:id/export-pdf`. **Library decision deferred to L3 receipt**: Puppeteer (visual fidelity, but ~250MB deploy size) vs pdfkit (lighter, programmatic, no headless browser). Verify Render's accepted limits before committing.

### G5 — Rolodex text density on desktop

**Fix scope:** denser rows on ≥1024px viewport. Don't break tablet/mobile.

### G6 — WorkoutLogger does not pre-populate from active plan

**Evidence:** Logger UX is currently "blank slate, type everything."

**Fix scope:** L4 — Logger fetches `/api/workouts/:userId/current` (already does) → reads `currentSession` (after L1 upgrades the endpoint to include it) → renders pre-populated form. Trainer/client fills actuals. Submit via `dailyWorkoutFormService.submitWorkoutForm()` → `POST /api/workout-forms` (existing path).

### G7 — Client access gate doesn't exist

**Fix scope:** new column `canGenerateWorkoutPlans BOOLEAN DEFAULT false` on `users` table. Admin client-settings UI toggle. Backend gate (3-step ordering): self-bypass → assignment check → permission flag check.

### G8 — Move Fitness branding not yet wired

**Fix scope:** L3 prerequisite — verify exact logo asset paths, MF approval, fallback behavior. Logos served from backend-accessible path (`backend/public/assets/`?) for server-side PDF generation.

### G9 — Plan duration UI label inconsistent with 4-week-month math

**Evidence:** `WorkoutPlannerTypes.ts:120` declares `PlanDuration = ... | '52'` and `WorkoutPlannerTypes.ts:133` labels `'52'` as `"12 Months (52 weeks)"`. Per REV 2 §0 + F3, 12 months = 48 weeks (4-week mesocycle months), not 52.

**Fix scope (L2, NOT L1):**
- Replace `'52'` with `'48'` in the PlanDuration type.
- Relabel "12 Months (52 weeks)" → "12 Months (48 weeks)".
- Backend (L1) accepts whatever durationWeeks comes in (existing `Math.min(52, ...)` clamp stays — no L1 enforcement of dropdown values; the label-vs-number alignment is purely a frontend correction).

### G10 — Backend exercise rotation across long horizon

**Fix scope:** apply `recentlyUsedExercises` constraint as a SLIDING WINDOW across ALL prior sessions in the generated horizon (not just immediate prior). Default window: 7 sessions. NASM-OPT-PROTOCOL.md may have specific guidance — verify in receipt.

---

## 3.5 — Canonical `planData` JSONB schema for long-horizon plans (NEW — F2)

This is the **contract** L1 must produce. All consumers (Plan Library load, `/api/workouts/:userId/current`, WorkoutLogger prefill, PDF export) read this shape.

```ts
interface LongHorizonPlanData {
  // Top-level metadata
  goal: PlanGoal;                           // 'general_fitness' | 'hypertrophy' | ...
  category?: WorkoutCategory;               // optional weighting
  durationWeeks: number;                    // 1, 4, 12, 24, 36, 48
  sessionsPerWeek: number;                  // 1-5
  startingPhase: 1 | 2 | 3 | 4 | 5;

  // Mesocycle metadata (preserved from existing generatePlan output)
  mesocycles: Array<{
    block: number;                          // 1, 2, 3, ...
    weekStart: number;                      // 1, 5, 9, ...
    weekEnd: number;                        // 4, 8, 12, ...
    nasmPhase: 1 | 2 | 3 | 4 | 5;
    phaseName: string;                      // 'Stabilization Endurance', etc.
    params: {
      sets: string;                         // '2-4'
      reps: string;                         // '12-20'
      tempo: string;                        // '4-2-1'
      rest: string;                         // '0-90s'
      intensity: string;                    // '50-70%'
    };
    overloadStrategy: string;
    deloadWeek?: number;                    // optional, e.g. 4 means "deload at week 4 of this block"
  }>;

  // Per-week → per-day → per-exercise (NEW in REV 2 — what L1 must produce)
  weeks: Array<{
    weekNumber: number;                     // 1..durationWeeks (absolute, not within-month)
    monthNumber: number;                    // 1..ceil(durationWeeks/4)  — 4-week mesocycle month
    weekInMonth: number;                    // 1..4 (week within the month)
    mesocycleBlock: number;                 // which mesocycle block this week falls into
    isDeloadWeek: boolean;                  // true if this is the deload week of its block
    days: Array<{
      dayNumber: number;                    // 1..sessionsPerWeek (per-week ordinal)
      dayInPlan: number;                    // 1..(durationWeeks * sessionsPerWeek)  — absolute session number
      name: string;                         // 'Full Body Day 1', 'Lower', etc.
      focus: string;                        // 'Full Body' | 'Chest+Back' | 'Lower' etc.
      dayType: 'training' | 'recovery' | 'deload';
      optPhase: string;                     // 'stabilization_endurance', etc.
      exercises: Array<{
        exerciseId: string;                 // canonical exercise key from registry
        exerciseName: string;
        orderInWorkout: number;             // 1-based
        sets: number;                       // resolved from mesocycle params
        reps: string;                       // '12-20' (resolved)
        setScheme: string;                  // '3x12-20'
        repGoal: string;
        restPeriod: number;                 // seconds
        tempo: string;                      // '4-2-1'
        intensityGuideline: string;         // '60% 1RM' | 'RPE 7' etc.
        notes: string;                      // trainer/AI notes
        source: 'auto-populated' | 'trainer-edited' | 'imported';
        reason?: string;                    // why this exercise was chosen (for AI Recommendations panel)
      }>;
    }>;
  }>;

  // Auto-populated AI recommendations.
  // L1 receipt REV 2 (Codex C3): preserved as string[] for frontend compat
  // (current type is recommendations: string[] in WorkoutPlannerTypes.ts:106).
  // Source-citation metadata moves to a NEW additive field below.
  recommendations: string[];                // rendered text for UI

  // NEW additive field — source-aware recommendation details
  recommendationDetails: Array<{
    type: 'pain' | 'equipment' | 'baseline' | 'goal' | 'progression';
    text: string;                            // matches recommendations[i] for round-trip
    sourceCitation: string;                  // SCHEMA-PATH like "client.painEntries[0].bodyPart" (NOT actual data — rule 8)
  }>;

  // Trainer-applied edits log (audit trail; appended on each save)
  edits: Array<{
    timestamp: string;                      // ISO
    by: number;                             // user id of the editor
    change: 'swap-exercise' | 'adjust-params' | 'add-note' | 'delete-day' | 'reorder';
    weekNumber: number;
    dayNumber: number;
    diff: Record<string, unknown>;          // shape-specific
  }>;
}
```

### Contract round-trip tests required (F7)

L1 acceptance includes:

- **R1**: `generatePlan(opts)` → returns `LongHorizonPlanData` matching the schema above.
- **R2**: Save a generated plan via `POST /api/workout-plans` (`Save Draft` mode) → row persists, `planData` round-trips byte-for-byte.
- **R3**: Load via `Plan Library` card → builder renders all weeks/days/exercises.
- **R4**: Activate plan → `GET /api/workouts/:userId/current` returns `currentSession` extracted from `weeks[currentWeek-1].days[currentDay-1]`.
- **R5**: WorkoutLogger reads `currentSession.exercises` and renders one row per exercise.
- **R6**: PDF export (L3) reads the same shape and produces a faithful printout.

If any consumer demands a field not in this schema, ADD IT IN L1 — don't paper over with adapters.

---

## 4. Phased execution plan (REV 2)

### Phase L1 — Schema + auto-populated long-horizon plan (BACKEND-FIRST, [ESTIMATE] M-L)

**Scope:**
1. Define + lock the `LongHorizonPlanData` schema (§3.5).
2. Extend `generatePlan` to emit the new shape with populated `weeks[i].days[j].exercises[]`.
3. Apply rotation rules across the full horizon (sliding window, default 7 sessions).
4. Pass `clientIntelligenceService.getClientContext()` outputs into per-day exercise selection (pain/equipment/level constraints).
5. Generate `recommendations[]` array with cited sources.
6. **Upgrade `clientWorkoutRoutes.mjs:152` to also return `currentSession`** via the existing `extractCurrentSession()` helper from `workoutPlanRoutes.mjs:114`. This keeps logger endpoint canonical AND fixes the F1 mismatch.
7. Verify duration math: 12 months = 48 weeks (4-week mesocycle months), 3x/week = 144 sessions.

**Tests:** R1-R6 round-trip suite, plus:
- 12-month plan returns 144 sessions with exercises populated.
- No exercise repeats within 7 sessions.
- All exercises respect equipment + pain constraints from context.
- All OPT phases hit at appropriate weeks.
- `/api/workouts/:userId/current` and `/api/workout-plans/client/:userId` BOTH return the same active plan and matching cursor session.

**Smoke:** trainer generates 6-month plan → all 72 days have exercises; week 1 day 1 differs from week 1 day 3.

### Phase L4 — WorkoutLogger ↔ Active Plan binding (FRONTEND + INTEGRATION, [ESTIMATE] M)

**Hard dependency:** L1 must land first (currentSession + populated planData are the contract).

**Scope:**
1. WorkoutLogger reads `currentSession.exercises` from `/api/workouts/:userId/current`.
2. Logger renders one form row per planned exercise; trainer fills actuals only.
3. **"Complete Session" submit path** — see decision below.
4. "Substitute Day" affordance for when trainer/client deviates from plan.

**Submit-path decision (F4):** WorkoutLogger today submits to `POST /api/workout-forms` via `dailyWorkoutFormService.submitWorkoutForm()`. The plan cursor advance is `PUT /api/workout-plans/:id/advance`. **L4 receipt must specify ONE of:**
- **Option A (preferred): atomic backend endpoint** — new endpoint `POST /api/workout-forms/with-advance` that does both inside a transaction. Avoids partial-failure desync.
- **Option B: ordered two-call** — submit form first; on success call advance. Failure handling: if advance fails after successful submit, surface a "Plan cursor stuck" error and provide a manual-advance button for the trainer.

L4 receipt picks one. Both have tests.

**Tests:**
- Logger pre-populates correctly from L1-shape currentSession.
- Submit flow records actuals.
- Plan cursor advances on completion.
- Submit-success-but-advance-fail edge case has surfaced UX (Option B) or doesn't happen (Option A).
- Substitute-day flow doesn't corrupt plan cursor.

### Phase L2 — Long-horizon view UI + Rolodex desktop density + richer AI Recs (FRONTEND, [ESTIMATE] L)

**Hard dependency:** L1 (data shape) + L4 (logger pattern reused for day-detail edit).

**Scope:** G2, G3, G5, G9. New components extracted from `WorkoutPlannerPage.tsx` (which is already at 1300+ lines): `LongHorizonPlanView.tsx`, `MonthTabsRow.tsx`, `WeekTabsRow.tsx`, `DayDetailPanel.tsx`. Routes through `swan-design-router` (rule 40) for the new components.

### Phase L5 — Client access gate + Self-service (BACKEND + FRONTEND, [ESTIMATE] M)

**Scope:** G7. Migration adds `canGenerateWorkoutPlans` column. Admin client-settings UI toggle. Backend gate ordering:

```
1. role === 'client' && parseInt(clientId) === user.id  → SELF BYPASS (allowed)
2. role === 'admin'                                       → ADMIN BYPASS (allowed)
3. role === 'trainer' && assertAssignmentOrAdmin(...)     → ASSIGNMENT (existing)
4. role === 'client' && !user.canGenerateWorkoutPlans     → 403 GATE
5. fall-through                                            → 403
```

### Phase L3 — Branded PDF export (BACKEND + ASSETS, [ESTIMATE] L)

**Hard prerequisites (must clear before code):**
- [ ] Exact Swan Studios logo asset path (`backend/public/assets/...?` or R2 URL?)
- [ ] Exact Move Fitness logo asset path
- [ ] **Move Fitness has approved their logo on PDFs sent to MF-tier clients** (Sean to confirm — non-engineering blocker)
- [ ] Fallback: if logo asset is missing or fails to load, PDF still generates with placeholder + log warning
- [ ] Library decision: Puppeteer (visual fidelity, ~250MB deploy) or pdfkit (lighter, programmatic) — verify Render deploy-size limits before committing
- [ ] Light theme variant of Crystalline Swan: needs design pass (Gemini direct consult, NOT AI Village — Phase 2C still degraded). Receipt must include the print-safe palette.

**Scope:** G4, G8. New endpoint `GET /api/workout-plans/:id/export-pdf` → returns `application/pdf`. PDF reads §3.5 schema directly.

### Phase L6 — Backwards-compat audit (NEW — F11, runs alongside L2)

**Scope:**
- Audit existing `WorkoutPlan` rows in production for plans without populated `weeks[i].days[j].exercises[]` (legacy single-day saves from before L1).
- Decide UI behavior: show legacy plans with "View as single day" affordance; OR auto-promote on next-edit; OR mark as deprecated.
- Audit current logger users — any users mid-flight with the blank-slate logger UX before L4 lands? Communicate change.

---

## 5. Ordering rationale (REV 2 — matches Codex recommended order)

**L1 → L4 → L2 → L5 → L3.**

- **L1** is foundational — defines the schema everything else reads from. Without populated days, L2 has nothing to render and L3 has nothing to format.
- **L4** depends on L1 (currentSession contract). Ships next because daily trainer workflow benefit is high with minimal new UI.
- **L2** is the big design slice. Deferred so it can be designed AGAINST the live L1 contract, not against speculation.
- **L5** parallel-able with L2 — different files. Can be admin's first "wow, my client uses the app now" moment.
- **L3** last — polish on top of working data + UI.

L6 (backwards-compat audit) runs as a parallel side-quest with L2 since it's a data audit + small UI affordance, no schema work.

---

## 6. PDF spec (referenced from G4 + L3 — REV 2 with prerequisites)

### Light theme variant of Crystalline Swan (NEW prerequisite — F10)

CLAUDE.md mandates dark-first design (rule 3). There is **no documented light variant**. Before L3 code:

- Gemini direct consult (not AI Village) drafts the print-safe light palette.
- Cover page suggested: white bg, Midnight Sapphire `#002060` body text, Gilded Fern `#C6A84B` accents, Royal Depth `#003080` section dividers — but Gemini's call.
- Output saved to `docs/ai-workflow/references/CRYSTALLINE-SWAN-PRINT-PALETTE.md`.

### Cover page

- Center top: Swan Studios logo (full color)
- Below logo, smaller: Move Fitness logo IF client is MF-tier
- Hero text: "{Client First Name}'s {Plan Duration} Periodized Training Plan"
- Subhead: "{Plan Goal} — Phases {N}→{M} — {Start Date} to {End Date}"
- Trainer signature line: "Designed by: {Trainer Name}" `[VERIFY: cert chips data source]`
- Quick stats card: total sessions, sessions/week, deload weeks, primary movement focus
- AI Recommendations summary block (3-5 lines from §3.5 `recommendations[]`)

### Body — month sections (4-week mesocycle months)

Each month gets a divider page: "Month {N}: {Phase Name}". Per-month overview block. Per-week sections. Per-day card:
- Header: "Day {N}: {Day Theme}"
- Table: Exercise | Sets | Reps | Tempo | Rest | Intensity | Notes | Actuals (blank for trainer to fill)
- Footer line: trainer notes + form-rating space

### PDF dual-purpose mode

- **Template mode** (default): Actuals column blank.
- **History mode** (NEW: `?mode=history`): Actuals column auto-fills from `WorkoutForm` records keyed by `(planId, weekNumber, dayNumber)`. Useful for "send client their completed-month report."

### Branding & polish

- Typography: Plus Jakarta Sans (headings), Fira Code (data columns), Cormorant Garamond Italic (cover-page tagline).
- Page footer: "{Client Name} — {Plan ID short — first 8 chars of UUID} — Page {N} of {Total} — Generated {Date}"
- No emoji. No animations.

---

## 7. Risk register (REV 2 — added F14 + Codex risks)

| Risk | Severity | Mitigation |
|---|---|---|
| L1: 12-month plan = 144 sessions = registry-rotation pressure | M | 7-session sliding window; bodyweight-fallback; trainer can manually swap |
| L1: equipment-constrained clients run out in some categories | M | Service falls back to bodyweight alternates; receipt audits coverage |
| L1: existing AI-gen flows (`workoutPlanPersistence.mjs`, `workoutService.mjs`) still default `status='active'` and now hit 23505 if client has existing active | M | Defer to "AI-gen sibling-deactivate" hardening slice (separate from L1-L5) |
| L1: pain context drift over 12 months — initial plan becomes stale | M | UI affordance: "Re-generate from updated context" button on plan view; pulls latest pain entries |
| L2: WorkoutPlannerPage already 1300+ lines | M | Force component extraction (Long-Horizon view, Day Detail panel) |
| L3: Puppeteer adds ~250MB to deploy | M | Receipt evaluates pdfkit alternative; Render Pro plan (~$60/mo) supports larger deploys |
| L3: PDF generation takes >30s on 12-month plan | L | Cache by `(planId, planUpdatedAt)`; queue job for very-large plans |
| L3: Move Fitness logo licensing | M-H | Sean confirms approval BEFORE L3 code starts — listed as L3 prerequisite |
| L3: light theme variant of Crystalline Swan doesn't exist | M | Gemini direct consult drafts palette before L3 code |
| L4: Logger UX legacy collision — current logger may have fields/flows the pre-fill restructure breaks | H | Receipt audits existing WorkoutLogger.tsx + dailyWorkoutFormService.ts; identify breaking changes |
| L4: Submit-success-but-advance-fail desync | M | Receipt picks Option A (atomic) or Option B (ordered + manual recovery) |
| L5: client-side bypass via direct API call | H | Backend MUST enforce — frontend gate is UX, server is security |
| L5: pre-L5 clients with active workout planner usage now defaulting to false | M | Migration sets flag to true for any user with existing plan history |
| L6: existing pre-L1 saved plans without populated days | L | UI gracefully handles legacy shape; "Re-generate populated version" button |
| Client expectation mismatch on 12-month PDF | M | PDF cover page includes "This is a periodization template — your trainer adapts week-to-week" disclaimer |
| Equipment mismatch with actual training environment (gym vs home) | L | EquipmentProfile already constrains; trainer can swap any exercise post-generate |

---

## 8. What this spec does NOT include (out of scope)

- Mesocycle expand/drill (separate slice)
- Coach plan-awareness in chat (separate slice — was W4)
- Dietary nutrition integration into the plan
- Wearable / heart-rate integration during logging
- Multi-trainer plans (one client, multiple trainers contributing)
- Plan-versioning (track edits as separate revisions vs in-place updates)
- Cross-client plan templates
- Mobile-app native UI (web only; native is App Store roadmap)
- Plan SHARING between trainers
- Plan COMMENTING (trainer-on-trainer notes)
- Plan TIMELINE adjustments (push deload week back)

---

## 9. Acceptance criteria summary (REV 2 — math fixed)

A trainer should be able to:
1. Pick a client → pick "12 months, 3x/week, Hypertrophy" → click Generate → see a fully-populated **144-session** plan (12 × 4 × 3 = 144) with rich AI recommendations.
2. Navigate Month 7 → Week 2 → Day 1 → see and edit that specific session.
3. Save the plan as the client's active plan via existing Plan Library save matrix.
4. Export to a branded PDF (Swan + Move logos as applicable) with month/week/day sectioning.
5. Tomorrow open WorkoutLogger for that client → see today's planned session pre-filled → record actuals → mark complete → cursor advances.
6. Toggle a different client's `canGenerateWorkoutPlans` flag; that client logs in and sees the planner; admin toggles off; client loses access.

A client (when admin-allowed) should be able to:
1. Generate a plan for themselves, constrained to their own user id.
2. NOT see other clients.
3. NOT bypass the gate via direct API call (backend self-bypass + permission flag check).

---

## 10. Codex / AI Village review checkpoints (REV 2 — F15)

Each phase L1-L5/L6 gets:
1. Pre-code receipt (rule 26 + 27 + 29)
2. Codex review of receipt before code
3. Code + tests + Tier-A baseline
4. Codex final-gate diff review (rule 46)
5. Production probe + Sean's manual smoke
6. Closeout per rule 41 + rule 48 audit record at phase close

For L3 PDF visual: **Gemini direct consult** (`scripts/consult-gemini.mjs --design`) NOT AI Village (Phase 2C UX/UI debate is still degraded from Gemini quota 429 earlier today).

---

## 11. Immediate next action

REV 2 spec is ready. Sean approves → optional Codex re-pass on REV 2 → L1 receipt → L1 code.

Per Sean's "let's start building based on both hostile reviews," the implicit signal is REV 2 is the spec; L1 receipt is the next concrete deliverable.

---

## Appendix A — Sean's raw 2026-05-01 brief (preserved verbatim)

> So this section right here it's supposed to generate a whole 6 months worth of exercises depending if I pick one day a week two day a week three a day a week 4 a week or day a week or 5 day a week So I would need to either create a whole nother model that has the view for this because this end up being separate from the workout builder because the workout builder seems like it's mainly good for single workouts for that day Otherwise we need to convert it so that it could be good for one day one week One month three months 6 months 9 months and 12 months we need to create A model view that will be able to Scroll down and look at all of these different workouts and then create And PDF file that will be well documented look beautiful look professional not some just table chart It will have the swan logo in it That's fine studios and the Move Fitness logo And it would have sectioned off one month two months three months four months 5 months 6 months 7 months 8 months nine months 10 months 11 months 12 months And then it would break it down into weeks and then each individual day I should be able to click on each individual day and see the workout for that day specifically and it's a full workout in ASM based I should be able to go through that and I should be able to save it create a PDF file so it could be like one of the saved plans the main plan and then then if I want to create another workout for that same client I could choose like a single day workout I could create that and I should be able to save the single day workout and also if you see and look the text on the workout road decks the text is still too big on desktop mode maybe alright when it goes into like tablet and mobile mode but desktop mode is looking terrible with the Rolodex We need to look into that and be creative to create a wonderful UI UX upgrade without taking away from what we got already  I also would like the AI recommendation section to be a little bit more comprehensive and give more data right now as it seems like man just give it some easy random information it feels like and the weekly schedule it has day one day two day 3 but It also says Click Exercises in the Rolodex to populate this day but the day doesn't really get populated and I feel like it should be more comprehensive it says the weekly schedule but it just says day one day 2 day 3 day 4 day 5 day 6 it should say week one and then it should have all the days in it and then I should be able to click the day and then populate it with the exercises if I want to and move on But all those days should be automatically populated with exercises from the Rolodex based off NASM standards and not just randomization So it should all be populated and then I should be able to go in there and edit the days if I want to so if I want to take exercises out and switch it up I can do that and then once we have I I'm done doing that I could again be able to save it as a PDF and it would save every single day and set it all up and and have it set up or I could save it as that client's main workout program and then I can continue to just go there daily and look at the workouts that we have and then fill in the information I need to be able to log the workout so the workout logger needs to be tied into this so when trying to fill out the workout it's gonna pull out their plan already and then I just need to just show how many preps or how many sets they did or what the tempo was or how their form was add notes that whole section where I'm able to add information and data carry over to that section which is on the Clients and Team section workout longer and that's why I want the client and team section to make sure that it's using the same layout so basically it's just going to carry it over to the workout logger and then I'll be able to connect the workout logger to the to the Swan Studios workout planner and this is going to be utilized for the trainer and for the admin but on the client side we need to make it available for them to use it but that needs to only be allowed by the administrator so if II should be able to choose a client and then have a option in the client settings to click allow to generate workout plans via the Swan Studios Workout planner So I would have the the gate to control to allow clients to have that.

---

## Appendix B — Hostile review findings cross-reference

Combined Claude (self-pass) + Codex hostile review findings, mapped to REV 2 fixes:

| Finding | Source | REV 2 Fix |
|---|---|---|
| Conflicting current-plan endpoint claim | Claude H1, Codex H1 | F1 |
| L1 missing planData schema | Codex H2 | F2 (NEW §3.5) |
| Duration math contradiction | Codex H3, Claude H1 | F3 (4-week mesocycle months) |
| L4 wrong submit path | Codex H4 | F4 |
| L4 dependency on L1 not stated | Codex H5, Claude H4 | F5 |
| PDF asset/licensing not gated | Codex H6, Claude H6 | F6 (L3 prerequisite checklist) |
| Round-trip schema tests missing | Codex F7 | F7 (R1-R6 tests) |
| Made-up data sources in §3 G3 | Claude H5 | F8 ([VERIFY-PRE-CODE] markers) |
| Trainer "default access" misframed | Claude H2 | F9 |
| Light theme variant doesn't exist | Claude H3 | F10 (L3 prerequisite) |
| Backwards-compat audit missing | Claude H7 | F11 (NEW phase L6) |
| Self-supervised client gate-ordering | Claude H8 | F12 |
| Cert chips data source | Claude H10 | F13 |
| Risks missing | Claude H11 | F14 |
| Phase 2C broken → use Gemini direct | Claude H13 | F15 |
| Phase estimates loose | Claude H9 | F16 |

---

**End enhanced spec REV 2.** Ready for Sean's approval. After approval, this becomes the source-of-truth working brief for the long-horizon arc (L1 → L4 → L2 → L5/L6 → L3).
