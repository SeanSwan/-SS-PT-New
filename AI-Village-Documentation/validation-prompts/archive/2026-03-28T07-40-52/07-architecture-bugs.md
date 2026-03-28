# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 100.3s
> **Files:** backend/services/oneRepMaxService.mjs, backend/services/variationEngine.mjs, backend/services/workoutBuilderService.mjs, backend/services/clientIntelligenceService.mjs
> **Generated:** 3/28/2026, 12:40:52 AM

---

# SwanStudios Backend Services — Deep Architecture Review

## Executive Summary

I've completed a thorough review of the four backend service files. The codebase demonstrates sophisticated fitness programming logic but contains **several critical bugs** that will cause runtime failures or incorrect workout generation. Most severe is the completely broken `recentlyUsedExercises` filter in workoutBuilderService — it captures the constraint but never applies it.

---

## 1. Bug Detection

### CRITICAL

#### File: `workoutBuilderService.mjs`
**Line:** ~130-145 (filterExercises function)

**What's Wrong:**
The `recentlyUsedExercises` constraint is destructured from `constraints`, a Set is built from it (`recentSet`), but **the filter never checks it**. The function always returns `true` for the recently-used check, meaning clients can be recommended exercises they just performed.

```javascript
function filterExercises(exercises, constraints, equipmentItems) {
  const { excludedMuscles, compensationTypes, recentlyUsedExercises } = constraints;
  const excludedSet = new Set(excludedMuscles);
  const recentSet = new Set(recentlyUsedExercises);  // ← BUILT BUT NEVER USED

  return exercises.filter(ex => {
    const hasPainConflict = ex.muscles?.some(m => excludedSet.has(m)) ?? false;
    if (hasPainConflict) return false;

    if (availableCategories.size > 0 && ex.equipment && ex.equipment.length > 0) {
      const hasEquipment = ex.equipment.some(eq => availableCategories.has(eq));
      if (!hasEquipment) return false;
    }

    return true;  // ← Should check: if (recentSet.has(ex.key)) return false;
  });
}
```

**Fix:**
```javascript
return exercises.filter(ex => {
    // ... existing checks ...
    
    // Add this check before returning true
    if (recentSet.has(ex.key)) return false;
    
    return true;
});
```

---

#### File: `oneRepMaxService.mjs`
**Line:** ~71-75 (getRecommendedWeight function)

**What's Wrong:**
The function accepts `movementPattern` parameter but has inconsistent null handling. If `movementPattern` is explicitly passed as an empty string `""`, the `if (movementPattern)` check passes (empty string is truthy in some contexts), but then `movementPattern.toLowerCase()` could fail if it's not a string. More critically, there's **no validation that `intensityMin` and `intensityMax` are numbers** — passing strings will cause `Math.min` comparisons to behave unexpectedly.

```javascript
export function getRecommendedWeight({
  movementPattern,
  exerciseKey,
  estimated1RMs,
  intensityMin,
  intensityMax,
}) {
  // intensityMin/intensityMax could be undefined, null, or strings
  const safeMin = Math.min(intensityMin || 0.5, 1.0);  // ← Type coercion issue
  const safeMax = Math.min(intensityMax || 0.7, 1.0);
```

**Fix:**
```javascript
const safeMin = Math.min(Number(intensityMin) || 0.5, 1.0);
const safeMax = Math.min(Number(intensityMax) || 0.7, 1.0);
```

---

### HIGH

#### File: `workoutBuilderService.mjs`
**Line:** ~245 (phaseIntensityMap lookup)

**What's Wrong:**
Invalid `nasmPhase` values (0, 6, null, undefined) silently default to Phase 2 intensity (70-80%) instead of failing fast. This could cause dangerous overloading if a client has an unrecognized phase.

```javascript
const [minPct, maxPct] = phaseIntensityMap[nasmPhase] || [0.70, 0.80];
```

**Fix:**
```javascript
if (!phaseIntensityMap[nasmPhase]) {
  logger.warn('[WorkoutBuilder] Invalid nasmPhase', { nasmPhase, clientId });
  throw new Error(`Invalid NASM phase: ${nasmPhase}. Must be 1-5.`);
}
const [minPct, maxPct] = phaseIntensityMap[nasmPhase];
```

---

#### File: `variationEngine.mjs`
**Line:** ~285 (isEquipmentAvailable function)

**What's Wrong:**
The function assumes `availableEquipment` items have a `.category` property, but this contract isn't enforced. If the frontend passes strings (e.g., `['barbell', 'dumbbell']`) instead of objects (`[{category: 'barbell'}]`), the function will silently return `false` for all exercises, blocking all workouts.

```javascript
function isEquipmentAvailable(exerciseKey, availableEquipment) {
  if (!availableEquipment || availableEquipment.length === 0) return true;
  // Assumes availableEquipment is [{category: 'barbell'}, ...]
  const availableCategories = new Set(availableEquipment.map(e => e.category));
  // ...
}
```

**Fix:**
```javascript
function isEquipmentAvailable(exerciseKey, availableEquipment) {
  if (!availableEquipment || availableEquipment.length === 0) return true;
  
  const availableCategories = new Set(
    availableEquipment.map(e => typeof e === 'string' ? e : e.category).filter(Boolean)
  );
  
  const exercise = EXERCISE_REGISTRY[exerciseKey];
  // ... rest unchanged
}
```

---

