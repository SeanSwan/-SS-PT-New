# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 29.7s
> **Files:** backend/services/workoutBuilderService.mjs
> **Generated:** 3/6/2026, 6:17:05 PM

---

# Deep Code Review: workoutBuilderService.mjs

## Executive Summary

This service contains **3 CRITICAL bugs** that will cause runtime failures, **2 HIGH severity issues** affecting data integrity, and several medium/low issues. The most severe is an undefined constant reference that will crash production.

---

## CRITICAL Findings

### 1. Undefined Constant Reference (Runtime Crash)

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `generateWorkout()` function, lines ~285-290 | The constant `PAIN_AUTO_EXCLUDE_SEVERITY` is referenced inside the explanations but is defined **after** the function returns. This causes `ReferenceError: PAIN_AUTO_EXCLUDE_SEVERITY is not defined` at runtime. | Move `const PAIN_AUTO_EXCLUDE_SEVERITY = 7;` to the top of the file, before the `generateWorkout` function. |

**Evidence:**
```javascript
// Line ~285: References constant that doesn't exist yet
explanations.push({
  type: 'pain_exclusion',
  message: `${context.pain.exclusions.length} muscle group(s) auto-excluded due to pain severity >= ${PAIN_AUTO_EXCLUDE_SEVERITY}/10 within 72h`,
  // ...
});

// Line ~380: Defined AFTER the function that uses it
const PAIN_AUTO_EXCLUDE_SEVERITY = 7;
```

---

### 2. Incorrect Conditional Logic in Category Mapping

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | Lines 248-254 | The ternary chain for mapping categories to movement types is broken. `category === 'chest' || category === 'shoulders' ? 'push'` is evaluated as `(category === 'shoulders' ? 'push' : (category === 'chest'))`. This means `chest` maps to `'chest'` (truthy), not `'push'`. | Fix the parentheses: `category === 'chest' || category === 'shouldarms' ? 'push' : category === 'back' ? 'pull' : ...` or use a lookup map. |

**Current broken code:**
```javascript
const movementCategories = category === 'full_body'
  ? ['push', 'pull', 'squat', 'hinge', 'lunge', 'core']
  : [category === 'chest' || category === 'shoulders' ? 'push'  // BROKEN
      : category === 'back' ? 'pull'
      : category === 'legs' ? 'squat'
      : category === 'arms' ? 'push'
      : 'core'];
```

**Correct logic:**
```javascript
const movementCategories = category === 'full_body'
  ? ['push', 'pull', 'squat', 'hinge', 'lunge', 'core']
  : [
      category === 'chest' || category === 'shoulders' ? 'push'
      : category === 'back' ? 'pull'
      : category === 'legs' ? 'squat'
      : category === 'arms' ? 'push'
      : 'core'
    ];
```

---

### 3. Missing Null Guard on Equipment Items

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | Lines 232-237 | When `equipmentProfileId` is provided but `context.equipment` is empty or the profile isn't found, `equipmentItems` becomes `[]`. The filter logic then allows ALL exercises (because `availableCategories.size > 0` is false when no equipment found). This bypasses equipment filtering silently. | Add explicit null check and throw error or return empty exercises when equipment profile not found. |

```javascript
// Current (buggy):
let equipmentItems = [];
if (equipmentProfileId) {
  const profile = context.equipment.find(p => p.id === equipmentProfileId);
  if (profile) equipmentItems = profile.items;
}

// Should be:
let equipmentItems = [];
if (equipmentProfileId) {
  const profile = context.equipment?.find(p => p.id === equipmentProfileId);
  if (!profile) {
    logger.warn(`Equipment profile ${equipmentProfileId} not found for client ${clientId}`);
    // Option 1: Throw error
    // throw new Error(`Equipment profile ${equipmentProfileId} not found`);
    // Option 2: Return empty (safer)
    return { error: 'Equipment profile not found', ... };
  }
  equipmentItems = profile.items;
}
```

---

## HIGH Severity Findings

### 4. Unused Import

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | Line 17 | `getNextSessionType` is imported from `variationEngine.mjs` but never used. This indicates dead code or incomplete implementation. | Remove the unused import or implement the missing functionality. |

```javascript
// Current:
import { getExerciseRegistry, getNextSessionType, generateSwapSuggestions } from './variationEngine.mjs';

// Fix:
import { getExerciseRegistry, generateSwapSuggestions } from './variationEngine.mjs';
```

---

### 5. No Input Validation on Public API Functions

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `generateWorkout()` and `generatePlan()` | No validation on `clientId`, `trainerId`, or other parameters. Missing required fields will cause downstream errors. | Add input validation at function entry. |

```javascript
// Add at start of generateWorkout:
if (!clientId || typeof clientId !== 'number') {
  throw new Error('clientId is required and must be a number');
}
if (!trainerId || typeof trainerId !== 'number') {
  throw new Error('trainerId is required and must be a number');
}
if (!['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body'].includes(category)) {
  throw new Error('Invalid category');
}
```

---

## MEDIUM Severity Findings

### 6. Potential Stale Closure in Swap Suggestions

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 269-277 | `generateSwapSuggestions()` is called with `selectedExercises.map(e => e.key)` but the result is assigned to `swapSuggestions` which is returned directly. If `generateSwapSuggestions` is async or returns a promise, it's not being awaited. | Verify if `generateSwapSuggestions` returns a Promise. If so, add `await`. |

```javascript
// Current:
let swapSuggestions = null;
if (sessionType === 'switch' && selectedExercises.length > 0) {
  swapSuggestions = generateSwapSuggestions(/* ... */);  // Could be async
}

// If async:
if (sessionType === 'switch' && selectedExercises.length > 0) {
  swapSuggestions = await generateSwapSuggestions(/* ... */);
}
```

---

### 7. Hardcoded Rotation Pool

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 356-357 | `rotationPool` is hardcoded. This should come from client context or configuration. | Move to configuration or derive from `context.variation`. |

```javascript
// Current:
const rotationPool = ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];

// Should be:
const rotationPool = context.variation.rotationPool || ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];
```

---

### 8. Deload Week Logic Bug

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 337-340 | The deload week logic is confusing: `weekEnd === (i + 1) * 4 ? weekEnd : null`. This always evaluates to `true` for complete mesocycles, but the logic seems wrong. | Clarify intent: should deload be every 4th week or only on the final mesocycle? |

```javascript
// Current (unclear intent):
deloadWeek: weekEnd === (i + 1) * 4 ? weekEnd : null,

// If intent is "every 4th week":
deloadWeek: weekEnd % 4 === 0 ? weekEnd : null,

// If intent is "last week of mesocycle":
deloadWeek: weekEnd,
```

---

### 9. No Error Handling for getClientContext

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | Lines 224, 323 | `getClientContext()` is called without try/catch. If the service fails, the entire workout generation fails with no graceful handling. | Wrap in try/catch with proper error logging. |

```javascript
// Current:
const context = await getClientContext(clientId, trainerId);

// Should be:
let context;
try {
  context = await getClientContext(clientId, trainerId);
} catch (err) {
  logger.error('Failed to get client context', { clientId, trainerId, error: err.message });
  throw new Error('Unable to generate workout: client context unavailable');
}
```

---

## LOW Severity Findings

### 10. Unused Logger Import

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | Line 18 | `logger` is imported but never used. | Remove unused import or add logging statements. |

---

### 11. Magic Numbers

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|


---

*Part of SwanStudios 7-Brain Validation System*
