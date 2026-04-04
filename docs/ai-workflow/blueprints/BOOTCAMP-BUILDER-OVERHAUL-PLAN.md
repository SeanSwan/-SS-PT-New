# Bootcamp Class Builder Overhaul — AI Village Planning Document

## 1. PROBLEM STATEMENT

The Bootcamp Builder has a strong backend (12 models, 12-step generation pipeline, sprint planner) but critical gaps in usability and integration:

### User Complaints:
1. **Exercise Rolodex not visible** — 840+ exercises exist in the database and the bridge is built, but there's NO UI to search/browse/manually select exercises
2. **Equipment Profile disconnected** — UI has a picker, model exists, but the generator NEVER uses it to filter exercises
3. **Limited class formats** — Only 4 formats (4x, 3x5, 2x7, full_group). Missing: EMOM, Tabata, AMRAP, Hybrid
4. **AI is not real AI** — Generation uses deterministic algorithms, not the Hive Mind LLM system
5. **Not in trainer dashboard** — Only accessible via admin sidebar
6. **No manual exercise selection** — Everything is auto-generated, trainer can't choose specific exercises
7. **No Teach Me mode** — New trainers don't know how to use the builder
8. **Mobile responsiveness** — Not tested on mobile

## 2. CURRENT STATE

### Built & Working:
- 4 class formats with station-based exercise distribution
- 4 class styles (standard, pyramid, superset, mixed)
- 6 intensity categories
- NASM OPT Phase 1-5 selection
- Flow optimization (fast/slow setup interleaving)
- Two-board system (main + modifications)
- Pain-aware exercise flagging
- Overflow plan (lap rotation for oversized classes)
- Warm-up stretch generation by day type
- 12-week sprint planner with cross-sprint exercise memory
- Class history logging with ratings
- Space profile CRUD

### Broken / Disconnected:
- **Equipment Profile**: `equipmentProfileId` passed to API but NEVER used in `bootcampGenerator.mjs`
- **Exercise Rolodex UI**: `GET /api/bootcamp/exercises` endpoint exists but no frontend search component
- **LLM Integration**: AITerminalPanel in right panel is placeholder only
- **No manual mode**: Can't manually pick exercises from the Rolodex
- **No time enforcement**: Frontend allows 20-90 min, no 55-min class cap

## 3. PROPOSED CHANGES

### 3A. Connect Equipment Profile to Generator
**Fix**: In `bootcampGenerator.mjs`, replace `getExerciseRegistry()` with `queryExercisesForBootcamp()` from `exerciseRolodexBridge.mjs`, passing the equipment profile's available equipment list.

### 3B. Add Exercise Rolodex Search UI
**New component**: `ExerciseRolodexPanel` — searchable, filterable exercise browser
- Search by name, muscle group, equipment, difficulty
- Filter chips: body part, equipment type, OPT phase
- Click to add exercise to a specific station (manual mode)
- Drag-and-drop reordering within stations
- Exercise cards show: name, primary muscles, equipment, difficulty badge, pain mods

### 3C. Manual + AI Hybrid Mode
Two modes available:
1. **AI Generate** (existing) — AI builds the entire class
2. **Manual Build** — Trainer selects exercises from Rolodex, assigns to stations
3. **Hybrid** — AI generates, trainer edits (add/remove/swap exercises)

### 3D. Add Missing Class Formats
New formats to add (with timing configs):

| Format | Description | Timing | Stations |
|--------|-------------|--------|----------|
| **EMOM** | Every Minute On The Minute | 60s cycles, exercises fit within | Dynamic |
| **Tabata** | 20s work / 10s rest × 8 rounds | 4 min per exercise, 8 rounds | None (full group) |
| **AMRAP** | As Many Reps As Possible | X minutes per block (3-5 min) | None (full group) |
| **Hybrid** | Warm-up stations + full group + finisher | Split timing | Mixed |
| **Circuit** | Time-based circuit, all same exercises | 30-45s work, 15s rest | None (circuit) |
| **Partner** | 2-person stations, one works one rests | I-go-you-go timing | Paired stations |

