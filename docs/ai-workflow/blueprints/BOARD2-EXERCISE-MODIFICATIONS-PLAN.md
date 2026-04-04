# Board 2 Exercise Modifications — Complete Redesign Plan

## Problem Statement
Board 2 ("Modified") currently shows random alternative exercises — often just cardio finishers with easier versions. It does NOT show the same exercises as Board 1 with proper modifications for each body area that could have issues.

Board 2 should mirror Board 1's exercises exactly, but show a comprehensive modification table for EACH exercise with alternatives for every joint/body area that could be problematic.

## What We're Building

### Database Schema (10 variation/mod fields per exercise, 883 exercises)
Each of the 883 exercises in the Exercises table gets:

| Field | Purpose | Example for "Barbell Back Squat" |
|-------|---------|--------------------------------|
| `easyVariation` | Simpler regression | Bodyweight Squat |
| `hardVariation` | Advanced progression | Paused Back Squat |
| `kneeMod` | Knee pain alternative | Leg Press (partial ROM) |
| `shoulderMod` | Shoulder pain alternative | Goblet Squat |
| `backMod` | Lower back pain alternative | Belt Squat |
| `ankleMod` | Ankle pain alternative | Box Squat |
| `wristMod` | Wrist pain alternative | Safety Bar Squat |
| `elbowMod` | Elbow pain alternative | Smith Machine Squat |
| `footMod` | Foot pain alternative | Seated Leg Press |
| `hipMod` | Hip pain alternative | Partial ROM Squat to Box |

### Population Method
- Gemini 2.5 Flash (FREE) generates modifications in batches of 20
- Each batch sends exercise name, type, muscles, equipment to Gemini
- Gemini returns a JSON array with all 10 fields per exercise
- Script writes directly to production DB (same DB as local dev)
- Total: 883 exercises ÷ 20/batch = 45 API calls ≈ 5-10 minutes

### Board 2 UI Redesign
Instead of showing different exercises, Board 2 shows the SAME exercises as Board 1 with a modification table below each one.

**Proposed Board 2 Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Station 1: Quads                                        │
│─────────────────────────────────────────────────────────│
│ Exercise: Barbell Back Squat                             │
│                                                          │
│ ┌─── Modification Table ──────────────────────────────┐ │
│ │ Easy Version  │ Bodyweight Squat                     │ │ ← green row
│ │ Hard Version  │ Paused Back Squat                    │ │ ← red row
│ │ ─────────────────────────────────────────────────── │ │
│ │ 🦵 Knee       │ Leg Press (partial ROM)              │ │ ← alternating bg
│ │ 💪 Shoulder   │ Goblet Squat                         │ │
│ │ 🔙 Lower Back │ Belt Squat                           │ │ ← alternating bg
│ │ 🦶 Ankle      │ Box Squat                            │ │
│ │ ✋ Wrist       │ Safety Bar Squat                     │ │ ← alternating bg
│ │ 💪 Elbow      │ Smith Machine Squat                  │ │
│ │ 🦶 Foot       │ Seated Leg Press                     │ │ ← alternating bg
│ │ 🦴 Hip        │ Partial ROM Squat to Box             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Exercise: Goblet Squat                                   │
│ [Same modification table format]                         │
│                                                          │
│ Exercise: Mountain Climbers (cardio finisher)            │
│ [Same modification table format]                         │
└─────────────────────────────────────────────────────────┘
```

### Visual Contrast Requirements (from user):
- Alternating row backgrounds (dark/slightly-lighter) for easy scanning
- Clear separation between the Easy/Hard section and the Pain Mods section
- Each joint area has a small icon/emoji for quick visual identification
- The modification exercise name is clearly readable (Frost White text)
- The joint label is in a muted color to create hierarchy
- Row height is generous (44px min touch targets) so it's tappable on mobile

### Color Scheme (Crystalline Swan):
- Easy variation row: subtle green tint `rgba(16, 185, 129, 0.08)`
- Hard variation row: subtle red tint `rgba(201, 42, 84, 0.08)`
- Pain mod rows: alternating `var(--bg-base, #0A0A0F)` and `rgba(96, 192, 240, 0.03)`
- Joint labels: `var(--text-muted, rgba(224, 236, 244, 0.4))`
- Exercise names: `var(--text-primary, #E0ECF4)`
- "N/A" entries: dimmed to 0.2 opacity so they don't clutter the view

## Questions for AI Village
1. What are the NASM-standard regression/progression protocols for compound movements? (Web research)
2. What are evidence-based joint-specific exercise modifications used in physical therapy clinics? (Web research)
3. How do ACE/ACSM recommend modifying exercises for special populations (pregnant, seniors, post-surgery)? (Web research)
4. What common exercise modifications do CrossFit boxes use for scaled workouts? (Web research)
5. Are there any exercises that should NEVER be modified (just skipped entirely)?
6. What is the correct terminology — "modification" vs "regression" vs "alternative" vs "substitution"?
7. How should unilateral exercises be modified differently from bilateral exercises?
8. What exercises are commonly prescribed for golfer's elbow vs tennis elbow modifications?

## Files That Need Changes
1. `backend/routes/exerciseRoutes.mjs` — Include all mod fields in API (DONE)
2. `frontend/src/components/WorkoutLogger/exerciseSearchWorker.ts` — ExerciseSlim type (DONE)
3. `frontend/src/components/WorkoutLogger/useExerciseSearch.ts` — Include mods in fetch (DONE)
4. `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx` — Board 2 redesign
5. `backend/services/bootcamp/bootcampGenerator.mjs` — Board 2 generation logic
6. `scripts/populate-exercise-variations.mjs` — Population script (DONE)
7. `backend/migrations/20260404000001-add-exercise-variations.cjs` — Migration (DONE)
