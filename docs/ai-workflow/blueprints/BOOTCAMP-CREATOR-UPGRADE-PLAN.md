# Bootcamp Creator — Full Upgrade Plan

> **Author:** Sean (Owner/Trainer) + Claude Opus 4.6 (CEO)
> **Date:** 2026-04-02
> **Status:** PLANNING — Submit to AI Village for 14-brain consensus
> **Priority:** HIGH — This is a revenue-driving feature for group fitness classes

---

## 1. Current State Analysis

### What Exists (Phase 10 — Built)
- **Frontend:** `BootcampBuilderPage.tsx` (723 lines — exceeds 300-line limit)
- **Backend Service:** `bootcampService.mjs` (569 lines — exceeds 300-line limit)
- **Backend Routes:** `bootcampRoutes.mjs` (245 lines)
- **6 Database Models:** BootcampTemplate, BootcampStation, BootcampExercise, BootcampSpaceProfile, BootcampClassLog, BootcampOverflowPlan
- **Equipment Integration:** EquipmentProfilePicker already embedded, FK to EquipmentProfile
- **API Hook:** `useBootcampAPI.ts` (250 lines)
- **PDF Export:** Via `pdfExportService.ts`

### What's Missing (Sean's Requirements)
1. **Pyramid Class Format** — Heavy→medium→light weight drops to failure
2. **Superset Class Format** — Compound heavy→bodyweight→banded (same muscle group, failure)
3. **Mixed Ability Support** — Two-board system: Board 1 (main intensity) + Board 2 (easier alternatives)
4. **Setup Time Flow Management** — Ensure nobody waits while others set up equipment
5. **Quick Stretch Module** — 3-5 min targeted stretch warm-up for muscles being worked
6. **Flexible Format Options** — Variable exercises/duration (e.g., 4 exercises × 50s × 2 rounds, OR 8 exercises × 1 round)
7. **AI Hive Mind Integration** — 3-brain consensus for class generation (Gemini Flash → Qwen → Gemini Pro)
8. **Equipment-Aware Generation** — AI considers what equipment is at the selected location
9. **Coach Assistant Integration** — Chat interface to tweak classes conversationally
10. **File decomposition** — Break 723-line monolith into <300-line files

---

## 2. Sean's Training Philosophy (CRITICAL — Domain Knowledge)

### Standard Station Format (Current)
- 4-5 stations, 3-4 exercises per station written on a whiteboard
- 40 seconds per exercise, 3 rounds per station
- Trainer circulates to check form while class works independently at stations
- 45 minutes working out + 5 min demo + 5-10 min clear/transition = 55-60 min total

### NEW: Pyramid Format
- Start at heaviest weight the client can manage
- Do as many reps as possible
- Drop 20 lbs, continue reps
- Drop again, continue until failure
- **Mixed ability handling:** Clients who can't do pyramids get a separate board with standard exercises (1 set of 12) while advanced clients pyramid
- Trainer needs to be able to switch between pyramid days and standard days

### NEW: Superset Format
- Exercise 1: Heavy compound (e.g., heavy chest press)
- Exercise 2: Bodyweight (e.g., push-ups)
- Exercise 3: Light banded/resistance (e.g., banded fly)
- All 3 target the SAME muscle group
- Goal: failure through progressive fatigue (heavy→medium→light)
- **Mixed ability:** Some people can only do 1 set of the first exercise — they need alternative exercises on Board 2

### Two-Board System (CRITICAL)
- **Board 1:** Main exercises — pyramids, supersets, or standard (full intensity)
- **Board 2:** Modified/easier exercises — lower impact alternatives for people who aren't ready
- Both boards work the same muscle groups but at different intensity levels
- Trainer puts out two physical whiteboards at each station