### 3E. 55-Minute Class Limit
- Hard cap: `totalClassMin = workoutMin + demoMin(5) + clearMin(5) + stretchMin(3)` ≤ 55
- Backend validates and rejects if over
- Frontend shows real-time timing bar that turns red if exceeding 55 min
- Auto-adjust: if over limit, suggest reducing exercises or station time

### 3F. Connect to AI Hive Mind
Integrate with the Coach Assistant AI system for:
- **Intelligent exercise selection** — LLM ranks exercises by relevance to day type, client pain entries, equipment available
- **Smart explanations** — LLM explains WHY each exercise was chosen (not hardcoded strings)
- **Modification suggestions** — LLM generates custom modifications for injuries
- **Post-class recommendations** — After logging a class, LLM suggests what to change next time
- Use `aiChatService.mjs` for LLM calls (Gemini Flash for speed)

### 3G. Add to Trainer Dashboard
Currently only in admin sidebar. Add to trainer sidebar at same route.

### 3H. Teach Me Mode
Add TeachMeToggle to every section of the Bootcamp Builder:

| Section | Teach Me Content |
|---------|-----------------|
| **Format Selection** | What each format means, when to use it, timing implications |
| **Day Type** | Which muscles are targeted, how to structure the week |
| **Class Style** | Standard vs Pyramid vs Superset — when and why |
| **Intensity** | RPE ranges, who each level is for, safety considerations |
| **Equipment Profile** | How to set up profiles, what happens when equipment is limited |
| **Exercise Rolodex** | How to search, filter, and manually select exercises |
| **Station Assignment** | How exercises flow between stations, setup time considerations |
| **Two-Board System** | Board 1 vs Board 2 — when to use modifications |
| **Sprint Planning** | How 12-week cycles work, deload weeks, progression strategies |
| **Flow Score** | What the flow optimization score means, how to improve it |

### 3I. Mobile Responsive Rebuild
Current 3-pane layout doesn't work on mobile. Redesign:
- **Mobile**: Single-pane with bottom sheet for config, swipe for preview/detail
- **Tablet**: 2-pane (config left, preview right)
- **Desktop**: 3-pane (config | preview | detail)
- Large touch targets (44px+) for station/exercise selection
- Swipe gestures to move between Board 1 and Board 2

## 4. UX FLOW: MANUAL + AI HYBRID

```
┌──────────────────────────────────────────────────────────────┐
│ [AI Generate ▼]  [Manual Build]  [Hybrid]  [? Teach Me]     │
├──────────────────────────────────────────────────────────────┤
│ Format: [4-Station ▼]  Style: [Standard ▼]  Day: [Lower ▼]  │
│ Duration: [50 min]  Participants: [12]  Equipment: [Gym ▼]   │
│ [🎯 Generate Class]                                          │
├──────────┬─────────────────────────────┬─────────────────────┤
│ Exercise │ Class Preview               │ Exercise Detail      │
│ Rolodex  │                             │                      │
│ ┌──────┐ │ ┌─ Station 1 ──────────┐   │ 📋 Barbell Squat    │
│ │Search│ │ │ Barbell Squat   35s  │   │ Muscles: Quads,     │
│ │......│ │ │ Leg Press       35s  │   │   Glutes, Core      │
│ │      │ │ │ [+ Add Exercise]     │   │ Equipment: Barbell  │
│ │Quads │ │ └──────────────────────┘   │ Difficulty: 600     │
│ │▸ Sqt │ │                             │ Phase: 2-4          │
│ │▸ Lunge│ │ ┌─ Station 2 ──────────┐   │                      │
│ │▸ Press│ │ │ DB Bench Press  35s  │   │ Pain Mods:          │
│ │      │ │ │ Cable Fly       35s  │   │ 🦵 Knee: Wall Squat │
│ │Glutes│ │ │ [+ Add Exercise]     │   │ 🔙 Back: Goblet Sqt │
│ │▸ Brdg│ │ └──────────────────────┘   │                      │
│ │▸ Hip │ │                             │ [Ask AI for help]    │
│ └──────┘ │ Timing: 48/55 min ████░░   │                      │
├──────────┴─────────────────────────────┴─────────────────────┤
│ [Board 1: Main]  [Board 2: Modified]  Flow: 87/100 ████████ │
│ [💾 Save Template]  [📄 Export PDF]  [📋 Log Class]          │
└──────────────────────────────────────────────────────────────┘
```

