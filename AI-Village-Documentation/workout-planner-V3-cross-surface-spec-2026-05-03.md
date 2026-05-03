# Workout Planner V3 — Cross-Surface Intelligence Spec

**Owner:** Claude Opus 4.7
**Date:** 2026-05-03
**Status:** DRAFT pending hostile self-review, then 14-brain AI Village run, then final Codex pass
**Source:** Sean's voice spec 2026-05-03 (post-V2-Village + post-CRITICAL-4-fix)
**Builds on:** `workout-planner-V2-intelligence-spec-2026-05-02.md` (V2 spec — not superseded; V3 EXTENDS V2 with newly-found defects + cross-surface integration scope)

---

## 0. Why V3 exists

V2 (`AI-Village-Documentation/workout-planner-V2-intelligence-spec-2026-05-02.md`) was Village-validated 2026-05-02 with 11/11 PASS, 4 CRITICAL, 9 HIGH findings to address. V2 focused tightly on the workout-planner and logger surfaces.

After Sean reviewed the live UI on 2026-05-03 he flagged additional defects that V2 didn't capture, AND expanded the integration scope from "workout planner only" to **the full client-care pipeline**: Clients & Team → Training → Workout Logger → Workouts → Equipment → Progress → Biometric (Form Analysis / Range of Motion / Movement Analysis / Body Map) — ALL tied into Swan Coach AI as a single intelligence loop.

V3 captures: (a) what's still wrong on the live workout planner that V2 didn't fix, (b) the cross-surface integration architecture, (c) the specific NASM-correct day-type rules Sean wants in production (with concrete repro), (d) the corrective-exercise database expansion (V2 §F16-F17 elevated to a hard implementation task with exercise-count targets), (e) the dropdown semantics fix (full_body for multi-week plans).

V3 does NOT replace V2. The Village considers BOTH together when synthesizing the implementation receipt.

---

## 1. Sean's voice spec (verbatim, organized) — 2026-05-03

### 1.1 Live planner defects he just observed (Phase A — bugs from prior fixes)

| # | Defect | Sean's words |
|---|---|---|
| L1 | 6×/wk plan repeats push/pull/legs twice — no core/balance/stability/recovery day | "When I choose full body it still doesn't have a core day Does chest shoulders traps day one back biceps day two quads hamstring glues day 3 then chest shoulders triceps again day 4 back biceps day 5 quads hamstrings include Stage 6 I don't see ABS no No balance no stability There should be a day that just focus on balances balances stability and absent core if you're doing six days" |
| L2 | 4-day plans must include an abs/core day | "if it's four days there should be an an [abs] day" |
| L3 | 3-day plans must integrate abs into the 1-3 days | "if it's three days then we need to integrate apps within the 1 to 3 days That's how I normally do it" |
| L4 | Category dropdown semantics broken for multi-week plans | "if I'm picking full body and I'm doing a three month plan a one week plan a 12 month plan a 6 month plan I guess all of those are going to have to be full body because they're going to be a plan for not just one day it's going to be multiple days the drop down is really more for a individual one day workout after you start making 3 months 12 months 6 months 9 month plans that just becomes a full body workout because we're working the full body out throughout the month in a sense … so it's not just a day full body workout it doesn't really necessarily have to follow the full body drop down logic in that sense so we need to make sure that that drop down section is appropriate to that thought process" |

### 1.2 Database / Rolodex expansion (Phase B — corrective exercise gap)