### Flow Management (CRITICAL — Sean's #1 Priority)
The single most important aspect of class flow:
- **Problem:** Banded lateral walks require putting bands on legs (30+ seconds setup). Cable machine requires weight adjustment (20+ seconds). Push-ups = instant start (0 seconds).
- **Goal:** While Person A puts bands on, Person B should already be doing their bodyweight exercise. NOBODY should be standing around waiting.
- **Solution:** Pair exercises with different setup times together. Quick-start exercises (bodyweight, floor work) pair with equipment-heavy exercises (cables, bands, ball squats) so one group is always working.
- **Time-aware sequencing:** The AI must consider setup time for each exercise and ensure smooth concurrent flow.

### Format Flexibility
Current formats are too rigid. Sean wants to mix:
- 4 exercises × 50 seconds × 2 rounds
- 8 exercises × 40 seconds × 1 round
- 3 exercises × 60 seconds × 3 rounds (fewer exercises, more time per exercise)
- Custom: Trainer specifies exercises, duration, and rounds freely

### Quick Stretch Module
- 3-5 minutes of targeted stretches BEFORE the workout
- Stretches are specific to the muscles being worked that day
- Example: Leg day → hip flexor stretch, quad stretch, hamstring stretch, calf stretch, ankle mobility
- This is NOT a full yoga session — it's a focused "get ready" stretch
- Should be auto-generated based on the day type (upper/lower/full/cardio)

### Modified Exercises (Pain/Injury Alternatives)
Every exercise MUST have alternatives for:
- **Shoulder issues** — No overhead pressing, substitute lateral work
- **Knee issues** — No deep squats/lunges, substitute seated/wall work
- **Lower back issues** — No loaded flexion, substitute stability work
- **Wrist issues** — No planks/push-ups on hands, substitute forearm variations
- **Ankle issues** — No jumping/impact, substitute low-impact alternatives

The current system has `kneeMod`, `shoulderMod`, `ankleMod`, `wristMod`, `backMod` fields — these need to be populated for ALL exercises, not just cardio finishers.

---

## 3. Proposed Architecture

### Component Decomposition (Frontend — from 1 file to ~12 files)

```
frontend/src/components/BootcampBuilder/
├── index.ts                          # Barrel exports
├── BootcampBuilderPage.tsx           # Main page (orchestrator, <300 lines)
├── BootcampConfigPanel.tsx           # Left pane: format, day type, duration, equipment
├── BootcampClassPreview.tsx          # Center pane: station/exercise preview
├── BootcampAIInsights.tsx            # Right pane: AI explanations + Coach chat
├── BootcampStationCard.tsx           # Individual station card component
├── BootcampExerciseRow.tsx           # Single exercise row with mods
├── BootcampStretchModule.tsx         # Quick stretch warm-up generator
├── BootcampBoardToggle.tsx           # Board 1/Board 2 toggle view
├── BootcampTimeline.tsx              # Visual timeline showing flow/transitions
├── BootcampPyramidConfig.tsx         # Pyramid-specific configuration
├── BootcampSupersetConfig.tsx        # Superset-specific configuration
├── styles/
│   ├── BootcampStyles.ts             # Shared styled components
│   └── BootcampFloorModeStyles.ts    # Floor mode overrides
└── hooks/
    ├── useBootcampGeneration.ts      # AI generation logic
    └── useBootcampFlow.ts            # Flow timing calculations
```

### Backend Service Decomposition (from 1 file to ~6 files)

```
backend/services/bootcamp/
├── index.mjs                         # Barrel exports
├── bootcampGenerator.mjs             # Core generation logic (<300 lines)
├── bootcampPyramidEngine.mjs         # Pyramid format generation
├── bootcampSupersetEngine.mjs        # Superset format generation
├── bootcampFlowOptimizer.mjs         # Setup time flow optimization
├── bootcampStretchGenerator.mjs      # Quick stretch module
└── bootcampExerciseSelector.mjs      # Exercise selection + freshness + mods
```

### New Database Fields

**BootcampTemplate additions:**
- `classStyle` ENUM: `'standard'`, `'pyramid'`, `'superset'`, `'mixed'` (standard = current)
- `rounds` INTEGER (currently implicit, make explicit)
- `exerciseDurationSec` INTEGER (currently in FORMAT_CONFIG, make per-template)
- `includeStretch` BOOLEAN default true
- `stretchDurationMin` INTEGER default 3

