# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 67.5s
> **Files:** backend/services/clientIntelligenceService.mjs, backend/services/workoutBuilderService.mjs, backend/services/variationEngine.mjs
> **Generated:** 3/28/2026, 12:00:13 AM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## ⚠️ EXECUTIVE SUMMARY

**OVERALL RISK LEVEL: MEDIUM**

These services are **READ-HEAVY** and do not contain direct destructive operations. However, there are **CRITICAL GAPS** in error handling, transaction safety, and potential for data corruption through race conditions. The biggest risk is **NOT** accidental deletion, but **SILENT DATA CORRUPTION** and **CASCADING FAILURES** that could leave the system in an inconsistent state.

---

## 🔴 CRITICAL FINDINGS

### 1. **NO TRANSACTION WRAPPERS — DATA CORRUPTION RISK**

**Severity:** CRITICAL  
**Data at Risk:** All client workout data, pain entries, form analyses, variation logs  
**Blast Radius:** Single client per call, but could affect multiple clients if called in batch  
**File & Line:** `clientIntelligenceService.mjs:262-432` (entire `getClientContext` function)

**What's Wrong:**

The `getClientContext` function performs **15 parallel database queries** with no transaction wrapper. If any downstream service (like `workoutBuilderService.mjs`) uses this data to write records and fails mid-operation, you could have:

- A `VariationLog` entry created but no corresponding `DailyWorkoutForm`
- A `WorkoutSession` logged but no `ClientProgress` update
- Partial writes leaving the client's state inconsistent

**Example Failure Scenario:**
```javascript
// In workoutBuilderService.mjs (not shown in code, but likely exists)
const context = await getClientContext(clientId, trainerId); // ✅ Succeeds
await createWorkoutSession(context); // ✅ Succeeds
await updateClientProgress(context); // ❌ FAILS (network timeout)
// Result: WorkoutSession exists, but ClientProgress is stale
```

**Fix:**

Wrap any **write operations** that depend on `getClientContext` in a transaction:

```javascript
// In workoutBuilderService.mjs or any service that WRITES based on context
export async function generateAndSaveWorkout(options) {
  const transaction = await sequelize.transaction();
  try {
    const context = await getClientContext(options.clientId, options.trainerId);
    const workout = await generateWorkout({ ...options, context });
    
    // All writes in one transaction
    await VariationLog.create({ ...workout.log }, { transaction });
    await DailyWorkoutForm.create({ ...workout.form }, { transaction });
    await ClientProgress.update({ ...workout.progress }, { 
      where: { userId: options.clientId },
      transaction 
    });
    
    await transaction.commit();
    return workout;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

### 2. **SILENT FAILURE ON MODEL FETCH — DATA LOSS RISK**

**Severity:** HIGH  
**Data at Risk:** Baseline measurements, nutrition plans, onboarding data, streaks  
**Blast Radius:** Single client, but could cause incorrect workout generation  
**File & Line:** `clientIntelligenceService.mjs:362-407`

**What's Wrong:**

The `safeGetModel()` helper silently returns `null` if a model doesn't exist:

```javascript
function safeGetModel(name) {
  try { return getModel(name); } catch { return null; }
}
```

Then later:

```javascript
(safeGetModel('ClientBaselineMeasurements')?.findOne({
  where: { userId: clientId },
  order: [['createdAt', 'DESC']],
}) ?? Promise.resolve(null)).catch(err => {
  logger.warn('[ClientIntelligence] Baseline fetch failed:', err.message);
  return null;
})
```

**Problem:** If the `ClientBaselineMeasurements` table exists but the query fails (e.g., database connection lost), the error is logged but the function continues. The workout builder then generates a plan **without 1RM data**, potentially prescribing dangerous weights.

**Real-World Impact:**
- Client has a 200lb bench press 1RM in the database
- Database connection times out during `getClientContext`
- Workout builder defaults to 50% bodyweight (e.g., 100lbs for a 200lb client)
- Client attempts 100lbs when they should be lifting 160lbs (80% of 1RM)
- **Injury risk** or **undertraining**

**Fix:**

Make critical data failures **non-silent**:

```javascript
// For CRITICAL data (1RM, pain entries, compensations), fail loudly
const baselineMeasurements = await (safeGetModel('ClientBaselineMeasurements')?.findOne({
  where: { userId: clientId },
  order: [['createdAt', 'DESC']],
}) ?? Promise.resolve(null)).catch(err => {
  logger.error('[ClientIntelligence] CRITICAL: Baseline fetch failed', { clientId, error: err.message });
  throw new Error('Unable to generate safe workout: baseline data unavailable');
});