| # | Requirement | Sean's words |
|---|---|---|
| L5 | Rolodex needs WAY more corrective exercises | "I still don't feel like you got those corrective exercises that I asked you to add to the whole entire database" |
| L6 | Workout Logger has Warmup & Corrective + Balance/Core/Stability + Cooldown/Recovery sections that need population | "When I go to clients and team when I go to the training tab has Warm up and Corrective as an option to add exercises from there it has Balance core and Stability as an option to add exercises from air and it has cool down and recovery and then it has add button to add the exercises I need way more exercises to populate this section" |
| L7 | Source: NASM CES + sports science + kinesiology research online | "you should have went online and searched every single exercise based off NASM guidelines and just specific sports science and kinesiology protocol best protocol far as what warm ups and corrective exercises are best warm up exercises best corrective exercises" |
| L8 | Specific NASM postural distortion patterns | "for what I told you four cross shoulder syndrome … forward cross shoulder syndrome and lower cross syndrome rounded back" |
| L9 | OHSA-derived corrective targeting | "based off of overhead squat assessment So like the knees going inward or outward the feet going inward or outward weak lower back hamstrings all that stuff" |
| L10 | OHSA must be a section we capture client data into | "the client has in their section for their overhead squad assess assessment which should definitely be a section where we're taking … information from This is usually the first things we do when we have a client sign up as they're supposed to go through tests to see what their weaknesses are" |
| L11 | Rolodex meshed with Workout Logger sections (no separate tabs) | "needs to become one and mesh together as one as I asked for before" — reinforces V2 F11/F12 |

### 1.3 Cross-surface integration scope (Phase C — the BIG ask)

| # | Surface | Sean's expectation |
|---|---|---|
| L12 | Clients & Team tab | analyze its current state + how it connects to Training |
| L13 | Training section | tabs/views below client selection |
| L14 | Workout Logger section | mesh Rolodex into it; admin route should match trainer route |
| L15 | Workouts tab under Training | the planner page; fix L1-L4 defects |
| L16 | Equipment path | upload/manage equipment per location; flow into AI plan generation |
| L17 | Progress tab | client progress over time; informs AI history-aware bias |
| L18 | Biometric tab — Form Analysis | client form-quality scoring; informs AI plan adjustments |
| L19 | Biometric tab — Range of Motion | mobility restrictions; informs AI exercise selection |
| L20 | Biometric tab — Movement Analysis | OHSA + other gait/movement assessments; drives corrective-exercise selection |
| L21 | Biometric tab — Body Map | pain/injury markers; drives exclusions + supporting-muscle bias |
| L22 | Swan Coach AI as orchestrator | "the AI actually sending out an API call which can see all the exercises that are in the rolodex database … all the stretches all the corrective exercises all the warm up exercises and then we're using that AI to create this workout based off all the information that the AI has off of the client in the database" |

### 1.4 Process Sean prescribed

| # | Step | Sean's words |
|---|---|---|
| P1 | I analyze the surfaces FIRST | "first I want you to analyze the Clients and Team tab then the Training section the the workout logger section and then we need to go back and analyze the workouts tab under training and then we need to make sure we analyze the equipment path" |
| P2 | I make the prompt better | "I need you to take this prompt I need you to enhance it I need you to fill in the missing gaps I need you to make it better create a whole new prompt based off this prompt" |
| P3 | Hostile self-review | "I want you to first give yourself a hostile review of what you found" |
| P4 | THEN dispatch Village | "then take that information and then give it to the AI village for running" |
| P5 | Then final Codex pass | "we'll go ahead and do a final review pass after that with just Codex" |

---

## 2. Code-level confirmation of L1-L11 (file:line evidence)

### 2.1 L1-L3: Day rotation has zero core/balance/stability/recovery slots

**Evidence:** [VERIFIED] `backend/services/workoutBuilderService.mjs:776` and `:822` both define identical rotation pools:
```js
const rotationPool = ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];
```
For `sessionsPerWeek >= 4` the populator iterates this pool day-by-day; for `sessionsPerWeek < 4` it uses `['full_body', 'upper', 'lower']`. **Neither pool contains `core`, `balance`, `stability`, `corrective`, or `recovery` slots.** Confirms Sean's exact complaint.

**Concrete rotation outputs today:**
- 1×/wk: `[full_body]` — abs implicitly inside but not enforced
- 2×/wk: `[full_body, upper]`
- 3×/wk: `[full_body, upper, lower]` — no dedicated core; abs are NOT integrated
- 4×/wk: `[push, pull, legs, push]` — duplicate push, no abs
- 5×/wk: `[push, pull, legs, push, pull]` — duplicate push+pull, no abs
- 6×/wk: `[push, pull, legs, push, pull, legs]` — Sean's exact observation
- 7×/wk: `[push, pull, legs, push, pull, legs, full_body]`