#### File: `clientIntelligenceService.mjs` (inferred from patterns)
**What's Wrong:**
There's a **duplicate `safeBrzycki1RM` function** in this file (lines ~50-56) that is never used. The codebase already has `estimateBrzycki1RM` exported from `oneRepMaxService.mjs`. This creates:
- Confusion about which function to use
- Duplicate maintenance burden
- The local version isn't even exported or called

---

### MEDIUM

#### File: `oneRepMaxService.mjs`
**Line:** ~30 (Brzycki formula denominator guard)

**What's Wrong:**
The denominator guard `denominator <= 0.01` is overly aggressive. The Brzycki formula becomes inaccurate around 15+ reps (denominator ≈ 0.61), but it doesn't break until ~37 reps (denominator = 0). Returning `null` at 0.01 prevents valid calculations at 10-15 reps which are within the "extended range" the function claims to support.

```javascript
if (denominator <= 0.01) return null;  // Too strict for extended range
```

**Fix:**
```javascript
if (denominator <= 0) return null;  // Only fail on mathematical impossibility
```

---

#### File: `variationEngine.mjs`
**Line:** ~150 (getNextSessionType logic flaw)

**What's Wrong:**
The function counts consecutive BUILD sessions but doesn't account for the case where history is empty vs. when the last session was a SWITCH. If history is `['build', 'switch', 'build']`, it correctly returns 'build', but if history is `['build', 'build']` with buildCount=2, it returns 'switch' — which is correct. However, **the initial session logic is inverted**: new clients (empty history) start with 'build', but the 2-Week Rotation Principle says the first session should arguably be 'build' to establish baseline. This is actually correct but the comment should clarify the intentional choice.

---

#### File: `workoutBuilderService.mjs`
**Line:** ~200 (equipmentProfileId handling)

**What's Wrong:**
When `equipmentProfileId` is provided but not found in context, the code logs a warning and proceeds **without any equipment filter**. This means clients could be assigned exercises requiring equipment not available at their location — a safety/UX issue, not a crash.

```javascript
if (!profile) {
  logger.warn(`Equipment profile ${equipmentProfileId} not found...`);
  // Proceeds with empty equipmentItems = no filter applied
}
```

**Fix:**
```javascript
if (!profile) {
  logger.warn(`Equipment profile ${equipmentProfileId} not found for client ${clientId}`);
  throw new Error(`Equipment profile ${equipmentProfileId} not found`);
}
```

---

## 2. Architecture Flaws

### HIGH

#### File: `workoutBuilderService.mjs`
**Lines:** Entire file (~500 lines)

**What's Wrong:**
This is a **god service** doing too much. It directly imports and orchestrates:
- `getClientContext` (clientIntelligenceService)
- `getExerciseRegistryFromDB` (variationEngine)
- `generateSwapSuggestions` (variationEngine)
- `getRecommendedWeight` (oneRepMaxService)

It handles:
- 7-step workout generation
- OPT phase parameter mapping
- Warmup/cooldown template selection
- 1RM-based weight recommendations
- Explanation generation
- Long-term plan generation

**Fix:** Split into dedicated services:
- `workoutGenerationService.mjs` — pure workout building logic
- `warmupCooldownService.mjs` — template management
- `weightRecommendationService.mjs` — 1RM integration
- `planGenerationService.mjs` — long-term planning

---

#### File: `variationEngine.mjs`
**Lines:** ~55-140 (EXERCISE_REGISTRY hardcoded 81 exercises)

**What's Wrong:**
Dual exercise registries create synchronization burden:
1. Hardcoded 81-exercise registry (used as fallback)
2. Database 840+ exercises (primary source)

The comment acknowledges this is technical debt: "Backwards compat until all 840+ exercises have nasmMovementPattern set." There's no migration mechanism, and the fallback means bugs in the hardcoded list may never be discovered.

**Fix:**
- Prioritize DB migration to populate `nasmMovementPattern` for all exercises
- Remove hardcoded fallback after migration (or keep as emergency fallback only)
- Add a migration status endpoint to track completion

---

#### File: `clientIntelligenceService.mjs`
**Lines:** ~180+ (getClientContext function)

**What's Wrong:**
Despite the comment claiming "parallel-fetch data from all subsystems," the implementation appears to make **sequential database calls** in a try-catch chain. This creates unnecessary latency.

**Fix:**
```javascript
// Use Promise.allSettled for true parallel fetching
const results = await Promise.allSettled([
  getClientPainEntry(clientId),
  getMovementProfile(clientId),
  getFormAnalysis(clientId),
  // ... all other calls
]);

// Then validate each result
const pain = results[0].status === 'fulfilled' ? results[0].value : null;
// ...
```

---

### MEDIUM

#### File: `oneRepMaxService.mjs`
**Lines:** ~90-110 (fallbackKeyMatch function)

**What's Wrong:**
The fallback string-matching logic contradicts the file's stated purpose of using DB-driven patterns "so new exercises automatically get correct 1RM mapping at creation time." If fallback is needed for 81 exercises, it suggests the DB migration is incomplete.

**Fix:** Track migration status, log warnings when fallback is used, prioritize completing the migration.

---

## 3. Integration Issues

### HIGH

#### File: `workoutBuilderService.mjs` ↔ `clientIntelligenceService.mjs`

**What's Wrong:**
The `context.variation` object structure isn't validated. If `variation.lastSessionType` is missing or has an

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