**BootcampExercise additions:**
- `board` ENUM: `'main'`, `'alternative'` (Board 1 vs Board 2)
- `setupTimeSec` INTEGER default 0 (for flow optimization)
- `pyramidStartWeight` TEXT (e.g., "heavy — as much as you can")
- `pyramidDrops` INTEGER (e.g., 3 = heavy→medium→light→failure)
- `supersetOrder` INTEGER (1=heavy compound, 2=bodyweight, 3=light banded)
- `supersetGroupId` INTEGER (links exercises in same superset)

**New table: BootcampStretch**
- `id`, `templateId` (FK), `exerciseName`, `targetMuscles`, `durationSec`, `sortOrder`, `description`

### New Class Formats

| Format | Exercises/Station | Duration | Rounds | Setup Time Aware | Board 2 |
|--------|-------------------|----------|--------|------------------|---------|
| `stations_4x` (existing) | 4 | 35s | varies | NO → YES | NO → YES |
| `stations_3x5` (existing) | 3 | 40s | 3 | NO → YES | NO → YES |
| `stations_2x7` (existing) | 2 | 30s | varies | NO → YES | NO → YES |
| `full_group` (existing) | variable | 40s | 2 | NO → YES | NO → YES |
| `pyramid` (NEW) | 1-2 | until failure | drop sets | YES | YES |
| `superset` (NEW) | 3 (heavy→body→light) | 40-60s | 2-3 | YES | YES |
| `custom` (NEW) | trainer-defined | trainer-defined | trainer-defined | YES | YES |
| `hiit_circuit` (NEW) | 8+ | 40-50s | 1 | YES | YES |

### Flow Optimization Algorithm

```
For each station:
  1. Calculate total setup time for all exercises
  2. Pair exercises: [high-setup, low-setup] pairs
  3. Sequence: low-setup exercise FIRST (people start immediately)
     → high-setup exercise SECOND (while others are already working)
  4. If ALL exercises have high setup time → add a bodyweight "active wait"
     exercise that people do while others set up
  5. Calculate per-exercise start offsets to ensure concurrent activity
  6. Flag any station where someone would wait >15 seconds with no activity
```

### AI Hive Mind Integration

The Bootcamp Creator should use the App AI Hive Mind (100% free) for class generation:
1. **Gemini 2.5 Flash** generates the initial class based on config + equipment profile
2. **Qwen 3.6 Plus:free** reviews for flow issues, exercise balance, and modification gaps
3. **Gemini 3.1 Pro** finalizes with trainer-quality judgment