// For NON-CRITICAL data (nutrition, streaks), allow null
const nutritionPlan = await (safeGetModel('ClientNutritionPlan')?.findOne({
  where: { clientId, isActive: true },
  order: [['createdAt', 'DESC']],
}) ?? Promise.resolve(null)).catch(err => {
  logger.warn('[ClientIntelligence] NutritionPlan fetch failed:', err.message);
  return null; // OK to continue without this
});
```

---

### 3. **RACE CONDITION: CONCURRENT WORKOUT GENERATION**

**Severity:** HIGH  
**Data at Risk:** Variation logs, workout session counts, streak data  
**Blast Radius:** Single client, but could corrupt rotation pattern  
**File & Line:** `workoutBuilderService.mjs:242-248`

**What's Wrong:**

```javascript
const sessionType = context.variation.lastSessionType
  ? (context.variation.lastSessionType === 'build' ? 'switch' : 'build')
  : 'build';
```

If two trainers (or the same trainer in two browser tabs) generate workouts for the same client simultaneously:

1. **Request A** reads `lastSessionType = 'build'` → decides to generate `'switch'`
2. **Request B** reads `lastSessionType = 'build'` (same value, before A writes) → also decides to generate `'switch'`
3. Both write `'switch'` sessions → rotation pattern is now broken (should be BUILD-BUILD-SWITCH, but got BUILD-SWITCH-SWITCH)

**Fix:**

Use a database-level lock or atomic counter:

```javascript
// Option 1: Row-level lock (PostgreSQL)
const lastLog = await getVariationLog().findOne({
  where: { clientId, trainerId },
  order: [['sessionDate', 'DESC']],
  lock: transaction.LOCK.UPDATE, // Locks the row until transaction commits
  transaction,
});

// Option 2: Atomic increment pattern
const rotationCounter = await getModel('ClientRotationCounter').findOne({
  where: { clientId },
  transaction,
});

const sessionType = (rotationCounter.count % 3 === 2) ? 'switch' : 'build';

await rotationCounter.increment('count', { transaction });
```

---

## 🟠 HIGH FINDINGS

### 4. **NO VALIDATION ON PAIN EXCLUSION LOGIC**

**Severity:** HIGH  
**Data at Risk:** Client could be prescribed exercises that aggravate injuries  
**Blast Radius:** Single client per workout  
**File & Line:** `clientIntelligenceService.mjs:456-481`

**What's Wrong:**

```javascript
if (severity >= PAIN_AUTO_EXCLUDE_SEVERITY && isRecent) {
  painExclusions.push({
    bodyRegion: entry.bodyRegion,
    painLevel: severity,
    painType: entry.painType,
    muscles,
    reason: `Auto-excluded: severity ${severity}/10 within 72h`,
    entryId: entry.id,
  });
  muscles.forEach(m => excludedMuscles.add(m));
}
```

**Problem:** If `entry.bodyRegion` is `null`, `undefined`, or an invalid key (e.g., `"left_shouldr"` typo), `REGION_TO_MUSCLE_MAP[entry.bodyRegion]` returns `undefined`, and `muscles` becomes an empty array. The exclusion is logged, but **no muscles are actually excluded**.

**Real-World Impact:**
- Client reports severe left shoulder pain (severity 9/10)
- Typo in database: `bodyRegion = 'left_shouldr'` (missing 'e')
- Workout builder includes overhead press, lateral raises, etc.
- **Client re-injures shoulder**

**Fix:**

```javascript
const muscles = REGION_TO_MUSCLE_MAP[entry.bodyRegion];

if (!muscles || muscles.length === 0) {
  logger.error('[ClientIntelligence] CRITICAL: Invalid bodyRegion in pain entry', {
    entryId: entry.id,
    clientId,
    bodyRegion: entry.bodyRegion,
    painLevel: severity,
  });
  // Fail safe: exclude entire upper/lower body if region is unknown
  const fallbackMuscles = entry.bodyRegion?.includes('shoulder') || entry.bodyRegion?.includes('arm')
    ? ['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff', 'biceps', 'triceps']
    : entry.bodyRegion?.includes('leg') || entry.bodyRegion?.includes('knee')
    ? ['quads', 'hamstrings', 'glutes', 'calves']
    : [];
  
  fallbackMuscles.forEach(m => excludedMuscles.add(m));
  
  painExclusions.push({
    bodyRegion: entry.bodyRegion,
    painLevel: severity,
    painType: entry.painType,
    muscles: fallbackMuscles,
    reason: `FALLBACK EXCLUSION: Invalid body region, excluded related muscle groups`,
    entryId: entry.id,
  });
  continue;
}
```

---

### 5. **EQUIPMENT FILTER BYPASS**

**Severity:** HIGH  
**Data at Risk:** Client prescribed exercises requiring unavailable equipment  
**Blast Radius:** Single workout  
**File & Line:** `workoutBuilderService.mjs:135-149`

**What's Wrong:**

```javascript
function filterExercises(exercises, constraints, equipmentItems) {
  // ...
  const availableCategories = new Set();
  if (equipmentItems && equipmentItems.length > 0) {
    for (const item of equipmentItems) {
      availableCategories.add(item.category);
    }
    availableCategories.add('bodyweight'); // Always available
  }

  return exercises.filter(ex => {
    // ...
    if (availableCategories.size > 0 && ex.equipment && ex.equipment.length > 0) {
      const hasEquipment = ex.equipment.some(eq => availableCategories.has(eq));
      if (!hasEquipment) return false;
    }
    return true;
  });
}
```

**Problem:** If `equipmentItems` is `null` or `[]`, `availableCategories.size === 0`, and the equipment check is **skipped entirely**. The workout could include barbell squats when the client only has dumbbells.

**Fix:**

```javascript
// If no equipment profile provided, default to bodyweight only
if (!equipmentItems || equipmentItems.length === 0) {
  logger.warn('[WorkoutBuilder] No equipment profile provided, defaulting to bodyweight exercises only', { clientId });
  availableCategories.add('bodyweight');
} else {
  for (const item of equipmentItems) {
    availableCategories.add(item.category);
  }
  availableCategories.add('bodyweight');
}

