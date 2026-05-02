# Workout Planner V2 — Intelligence Upgrade Spec (Pre-Village Draft)

**Owner:** Claude Opus 4.7
**Date:** 2026-05-02
**Status:** DRAFT — pending Codex gap-analysis pass, then 14-brain AI Village validation
**Source:** Sean's voice spec, dictated 2026-05-02 after the L1-L6 long-horizon arc closed

---

## 0. Why this exists

The L1-L6 workstream that just shipped (commits `089844f16` → `52d5ceaa3`) gave us populated multi-month plans and a working Month → Week → Day drill-down. After Sean reviewed the live UI, he flagged that **the planner is producing technically-valid but creatively-shallow workouts**:

- Same exercises every week of a mesocycle (no progression, no variation within the block)
- Push / Pull / Legs / Push / Pull / Legs / Full-body — no balance, no stability, no core, no NASM-correct split
- No active-recovery / stretch day at 6×/wk, no dedicated core day at 5×/wk
- Not pulling from the AI Swan Coach for creative generation
- Equipment table exists but is not deeply integrated
- Pain management data exists but doesn't drive *what* to prescribe (only what to exclude)
- Plans don't get smarter over time as client history accumulates

This V2 upgrade turns the populator into an **AI-augmented, NASM-correct, history-aware program generator**. We **build on** the existing infrastructure (variationEngine, clientIntelligenceService, registry) — we do NOT rebuild — unless Village review proves rebuild is materially better.

---

## 1. Sean's stated requirements (verbatim, organized)

### 1.1 Detailed Schedule UI (visible defects)

| # | Defect | Sean's words |
|---|---|---|
| D1 | Month tabs render even when not all months have weeks | "When I click on month one it should just only show the weeks that are available" |
| D2 | Same exercises every week of a mesocycle | "the week seemed like they were the same exercises every week for the whole month it's not really mixing things up" |
| D3 | No rep progression | "it's not trying to change the reps it's just keeping it all the way the same all way through" |
| D4 | No NASM balance + stability + core days | "where's no balance and stability like any ASM there's no core days there should at least be a core day and a balance" |
| D5 | Core day should integrate balance + stability | "the core day should be mixed with balance and stability as well" |
| D6 | 6-day weeks need a stretch / active recovery day | "if we were doing six days a week one of those days realistically should be a stretch day so it should be cool and stretching focusing on all the exercises we've done previously in the week" |
| D7 | 5-day weeks need a full core day | "if there's only a 5th day then that means we for sure need to get one core exercise day in for the week so that'll be like abs full AB day lower back ETC" |

### 1.2 AI / data integration requirements

| # | Requirement | Sean's words |
|---|---|---|
| AI1 | Generate button pulls from Swan Coach | "they need to be connected to the AI API that gives a solid prompt that we need to probably create that's gonna let it know that it needs to be creating workouts based off of this … should already be implemented into the Swan Studios coach so it should be pulling from the Swan Studios coach when I click generate with the AI" |
| AI2 | Workouts more versatile + creative | "more versatile be more creative" |
| AI3 | Swan Coach reads from the Rolodex | "the Swan Studios coach needs to be looking at the Rolodex all the exercises that are available there and then using an integrating those into the workout" |
| AI4 | Equipment table integration | "pull in the equipment table … gym move fitness park home et cetera that needs to be tied into this too as well so that when Swan Coach creates the programs they're creating it based off of programs that are available and equipment that's available" |
| AI5 | Client profile + previous workouts | "supposed to be always looking at the client's profile the previous workouts if they have any" |
| AI6 | Pain management — avoid + strengthen | "the pain management section if there's anything placed in the pain management section so that we make sure we're not giving workouts that are going to hurt areas that are already injured and we're going to give them workouts that will help them strengthen areas that are weak based off of their reports for functionality and body map etc" |
| AI7 | All connected to the hive mind | "this is supposed to be all connected to the hive mind" |
| AI8 | Smart algorithm, not Math.random | "this isn't a math dot random function this is an algorithm we're creating to be smart" |
| AI9 | Builds history over time | "If they don't have any history it's OK we just go ahead and give them a standard workout when we build that history from here and I keep adding information and then we keep taking and we keep making it better and building off of that" |

### 1.2.1 Sean follow-up additions (post-draft, voice 2026-05-02)

| # | Requirement | Sean's words |
|---|---|---|
| F1 | Month-tab → flat day list (cumulative day count for the month) | "Add all the days up for that month And I should be able to click on those days and then it will show the pool workout" — clicking month opens a flat list of every session in that month (e.g. 12 days for 3×/wk × 4 weeks; week boundaries become visual cues, not separate nav levels) |
| F2 | Existing detail-panel output is OK; upgrade it but keep model | "well actually that's what we do we have an output that shows the workout so that's cool we can upgrade that" |
| F3 | Workouts must be incrementing little by little | "I need to make sure that the workouts are thorough and they're different and we're incrementing little by little" |
| F4 | Apply NASM overload strategy concretely to reps + weight | "we should be incrementing adding more weight where necessary et cetera just like it says add one to two reps per week increase weight when hitting top of Rep range we should be utilizing that in the workout" |
| F5 | Plan → Logger model parity | "that's where it carries over to the workout logger where the same setup will be used the same model will be used with the workout logger so all that stuff should be put in and have added so I can go ahead and update what the client actually did in the workout" — the plan's prescribed sets / reps / **target weight** for a specific week+day must pre-fill the logger so the client/trainer just records actuals against it |