The AI receives:
- Location equipment profile (what's available)
- Day type + class style (pyramid/superset/standard)
- Participant count and ability range
- Recent class history (freshness — no repeats within 2 weeks)
- Injury flags for the class (how many people have knee/shoulder/back issues)
- Target duration and format

The AI returns:
- Board 1 exercises with full pyramid/superset specs
- Board 2 alternative exercises
- Quick stretch warm-up
- Flow-optimized sequencing with setup time pairs
- Overflow plan for large classes
- Explanations for every decision

### Coach Assistant Embed

The right pane of the Bootcamp Builder should embed a mini Coach Assistant with bootcamp context:
- "Make station 3 harder"
- "Replace cable exercises — we're at the park today"
- "Add a pyramid set for bench press"
- "This class has 3 people with knee issues"
- The AI adjusts the generated class in real-time

---

## 4. Timing Breakdown

### Total Class Time Budget: 60 minutes
| Phase | Duration | Description |
|-------|----------|-------------|
| Arrival/Setup | 0 min | Class arrives, equipment pre-set by trainer |
| Quick Stretch | 3-5 min | Targeted stretches for day's muscle groups |
| Demo | 5 min | Trainer demonstrates exercises at each station |
| Workout | 45-50 min | Station rotations (the main event) |
| Cool Down | 0-2 min | Optional brief cool-down |
| Clear | 5 min | Clean equipment, clear room for next class |
| **Total** | **58-62 min** | Max 55 min workout if 5 min clear needed |

### Per-Station Time Calculation
```
station_time = (num_exercises × exercise_duration) + ((num_exercises - 1) × transition_time) + station_transition
```

Example: 3 exercises × 40s + 2 transitions × 15s + 30s station change = 120s + 30s + 30s = 3 min/station
For 5 stations × 3 rounds = 5 × 3 × 3 = 45 min ✓

---

## 5. Equipment Setup Time Database

Every exercise type needs a `setupTimeSec` classification:

| Setup Category | Time | Examples |
|----------------|------|---------|
| Instant (0s) | 0-5s | Push-ups, burpees, high knees, mountain climbers |
| Quick (10s) | 5-15s | Dumbbell grab, kettlebell grab, medicine ball |
| Medium (20s) | 15-30s | Resistance band application, stability ball position |
| Slow (30s) | 25-40s | Cable machine weight adjustment, banded walks (band on legs) |
| Complex (45s) | 35-60s | Barbell load change, TRX height adjustment, BOSU setup |

The flow optimizer MUST pair Instant/Quick exercises with Slow/Complex exercises at the same station.

---

## 6. Modified Exercise Requirements

Every main exercise needs COMPLETE modification data:

```json
{
  "exerciseName": "Barbell Back Squat",
  "board": "main",
  "setupTimeSec": 45,
  "pyramidCapable": true,
  "supersetRole": "heavy_compound",
  "modifications": {
    "kneeMod": "Wall Sit Hold (0s setup)",
    "shoulderMod": "Goblet Squat (10s setup)",
    "backMod": "Leg Press Machine (30s setup) or Bodyweight Squat",
    "ankleMod": "Seated Leg Extension (20s setup)",
    "wristMod": "Barbell Back Squat (no wrist issue)"
  },
  "boardTwoAlternative": {
    "exerciseName": "Bodyweight Squat to Chair",
    "setupTimeSec": 0,
    "description": "Touch butt to chair, stand back up. 12 reps."
  }
}
```

---

## 7. Implementation Phases

### Phase 0: Decomposition (Pre-requisite)
- Break `BootcampBuilderPage.tsx` (723 lines) into 12 files under 300 lines each
- Break `bootcampService.mjs` (569 lines) into 6 files under 300 lines each
- Add sidebar entries for admin + trainer dashboards ✅ (DONE)
- No feature changes — pure structural decomposition

### Phase 1: New Formats + Two-Board System
- Add `pyramid` and `superset` class formats to backend
- Add `board` field to exercises (main vs alternative)
- Create `BootcampPyramidConfig.tsx` and `BootcampSupersetConfig.tsx` panels
- Create `BootcampBoardToggle.tsx` for switching Board 1/Board 2 view
- Database migration for new fields

### Phase 2: Flow Optimization Engine
- Add `setupTimeSec` to all exercises in the database
- Build `bootcampFlowOptimizer.mjs` — pairs exercises by setup time
- Create `BootcampTimeline.tsx` — visual timeline showing concurrent flow
- Flag warnings when someone would wait >15s with nothing to do

### Phase 3: Quick Stretch Module
- Build `bootcampStretchGenerator.mjs` — auto-generates stretches by day type
- Create `BootcampStretchModule.tsx` — displays stretch warm-up
- Create `BootcampStretch` database table
- Add stretch time to total class time calculation

### Phase 4: AI Hive Mind Integration
- Connect bootcamp generation to App AI Hive Mind (Gemini Flash → Qwen → Gemini Pro)
- AI receives equipment profile + day type + class style + participant info
- AI generates Board 1 + Board 2 + stretches + flow-optimized sequence
- Embed mini Coach Assistant in right pane for conversational tweaks

### Phase 5: Custom Format + HIIT Circuit
- Add `custom` format — trainer defines everything manually
- Add `hiit_circuit` format — 8+ exercises, short duration, 1 round
- Flexible round/duration/exercise count inputs
- Template library — save and reuse favorite class templates

### Phase 6: PDF + Floor Mode Enhancement
- Enhanced PDF with Board 1 + Board 2 side by side
- Floor Mode improvements — larger fonts, high contrast, touch-friendly station cards
- Print-ready whiteboard format (one page per station, large text)

---

## 8. Key Technical Decisions for AI Village Review

1. **Should pyramid/superset be new class formats or modifiers on existing formats?**
   - Option A: New `classFormat` values (pyramid, superset)
   - Option B: A `classStyle` modifier that applies to any format
   - Leaning toward Option B — a station format of `stations_4x` with style `pyramid` makes more sense than a separate `pyramid` format

2. **Should Board 2 be stored as separate exercises or as a field on the main exercise?**
   - Option A: `board` field on BootcampExercise (`main` vs `alternative`)
   - Option B: Separate `BootcampAlternativeExercise` table
   - Leaning toward Option A — simpler, same schema

3. **Should flow optimization happen server-side or client-side?**
   - Server-side: AI does it during generation
   - Client-side: Real-time reordering as trainer adjusts exercises
   - Recommendation: Both — server generates optimized order, client allows manual reorder with warnings

4. **How should the Coach Assistant embed work?**
   - Option A: Full Coach Assistant component in right pane
   - Option B: Slim chat input that posts to `/api/ai-chat` with bootcamp context
   - Option C: `AITerminalPanel` (already imported in current code)
   - Leaning toward Option C — it's already there, just needs bootcamp-specific context

5. **Should stretches be AI-generated or from a curated database?**
   - Option A: AI generates stretches per class
   - Option B: Curated stretch database, auto-selected by muscle group
   - Recommendation: Option B for reliability + Option A for variety (curated fallback if AI fails)

---

## 9. Success Criteria

- [ ] Trainer can generate a pyramid class with 2 boards in under 30 seconds
- [ ] Trainer can generate a superset class with flow-optimized sequencing
- [ ] Nobody waits more than 15 seconds without an activity during class
- [ ] Every exercise has shoulder/knee/back/wrist/ankle modifications
- [ ] Quick stretch auto-generates based on day type
- [ ] AI Hive Mind generates classes considering equipment availability
- [ ] Coach Assistant can tweak generated classes conversationally
- [ ] Floor Mode displays both boards in high-contrast large text
- [ ] PDF exports include Board 1 + Board 2 side by side
- [ ] All files under 300 lines
- [ ] Mobile-responsive (trainer uses iPad/phone at gym)
- [ ] Trainer can switch between standard/pyramid/superset on the fly

---

## 10. Files to Analyze (AI Village Input)

### Existing files to review:
- `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx` (723 lines)
- `frontend/src/hooks/useBootcampAPI.ts` (250 lines)
- `frontend/src/components/Shared/EquipmentProfilePicker.tsx` (431 lines)
- `backend/services/bootcampService.mjs` (569 lines)
- `backend/routes/bootcampRoutes.mjs` (245 lines)
- `backend/models/BootcampTemplate.mjs`
- `backend/models/BootcampStation.mjs`
- `backend/models/BootcampExercise.mjs`
- `backend/models/BootcampSpaceProfile.mjs`
- `backend/models/BootcampClassLog.mjs`
- `backend/models/BootcampOverflowPlan.mjs`
- `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx` (1129 lines)
- `frontend/src/hooks/useEquipmentAPI.ts` (256 lines)
- `backend/routes/equipmentRoutes.mjs` (732 lines)
- `backend/services/equipmentScanService.mjs`

### Equipment integration files:
- `backend/models/EquipmentProfile.mjs`
- `backend/models/EquipmentItem.mjs`
- `backend/models/EquipmentExerciseMap.mjs`

---

*SwanStudios Bootcamp Creator Upgrade Plan v1.0*
*Submit to: `node scripts/validation-orchestrator.mjs --mode plan --document docs/ai-workflow/blueprints/BOOTCAMP-CREATOR-UPGRADE-PLAN.md`*
