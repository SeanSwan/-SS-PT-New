---
decision: "Exercise Rolodex: one catalog, seven browse UIs. Fix the Exercise model's 9 blind columns first (turns on built-but-invisible Easier/Harder + joint-mod rows), serve coachingCues, cache the fetch, unify the three divergent filter taxonomies, then ADOPT the already-built SwanExercisePicker surface by surface (bootcamp → planner → logger), add OPT-phase + contraindication + custom-exercise filters, quarantine the two dead pickers — 12 numbered slices"
status: open
supersedes: none
---

# 05 — EXERCISE ROLODEX / LIBRARY · Audit + Blueprint

**Ground truth:** `origin/main@3887c8ef`, read-only audit 2026-09-03; D1 (model blind to 9 live columns), the zero-consumer status of `SwanExercisePicker`, and the missing `coachingCues` in the contract were re-verified by direct read this session. Shared protocol + bans: `10-CHECKPOINT-PROTOCOL-AND-BANS.md`. Builder starts at §E.
**Builds on (do not re-litigate):** `brainstorms/FABLE-VISION-MASTER-BRIEF-2026-07-05.md` §81 (ONE shared picker; unify vocab; mobile sheet; `coachingCues` over heuristics — **built, never adopted**), `SCHEMA-DRIFT-HOSTILE-AUDIT-RECORD-2026-08-03.md` (`exercise_library` fallback removed from the bridge), `SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12.md` §7 (exercise ontology: high-traffic programming fields on `Exercises`, clinical profile in a 1:1 table — the target this blueprint's filters build toward), `WORKOUT-BUILDER-CANONICAL-SURFACE-RECEIPT-2026-04-29.md` D9 (planner chip-pile is a hierarchy problem; the V2 panel is the fix and is flag-dark).

---

## §A — GROUND TRUTH

### A1. Surface Classification Table (Rule 27) — 7 UIs over ONE catalog

| # | UI | Mounted (route → JSX) | Data | Class |
|---|---|---|---|---|
| 1 | `WorkoutLogger/NASMExerciseRolodex.tsx` (295) | client `/log-workout` (`routes.tsx:222`) → **JSX `WorkoutLogger.tsx:718`**; staff Client Hub `TrainingTabSectionContent.tsx:110` | `useExerciseSearch` → `GET /api/exercises/library` | **canonical** (logger) |
| 2 | `admin-workout-planner/WorkoutPlannerRolodexPanel.tsx` (211) | `/workout-planner` (`routes.tsx:153,:198`) → **JSX `WorkoutPlannerPageLayout.tsx:152`, rendered `:245`** | `useWorkoutPlannerRolodexState` → `useExerciseSearch` | **canonical** (planner) |
| 3 | `BootcampBuilder/ExerciseRolodexPanel.tsx` (282) | `/bootcamp` (`:155,:206`) → **JSX `BootcampBuilderSidePanels.tsx:95,:137`** | `useExerciseSearch` + `useEquipmentAPI` | **canonical** (bootcamp) |
| 4 | `workout-design-lab/WorkoutDesignRolodex.tsx` (69) | `/workout-design-lab` → **JSX `WorkoutDesignLabPage.tsx:276`** | delegates to #1 | canonical thin adapter |
| 5 | `WorkoutPlannerRolodexPanelV2.tsx` (278) | `WorkoutPlannerPageLayout.tsx:227` inside `iaV2` | same as #2 | dormant flag-dark (`VITE_ENABLE_PLANNER_IA_V2` absent in prod) |
| 6 | `WorkoutManagement/ExerciseLibrary.tsx` (**1113**) | `TrainingTabSectionContent.tsx:85` → `WorkoutPlanBuilder.tsx:214` → `WorkoutPlanBuilderExerciseModal.tsx:57` | `useWorkoutMcp` → `/library` | **legacy (mounted)** — 4th taxonomy, private theme object, 3.7× cap |
| 7 | `Shared/SwanExercisePicker/**` (9 src + 5 tests, ~1,000) | **NOWHERE** | wraps `useExerciseSearch` | **dormant — zero consumers** ✔ (the "shared unification" the blueprints describe as already adopted) |
| 8 | `Shared/ExercisePickerPanel.tsx` (463) | NOWHERE | `GET /api/exercises/search` | dormant — zero consumers |
| 9 | `WorkoutLogger/ExerciseAutocomplete.tsx` (191+141) | NOWHERE | `/search` | dormant — zero consumers (also in `01-WORKOUT-LOGGER.md` L5) |
| 10 | `lens/styles/rolodex-first/index.tsx` (35) | flag-dark layout lens positioning #2 | — | dormant, not a rolodex |

**Canonical receipt (Rule 26) for #1/#2/#3:** (a) routes above; (b) JSX lines above; (c) `useExerciseSearch.ts:51`; (d) `useExerciseSearch.ts:100` `api.get('/api/exercises/library')`; (e) `backend/routes/exerciseRoutes.mjs:480` `router.get('/library', protect, apiLimiter, …)`; mount `backend/core/routes.mjs:767` (exactly once; within the router all literal paths precede `/:id` `:683` — no shadowing); (f) model below.

### A2. Data model — `backend/models/Exercise.mjs` (355 ln, `tableName: "Exercises"` `:350`, camelCase, no `field:` except `exercise_key`)
`id` UUID · `name` unique · `description` · `instructions` · `videoUrl` · `previewVideoUrl` · `imageUrl` · `exerciseType` ENUM(core|balance|stability|flexibility|calisthenics|isolation|stabilizers|injury_prevention|injury_recovery|compound) · `primaryMuscles` TEXT+JSON · `secondaryMuscles` · `difficulty` 0–1000 · `progressionPath` · `prerequisites` · `equipmentNeeded` TEXT+JSON · `canBePerformedAtHome` · **`coachingCues` JSON (`:148`)** · `contraindicationNotes` · `safetyTips` · `recommendedSets/Reps/Duration` · `restInterval` · `scientificReferences` · `unlockLevel` · `isActive` · `isPopular` · `experiencePointsEarned` · `targetProgressionRate` · `exercise_key` unique · `source` def `'nasm'` · `nasmCorrectiveCategory` JSON · `cesProtocolStep` · `sourceCitation` · `force` · `mechanic` · `aliases` · **`optPhases` TEXT+JSON (`:294`)** · `nasmMovementPattern` · `thumbnailUrl` · `defaultTempo` · `defaultRestSeconds` · `bodyPartCategory`.

**Two tables exist; only `"Exercises"` is the catalog.** `exercise_library` (snake_case, migrations `20251113000000/03`, `20251118000003`) has no Sequelize model and is referenced only as an optional FK target by `VideoCatalog.mjs:214` and video/admin-metrics controllers. The three migrations named in the brief therefore shape a table the rolodex does not read.

**Drift table (Rule 29) — `"Exercises"` migrations vs model:**

| Column (migration) | Model | Verdict |
|---|---|---|
| all 43 fields above (`20260307000002`, `20260321000001`, `20260212000005`, `20260504000000`) | declared | match |
| `easyVariation`, `mediumVariation`, `hardVariation`, `kneeMod`, `shoulderMod`, `ankleMod`, `wristMod`, `backMod`, `equipment` JSONB (`20260404000001:28-36`) | **ABSENT** ✔ (`grep -c` → 0) | **DRIFT — column exists, model blind** |
| `elbowMod`, `footMod`, `hipMod` | absent — and the columns live on `bootcamp_exercises` (`20260526000400`), NOT `"Exercises"` | **PHANTOM** — `exerciseRoutes.mjs:404-406` hardcodes them on `/all` |

Consequence: `exerciseLibraryContract.mjs:55-61` intersects the attribute list with `Exercise.rawAttributes` ✔, so all nine drifted columns are dropped from the SELECT and `formatLibraryExercise:117-127` emits `null` for each → `NASMExerciseRolodexPreview.tsx:69-70` "Easier:/Harder:" rows and `ExerciseModAccordion.tsx:26-27` **can never render** from `/library`. The bootcamp bridge is unaffected (raw SQL `exerciseRolodexBridge.mjs:142-143`).

**Seed/catalog size:** 8 seeders → 1,135 authored (pre-dedupe) into `"Exercises"` by `exercise_key`; live ≈ **916** rows `[LIKELY]` (peer-verified 2026-08-03, not re-run); UI claims `900+` (`marketingStats.ts:46`). `optPhases` populated on ~758. **`videoUrl`/`thumbnailUrl` seeded on ZERO** — media arrives only via `PUT /api/exercises/:id/media` (Content Studio coverage tracker) or a read-time `VideoCatalog` join. Per-exercise video coverage `[UNKNOWN]` (prod data).

### A3. Runtime flow

```mermaid
flowchart TD
  EX[("\"Exercises\" ≈916 rows")] -->|findAll isActive, attrs ∩ rawAttributes| LIB["GET /api/exercises/library :480<br/>Cache-Control private max-age=300"]
  VC[("video_catalog")] -->|getCatalogVideoSamplesByExercise| LIB
  EX -->|raw SQL 28 cols| BRIDGE["exerciseRolodexBridge (bootcamp generator)"]
  LIB --> HOOK["useExerciseSearch :51 — sanitize → ExerciseSlim (34 fields, id coerced to string)"]
  HOOK -->|postMessage CACHE| W["Blob Web Worker — fuzzy score, top 100"]
  W -->|RESULTS| HOOK
  HOOK -.->|worker null / CSP| SYNC["searchExercisesSync — DIFFERENT scoring (D5)"]
  HOOK --> R1["#1 NASMExerciseRolodex (logger)"] & R2["#2 WorkoutPlannerRolodexPanel"] & R3["#3 ExerciseRolodexPanel (bootcamp)"]
  HOOK -.->|zero consumers| R7["#7 SwanExercisePicker — DORMANT"]
  LIB --> R6["#6 ExerciseLibrary.tsx 1113 ln — LEGACY"]
  R1 --> SEC["sectionFilter + applyEquipTypeFilters (logger vocab: 6 types / 10 equipment)"]
  R2 --> F2["type→equip→source→impact (planner vocab: 7 / 13)"]
  R3 --> F3["+ equipment-profile tokens (bootcamp vocab: 7 / 13)"]
  SEC & F2 & F3 --> SEL{"select"}
  SEL --> REC["recordRecentExercise — localStorage, #1 ONLY"]
  SEL --> OUT["onSelectExercise → logger set / planner row / bootcamp station"]
  DL["?exercise= deep link (exact match only)"] --> R1
  R1 --> PV["Preview → ExerciseMediaPreview video → thumb → empty"]
```

Fetch behavior: each hook instance owns its own cache + fetch (`exerciseCacheRef` `:60`); `fetchExercises` is `useCallback(…, [query])` and its effect refires per keystroke — absorbed by a 5-minute staleness guard `:88-91`, after which each keystroke refetches ~916 rows (D6).

### A4. Data contract — `GET /api/exercises/library`
Auth: `protect` only (any role, incl. client — deliberate, `exerciseRoutes.mjs:466-479`) + `apiLimiter`. Response `{success, exercises: LibraryExercise[], count}`. `LibraryExercise` (`exerciseLibraryContract.mjs:88-128` + `catalogVideoSample` grafted `exerciseRoutes.mjs:516`): `id, name, exerciseKey, exerciseType, bodyPartCategory (def 'Full Body'), primaryMuscles[], secondaryMuscles[], difficulty, equipment[] & equipmentNeeded[] (SAME parsed array), source, description, instructions, videoUrl, previewVideoUrl, imageUrl, thumbnailUrl, defaultTempo, defaultRestSeconds, recommendedSets/Reps/Duration, restInterval, optPhases[], nasmMovementPattern, canBePerformedAtHome, easyVariation, hardVariation, kneeMod, shoulderMod, ankleMod, wristMod, backMod, elbowMod, footMod, hipMod (ALL 10 ALWAYS null — D1/D2), catalogVideoSample|null`. **NOT in the contract:** `coachingCues` ✔ (`grep -c` → 0), `contraindicationNotes`, `safetyTips`, `nasmCorrectiveCategory`, `cesProtocolStep`.
Other endpoints: `/search` (trainer/admin; no live consumer), `/categories`, `/`, `/all` (no consumer; D2), `/recommended[/:userId]`, `PUT /:id/media` (coverage tracker), `GET /:id/teach-mode`, `GET /:id`.

---

## §B — DUPLICATION ANALYSIS (what becomes shared)

| Concern | Copies today | Divergence |
|---|---|---|
| Body-part chips | `ExerciseFilterChips.tsx:23`, `ExerciseRolodexPanel.constants.ts:1`, `WorkoutPlannerFilters.ts:9` | identical (10) |
| Exercise types | logger 6 · bootcamp 7 (+Core) · planner 7 | **logger lacks Core** |
| Equipment | logger 10 (Band, Ball) · bootcamp/planner 13 (Resistance Band, Sliders, Stability Ball, Medicine Ball, TRX) | **Sliders/TRX/Medicine Ball/Stability Ball unreachable from the logger** |
| `parseEquipment` | 3 copies, 2 behaviors (bootcamp adds `.map(String)` + non-array guard) | |
| `getJointImpact` | 2 copies; planner copy is case-fragile (no lowercase, no null guard) | |
| Equipment predicate | 3 hand-rolled variants (`ex.equipment \|\| ex.equipmentNeeded` vs `ex.equipment` only vs profile tokens) | works only because the API sets both arrays equal (D14) |
| Card/row | 3 implementations; only the logger virtualizes | |

**The boundary already exists:** `Shared/SwanExercisePicker/` (types, filters, hook with debounce + persistence, list, sheet, preview, search bar — 9 files, largest 195 ln, 5 test files). **Adopt it; do not rebuild.**
Shared (promote): `taxonomy.ts` (NEW, one declaration of all five constant sets), `filters.ts` (exists: `parseEquipment`, `getJointImpact`, `matches*`), `useSwanExercisePicker.ts`, `useExerciseSearch.ts` (MOVE from `WorkoutLogger/` + module-level cache), `SwanExercisePickerList/Sheet/Preview`, `recentExercises.ts` (MOVE).
Stays surface-specific: `NASMExerciseRolodex.sectionFilter.ts` (logger protocol sections), `BootcampEquipmentProfileFilter` + `useEquipmentAPI`, planner swap/horizon logic in `useWorkoutPlannerRolodexState`, `WorkoutDesignRolodex` chrome, each surface's `onSelectExercise` payload.

---

## §C — DEFECTS / DRIFT / RISKS

| ID | Sev | Finding | Evidence |
|---|---|---|---|
| **D1** | 🔴 HIGH | Model blind to 9 live columns → `/library` nulls every variation/joint-mod field; built preview rows never render. | ✔ `Exercise.mjs` grep 0; `20260404000001:28-36`; `exerciseLibraryContract.mjs:55-61` |
| **D2** | 🟠 MED `[LIKELY]` | `/all` hardcodes 3 phantom columns without the rawAttributes filter → SELECT throws → bare `catch :412` → 5-attribute fallback that also drops `isActive:true`. Zero live callers. | `exerciseRoutes.mjs:404-418`; test `libraryMediaContract.test.mjs:184-188` knows they are phantom for `/library` only |
| **D3** | 🟠 MED | `coachingCues` declared + seeded (183 rows) + never served; preview uses ~28 hardcoded `name.includes()` tips instead. | ✔ contract grep 0; `NASMExerciseRolodex.helpers.ts:47-77` |
| **D4** | 🟡 LOW | Bridge docstring says it reads `exercise_library`; code reads `"Exercises"` and explains why the other cannot work. Rule 75 trap. | `exerciseRolodexBridge.mjs:9` vs `:71-73` |
| **D5** | 🟠 MED | Worker (fuzzy ×0.5/×0.7) vs sync fallback (flat 300/200 substring) — result membership silently differs under CSP/worker error. No parity test. | `exerciseSearchWorker.ts:105-111,213-221` |
| **D6** | 🟠 MED | Refetch per keystroke after 5 min; one full download per mounted rolodex (3 on a page). | `useExerciseSearch.ts:60,88-196` |
| **D7** | 🟡 LOW | Recents logger-only. | `NASMExerciseRolodex.tsx:127` |
| **D8** | 🟠 MED | `ExerciseLibrary.tsx` 1113 ln, private theme, 4th taxonomy, mounted via plan-builder modal. | `WorkoutPlanBuilderExerciseModal.tsx:57` |
| **D9** | 🟠 MED | ~1,150 lines of dormant pickers beside live ones, no dormancy headers (Rule 77 at scale). | #7, #8, #9 |
| **D10** | 🟠 MED | Blueprint docs say the shared picker is "already extracted" and build on it — extracted ≠ adopted (Rule 75). | `brainstorms/blueprints-2026-07/01-…:80`, `03-…:47` |
| **D11** | 🟡 LOW | Top-100 cap reported as the match count ("100 matching"). | `exerciseSearchWorker.ts:118,250`; `NASMExerciseRolodex.tsx:288` |
| **D12** | 🟠 MED (product) | Zero seeded media across 1,135 exercises; coverage unknown. | seeders |
| **D13** | 🟡 LOW | `exercise-service.ts` calls `/muscle/:m` and `/type/:t` — neither exists; falls to `GET /:id` with a bad UUID. Latent. | routes grep |
| **D14** | 🟡 LOW | Two equipment columns (`equipmentNeeded` TEXT, `equipment` JSONB); API sets both outputs from `equipmentNeeded`; surfaces read different keys. | `exerciseLibraryContract.mjs:89,99-100` |
| **A11y** | 🟡 | `role=combobox/listbox` wiring untested; `aria-activedescendant` absent. | `NASMExerciseRolodex.tsx:207-216` |

Clean: hex discipline (127 hex, all in `var()`), 44px (contract-tested), no TODO/HACK, no route shadowing, honest load-failed vs no-results state.
**Test gaps:** no model↔migration column test (the only backend contract test hand-authors `rawAttributes` in a mock — cannot see drift by construction); `/all` untested; no worker↔sync parity test; no taxonomy-equality test; no fetch-count test; 5 green test files over unreachable picker code.

---

## §D — TARGET DESIGN

### D1. One picker, three hosts (slices X5–X7) — `SwanExercisePickerSheet` on 375; inline panel ≥1024
```
┌──────────────────────────────────────┐
│ ⌄                                    │  sheet handle (44px)
│ 🔍 Search 900+ exercises      [✕]    │
│ [Recent ▸] Goblet Squat · Hip Hinge · Plank    <- one-tap recents (ALL hosts after X6)
│ [Body ▾][Type ▾][Equip ▾][Phase ▾][More ▾]    <- ONE taxonomy; Phase = NASM OPT 1-5 (X8)
│ ────────────────────────────────────  │
│ ▸ Goblet Squat             ⚠ knee    │  <- contraindication badge (X9), 56px virtualized row
│   Compound · Legs · Dumbbell · P2-4   │
│ ▸ Romanian Deadlift                  │
│ …                                    │
│ Showing 100 of 312 · refine to see more   <- D11 fix, exact copy
└──────────────────────────────────────┘
   tap row → preview pane (≥1024) or second sheet (375):
   media (video → thumb → "No demo video yet")
   Coaching cues (real coachingCues; heuristic tips ONLY when null — X3)
   Easier: <easyVariation>  Harder: <hardVariation>   (renders once X1 lands)
   Joint mods: knee · shoulder · ankle · wrist · back (accordion)
   [ Add to <host noun> ]   host noun = "set" | "plan" | "station 2"
```
Exact copy: search placeholder `Search 900+ exercises` (uses `EXERCISE_LIBRARY_CLAIM`); empty media `No demo video yet`; cap line `Showing 100 of <N> · refine to see more`; CTA `Add to set` / `Add to plan` / `Add to station <n>`.
Host contract: `<SwanExercisePicker host="logger"|"planner"|"bootcamp" section?={…} equipmentProfileId?={…} onSelect={(slim) => …} />` — the host-specific filters (logger section, bootcamp profile, planner swap target) are passed as props and applied AFTER the shared filters.

### D2. Filter taxonomy (X2) — the single declaration
`BODY_PARTS` (10, unchanged) · `EXERCISE_TYPES` = All, Compound, Isolation, Calisthenics, Stability, Flexibility, **Core** (7) · `EQUIPMENT` = All, Bodyweight, Dumbbell, Barbell, Kettlebell, Machine, Cable, Resistance Band, Stability Ball, Medicine Ball, BOSU, Sliders, TRX (13; "Band"→"Resistance Band", "Ball"→ split) · `SOURCE`, `IMPACT` (unchanged from bootcamp) · **NEW** `OPT_PHASE` = Any, 1 Stabilization Endurance, 2 Strength Endurance, 3 Muscular Development, 4 Maximal Strength, 5 Power.

---

## §E — NUMBERED SLICES

### X1 — Declare the 9 blind columns (D1) · **S** · backend · no flag
1. RED: NEW `backend/__tests__/exerciseModelColumns.test.mjs` — reads migration `20260404000001` column names and asserts each is in `Exercise.rawAttributes`; plus a Rule 58 probe receipt (`information_schema.columns WHERE table_name='Exercises'`) pasted in the package.
2. Add `easyVariation, mediumVariation, hardVariation, kneeMod, shoulderMod, ankleMod, wristMod, backMod` (STRING(255)) and `equipment` (JSONB) to `Exercise.mjs`. Split the model (355 → two files: attributes + associations/hooks) to clear the cap.
3. `formatLibraryExercise`: prefer `equipment` JSONB when non-empty else `equipmentNeeded` (D14, documented).
**Accept:** column test RED→GREEN; `libraryMediaContract.test.mjs` updated (RE-ANCHOR: mock `rawAttributes` now includes the 9); `NASMExerciseRolodexPreview` renders Easier/Harder with a fixture (test).
STOP.

### X2 — One taxonomy + one filters module (§B, §D2) · **M** · frontend
1. RED: `Shared/SwanExercisePicker/taxonomy.test.ts` asserts the three legacy constant modules re-export from `taxonomy.ts` (source-contract) and that `filters.ts` `getJointImpact` lowercases + null-guards.
2. Create `taxonomy.ts`; make `NASMExerciseRolodex.helpers.ts`, `ExerciseRolodexPanel.constants.ts`, `WorkoutPlannerFilters.ts` thin re-exports; delete the 3 `parseEquipment`/2 `getJointImpact` copies in favor of `filters.ts`.
3. Intentional vocab convergence: the logger gains Core/Sliders/TRX/Medicine Ball/Stability Ball (RE-ANCHOR rows on `sectionFilter`/touchTarget tests if counts change).
STOP.

### X3 — Serve `coachingCues` + safety fields (D3, prep for X9) · **S** · backend + preview
Add `coachingCues`, `contraindicationNotes`, `safetyTips`, `nasmCorrectiveCategory`, `cesProtocolStep` to `exerciseLibraryContract.mjs` + `ExerciseSlim`; preview renders real cues, falls back to `getExerciseTips` only when null (exact heading `Coaching cues`). RED: contract test asserts the fields; preview test with cues present/absent.
STOP.

### X4 — Fetch cache (D6) + worker parity (D5) + cap honesty (D11) · **S** · frontend
Drop `query` from `fetchExercises` deps (use a ref); hoist `exerciseCacheRef` to module scope (one download per page). Property test over a shared fixture: worker and sync produce the same membership for 50 queries (make sync use the same fuzzy scorer — import it). Status line per §D1 copy. RED: fetch-count test (1 fetch for 3 mounted hooks; 0 refetch on 20 keystrokes).
STOP.

### X5 — Adopt `SwanExercisePicker` in bootcamp (#3) · **M** · frontend · flag `VITE_ENABLE_SHARED_PICKER_BOOTCAMP` (default OFF → ON after QA)
Host wrapper keeps `BootcampEquipmentProfileFilter` + station placement payload; `ExerciseRolodexPanel.tsx` becomes a thin host. RED: existing `composition`/`layout` tests re-anchored; select payload byte-identical (snapshot). Screenshots 375 (sheet) + 1440 (panel).
STOP.

### X6 — Adopt in planner (#2) + recents everywhere (D7) · **M**
Planner host keeps swap/horizon logic; `recentExercises.ts` moves to Shared and is written by all three hosts. This ALSO resolves the 2026-04-29 D9 chip-pile (one Filters sheet) without needing the IA-V2 flag — record that `WorkoutPlannerRolodexPanelV2` becomes redundant (propose quarantine).
STOP.

### X7 — Adopt in logger (#1) · **M** · highest traffic, last
Keep `sectionFilter`, deep link, 44px suites; `NASMExerciseRolodex.tsx` becomes the logger host (<150 ln). All 5 logger rolodex test files re-anchored with a table.
STOP.

### X8 — NASM OPT-phase + movement-pattern filters · **S** · frontend
`OPT_PHASE` chip row per §D2 over `optPhases[]` (populated on ~758); `nasmMovementPattern` under `More`. RED: filter tests.
STOP.

### X9 — Contraindication badge at pick time · **S** · frontend (data from X3)
Row badge `⚠ <region>` when `contraindicationNotes` or `nasmCorrectiveCategory` present; preview shows the note verbatim under heading `Use with care` — non-medical framing, no diagnosis copy. (Pairs with the client pain chart: hosts may pass `painRegions[]` to sort flagged rows to the bottom, never hide them.)
STOP.

### X10 — Trainer custom exercises in the picker · **M** · backend + frontend
`/library` unions `CustomExercise` rows scoped to `req.user` (author or same trainer org) with `source:'custom'`; source chip. RED supertest: trainer A never sees trainer B's custom rows; client sees only their trainer's.
STOP.

### X11 — Retire `/all`, fix D4/D13, quarantine dead pickers (D2, D9) · **S** · `SEAN-GATE` for moves
Propose `Shared/ExercisePickerPanel.tsx` + `WorkoutLogger/ExerciseAutocomplete*` → `archive/pending-deletion/`; delete `/all` handler after a zero-caller receipt (or route through `getLibraryAttributes`); fix the bridge docstring; remove the two phantom `exercise-service.ts` methods; correct the two blueprint lines (D10).
STOP.

### X12 — Media coverage tooling (D12) · **M** · Content Studio link
Coverage tracker orders the gap list by logged frequency (`workout_logs.exerciseName` counts, IDs only) so the most-used exercises get demos first. See `06-CREATOR-CONTENT-STUDIO.md`.
STOP.

**Order:** X1 → X2 → X3 → X4 → X5 → X6 → X7 → X8 → X9 → X10 → X11 → X12. X1 is one file and turns on a built feature; X2 must precede X5–X7.

---

## §F — TEST MATRIX

| Slice | Test | Proves |
|---|---|---|
| X1 | `exerciseModelColumns.test.mjs` + probe | model ⊇ migration columns |
| X2 | `taxonomy.test.ts`, `filters.test.ts` | one declaration; case-safe impact |
| X3 | contract test (+cues/safety), preview test | real cues served + rendered |
| X4 | fetch-count test, worker/sync parity property test | one download; identical membership |
| X5–X7 | host adoption tests + select-payload snapshots | no behavior loss per host |
| X8/X9 | filter + badge tests | phase filter; badge never hides |
| X10 | `exerciseRoutes.customUnion.test.mjs` | scoping |
| X11 | zero-caller receipts | safe retirement |

## §G — DECISIONS PRE-MADE
| # | Question | Default | Why |
|---|---|---|---|
| Q1 | Adopt vs rebuild the shared picker | **adopt `SwanExercisePicker`** | built, decomposed, tested; roadmap already paid for it |
| Q2 | Adoption order | bootcamp → planner → logger | lowest traffic first; logger has the richest tests |
| Q3 | Logger vocabulary convergence | yes — logger gains the planner/bootcamp terms | one filter means one thing |
| Q4 | `/all` | retire after receipt | zero callers, degraded payload |
| Q5 | Clinical ontology table (Cortex §7) | NOT in this program — X9 uses existing columns only | ontology upgrade is its own program |
| Q6 | Custom exercise visibility | author + their clients | privacy; no org model exists yet |
