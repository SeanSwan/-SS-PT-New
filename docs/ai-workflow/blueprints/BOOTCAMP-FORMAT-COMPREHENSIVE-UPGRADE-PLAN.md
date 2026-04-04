# Bootcamp Class Format & Style Comprehensive Upgrade Plan

## Problem Statement
The current Bootcamp Builder has 12 formats but they don't match real-world class structures. Key issues:

1. **`stations_4x` defaults to 10 stations** — way over 55 minutes. The dynamic station calculation is wrong.
2. **Missing the most common real-world format**: Sean's actual classes are typically 6-8 stations × 2-3 exercises × 2-3 rounds at 30s each. This doesn't exist in the dropdown.
3. **No "rounds per station" concept** — currently only tracks exercises and duration per exercise, not how many times participants repeat the circuit at each station before rotating.
4. **No unilateral exercise awareness** — exercises like single-leg bridge, single-arm row, toe taps (one side then the other) effectively take 2x time. The system doesn't account for this.
5. **Only 4 class styles** — missing ladder, chipper, descending pyramid, countdown, death by (EMOM progression), YGIG (you go I go), etc.
6. **Manual mode doesn't let you CHOOSE the format** — it's stuck on whatever the AI mode had selected.
7. **No timing preview** — trainer can't see "this format will take X minutes" before generating or adding exercises.

## Sean's Real-World Class Example (Today)
- **8 stations, 2 exercises per station, 3 rounds of 30 seconds each**
- **1 special station with 3 unilateral exercises** (single-leg bridge, fire hydrant, toe taps) — each done left side then right side
- The 2-exercise stations completed 3 rotations in the same time the 3-exercise unilateral station completed 1 rotation
- **Total workout time**: ~40 minutes (fits 55-min class with demo/stretch/clear)
- **Exercise types**: Some stations had bilateral exercises (dumbbell chest press — both arms at once), some had step-ups (one leg at a time = unilateral but still counted as 1 exercise with alternating)

## What Needs to Change

### 1. Expand Station-Based Formats (Priority: CRITICAL)
Every realistic combination of stations × exercises × rounds that fits within 37-42 minutes of workout time (to stay under 55 min total).

**Proposed format library (all station-based, times calculated for 55-min total class):**

| Format ID | Stations | Ex/Station | Rounds | Work(s) | Rest(s) | Approx Workout Time | Notes |
|-----------|----------|------------|--------|---------|---------|---------------------|-------|
| `2x8_r3` | 8 | 2 | 3 | 30 | 15 | ~38 min | Sean's most common format |
| `2x6_r3` | 6 | 2 | 3 | 35 | 15 | ~30 min | Compact, high energy |
| `2x7_r3` | 7 | 2 | 3 | 30 | 15 | ~33 min | Good balance |
| `2x8_r2` | 8 | 2 | 2 | 35 | 15 | ~27 min | Express version |
| `2x10_r2` | 10 | 2 | 2 | 30 | 15 | ~30 min | Max stations, fewer rounds |
| `3x6_r2` | 6 | 3 | 2 | 30 | 15 | ~33 min | Deeper per station |
| `3x5_r2` | 5 | 3 | 2 | 35 | 15 | ~30 min | Existing but with rounds |
| `3x4_r3` | 4 | 3 | 3 | 30 | 15 | ~33 min | Fewer stations, more rounds |
| `3x8_r1` | 8 | 3 | 1 | 30 | 15 | ~30 min | Many stations, 1 pass each |
| `4x4_r2` | 4 | 4 | 2 | 30 | 15 | ~29 min | Dense stations |
| `4x5_r2` | 5 | 4 | 2 | 30 | 10 | ~33 min | Classic "4 corners + 1" |
| `4x6_r1` | 6 | 4 | 1 | 35 | 15 | ~24 min | Express, lots of variety |
| `5x4_r1` | 4 | 5 | 1 | 30 | 10 | ~17 min | Sprint format |
| `2x5_r4` | 5 | 2 | 4 | 30 | 15 | ~33 min | High repetition |
| `mixed_unilateral` | 7+1 | 2/3 | 3/1 | 30 | 15 | ~38 min | Sean's exact class: 7 bilateral stations (2 ex, 3 rounds) + 1 unilateral station (3 ex, 1 round) |

**Key addition: `rounds` field.** Every format now specifies how many times participants repeat the circuit AT each station before rotating to the next station. This is the missing piece.

### 2. Unilateral Exercise Flag
Add a `unilateral` boolean to exercise metadata. When an exercise is unilateral:
- Time doubles (30s becomes 60s: 30s left side + 30s right side)
- OR: system accounts for it in timing calculation
- Station with 3 unilateral exercises at 30s = 3 × 60s = 180s (3 min) = same time as 2 bilateral exercises × 3 rounds at 30s (180s)