## 5. FILES TO MODIFY

### Backend:
- `backend/services/bootcamp/bootcampGenerator.mjs` — Connect equipment profile, add new formats
- `backend/services/bootcamp/bootcampConstants.mjs` — Add EMOM, Tabata, AMRAP, Hybrid, Circuit, Partner configs
- `backend/services/bootcamp/exerciseRolodexBridge.mjs` — Ensure equipment filtering works
- `backend/routes/bootcampRoutes.mjs` — Add validation for 55-min limit

### Frontend (Rebuild):
- `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx` — Add mode toggle (AI/Manual/Hybrid)
- `frontend/src/components/BootcampBuilder/ConfigPanel.tsx` — Add new formats, Teach Me toggles
- `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx` — Add manual exercise add/remove, timing bar
- `frontend/src/components/BootcampBuilder/ExerciseDetailPanel.tsx` — Wire to AI Coach
- NEW: `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx` — Searchable exercise browser
- `frontend/src/components/BootcampBuilder/BootcampBuilderConstants.ts` — Add new format configs

### Route Changes:
- Add bootcamp to trainer sidebar (TrainerStellarSidebar.tsx)
- Verify route works for both admin and trainer roles

## 6. INLINE REGRESSION/EASIER OPTIONS (EVERY EXERCISE)

### Current State:
Board 2 exists but is hidden behind a toggle — trainer has to switch boards to see alternatives. During a live class with 12 people, you don't have time to flip between boards.

### New Design:
Every exercise in the class preview should show its **regression (easier version)** directly inline:

```
┌─ Station 1 ─────────────────────────────────────────┐
│ 1. Barbell Back Squat        35s   🟢 Medium        │
│    ↳ Easier: Goblet Squat (DB) or Bodyweight Squat  │
│                                                      │
│ 2. Walking Lunges             35s   🟢 Medium        │
│    ↳ Easier: Stationary Lunge (supported) or Step-Up│
│                                                      │
│ 3. Leg Press Machine          35s   🟡 Easy          │
│    ↳ Easier: Wall Sit (bodyweight)                   │
│                                                      │
│ 4. Box Jumps                  35s   🔴 Hard          │
│    ↳ Easier: Step-Ups (no jump) or Squat Jumps (low)│
└──────────────────────────────────────────────────────┘
```

### Implementation:
- **Exercise model already has**: `easyVariation`, `kneeMod`, `shoulderMod`, `ankleMod`, `wristMod`, `backMod`
- Show the `easyVariation` as the primary regression
- If specific pain mods exist (knee, back, etc.), show those as contextual options
- Color-coded difficulty badges: 🟢 Easy, 🟡 Medium, 🔴 Hard
- On the **printed/texted class plan**, include both main + easier option for every exercise
- Trainer can verbally say "Station 1, if squats are too hard, do goblet squats instead"
- AI should generate a regression for EVERY exercise — if `easyVariation` is null, the AI fills it

### Board 2 Enhancement:
Keep Board 2 as a full alternative class plan, but ALSO show inline regressions on Board 1. Board 2 becomes the "completely different workout" option (e.g., chair-based for seniors), while inline regressions are quick mid-exercise swaps.

## 7. QUESTIONS FOR AI VILLAGE
1. Should EMOM/Tabata/AMRAP be separate formats or sub-styles within existing formats?
2. What's the optimal station count for a 55-min class at each format?
3. Should the Exercise Rolodex be a sidebar panel or a modal overlay on mobile?
4. How should equipment constraints interact with class styles (e.g., pyramid requires weight plates)?
5. Should the AI generate the ENTIRE class first, then trainer edits, or should the trainer set up stations first and AI fills gaps?
6. What industry-standard group fitness timing protocols should we reference?
7. Should the Teach Me content be static markdown or AI-generated dynamically?
8. How should we handle the case where equipment profile has limited gear but the format requires specific equipment?