**Required (from V2 §3.1, now elevated):**
- 3×/wk: `[full_body+core, upper+core, lower+core]` (core integrated) OR `[full_body, full_body+abs, full_body+balance]`
- 4×/wk: `[push, pull, legs, core+stability+balance]` — explicit ab/core day (L2)
- 5×/wk: `[push, pull, legs, upper-accessory, full-core-day]` — full ab + lower-back day (Sean's L2 specific)
- 6×/wk: `[push, pull, legs, upper, lower, active-recovery+stretch+balance+stability+core]` (L1)

### 2.2 L4: Category dropdown semantics for multi-week plans

**Evidence:** [VERIFIED] The dropdown is wired identically regardless of `planDuration`:
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` Category Select (line ~915-930) sends `category` to both `/api/workout-builder/generate` (single-day) AND `/api/workout-builder/plan` (multi-week).
- For a multi-week plan, the backend ignores `category` for day-type assignment (the rotation pool drives day type) but DOES use it for the manual one-day path AND for save metadata.

**Sean's logic:** for 3-month / 6-month / 9-month / 12-month plans, the only sensible category IS `full_body` because every body part gets trained across the cycle. The dropdown should:
- For `planDuration === 'single'`: stay enabled; full category list
- For multi-week durations: lock to `full_body` (or auto-select + visually indicate it's locked) — NOT show the misleading category options

### 2.3 L5-L6: Rolodex filter is too narrow vs the seeded NASM exercise database

**Evidence:** [VERIFIED] `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.tsx:84-103`:
```js
const SECTION_PATTERNS = {
  warmup: {
    categories: ['recovery'],         // ONLY 'recovery' bodyPartCategory
    types: ['flexibility'],           // ONLY 'flexibility' exerciseType
    nameKeywords: /foam roll|stretch|dynamic|warmup|warm up|corrective/i,
  },
  balance_core: {
    categories: ['core'],             // ONLY 'core' bodyPartCategory
    types: [],                        // ZERO types
    nameKeywords: /balance|plank|stability|bird dog|dead bug|pallof/i,
  },
  cooldown: {
    categories: ['recovery'],
    types: [],
    nameKeywords: /stretch|foam roll|breathing|cool down|cooldown|recovery/i,
  },
};
```

**Database actually has** (per `backend/seeders/20260228-seed-nasm-comprehensive-exercises.mjs`, ~183 NASM exercises by exerciseType):
| `exerciseType` | Count |
|---|---|
| compound | 29 |
| isolation | 25 |
| injury_recovery | 25 |
| injury_prevention | 24 |
| flexibility | 20 |
| core | 15 |
| calisthenics | 15 |
| stabilizers | 10 |
| stability | 10 |
| balance | 10 |

**Filter gap:**
- `warmup` filter only catches `flexibility` (20) + name-matched ones — **misses 24 `injury_prevention` exercises** that ARE corrective warmup work.
- `balance_core` filter only catches `bodyPartCategory='core'` + name-matched — **misses 30 exercises tagged `balance`/`stability`/`stabilizers`** in `exerciseType`.
- `cooldown` filter only catches `bodyPartCategory='recovery'` + name-matched — **misses 25 `injury_recovery` exercises** that ARE recovery work.

**Net result:** Sean sees ~5 exercises per category in the live UI when ~50+ should appear per section.

### 2.4 L7-L10: NASM corrective taxonomy + OHSA hooks

**Status:** Pre-existing OHSA infrastructure in `clientIntelligenceService.mjs:721-726` (`movement.compensations`, `exerciseScores`, `nasmPhaseRecommendation`) — but the registry doesn't have CES-mapped exercises tagged for the specific compensations.

**Required from L7-L10:**
- New `nasmCorrectiveCategory` field on Exercise model (or use `nasmMovementPattern`) tagging each corrective exercise to one or more of:
  - Upper Crossed Syndrome — inhibit/lengthen/activate/integrate sets per NASM CES guide
  - Lower Crossed Syndrome — same
  - Pronation Distortion Syndrome — same
  - OHSA-specific: knees-cave, knees-bow, low-back-arch, forward-head, asymmetric-shift
- Seeder expansion: ~120-200 new corrective rows from the NASM CPT + CES study guides
- Sourcing: Web research (NASM official guides, sportsmedicine journals, kinesiology textbooks)

### 2.5 L11: Rolodex meshes into Workout Logger

**Status:** [VERIFIED] V2 §F6-F12 already documents this; partially implemented (Rolodex IS embedded in logger via `NASMExerciseRolodex` mounted in main + protocol contexts). What's missing per Sean today: the protocol section "tabs" (Warmup & Corrective / Balance & Core / Cooldown) feel like SEPARATE tabs to the user. Sean wants them to be filter chips inside the unified Rolodex (V2 F12 "get rid of those unnecessary tabs").

---

## 3. Cross-surface architecture (V3 NEW — addresses L12-L22)

The current system has the surfaces but they are not unified into a single Swan Coach intelligence loop. V3 architects the loop:

```
              ┌────────────────────────────────────────────────┐
              │   ADMIN: CLIENTS & TEAM (admin-clients/)       │
              │   - client roster, search, filters             │
              │   - per-client details panel:                  │
              │     • Personal Info                             │
              │     • Onboarding Wizard                         │
              │     • Training (TAB)                            │
              │     • Progress (TAB)                            │
              │     • Biometric (TAB)                           │
              │       ├─ Form Analysis                          │
              │       ├─ Range of Motion                        │
              │       ├─ Movement Analysis (OHSA)               │
              │       └─ Body Map (pain markers)                │
              │     • Equipment (per location)                  │
              │     • Plan Library (V2 already shipped)         │
              │     • Workout Logger Modal (admin "log for")    │
              └────────────────────┬───────────────────────────┘
                                   │
                                   ▼
              ┌────────────────────────────────────────────────┐
              │   getClientContext(clientId, trainerId)        │
              │   (clientIntelligenceService.mjs:220)          │
              │   AGGREGATES (today, partial use):              │
              │   • pain (excluded muscles, severity)           │
              │   • movement.compensations (OHSA-derived)       │
              │   • equipmentByLocation                         │
              │   • workouts (history, RPE, formQuality)        │
              │   • variation (recently-used exercises)          │
              │   • goals + body + baseline + nutrition         │
              │   • progressLevels + streak                     │
              │   • activeProgram                               │
              └────────────────────┬───────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────┴──────────────────────────────┐
        │   SWAN COACH AI ENHANCEMENT (V3 NEW — addresses L22)    │
        │   • Sanitized client context DTO (V2 §3.3 + §8.E)        │
        │   • Eligible Rolodex slice (registry × equipment ×       │
        │     pain × NASM phase × goal)                            │
        │   • CES corrective bias from movement.compensations      │
        │   • LLM creative substitution + rationale                │
        │   • Closed-set guarantee (V2 §3.3 Step 4)                │
        └──────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────┴──────────────────────────────┐
        │   DETERMINISTIC PLAN SKELETON (V2 §3.3 Step 2 + V3 fix) │
        │   • NASM-correct day type per session (V2 §3.1 + L1-L3) │
        │   • Per-week progression (V2 §3.2)                       │
        │   • Per-day prescribed sets (V2 §1.2.2 F5)               │
        │   • Always include Warmup/Corrective + Balance/Core/    │
        │     Stability + Cooldown/Recovery in EVERY session       │
        │     (V2 §F13)                                            │
        └──────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────┴──────────────────────────────┐
        │   PERSISTED PLAN (already shipped CRITICAL-4 fix)        │
        │   • planData.weeks[] survives save/load (a3e097814)      │
        │   • Generated/manual discriminator via planSummary       │
        │   • All L1 additive fields round-trip                    │
        └──────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
              ┌─────────────────────────────────────────────────┐
              │   WORKOUT LOGGER (admin + trainer + client)     │
              │   - Cursor prefill from plan.currentSession     │
              │     (L4 already shipped)                         │
              │   - Per-set target weight ghost hints            │
              │     (V2 §1.2.2 F5 — pending implementation)      │
              │   - Unified Rolodex with Warmup/Balance/         │
              │     Cooldown filter chips (V2 F7-F9 + F11-F12,   │
              │     V3 L6 + L11)                                 │
              │   - Submission writes back into history → loop   │
              └─────────────────────────────────────────────────┘
```

### 3.1 Per-surface findings checklist

| Surface | File evidence | V3 task |
|---|---|---|
| Clients & Team admin route | `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx` | Audit existing tabs; add explicit Training/Progress/Biometric tabs if not present |
| Training tab | `EnhancedAdminClientManagementView.tsx` (need to verify tab structure) | Mount the canonical workout planner + workout logger here for the selected client |
| Workout Logger | `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` (canonical, used by both trainer + admin via `EnhancedWorkoutLogger`) | Confirm Rolodex mounts in admin "log for client" path; collapse the 3 protocol section tabs into Rolodex filter chips |
| Workouts tab | `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` | Fix L1-L4 day-rotation + dropdown semantics; wire equipmentProfileId; surface Swan Coach generate button |
| Equipment path | `backend/routes/equipmentRoutes.mjs` + `frontend/src/components/Shared/EquipmentProfilePicker.tsx` | Already exists; wire into plan generation request body (V2 §3.5) |
| Progress tab | TBD audit — `WorkoutHistoryPanel.tsx`, `ClientProgressDashboard.tsx`, `WorkoutChartsTab.tsx` | Surface RPE/formQuality trends to Swan Coach context (V2 §3.6) |
| Biometric — Form Analysis | `frontend/src/components/FormAnalysis/FormAnalysisPage.tsx` | Surface aggregate `formAnalysisSummary` to Swan Coach context |
| Biometric — Range of Motion | (audit needed — check `ClientMeasurementPanel.tsx`?) | If missing, add ROM measurement intake; feed into eligible-pool exclusions |
| Biometric — Movement Analysis | `frontend/src/components/DashBoard/Pages/admin-movement-analysis/MovementAnalysisListPage.tsx` + `MovementAnalysisWizard.tsx` (OHSA wizard) | Surface OHSA results into `movement.compensations` → Swan Coach corrective bias |
| Biometric — Body Map | `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientBodyMapModal.tsx` + `frontend/src/components/BodyMap/BodyMapSVG.tsx` | Pain markers → already in `pain.exclusions`; verify the path is wired into V3 |

---

## 4. The 16 V3 implementation tasks (concrete, file-scoped)

### Phase A — workout-planner day-rotation correction (HIGHEST PRIORITY)

| # | Task | File:line | Estimate |
|---|---|---|---|
| T1 | Replace fixed rotationPool with `buildWeeklyDayTypes({sessionsPerWeek, phase, goal})` per V2 §3.1 + V3 L1-L3 | `workoutBuilderService.mjs:776 + :822` | M |
| T2 | New `planDayTypeService.mjs` module returning the day-type array per (sessions, phase, goal) | NEW backend file | M |
| T3 | Update fixture `longHorizonRegistryFixture.mjs` to add core/balance/stability category exercises so existing tests still pass | `backend/__tests__/fixtures/longHorizonRegistryFixture.mjs` | S |
| T4 | Day population: ALWAYS include 1-3 warmup/corrective + 4-6 main + 1-3 balance/core/stability + 1-2 cooldown per session (V2 §F13 hard constraint) | `workoutBuilderService.mjs` per-day populator | L |

### Phase B — Category dropdown semantics fix

| # | Task | File:line | Estimate |
|---|---|---|---|
| T5 | When `planDuration !== 'single'`, lock category to `full_body` and visually indicate (label "Plan Duration determines focus") | `WorkoutPlannerPage.tsx` Category Select | S |

### Phase C — Rolodex filter expansion

| # | Task | File:line | Estimate |
|---|---|---|---|
| T6 | Expand `SECTION_PATTERNS` to include `injury_prevention` + `balance` + `stability` + `stabilizers` + `core` exerciseTypes; expand bodyPartCategory matches; fix nameKeywords | `NASMExerciseRolodex.tsx:84-103` | S |
| T7 | Verify the filter expansion against live DB exercise counts: warmup ≥ 40, balance/core ≥ 35, cooldown ≥ 40 | New regression test against fixture registry | S |

### Phase D — NASM corrective database expansion (L5-L9)

| # | Task | File:line | Estimate |
|---|---|---|---|
| T8 | New `Exercise.nasmCorrectiveCategory` field + migration (UCS/LCS/PDS/knees-cave/knees-bow/low-back-arch/forward-head/asymmetric-shift) | NEW migration + model field | M |
| T9 | Web-research-driven seeder: ~120-200 corrective exercises sourced from NASM CPT + CES + AAOS guidelines | NEW seeder `20260503-seed-nasm-corrective-comprehensive.mjs` | L |
| T10 | Each new exercise includes: name, instructions, muscles, equipment, NASM CES strategy (inhibit/lengthen/activate/integrate), `nasmCorrectiveCategory[]`, `bodyPartCategory`, `exerciseType` | (same as T9) | (included in L) |

### Phase E — Workout Logger Rolodex unification (V2 F11/F12 + V3 L11)

| # | Task | File:line | Estimate |
|---|---|---|---|
| T11 | Replace `CompactProtocolSection` 3-tab layout with Rolodex filter chips (Warmup / Balance & Core / Cooldown / Main) | `WorkoutLogger.tsx` + `NASMExerciseRolodex.tsx` | M |
| T12 | Confirm admin "log for client" path mounts the same Rolodex (V2 F6 + V3 L14) | `WorkoutLoggerModal.tsx` + `EnhancedWorkoutLogger.tsx` | S |

### Phase F — Cross-surface integration (V3 L12-L22)

| # | Task | File:line | Estimate |
|---|---|---|---|
| T13 | Surface OHSA results from MovementAnalysisListPage into `movement.compensations` if not already wired | `MovementAnalysisWizard.tsx` → `clientIntelligenceService.mjs` | M |
| T14 | Wire `equipmentProfileId` from frontend Generate Plan → backend `/api/workout-builder/plan` | `WorkoutPlannerPage.tsx` `handleGeneratePlan` | S |
| T15 | New `clientContextPromptSanitizer.mjs` per V2 §3.3 + Codex CRITICAL-3 (PII-safe DTO) | NEW backend file | M |
| T16 | New `aiWorkoutEnhancementService.mjs` per V2 §3.3 (closed-set LLM enhancement + validation + fallback) | NEW backend file | L |

---

## 5. Open questions for the Village (extending V2 §4 + §8.C)

1. **Day-type minimum quotas per phase:** for Phase 1 (Stabilization), every session must include ≥1 balance + ≥1 core. For Phase 5 (Power), every session must include ≥1 plyometric. Confirm or refine via NASM specialist.
2. **Core integration rule for 3-day plans:** Sean's L3 says "integrate apps within the 1 to 3 days." How many core exercises per day for a 3-day plan? 2? 3? Same on every day, or rotate (Day 1: anti-rotation, Day 2: anti-extension, Day 3: anti-flexion)?
3. **Active recovery day for 6-day plans:** mobility flow + breathwork + foam roll + stretch — is this assigned to one day or distributed across two short sessions?
4. **Category dropdown UX:** for multi-week plans, lock to `full_body` AND hide the dropdown entirely, OR keep visible-but-disabled with explainer text?
5. **Corrective exercise sourcing:** Village to provide the canonical NASM CES taxonomy with file:line evidence from authoritative sources via Google grounding (NASM official, AAOS, Cleveland Clinic, sports medicine journals). Sean wants this grounded in legit research, not invented.
6. **OHSA data flow:** today `MovementAnalysisWizard` exists but `movement.compensations` may be empty for clients who never had an OHSA. What's the fallback? Use a default conservative compensation profile + flag the client for OHSA intake? Or block plan generation until OHSA recorded?
7. **Equipment-by-location selection at generate-time:** does the trainer pick a single location per plan, or does the AI solve "any of my locations" by using whichever location has the eligible exercise?
8. **Rolodex unification migration:** when collapsing the 3 protocol tabs into filter chips, should we KEEP the existing `CompactProtocolSection` + `pendingSectionContext` plumbing as a behind-the-scenes router, or fully delete it?
9. **Forward-head / lower-cross / upper-cross detection:** Sean wants the AI to ALSO infer these from OHSA results, not require explicit syndrome tagging. NASM's compensation patterns map to these — confirm the mapping.
10. **Database expansion process:** seed-once or progressive (admin can add corrective exercises through an admin UI as new ones are vetted)?

---

## 6. Constraints (CLAUDE.md rules apply)

Same as V2 §6: Rule 4, 6, 8, 18, 22-25, 26-29, 50, 51, 56, 58. Crystalline Swan only. NO Material-UI / Recharts / Grok.

V3-specific:
- T8 (new column) triggers Rule 58 schema-drift cross-check before migration.
- T9 (web research) MUST cite authoritative NASM/medical sources; NO uncited "AI-knows-NASM" content.
- T15-T16 are AI-integration; Rule 8 PII zero-leak applies; pre-implementation test for prompt sanitization required.
- T11 (Rolodex unification) is a design pass; Rule 22-25 design dual-pass + responsive matrix required.

---

## 7. Success criteria

- 6×/wk plan generated by V3 has Day 6 = Active Recovery + Stretch + Balance + Stability + Core (NOT a duplicate legs day).
- 5×/wk plan has Day 5 = Full Core (abs + lower back + obliques).
- 4×/wk plan has Day 4 = Core + Stability + Balance.
- 3×/wk plan integrates 1-2 core exercises into every session.
- Category dropdown auto-locks to `full_body` for multi-week durations with visible "duration drives focus" hint.
- Rolodex search for "warmup" returns ≥40 exercises; "balance" returns ≥30; "cooldown" returns ≥40 (vs ~5 today per Sean's observation).
- A client with OHSA showing knees-cave-in gets corrective exercises (glute bridge, lateral band walks, single-leg squat-to-tap) automatically prescribed in EVERY warmup of EVERY session of the plan.
- Admin viewing "Clients & Team → [client] → Training → Workout Logger" sees the same unified Rolodex the trainer sees.
- Equipment-by-location filter is sent in the Generate Plan request and constrains the eligible pool.
- All 4 CRITICAL findings from V2 Village + 9 HIGH findings + V3 L1-L11 + V3 L12-L22 are addressed before V3 is considered DONE.

---

## 8. Hostile self-review (Phase 3 — Sean's P3)

Self-critique of this V3 spec as if I were a hostile reviewer trying to find every weakness BEFORE the Village sees it:

### Where this spec is weak

**SR-1.** §2.2 L4 "Category dropdown semantics" hand-waves the actual fix — should the dropdown disappear, lock, or auto-set? Three options × N consumers means real architectural debate the Village should resolve. Spec doesn't pick a default for the Village to react to. **Mitigation:** Village debates UX; default in spec is "lock + hint", not silent.

**SR-2.** §2.3 filter-gap math (Sean sees ~5 per category) assumes the comprehensive seeder ran on production. **It may not have.** The spec doesn't include a "verify production registry contents" step before doing the filter expansion. If production has only the OLD seeder (pre-`20260228-seed-nasm-comprehensive-exercises.mjs`), the filter fix won't help. **Mitigation:** add T0 "verify production registry contents via curl + admin Exercise list endpoint" before T6.

**SR-3.** §3 cross-surface architecture diagram lists "Biometric — Range of Motion" but I have NOT verified ROM is a real surface. It might not exist as a discrete tab — it might live inside Movement Analysis or Body Map. **Mitigation:** Village audits existence; if missing, V3 doesn't invent it — it flags the gap.

**SR-4.** §4 task count (T1-T16) is 16 substantial tasks. At any reasonable engineering pace this is 2-4 weeks of work, not a single sprint. The Village should chunk + prioritize, not assume all 16 ship together.

**SR-5.** §4 T9 "120-200 corrective exercises" sourced from NASM CPT/CES — **I have not actually downloaded/cited those sources.** The number is from V2 §1.2.6 estimate. The Village's strategic-research track should use Google grounding to verify the count matches reality. Sean explicitly wants research-grounded sources (L7), not invented numbers.

**SR-6.** §4 T15 (clientContextPromptSanitizer) was already specified in V2 Village CRITICAL-3. V3 lists it as new but it's actually a V2 carryover. **Mitigation:** call it out as carryover, not new — keeps V3 honest.

**SR-7.** L7 says "search every single exercise based off NASM guidelines and just specific sports science and kinesiology protocol best protocol." This is research scope creep — the Village can't read every kinesiology paper. **Mitigation:** scope to NASM CPT 7th ed, NASM CES, AAOS clinical guidelines, and 2-3 peer-reviewed corrective-exercise meta-analyses. Concrete source list, not "every paper."

**SR-8.** §5 Q5 asks Village to "provide canonical NASM CES taxonomy with file:line evidence" — but Village output is not committed source files; it's a planning artifact. The taxonomy needs to land in our repo (e.g. `docs/ai-workflow/references/NASM-CES-TAXONOMY.md`). **Mitigation:** Add T17 "land NASM-CES-TAXONOMY.md as reference doc" to §4.

**SR-9.** The cross-surface scope (L12-L22) is genuinely large. Trying to ship V3 + cross-surface integration + corrective database expansion together violates surgical-changes principle (Karpathy). **Mitigation:** Village should chunk into V3a (planner day-rotation + Rolodex filter), V3b (corrective database + sanitizer), V3c (cross-surface OHSA → AI loop). Not one monolithic V3 ship.

**SR-10.** No mention of how the existing pre-V3 saved plans are migrated. After T1 lands, every existing saved plan still has the wrong day rotation. Do they get auto-regenerated? Flagged for trainer review? Left alone? **Mitigation:** §7 success criteria should add "no auto-mutation of existing saved plans"; admin can offer regenerate-with-V3 affordance per plan.

**SR-11.** The "Active Recovery Day" composition (mobility + breathwork + foam roll + stretch) lacks specific exercise selection rules. Without those, the AI will pick whatever — possibly something that overlaps with the prior 5 days' exercises which Sean explicitly said NOT to do ("focusing on all the exercises we've done previously in the week"). **Mitigation:** §5 Q3 must answer with concrete rule (e.g. "Day 6 mobility flow targets 80% of muscle groups touched in Days 1-5; foam-roll work targets the day with the most fatigue").

**SR-12.** Spec says "AI sends API call that sees all exercises in Rolodex database" but doesn't define what authentication / rate-limit / cost ceiling applies. A single 12-month plan generation calling LLM with the full eligible pool could be $0.10-$0.50 per generation. At 100 plans/month that's $10-50 — fine, but 1000 = $100-500 — needs budget. **Mitigation:** §5 add new question on per-plan cost ceiling.

### Where this spec is strong (defending against future Village pushback)

- §2 has file:line evidence for every claim, falsifiable per Rule 51.
- §3 architecture diagram traces the data flow end-to-end; no hand-waving on integration.
- §4 task list is concrete (file:line + estimate) — Village can sequence.
- Scope is explicitly "extends V2", not "replaces V2" — preserves Village 2026-05-02 work.
- Constraints (§6) explicitly invoke CLAUDE.md rules so Village can't approve anything that violates them.

### Net assessment

Self-grade: **B+**. Spec has concrete defects + architecture, but cuts corners on:
- Verification step before filter fix (SR-2)
- Research source list (SR-5, SR-7)
- Migration story for existing saved plans (SR-10)
- Active recovery composition rule (SR-11)
- Cost ceiling (SR-12)
- Chunking V3 vs trying to ship all 16 tasks together (SR-9)

Village should resolve these before issuing the implementation receipt.

---

## 9. Process for the Village (Phase 4 — Sean's P4)

Same as V2 §5: 13 Phase-1 analyst tracks + 3 Phase-2 specialty debates + escalation. Strategic-research track (Google grounding) MUST source the NASM CES taxonomy. NASM-fitness-science track validates day-type quotas + tempo/rest tables (Phase 2 superset rule, Phase 5 plyometric rule, etc.).

Codex stays in the loop per V2 §1.4 P4.

---

**End V3 draft. Hostile self-review applied (§8). Ready for Village dispatch.**