### 3. Timing Preview Calculator
Show estimated total class time in the format dropdown BEFORE the trainer selects it:
```
8 Stations × 2 Exercises × 3 Rounds (30s work / 15s rest) = 38 min workout → 51 min total class ✓
```

### 4. New Class Styles (Priority: HIGH)

| Style | Description | How It Works |
|-------|-------------|-------------|
| `ladder` | Ascending reps: 2-4-6-8-10 | Start at 2 reps, add 2 each round. Weight stays constant. |
| `descending` | Descending reps: 15-12-10-8-6 | Heavy at the top, lighter at the bottom. Opposite of standard. |
| `chipper` | High-rep single pass | 50 reps of exercise 1, then 40 of exercise 2, etc. No rounds — just chip away. |
| `countdown` | Timed countdown: 60s-45s-30s-15s | Same exercise, decreasing time each round. Intensity builds. |
| `death_by` | EMOM add 1 rep per minute | Minute 1: 1 squat. Minute 2: 2 squats. Continue until you can't finish in the minute. |
| `ygig` | You Go I Go (partner) | Partner A does reps while B rests. Switch. Natural 1:1 work:rest. |
| `contrast` | Heavy + plyometric | Heavy strength set → explosive plyometric. Same movement pattern. |
| `density` | Max work in fixed time | 5-minute blocks: do as much work as possible. Rest between blocks. |

### 5. Manual Mode Format Selection
In Manual mode, the format dropdown should be accessible AT THE TOP of the Rolodex panel (not hidden in AI mode's config panel). When the trainer changes the format in Manual mode, the station structure updates immediately.

### 6. Smart Format Recommendations
Based on the target duration, show which formats fit:
- Green: fits within target with 5+ min buffer
- Yellow: tight fit, less than 3 min buffer
- Red: exceeds target duration

## Questions for AI Village
1. What other station × exercise × round combinations are commonly used in professional group fitness? (Web research: Les Mills, Orangetheory, Barry's, F45 class structures)
2. Are there formats used in military/tactical fitness training that would appeal to Sean's market? (Web research: tactical fitness class formats)
3. What timing protocols do CrossFit affiliates use beyond the ones we have? (Web research: CrossFit class programming structures)
4. How do premium boutique fitness studios (Equinox, Barry's) structure their group classes? (Web research: boutique fitness class formats 2025-2026)
5. What class styles are trending in group fitness for 2025-2026? (Web research: group fitness trends IDEA, ACE, NASM)
6. How do F45 and Orangetheory structure their stations/rounds/timing? (Web research: F45 class structure, Orangetheory class format)
7. What are the most effective work:rest ratios for different training goals? (Web research: NSCA work-rest ratio guidelines)

## Current Backend Format Config (for reference)
```javascript
// backend/services/bootcamp/bootcampConstants.mjs
export const FORMAT_CONFIG = {
  stations_4x: { exercisesPerStation: 4, durationSec: 35, fixedStations: null },
  stations_3x5: { exercisesPerStation: 3, durationSec: 40, fixedStations: 5 },
  stations_2x7: { exercisesPerStation: 2, durationSec: 30, fixedStations: 7 },
  stations_3x4: { exercisesPerStation: 3, durationSec: 35, fixedStations: 4 },
  stations_5x3: { exercisesPerStation: 5, durationSec: 30, fixedStations: 3 },
  full_group: { exercisesPerStation: null, durationSec: 40, fixedStations: null },
  emom: { exercisesPerStation: null, durationSec: 60, fixedStations: null },
  tabata: { exercisesPerStation: null, durationSec: 20, restSec: 10, rounds: 8 },
  amrap: { exercisesPerStation: null, durationSec: null, blockMin: 4 },
  circuit: { exercisesPerStation: null, durationSec: 40, rounds: 3 },
  partner: { exercisesPerStation: 2, durationSec: 40, fixedStations: null },
  hybrid: { exercisesPerStation: null, durationSec: 35, fixedStations: null },
};
```

## Files That Need Changes
1. `frontend/src/components/BootcampBuilder/BootcampBuilderConstants.ts` — FORMAT_CONFIG, CLASS_FORMATS, CLASS_STYLES
2. `backend/services/bootcamp/bootcampConstants.mjs` — FORMAT_CONFIG (must mirror frontend)
3. `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx` — Manual mode format picker, timing preview
4. `frontend/src/components/BootcampBuilder/ConfigPanel.tsx` — Format dropdown with timing preview
5. `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx` — Per-station round display
6. `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx` — Format selector in Manual mode
7. `frontend/src/content/teach-me/index.ts` — Updated format descriptions
8. `frontend/src/hooks/useBootcampAPI.ts` — ClassFormat type union
9. `backend/services/bootcamp/bootcampGenerator.mjs` — Handle new formats + rounds