// Always enforce equipment check
return exercises.filter(ex => {
  if (ex.equipment && ex.equipment.length > 0) {
    const hasEquipment = ex.equipment.some(eq => availableCategories.has(eq));
    if (!hasEquipment) return false;
  }
  return true;
});
```

---

## 🟡 MEDIUM FINDINGS

### 6. **UNVALIDATED 1RM CALCULATIONS**

**Severity:** MEDIUM  
**Data at Risk:** Incorrect weight recommendations  
**Blast Radius:** Single client per workout  
**File & Line:** `clientIntelligenceService.mjs:595-609`

**What's Wrong:**

```javascript
benchPress1RM: baselineMeasurements.benchPressWeight && baselineMeasurements.benchPressReps
  ? Math.round(baselineMeasurements.benchPressWeight / (1.0278 - 0.0278 * baselineMeasurements.benchPressReps))
  : null,
```

**Problem:** If `benchPressReps` is 0, the formula becomes `weight / 1.0278`, which is incorrect. If `benchPressReps` is > 36, the denominator becomes negative, producing a negative 1RM.

**Fix:**

```javascript
benchPress1RM: baselineMeasurements.benchPressWeight && baselineMeasurements.benchPressReps > 0 && baselineMeasurements.benchPressReps <= 20
  ? Math.round(baselineMeasurements.benchPressWeight / (1.0278 - 0.0278 * baselineMeasurements.benchPressReps))
  : null,
```

---

### 7. **NO RATE LIMITING ON ADMIN OVERVIEW**

**Severity:** MEDIUM  
**Data at Risk:** Database overload from repeated calls  
**Blast Radius:** All trainers  
**File & Line:** `clientIntelligenceService.mjs:673-753`

**What's Wrong:**

`getAdminIntelligenceOverview` runs 5 parallel queries with no caching or rate limiting. If a dashboard widget polls this every 5 seconds, it could overwhelm the database.

**Fix:**

Add caching:

```javascript
import NodeCache from 'node-cache';
const adminCache = new NodeCache({ stdTTL: 60 }); // 60-second cache

export async function getAdminIntelligenceOverview(trainerId) {
  const cacheKey = `admin_overview_${trainerId}`;
  const cached = adminCache.get(cacheKey);
  if (cached) return cached;

  const result = await _fetchAdminOverview(trainerId);
  adminCache.set(cacheKey, result);
  return result;
}
```

---

## 🔵 LOW FINDINGS (Informational)

### 8. **INCOMPLETE EXERCISE REGISTRY**

**Severity:** LOW  
**File & Line:** `variationEngine.mjs:81` (truncated)

**What's Wrong:** The registry is cut off mid-definition. Ensure all 81 exercises are present in production.

---

## ✅ RECOMMENDED IMMEDIATE ACTIONS

1. **Add transaction wrappers** to any service that writes data after calling `getClientContext`
2. **Fail loudly** on critical data fetch failures (pain, baseline, compensations)
3. **Add row-level locking** to variation log rotation logic
4. **Validate pain entry body regions** before mapping to muscles
5. **Enforce equipment filtering** even when no profile is provided
6. **Validate 1RM inputs** before calculation
7. **Add caching** to admin overview endpoint

---

## 🛡️ POSITIVE FINDINGS (Good Practices)

✅ **No direct DELETE/TRUNCATE/DROP operations**  
✅ **Extensive error logging** (though some should throw instead of warn)  
✅ **Parallel queries** for performance (but need transaction safety)  
✅ **Comprehensive pain exclusion logic** (just needs validation)  
✅ **NASM-aligned exercise selection** (scientifically sound)

---

**AUDIT COMPLETED:** These services are **NOT** at risk of mass data deletion, but **ARE** at risk of silent data corruption and inconsistent state. Prioritize transaction safety and critical data validation.

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