### 1.2.2 V2 design implications of F1-F5

- **F1 / F2 — drill-down restructure**: The current Month → Week → Day three-level nav becomes Month → flat-day-list (with subtle week separators) → existing detail panel. Day chips show absolute session number ("Day 7 of 96") AND relative ("Week 2 · Day 3"). Clicking any chip drives the existing detail card.
- **F3 / F4 — actual progression baked into the schema**: Per-day prescription (within `weeks[i].days[j].exercises[k]`) MUST carry concrete `targetSets`, `targetReps`, **`targetLoad` / `targetWeight`** values that increment week-over-week per the §3.2 progression scaffold. Today the plan emits a single `setScheme` per mesocycle; F3 / F4 require per-week values.
- **F5 — Plan → Logger contract** (extends L4): the L4 cursor prefill already pulls `currentSession.exercises[]` into the logger but does NOT carry per-set target weights. V2 adds:
  - `plan.weeks[w].days[d].exercises[e].sets[s] = { setNumber, targetReps, targetLoad, targetRpe? }`
  - L4 reads the cursor session's full sets array (with target weights) instead of synthesizing empty sets
  - Logger displays target as a ghost / hint; client/trainer types ACTUAL value over the ghost
  - Submission flow records `(actualReps, actualLoad, actualRpe)` against the prescribed targets
  - Variance becomes feedback into next plan generation (§3.6 smarter-over-time)

### 1.2.3 Sean follow-up additions ROUND 2 (post-Codex-gap-pass, voice 2026-05-02)

| # | Requirement | Sean's words |
|---|---|---|
| F6 | Logger missing Rolodex for admin/trainer routes | "I go to clients and team and I go to logging workout for whichever client it doesn't have the workout rolodex in there" — admin route surface to log a client's workout must mount the same Rolodex the trainer route uses |
| F7 | Balance/Core/Stability section becomes a Rolodex tab/filter | "I already said I wanted the balance core and stability section to become a workout Rolodex section where we just have all the balance core and stability exercises" |
| F8 | Cool down + Recovery section becomes a Rolodex tab/filter | "same with the cool down and recovery section" |
| F9 | Warm up + Corrective section becomes a Rolodex tab/filter | "same with the warm up and corrective section those are all supposed to be new sections added to the workout Rolodex as a whole" |
| F10 | Rolodex available for trainer + admin; client gated | "for all the trainer and the admin And of course we have a gate for the client as well" |
| F11 | Rolodex MESHES INTO the Workout Logger | "that is supposed to be meshed into the the workout logger basically so bring the workout Rolodex mesh it into the workout logger so it becomes one" |
| F12 | Get rid of separate warmup/corrective tabs | "get rid of those unnecessary tabs for the warm up and corrective we can go ahead and make sure those are already added into the workout Rolodex" |
| F13 | AI MUST always include warmup/corrective + balance/core/stability + cooldown/recovery in EVERY AI-generated workout | "I want the AI to be pulling from this as well to make sure that we have warm up and corrective balance core stability and cool down the recovery added to every single workout that we do … we shouldn't be missing none of this in any of the workouts that the AI creates those should always be in there" |
| F14 | Logger model parity for admin viewing client workouts | "Clients and team on the amend dashboard and then when we go to logging workout that section right there needs to be the same as for the trainer as well when they go log the workout it should be bringing in the same exact model view which is what it does but now we're gonna have the Rolodex as I said" |
| F15 | All this context + previous context goes to the Village | "I need all this information this context and all the previous context I gave in the little gaps that I've given to be added to the AI village so AI Village can be looking into all of this as well" |

### 1.2.5 Sean follow-up additions ROUND 3 (NASM protocol expansion, voice 2026-05-02)

| # | Requirement | Sean's words |
|---|---|---|
| F16 | AI should look up NASM-protocol corrective exercises for tight/short muscles, upper-cross syndrome, lower-cross syndrome, etc. | "I want the AI to go ahead and look up for these warm up and corrective balancing core stability and cool down recovery exercises based off of NASM protocol for tight muscles short muscles for cross shoulder syndrome lower cross shoulder syndrome all that that may be things that the client has" |
| F17 | Registry currently has only ~5 exercises per warmup/corrective/balance/core/stability/cooldown category — UNACCEPTABLE | "let's make sure that the AI knows to be looking and adding more exercises than what's already available 'cause there's only like five exercises per category and that's unacceptable we need more" |

### 1.2.6 V2 design implications of F16-F17

This is a **closed-set guarantee CONFLICT**: Codex finding 8.B HIGH said V2 must enforce closed-set output (AI picks from a fixed eligible pool). Sean's F16-F17 want the AI to bring in NEW exercises beyond the registry for NASM-correct corrective work.

Two reconciliation paths the Village must rule on:

**Path A — Expand the registry (preferred from a safety standpoint).** Seed the production `Exercise` model with the canonical NASM corrective taxonomy:
- Upper Crossed Syndrome (UCS) — inhibit (foam roll: pec major/minor, levator scap, upper trap, sternocleidomastoid); lengthen (static stretch: same); activate (ball/wall slides, cervical retraction, T-Y-W on stability ball, chin tucks); integrate (squat to row).
- Lower Crossed Syndrome (LCS) — inhibit (foam roll: TFL, hip flexor, erector spinae, lats); lengthen (kneeling hip-flexor stretch, 90/90, child's pose); activate (glute bridge, quadruped hip extension, ball squat to row); integrate (single-leg balance reach).
- Pronation Distortion Syndrome (PDS) — inhibit (foam roll: peroneal, IT band, adductors, TFL); lengthen (gastroc/soleus, adductor); activate (single-leg balance, tibialis anterior); integrate (single-leg squat).
- Generic warmup / cooldown / breathwork / recovery taxonomy — diaphragmatic breathing, prone breathing, supine breathing, foam-roll flows, dynamic stretch sequences, static stretch sequences, mobility flows.

Estimate: ~120-200 new exercise rows seeded with NASM-correct metadata (`bodyPartCategory: 'recovery'` or `'corrective'`, equipment tags, NASM CES strategy mapping). One-time seeder script.

**Path B — AI proposes net-new + trainer review queue.** AI is allowed to suggest exercises NOT in the registry; those become "pending additions" stored in a review queue; trainer/admin approves; on approval they become permanent registry rows tagged `source: 'ai-suggested-{date}'`. Higher implementation cost; introduces a moderation surface.

**Path C — Hybrid.** Path A for the canonical NASM CES taxonomy (high-confidence, ships fast); Path B for the long tail (AI can propose niche corrective drills; trainer-gated). Village to evaluate.

The Village MUST decide A vs B vs C, and if A or C, the Village provides the canonical NASM corrective exercise list (with file:line evidence from NASM CPT / CES study guides via Google grounding) so we don't invent it ourselves.

### 1.2.4 V2 design implications of F6-F15

- **F6 + F14**: The Workout Logger component IS already used on both trainer route + admin "log for client" route (we verified this in L4 — `EnhancedWorkoutLogger` wraps `WorkoutLogger`). The Rolodex is mounted on the trainer mount but the admin mount may not show it. V2 audit step: confirm `<NASMExerciseRolodex />` is reachable from the admin "log workout for client" path.

- **F7-F9 + F12**: The current Logger has THREE separate tabs/sections — Warmup & Corrective, Balance & Core, Cooldown & Recovery — plus the main exercise body that uses the Rolodex. Sean's vision: collapse all three into the Rolodex as filter chips ("Warmup", "Balance & Core", "Cooldown") so trainers add ANY exercise from any category through the same picker. The compact "recommended chips" affordance from `CompactProtocolSection` is preserved as a quick-add row inside the Rolodex.

- **F11**: "Mesh" implies the Rolodex isn't a separate modal — it's an inline picker that's part of the logger's primary flow. The current implementation is already inline-capable; Sean wants it to be the ONLY add-exercise affordance.

- **F13 (HARD CONSTRAINT)**: Every AI-generated session output must contain a non-empty selection from each of:
  - Warmup / Corrective (1-3 items)
  - Main exercise body (4-8 items)
  - Balance / Core / Stability (1-3 items, integrated into core day or appended to other days per NASM phase)
  - Cooldown / Recovery (1-2 items)
  
  If the AI returns a session missing any required category, the constraint validator inserts a deterministic default from the eligible Rolodex slice for that category before saving. NO session ships without all four categories represented.

- **F15**: This entire spec + all of Sean's voice notes go into the Village prompt.

### 1.3 UI / UX research requirements

| # | Requirement | Sean's words |
|---|---|---|
| UX1 | UI/UX analysis of current state | "we need to go ahead and run another UI UX umm an analyzation for based off of what we have and how we can make this better" |
| UX2 | Award-winning sites research | "we need to make sure that we're looking online and doing the research on how this UIUX should be set up based off of award-winning sites" |
| UX3 | Keep Rolodex unless better option found | "I just want to keep the exercise rolodex unless you have a better way that you find would be better you know for mobile responsive phones or desktop I'm pretty happy with what we have but I am willing to change if we feel that change is needed" |

### 1.4 Process requirements

| # | Requirement | Sean's words |
|---|---|---|
| P1 | Codex reviews this prompt for gaps | "I need you to have codecs go ahead and add the missing gaps that I may be missing" |
| P2 | First make this prompt better | "first make this prompt better and then create a brand new prompt based off this prompt" |
| P3 | Run through 15-brain Village | "we need to go ahead and run this through the whole entire AI village not just Kodak so we do the 15 brain AI village" |
| P4 | Codex stays in the Village loop | "we'll make sure that Codex is involved in this to in that 15 Brain AI village" |
| P5 | Online research enabled | "give that prompt to the AI village so we can go ahead and do the research you know online research we have the Google doing online research" |
| P6 | Build on what we have, only rebuild if materially better | "we need to build off of what we have here and it had to make better and only rebuild if you feel that the rebuild is going to be so much more better than what we have let's make sure to keep our logic and as I said we can upgrade it if it needs to be" |
| P7 | Enterprise 7-star Michelin level | "this is Enterprise 7 star Michelin star level" |

---

## 2. Existing infrastructure — what we already have (Rule 18 existing-pattern-first)

Before recommending changes, the following are **already live in production**:

### 2.1 Backend

| Surface | Status | File:line evidence |
|---|---|---|
| `getClientContext(clientId, trainerId)` aggregator | LIVE | `backend/services/clientIntelligenceService.mjs:220` |
| Pain exclusions + excludedMuscles + warnings | LIVE | `clientIntelligenceService.mjs:456-466, :716-718` |
| Movement compensations + exerciseScores + nasmPhaseRecommendation | LIVE | `clientIntelligenceService.mjs:721-726` |
| Equipment-by-location aggregation | LIVE | `clientIntelligenceService.mjs:539-557, :732` |
| Workout history summary | LIVE | `clientIntelligenceService.mjs:730` |
| Variation history (recentlyUsedExercises sliding window) | LIVE | `clientIntelligenceService.mjs:558-569, :734, :748` |
| Goals + body + baseline + nutrition + progress + streak + activeProgram | LIVE | `clientIntelligenceService.mjs:736-743` |
| `generatePlan()` long-horizon populator (post-L1) | LIVE | `backend/services/workoutBuilderService.mjs` |
| Per-day exercise rotation with 7-distinct strict rule | LIVE | `workoutBuilderService.mjs:780-885` |
| `selectExercises()` registry filter + scoring | LIVE | `workoutBuilderService.mjs:229-260` |
| Schedule→movement category expansion (round-4 fix) | LIVE | `workoutBuilderService.mjs:229-244` |
| Exercise registry from DB (840+ exercises, mapped from `Exercise` model) | LIVE | `backend/services/variationEngine.mjs:384-450` |
| `safeWorkoutBuilderDetails()` info-leak guard | LIVE | `backend/routes/workoutBuilderRoutes.mjs:53-73` |
| L5 client-self-service gate + env flag | LIVE | `workoutBuilderRoutes.mjs:43-72` |

### 2.2 Frontend

| Surface | Status | File:line evidence |
|---|---|---|
| Admin Workout Planner page (controls + generated plan + saved plans) | LIVE | `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` |
| Long-Horizon Month/Week/Day drill-down | LIVE (post-L2.C) | `LongHorizonScheduleView.tsx` |
| NASM Exercise Rolodex (virtualized search + filter chips + Teach Me preview) | LIVE | `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.tsx` |
| Viewport-adaptive density (6 mobile / 10 desktop) | LIVE (post-L2.B) | `NASMExerciseRolodex.tsx` |
| Compact protocol section (warmup/balance/cooldown) | LIVE | `frontend/src/components/WorkoutLogger/CompactProtocolSection.tsx` |
| Branded PDF exporter (Swan + MF text mark) | LIVE (post-L3) | `frontend/src/services/pdfExportService.ts:507+` |
| WorkoutLogger cursor-driven prefill | LIVE (post-L4) | `WorkoutLogger.tsx:687+` |
| Equipment Profile Picker + image upload | LIVE | `frontend/src/components/Shared/EquipmentProfilePicker.tsx` |
| AI Terminal Panel (Swan Coach surface) | LIVE | `frontend/src/components/Shared/AITerminalPanel.tsx` |

### 2.3 What is NOT yet wired

| Gap | Implication |
|---|---|
| Generate button does NOT call out to an LLM for creative augmentation | Plans are deterministic algorithm output, not AI-enhanced |
| Pain data is consumed (exclusions) but not used to **prescribe** strengthening exercises | "Avoid + strengthen" rule is half-implemented |
| Per-week within mesocycle: same exercises | No progression / variation within a block |
| No 5-day-core-day or 6-day-recovery-day rules | NASM correctness gap |
| No balance / stability / core day in the rotation pool | NASM correctness gap |
| Rep progression: scheme is set per-mesocycle, not per-week-within-mesocycle | No micro-progression |
| Goals → workout selection bias is partial (goalBias exists but underused) | Sean wants this stronger |
| No history-aware "smarter over time" loop | First and 50th plan look identical; no learning |
| No real-time AI prompt that combines: client snapshot + Rolodex catalog + equipment + goals + pain + recent variation history | Sean's core ask |

---

## 3. The V2 plan (proposed — Village to validate / refine / replace)

### 3.1 NASM-correct session split rules

For a given `sessionsPerWeek`, the rotation pool is rule-based, not pattern-based:

| Sessions/wk | Required day types | Reasoning |
|---|---|---|
| 1 | Full body (compound + core integration) | Single-session must cover everything |
| 2 | Upper / Lower OR Push-Pull-Legs (compressed full body) | Two-session split |
| 3 | Full body × 3 OR Push / Pull / Legs | NASM Phase 1-2 favors full body; Phase 3+ may use split |
| 4 | Push / Pull / Legs / **Core+Stability+Balance** | The 4th day is the missing piece Sean named |
| 5 | Push / Pull / Legs / Upper-Accessory / **Full Core Day** (abs + lower back) | D7 — Sean's explicit 5-day ask |
| 6 | Push / Pull / Legs / Upper / Lower / **Active Recovery + Stretch** (focuses on previous 5 days' movements) | D6 — Sean's explicit 6-day ask |
| 7 | (rare) 6-day rotation + extra full-body | Non-default; warn the trainer |

The exact split also varies by NASM OPT phase:
- **Phase 1 (Stabilization Endurance)**: heavy emphasis on stability, balance, core integration; full-body days dominate
- **Phase 2 (Strength Endurance)**: superset push/pull or upper/lower with stability; supersets are core
- **Phase 3 (Hypertrophy)**: split-style training; balance + core moved to dedicated days
- **Phase 4 (Maximal Strength)**: split-style; balance + core deemphasized but not removed
- **Phase 5 (Power)**: power-focused; reactive + plyometric integration

### 3.2 Per-week within-mesocycle progression

Within a 4-week mesocycle, every week has the **same exercise pattern** but with progression on:

| Variable | Week 1 | Week 2 | Week 3 | Week 4 (deload optional) |
|---|---|---|---|---|
| Sets | base | base | base + 1 | base or -1 |
| Reps | low end of range | mid | high end | mid |
| Load (% of phase intensity) | base | base + 2.5% | base + 5% | base |
| Tempo | as phase | as phase | slightly faster eccentric | as phase |
| Volume (total sets × reps) | base | + ~10% | + ~20% | -20% if deload |

Exercise selection should also rotate within the block (sliding-window already exists; extend it to bias toward variety inside a mesocycle, not just avoid recent-7).

### 3.3 AI-augmented generation flow

**Core principle**: deterministic algorithm produces a **draft**, AI produces **enhancements + variety + creative substitutions**, deterministic constraint check filters AI output for safety.

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1 — Client snapshot (existing getClientContext)            │
│  - pain, movement, equipment, goals, baseline, history,          │
│    NASM phase recommendation, recently-used keys                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2 — Deterministic skeleton (existing generatePlan + V2     │
│  session split rules)                                            │
│  - Mesocycle structure (NASM phase sequence)                     │
│  - Day type per session (push / pull / legs / core / recovery)   │
│  - Per-week progression scaffold (sets/reps/load/tempo/volume)   │
│  - Eligible exercise pool per day (filtered by registry +        │
│    equipment + pain exclusions)                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3 — Swan Coach LLM enhancement pass (NEW)                  │
│  Inputs:                                                         │
│    - Skeleton from Step 2 (exercises chosen + day structure)     │
│    - Eligible Rolodex slice (allowed exercises with metadata)    │
│    - Client snapshot (PII-free per Rule 8)                       │
│    - Goals + bias                                                │
│    - Recent variation window (last 7-14 sessions)                │
│  Output:                                                         │
│    - Per-day creative substitutions (replace 1-2 exercises with  │
│      better-fit variants from the eligible pool)                 │
│    - Per-day notes for the trainer (cueing reminders, "watch     │
│      for X compensation", "progress to Y next mesocycle")        │
│    - Validation: AI is given the eligible pool — it MUST pick    │
│      from that pool; we reject any output referencing exercises  │
│      not in the pool (closed-set guarantee)                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4 — Constraint re-validation (deterministic)               │
│  - Final filter: pain exclusions, equipment availability,        │
│    NASM-level appropriate, no recent-window repeat               │
│  - If AI output violates any constraint → fall back to skeleton  │
│    for that day (fail-safe)                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5 — Final plan + audit trail                               │
│  - Each day annotated with `source: 'auto-populated' | 'ai-      │
│    enhanced' | 'fallback-after-ai-violation'`                    │
│  - `aiPromptHash` recorded so debugging can reproduce inputs     │
│  - Recommendations + recommendationDetails get AI-generated      │
│    "why this plan" section                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Pain-aware "avoid + strengthen" logic

Two concrete behaviors:

1. **Avoid (already partially done)**: pain entries → excluded muscles → registry filter drops exercises that load those muscles in a problematic plane.

2. **Strengthen (new)**: pain entries → corresponding stabilizers / antagonists → bias the eligible pool toward exercises that strengthen the **support structures** for the painful area. Example:
   - Lower-back pain → bias toward glute bridge, dead bug, bird dog, hip-flexor mobility (NASM CES-aligned)
   - Shoulder impingement → bias toward scapular retraction, external rotation, T-Y-W
   - Knee pain → bias toward glute med + adductor + ankle mobility
   - Maps already exist partly in `clientIntelligenceService.compensations` — we expand the mapping table.

### 3.5 Equipment-by-location integration

`getClientContext.equipment` already returns `equipmentByLocation: [{ location, items: [...] }]`. The V2 generation flow:

- Trainer / client picks **target location** for the plan (or "any of my locations" — multi-location merge).
- Equipment available at that location becomes the hard constraint at Step 2 deterministic skeleton.
- Step 3 LLM is told the location + equipment items so creative substitutions stay realistic.
- New `planSummary.targetLocation` field. Pre-V2 plans default to "any" for backwards compat.

### 3.6 Smarter-over-time loop

History-aware bias accumulates over the client's lifetime:
- **Workout history** — already in `clientIntelligenceService.workouts`. V2 surfaces "last 7-14 sessions' RPE / form quality" to bias next session intensity.
- **Form quality trend** — if last 3 sessions of an exercise had `formQuality < 3`, bias away from that exercise OR insert a corrective drill prerequisite.
- **RPE trend** — if RPE consistently below target → progress; consistently above → deload or substitute.
- **Streak / consistency** — if streak < 7 sessions → standard plan; if streak ≥ 30 sessions → unlock more advanced phases.
- **Plan effectiveness scoring** (new) — when a client completes a mesocycle, compute a score (form quality avg, RPE consistency, attendance %) and feed into the next plan generation.

### 3.7 UI/UX changes

| Change | Rationale |
|---|---|
| Month tabs only render for months with weeks | D1 fix |
| Per-week tab labels include progression delta ("Week 2: +1 set", "Week 4: deload") | D3 + transparency |
| Day chips colored by day-type (push=blue, pull=cyan, legs=purple, core=gold, recovery=mint) | NASM phase-correct visual grouping |
| New "Generate with Swan Coach" CTA next to the existing Generate button (or replace existing) | AI1 wire-up |
| Equipment / location selector in the generation control row | AI4 + 3.5 above |
| Pain-aware indicator pill when pain entries are present ("3 pain entries inform this plan") | Trust + transparency |
| Optional "Why this plan?" expandable card per mesocycle | UX2 (award-winning sites: explain-the-recommendation) |
| Keep the Exercise Rolodex (UX3 — Sean's preference) | UX3 |
| Mobile responsive matrix verified per Rule 24 | Standard |

### 3.8 What we are NOT changing (intentional)

| Decision | Why |
|---|---|
| Database schema (planData JSONB) | L1 contract is strictly additive — no migration |
| Rolodex component design | Sean's UX3 |
| Existing dashboard architecture | Out of scope |
| Backend route surface | Existing routes serve V2; the AI call is internal |
| The NASM 5-phase periodization sequence | Industry-standard, do not invent new phases |

---

## 4. Open questions for the Village

1. **AI provider for Swan Coach generator step**: Gemini (already wired), Claude (already wired via Hermes / consult), or per-step routing? Cost vs latency trade-off?
2. **Closed-set guarantee implementation**: best pattern for forcing the LLM to pick from a fixed pool (function-calling? structured-output JSON schema? string-matching post-filter?). Award-winning approach?
3. **Cache strategy**: the AI step adds latency. Cache by `(clientContextHash, registrySliceHash, planParametersHash)` to dedupe identical generations?
4. **Failure modes**: AI timeout, AI returns invalid JSON, AI references out-of-pool exercise — fallback ladder?
5. **Cost ceiling**: per-plan generation cost cap. Hard ceiling vs soft ceiling with degraded mode?
6. **Trainer override**: when the AI chooses, should the trainer get a "see the deterministic alternative" toggle?
7. **History-aware bias decay**: how far back does form/RPE/attendance influence current generation? 30 days? 90 days? Recency-weighted?
8. **NASM phase assignment**: today recommended by `clientIntelligenceService.nasmPhaseRecommendation`. V2 — should the AI advocate phase progression or stay anchored to that recommendation?
9. **Multi-location plans**: a client trains at home M-W-F and gym Tu-Th. How does location-aware generation handle mixed-location plans?
10. **Rebuild vs upgrade**: of the V2 changes, are any so far-reaching they justify rebuilding `generatePlan` from scratch? Current bias: NO — extend, don't replace.
11. **UI/UX research**: which 3-5 award-winning training-app or LMS interfaces should we benchmark? (TrainerRoad, Strong, Future, Caliber, Ladder, Whoop coaching, MyFitnessPal Premium?)
12. **Privacy**: Rule 8 (zero PII to LLMs). The AI step gets client snapshot + goals + pain + equipment — all of these are non-PII when scoped to IDs and tags. Confirm the prompt template is PII-free.

---

## 5. Process for the Village

1. **Phase 1 — 13 parallel analysts** review this spec across their tracks (UX research, security planning, performance, competitive intel, persona alignment, risk, frontend patterns, data safety, API design, module architecture, mobile edge cases, code architecture, strategic research with Google grounding).
2. **Phase 2 — 3 specialty debates** (security, architecture, design) refine the highest-stakes decisions — particularly the AI prompt template, the closed-set guarantee, and the NASM phase rules.
3. **Phase 3 — escalation** for anything that hits CRITICAL.
4. **Codex final gate** (per Rule 46) on the Village's synthesis.

Output expected: a Village-synthesized **V2 receipt** that I (or a future agent) can implement against, with locked decisions on the 12 open questions above.

---

## 6. Constraints (CLAUDE.md rules apply)

- Rule 4 — Max 300 LOC per file (any new component)
- Rule 6 — `var(--token, #fallback)` pattern
- Rule 8 — Zero PII to LLMs (prompt template scrubbing required)
- Rule 18 — Existing-pattern-first (we extend, don't rebuild)
- Rule 22-25 — Premium design + dual-pass + responsive matrix
- Rule 26-29 — Canonical Surface Receipt + Schema Cross-Check before any code lands
- Rule 50 — Tier-A + Tier-B + (this run is) Tier-C Village pass
- Rule 51 — Confidence tags on factual claims
- Rule 56 — Tier-A baseline disclosure on any test claims
- Rule 58 — Proactive schema-drift detection if any new column proposed
- Crystalline Swan only; NO Material-UI; NO Recharts; NO Grok / X-AI

---

## 7. Success criteria (how we know V2 is done)

- A 12-month / 5×wk plan generated by V2 has: NASM-correct session split (push / pull / legs / accessory / **full core day**); per-week progression on sets / reps / load / volume; AI-enhanced creative substitutions from the eligible Rolodex slice; PDF export still works.
- A 6×wk plan has at least one active-recovery / stretch day focused on the prior 5 days' movements.
- Pain entries in `painManagement` measurably steer the plan: excluded muscles dropped + supporting-stabilizer exercises promoted.
- Equipment from a chosen location is the only equipment used in that plan.
- A 2nd plan generated 30 days later for the same client looks **different** from the 1st, informed by the workout history accumulated in between.
- All Codex review findings closed before merge.
- Tier-A green; Tier-B (3-Brain) APPROVE; Village synthesis converged.

---

**End original draft. Codex gap analysis applied below — Village must address all findings.**

---

## 8. Codex pre-Village gap analysis (2026-05-02 18:41 UTC, 89.8s, model `openai/gpt-5.5-20260423`)

Full output saved at `AI-Village-Documentation/codex-consults/2026-05-02T18-41-26.md`. Findings the Village MUST address:

### 8.A Requirements gaps (HIGH)

1. **NASM day-type quotas not measurable.** "Core day" needs concrete rules: e.g. ≥2 anti-extension/anti-rotation, ≥1 balance, ≥1 low-back/posterior-chain stability, ≥1 mobility/corrective. Repro: POST `/api/workout-builder/plan` with `sessionsPerWeek=4` → `weeklySchedule` returns push/pull/legs/push, NOT push/pull/legs/core-stability.
2. **Active recovery taxonomy underspecified.** Does it use `category='corrective'`, `recovery`, `cardio`, mobility, breathwork, foam rolling, yoga-flow, or all? Define enum + minimum quotas.
3. **Progression must differ by exercise type.** Compound lifts vs isolation vs core holds vs mobility vs balance vs plyo vs recovery — each has a different progression curve. Phase-level constants are insufficient. Evidence: today's plan exercises only emit `setNum`, `repString` from `OPT_PHASE_PARAMS[phase]` constants — no week-or-history awareness (`workoutBuilderService.mjs:848-866`).
4. **"Creative but safe" limits.** Define: max 1-2 AI swaps/day; no swapping primary movement pattern on strength days; no high-impact substitution for pain/Phase 1 clients; no novel advanced exercises during deload.
5. **Long-horizon plan → saved/current contract.** Today the save handlers build a separate one-week `planData` from `planExercises`, NOT from `generatedPlan.weeks` (`WorkoutPlannerPage.tsx:568-603`). V2 needs explicit "save 12-month plan as draft/current" path.
6. **Trainer override workflow.** When trainer hand-edits a day after AI generation: persist into JSONB? Re-trigger progression? Re-validate? Codex flag.
7. **Equipment-location not wired from frontend.** Backend route accepts `equipmentProfileId` (`workoutBuilderRoutes.mjs:208-231`) but `handleGeneratePlan` doesn't send it (`WorkoutPlannerPage.tsx:536-544`). All current plans generate without equipment filtering.

### 8.B Hidden technical risks (HIGH)

8. **"Recent 7 sessions" is actually last 7 exercise keys, not 7 sessions.** Comment lies; impl passes `recentExerciseKeys.slice(-7)` (`workoutBuilderService.mjs:766-771`, `:825-832`). Day N only avoids the final 7 exercises from prior days, not the prior 7 sessions × ~6 exercises = ~42 keys.
9. **`selectExercises()` does NOT actually accept array categories.** Round-4's expansion uses `switch(category)`; if caller passes an array, `movementCats.includes(ex.category)` would compare to the array object, not its elements. Comment claim is inaccurate (`workoutBuilderService.mjs:222-247`).
10. **AI closed-set output can break on identity drift.** DB registry uses `ex.exercise_key || db-${id}` (`variationEngine.mjs:438`); planner save uses `exerciseSlim.id` as `exerciseId` (`WorkoutPlannerPage.tsx:590-591`). V2 must standardize: `exerciseKey` vs DB numeric id vs `db-${id}`.
11. **Pain "strengthen" needs medical-safety boundaries.** Severity caps, fail-closed on high-severity / recent pain, trainer-review gate before strengthening prescriptions ship to clients. Today only avoidance is implemented (`clientIntelligenceService.mjs:456-491`).

### 8.C Additional Village debate questions (15 questions)

12-26. Beyond the 12 in §4: canonical day-type enum, minimum quotas per type, target-load when no 1RM exists, unit/rounding (lbs vs kg, dumbbell pair vs per-hand, machine increments), upfront vs lazy generation, edit-vs-progression interaction, AI latency budget (5s? 15s? async?), sync HTTP vs async job, client self-gen route gating, draft-vs-published, audit fields (`aiPromptHash`, `model`, `latencyMs`, `fallbackReason`, `schemaVersion`), equipment-changed-after-generation, recovery-day "focus on prior 5 days" computation, trainer-configurable pain maps, AI substitution vs DB difficulty rounding.

### 8.D Schema-drift hazards (CRITICAL)

27. **CRITICAL: `exercises[].sets` from number → array of set objects breaks Logger.** Today logger creates N sets from `ex.sets.length` or `Number(ex.sets)`, but each actual set uses `weight: ex.weight || 0` and `reps: ex.targetReps || ex.reps || 10`, IGNORING per-set target fields (`WorkoutLogger.tsx:701-717`). V2 must add `setsDetailed` or `prescribedSets` as an ADDITIVE sibling, not replace `sets`.
28. **HIGH: V2 needs `planData.schemaVersion`.** Without it, V1 and V2 plans are indistinguishable to logger / planner / PDF / cursor code.
29. **HIGH: keep all existing fields additive.** `sets`, `reps`, `setScheme`, `repGoal`, `restPeriod`, `tempo`, `intensityGuideline` MUST remain. New: `targetSets`, `targetReps`, `targetLoad`, `prescribedSets`. Don't replace.
30. **MED: `exerciseId` identity must be stable.** Add `exerciseKey` and `exerciseDbId` separately rather than overloading `exerciseId`.
31. **MED: `currentSession` cursor compatibility rules.** If backend strips new V2 fields, logger parity fails even if JSONB stores them.

### 8.E Privacy / Rule-8 hazards (CRITICAL)

32. **CRITICAL: Raw `getClientContext()` is NOT safe to send to LLM.** Includes `clientName`, free-text goal `title`, free-text pain descriptions, free-text equipment profile `name`. Prompt MUST use a scrubbed DTO via a new `clientContextPromptSanitizer` service.
33. **HIGH: Pain entries are health data.** Reduce to abstract tags `{region:'lower_back', severityBand:'high', recencyBand:'<72h', excludedMuscles:[...]}`. Drop IDs and free text.
34. **HIGH: `aiPromptHash` should HMAC with server salt.** Never expose prompt text to frontend.
35. **MED: Goals + equipment names** can reveal identity through unique strings. Use normalized categories + types, not raw labels.

### 8.F Performance / scale (HIGH)

36. **HIGH: scale undercount.** 12 months × 5/wk = ~260 sessions × 6 exercises = ~1,560 prescriptions (NOT 432). At 7/wk: ~2,184. The spec's earlier example was wrong.
37. **HIGH: full Rolodex slice per day to LLM = token budget explosion.** 840+ exercises. V2 must narrow eligible pool to top 20-40 candidates per day OR send one AI call per mesocycle/day-type instead of per-day.
38. **MED: synchronous `/plan` route may time out** with AI step. Consider async job + polling.
39. **MED: caching key MUST include safety inputs** — pain exclusions, equipment profile, goal, phase, registry version, recent workout window, schema version. Otherwise stale unsafe plans get reused after pain/equipment changes.

### 8.G Codex's rebuild-vs-extend recommendation

**EXTEND, do not rebuild.** Concrete extension plan Codex prescribed:

- Replace rotation-pool logic inside `generatePlan()` with `buildWeeklyDayTypes({sessionsPerWeek, phase, goal})`.
- Add `buildProgressionForWeek({phase, weekInMesocycle, exerciseType, baseline1RM/history})`.
- Extend pain/compensation maps + goal-bias scoring (avoid + strengthen).
- Wire frontend `equipmentProfileId` into plan generation; backend already accepts it.
- Modify `LongHorizonScheduleView` from Month→Week→Day to Month→flat-day-chips.
- Extend `loadTodaysPlan()` to preserve prescribed per-set targets as ghost hints.

Five new small modules (each ≤300 LOC):
1. `planDayTypeService.mjs` — NASM split rules
2. `planProgressionService.mjs` — week-by-week sets/reps/load
3. `aiWorkoutEnhancementService.mjs` — closed-set LLM enhancement + validation
4. `workoutPlanSchemaAdapter.mjs` — V1/V2 JSONB compatibility
5. `clientContextPromptSanitizer.mjs` — Rule-8-safe AI prompt DTO

Rebuild only if: extending makes `generatePlan()` untestable (it's already large — extraction strongly preferable to replacement); or if flat-month + progression badges exceeds a clean patch on `LongHorizonScheduleView`.

**Do NOT rebuild Rolodex.** Already virtualized + viewport-adaptive. Sean wants it kept.

---

## 9. Village charge

Take §1-§8 as input. Run all 13 Phase-1 analyst tracks + 3 Phase-2 specialty debates + escalation. Resolve every Codex finding above (esp. CRITICAL #27 schema drift + #32 privacy). Decide: of the 12 §4 questions + 15 Codex §8.C questions, lock decisions before code. Output a Village-synthesized V2 receipt with concrete file-level scope, ordering, and acceptance criteria.

**End spec.**
