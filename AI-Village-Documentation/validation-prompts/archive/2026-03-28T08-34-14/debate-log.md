# Code Quality & Architecture — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 38,383 input / 7,584 output

---

## CTO (Chief Technology Officer) — Round 1

As the CTO, I have reviewed the codebase and the automated AI audit reports. While the AI agents caught some architectural and UX issues, they missed several **critical logical flaws, dangerous falsy evaluations, and severe cache fragmentation bugs** that will break core functionality in production. 

Here is my Round 1 analysis. I expect you to review these carefully. If you wish to challenge them, bring data.

---

### 🔴 CRITICAL: Workout Builder Category/Movement Mismatch
**File:** `backend/services/workoutBuilderService.mjs`
**Lines:** 140-143, 266-270
**What's Wrong:** 
The `generateWorkout` function is fundamentally broken for targeted workouts. If a user requests a `chest` workout, `CATEGORY_MOVEMENT_MAP` maps this to the `push` movement category. The code then loops over `['push']` and calls `selectExercises(registry, moveCat...)` where `moveCat` is `'push'`. 

However, inside `selectExercises`, the code filters the registry using:
`ex.category === category` (which evaluates to `ex.category === 'push'`). 
In the database, the category is `'chest'`, not `'push'`. `'push'` is the *movement pattern*. Because `'chest' === 'push'` is always false, `selectExercises` will return an **empty array**. The builder will generate workouts with 0 exercises for any specific body part.

**Proposed Fix:**
Update `selectExercises` to filter by `movementPattern` instead of `category`, since `generateWorkout` is passing movement patterns.

```javascript
// In selectExercises:
function selectExercises(registry, movementPattern, count, constraints, equipmentItems, nasmPhase) {
  const categoryExercises = registry
    .filter(ex => ex.movementPattern === movementPattern || ex.category === movementPattern);
  // ...
}
```

---

### 🟠 HIGH: Cache Fragmentation & API Quota Drain
**File:** `backend/services/serpApiService.mjs`
**Lines:** 127-130, 152-155
**What's Wrong:** 
For Google News and YouTube, the cache key includes the `num` parameter (e.g., `oracle:news:${fitnessQuery}:${num}`). However, `num` is **never passed** to the SerpAPI fetch parameters for these engines. SerpAPI returns a fixed payload, and the service caches the *entire* massive JSON response under that specific `num` key, only slicing the array *after* retrieval. 

If the frontend requests `num=5`, it caches the full payload under `...:5`. If it then requests `num=8`, it results in a cache miss, triggers a duplicate API call to SerpAPI, and caches the exact same full payload under `...:8`. This will rapidly drain our paid SerpAPI quota and bloat Redis with duplicate data.

**Proposed Fix:**
Remove `num` from the cache key for endpoints where it isn't sent to the API.

```javascript
// In searchFitnessNews:
const cacheKey = `oracle:news:${fitnessQuery}`; // Removed :${num}
const result = await cachedFetch(cacheKey, CACHE_TTL.news, { ... });
// ...
const articles = (result.data.news_results || []).slice(0, num).map(r => ({ ... }));
```

---

### 🟠 HIGH: Falsy Zero Bug in 1RM Intensity Calculation
**File:** `backend/services/oneRepMaxService.mjs`
**Lines:** 94-95
**What's Wrong:** 
The weight recommendation logic uses logical OR (`||`) for default parameters: 
`const safeMin = Math.min(intensityMin || 0.5, 1.0);`

If a trainer or an OPT phase specifies an `intensityMin` of `0` (e.g., for bodyweight, mobility, or Phase 1 stabilization exercises), `0 || 0.5` evaluates to `0.5`. This forces a minimum 50% 1RM load on exercises that should be unweighted. Assigning 50% of a 1RM to a corrective exercise is a massive injury liability.

**Proposed Fix:**
Use the nullish coalescing operator (`??`) to respect `0` as a valid intensity.

```javascript
const safeMin = Math.min(intensityMin ?? 0.5, 1.0);
const safeMax = Math.min(intensityMax ?? 0.7, 1.0);
```

---

### 🟡 MEDIUM: Negative Number Injection in Oracle Routes
**File:** `backend/routes/oracleRoutes.mjs`
**Lines:** 46, 62, 78
**What's Wrong:** 
The pagination parsing uses `Math.min(parseInt(num) || 5, 10)`. If a malicious or buggy client passes `?num=-5`, `parseInt` returns `-5`. `Math.min(-5, 10)` returns `-5`. 
This negative number is passed down to `slice(0, -5)` in the SerpAPI service, which will remove the last 5 elements of the array instead of returning 5 elements, breaking the API contract.

**Proposed Fix:**
Clamp the value with `Math.max` to ensure a floor of 1.

```javascript
// Apply to all oracle routes:
const parsedNum = Math.max(1, Math.min(parseInt(num) || 5, 10));
const result = await searchScholar(q, parsedNum);
```

---

### 🟡 MEDIUM: Route Shadowing (Duplicate Mounts)
**File:** `backend/core/routes.mjs`
**Lines:** 180-181
**What's Wrong:** 
```javascript
app.use('/api/auth', authRoutes);
app.use('/api/auth', userManagementRoutes);
```
Mounting two different routers to the exact same base path (`/api/auth`) creates route shadowing. Express will evaluate `authRoutes` first, and if a route isn't found, it falls through to `userManagementRoutes`. This makes debugging middleware, route resolution, and 404 handling incredibly difficult and is a major anti-pattern.

**Proposed Fix:**
Mount `userManagementRoutes` to its proper RESTful domain.

```javascript
app.use('/api/auth', authRoutes);
app.use('/api/users', userManagementRoutes); // Changed base path
```

---

### 🟡 MEDIUM: Unhandled JSON Parse Exception
**File:** `backend/services/serpApiService.mjs`
**Lines:** 57-59
**What's Wrong:** 
```javascript
return { ok: true, data: typeof cached === 'string' ? JSON.parse(cached) : cached, fromCache: true };
```
If the Redis cache is corrupted, manually edited, or encounters a memory fault resulting in invalid JSON, `JSON.parse()` will throw a synchronous exception. Because this is not wrapped in a `try/catch`, it will crash the Node.js event loop for that request, resulting in an unlogged 500 Internal Server Error.

**Proposed Fix:**
Wrap the parse in a try/catch and fallback to a cache miss if corrupted.

```javascript
  if (cached) {
    try {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return { ok: true, data, fromCache: true };
    } catch (e) {
      logger.warn(`[SwanOracle] Cache parse failed for ${cacheKey}, fetching fresh.`);
      // Fall through to fetch
    }
  }
```

---

**To the CEO:** The AI validators did a decent job catching the N+1 query in the workout builder and the monolithic route imports, but they completely missed the `generateWorkout` mapping bug which would have shipped broken workouts to production. Let me know which of these you want to debate.

---

## CEO (Chief Executive Officer) — Round 2

# CEO Response — Round 1

I've reviewed your analysis, CTO. Your technical rigor is appreciated, and I agree with the **severity classifications** and **most of your proposed fixes**. However, I have **one critical dispute** on implementation approach, **two refinements** to your solutions, and **one additional architectural concern** you missed.

---

## ✅ AGREED — Critical Issues

### 1. Workout Builder Category/Movement Mismatch (CRITICAL)
**Confirmed.** I traced the data flow and you're absolutely right. The `CATEGORY_MOVEMENT_MAP` returns movement patterns (`'push'`), but `selectExercises` filters by `ex.category` which contains body parts (`'chest'`). This is a **zero-exercise bug** that would fail silently in production.

**However, I propose a more robust fix:**

```javascript
// workoutBuilderService.mjs, line ~266
function selectExercises(registry, categoryOrPattern, count, constraints, equipmentItems, nasmPhase) {
  const categoryExercises = registry.filter(ex => 
    ex.category === categoryOrPattern || 
    ex.movementPattern === categoryOrPattern ||
    ex.secondaryCategories?.includes(categoryOrPattern) // Handle multi-joint exercises
  );
  // ... rest of function
}
```

**Rationale:** Your fix works, but doesn't account for exercises that legitimately belong to multiple categories (e.g., a bench press is both `chest` and `push`). We should check `secondaryCategories` array if it exists in the exercise schema.

---

### 2. Cache Fragmentation (HIGH)
**Agreed.** The `num` parameter in cache keys for News/YouTube is creating unnecessary API calls. Your fix is correct.

**Additional requirement:** We need a **cache migration script** to clear existing fragmented keys before deploying this fix, or we'll have orphaned cache entries bloating Redis.

```javascript
// Add to deployment script:
// redis-cli KEYS "oracle:news:*" | xargs redis-cli DEL
// redis-cli KEYS "oracle:youtube:*" | xargs redis-cli DEL
```

---

### 3. Falsy Zero Bug in 1RM (HIGH)
**Agreed.** The `||` operator is a classic JavaScript footgun here. Your `??` fix is correct and necessary for Phase 1 corrective exercises.

---

### 4. Negative Number Injection (MEDIUM)
**Agreed.** Your `Math.max(1, ...)` clamp is the right approach.

---

### 5. Unhandled JSON Parse Exception (MEDIUM)
**Agreed.** The try/catch wrapper is necessary for production resilience.

---

## ❌ DISPUTED — Route Shadowing Fix

**File:** `backend/core/routes.mjs`, Lines 180-181

### Your Proposal:
```javascript
app.use('/api/auth', authRoutes);
app.use('/api/users', userManagementRoutes);
```

### My Concern:
Changing the base path from `/api/auth` to `/api/users` for `userManagementRoutes` is a **breaking API change** that will require frontend coordination and versioning. Before we make this change, I need to see:

1. **Route inventory:** What specific endpoints are in `userManagementRoutes`? 
2. **Conflict analysis:** Are there actual route collisions, or is this theoretical?
3. **Frontend impact assessment:** How many components are calling these endpoints?

**Alternative proposal:**
If the routes don't actually conflict (e.g., `authRoutes` handles `/login`, `/register` and `userManagementRoutes` handles `/profile`, `/settings`), we should **merge them into a single router** rather than split the base path:

```javascript
// backend/routes/authRoutes.mjs
import userManagementRoutes from './userManagementRoutes.mjs';

// ... existing auth routes ...

// Re-export combined router
router.use('/', userManagementRoutes);
export default router;

// backend/core/routes.mjs
app.use('/api/auth', authRoutes); // Now includes user management
```

This preserves the API contract while eliminating the shadowing anti-pattern.

**Decision needed:** Provide the route inventory so we can choose the right approach.

---

## 🔴 MISSED CRITICAL ISSUE — Workout Builder Equipment Validation

**File:** `backend/services/workoutBuilderService.mjs`  
**Lines:** 272-276

### What's Wrong:
```javascript
const categoryExercises = registry
  .filter(ex => ex.category === category)
  .filter(ex => !equipmentItems.length || 
    ex.equipment.some(e => equipmentItems.includes(e))
  );
```

The equipment filter has a **dangerous short-circuit**: `!equipmentItems.length` means if the user provides an **empty equipment array** (common for "bodyweight only" workouts), the filter passes **all exercises regardless of equipment requirements**.

**Scenario:** User selects "Home Workout" with no equipment. System returns exercises requiring barbells, cable machines, etc.

**Proposed Fix:**
```javascript
const categoryExercises = registry
  .filter(ex => ex.category === category)
  .filter(ex => {
    if (!equipmentItems.length) {
      // Empty array means bodyweight only
      return !ex.equipment.length || ex.equipment.every(e => e === 'bodyweight');
    }
    return ex.equipment.some(e => equipmentItems.includes(e));
  });
```

---

## 📊 Summary

| Issue | Status | Action Required |
|-------|--------|-----------------|
| Category/Movement Mismatch | Agreed (with refinement) | Implement enhanced filter |
| Cache Fragmentation | Agreed | Add migration script |
| Falsy Zero Bug | Agreed | Deploy as proposed |
| Negative Number Injection | Agreed | Deploy as proposed |
| JSON Parse Exception | Agreed | Deploy as proposed |
| Route Shadowing | **Disputed** | Need route inventory |
| Equipment Validation | **New Critical** | CEO proposal |

**CTO, please respond with:**
1. Route inventory for `authRoutes` vs `userManagementRoutes`
2. Your assessment of the equipment validation bug
3. Any objections to the enhanced category filter

**Rounds remaining: 3**

---

## CTO (Chief Technology Officer) — Round 3

As the CTO, I appreciate the thorough review. You made an excellent catch on the equipment validation bug, and your concern regarding breaking API changes is valid. 

However, I must push back on your Redis migration strategy and refine your equipment validation logic, as both contain dangerous edge cases.

Here is my Round 2 analysis.

---

### ❌ DISPUTED: Redis Cache Migration Script (Cache Fragmentation)
**Your Proposal:** `redis-cli KEYS "oracle:news:*" | xargs redis-cli DEL`
**Why I Disagree:** 
Running the `KEYS` command in a production Redis environment is a severe anti-pattern. Redis is single-threaded; `KEYS` operates in $O(N)$ time and will block the event loop while scanning the entire keyspace. If we have millions of keys, this will cause massive latency spikes, potentially triggering timeouts across our entire backend and crashing the application.

**Proposed Alternative:**
We must use the non-blocking `SCAN` command to iterate over the keyspace in cursors. We should add a proper Node.js migration script rather than relying on bash pipes.

```javascript
// backend/scripts/clearFragmentedCache.mjs
import redisClient from '../core/redis.mjs';

async function clearOldCache(pattern) {
  let cursor = '0';
  do {
    const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = reply[0];
    const keys = reply[1];
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } while (cursor !== '0');
}

await clearOldCache('oracle:news:*');
await clearOldCache('oracle:youtube:*');
```

---

### ❌ DISPUTED: Equipment Validation Logic
**File:** `backend/services/workoutBuilderService.mjs`
**Lines:** 272-276
**Your Proposal:** 
```javascript
return ex.equipment.some(e => equipmentItems.includes(e));
```
**Why I Disagree:** 
You correctly identified the empty-array short-circuit (the "bodyweight" bug), and I fully agree with your fix for that specific scenario. However, your logic for when the user *does* have equipment uses `.some()`. 

If an exercise requires `['dumbbell', 'bench']` and the user only selects `['dumbbell']`, `.some()` evaluates to `true`. The user will be assigned a dumbbell bench press without owning a bench. The user's available equipment must be a **superset** of the exercise's required equipment.

**Proposed Alternative:**
We must use `.every()` to ensure the user possesses *all* required equipment for the exercise, while safely ignoring 'bodyweight' or 'none' tags.

```javascript
const categoryExercises = registry
  .filter(ex => ex.category === categoryOrPattern || ex.movementPattern === categoryOrPattern || ex.secondaryCategories?.includes(categoryOrPattern))
  .filter(ex => {
    // Empty array means bodyweight only
    if (!equipmentItems || !equipmentItems.length) {
      return !ex.equipment?.length || ex.equipment.every(e => e === 'bodyweight' || e === 'none');
    }
    // User has equipment: ensure they have ALL required items for this exercise
    return !ex.equipment?.length || ex.equipment.every(e => 
      e === 'bodyweight' || e === 'none' || equipmentItems.includes(e)
    );
  });
```
*(Note: I also integrated your `secondaryCategories` refinement here, which I fully agree with).*

---

### 🤝 PARTIAL AGREEMENT: Route Shadowing
**File:** `backend/core/routes.mjs`
**Lines:** 180-181

**Route Inventory:**
*   `authRoutes`: `/login`, `/register`, `/refresh`, `/logout`
*   `userManagementRoutes`: `/profile`, `/preferences`, `/:id/metrics`

**My Assessment:**
You are correct. Changing the base path to `/api/users` right now would immediately break the frontend applications currently fetching `/api/auth/profile`. 

I agree to your proposal of merging the routers to preserve the API contract and eliminate the shadowing ambiguity. 

**Implementation Agreement:**
```javascript
// backend/routes/authRoutes.mjs
import userManagementRoutes from './userManagementRoutes.mjs';

// ... existing auth routes ...

// Mount user routes under the same router to prevent Express fall-through ambiguity
router.use('/', userManagementRoutes); 
export default router;
```
*Caveat:* While we will do this for the hotfix, I strongly recommend we add a deprecation warning to the `/api/auth/profile` endpoints and schedule a v2 migration to `/api/users/profile` to respect RESTful boundaries.

---

**To the CEO:** 
We are very close to a rock-solid release. Let me know if you approve of the `SCAN` Redis migration and the `.every()` strict equipment validation.

---

## CEO (Chief Executive Officer) — Round 4

# CEO Response — Round 2

CTO, excellent pushback. Your Redis and equipment validation concerns are **both technically correct**. I'm reversing my positions on those two items and accepting your implementations. We're converging rapidly.

---

## ✅ AGREEMENT: Redis Migration Strategy

**I was wrong.** You're absolutely correct that `KEYS` is a blocking operation that could cause production outages. Your `SCAN`-based migration script is the proper solution.

**Accepted implementation:**
```javascript
// backend/scripts/clearFragmentedCache.mjs
import redisClient from '../core/redis.mjs';

async function clearOldCache(pattern) {
  let cursor = '0';
  let totalDeleted = 0;
  do {
    const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = reply[0];
    const keys = reply[1];
    if (keys.length > 0) {
      await redisClient.del(keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== '0');
  console.log(`Cleared ${totalDeleted} keys matching ${pattern}`);
}

await clearOldCache('oracle:news:*');
await clearOldCache('oracle:youtube:*');
```

**Additional requirement:** Add this to our deployment checklist and document it in `DEPLOYMENT.md` so DevOps runs it before the service restart.

---

## ✅ AGREEMENT: Equipment Validation Logic

**You caught a critical flaw in my logic.** I used `.some()` when I should have used `.every()`. Your analysis is correct: if an exercise requires `['dumbbell', 'bench']` and the user only has `['dumbbell']`, my code would incorrectly include that exercise.

**Accepted implementation:**
```javascript
const categoryExercises = registry
  .filter(ex => 
    ex.category === categoryOrPattern || 
    ex.movementPattern === categoryOrPattern || 
    ex.secondaryCategories?.includes(categoryOrPattern)
  )
  .filter(ex => {
    // Empty array means bodyweight only
    if (!equipmentItems || !equipmentItems.length) {
      return !ex.equipment?.length || 
        ex.equipment.every(e => e === 'bodyweight' || e === 'none');
    }
    // User has equipment: ensure they have ALL required items
    return !ex.equipment?.length || 
      ex.equipment.every(e => 
        e === 'bodyweight' || e === 'none' || equipmentItems.includes(e)
      );
  });
```

**One minor refinement request:** Can we add a unit test for this specific scenario to prevent regression?

```javascript
// backend/tests/workoutBuilderService.test.mjs
describe('Equipment Validation', () => {
  it('should exclude exercises requiring equipment user does not have', () => {
    const registry = [
      { id: 1, category: 'chest', equipment: ['dumbbell', 'bench'] },
      { id: 2, category: 'chest', equipment: ['dumbbell'] },
      { id: 3, category: 'chest', equipment: ['bodyweight'] }
    ];
    const result = selectExercises(registry, 'chest', 10, {}, ['dumbbell'], 'phase1');
    expect(result.map(e => e.id)).toEqual([2, 3]); // Should exclude exercise 1
  });
});
```

---

## ✅ AGREEMENT: Route Shadowing Resolution

Your route inventory confirms there are no actual collisions. I accept your merged router approach:

```javascript
// backend/routes/authRoutes.mjs
import userManagementRoutes from './userManagementRoutes.mjs';

// ... existing auth routes ...

router.use('/', userManagementRoutes); 
export default router;

// backend/core/routes.mjs
app.use('/api/auth', authRoutes); // Now includes user management
```

**I also agree with your deprecation recommendation.** Let's add response headers to signal the future migration:

```javascript
// backend/routes/userManagementRoutes.mjs
router.get('/profile', (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT');
  res.set('Link', '</api/users/profile>; rel="alternate"');
  next();
}, getProfile);
```

This gives frontend teams 6+ months to migrate while maintaining backward compatibility.

---

## 📊 Final Consensus Summary

| Issue | Resolution | Owner | Priority |
|-------|-----------|-------|----------|
| Category/Movement Mismatch | **AGREED** - Enhanced filter with `secondaryCategories` | CTO | P0 |
| Cache Fragmentation | **AGREED** - Remove `num` from cache keys | CTO | P0 |
| Cache Migration | **AGREED** - Use `SCAN` instead of `KEYS` | CTO | P0 |
| Falsy Zero Bug (1RM) | **AGREED** - Use `??` operator | CTO | P0 |
| Negative Number Injection | **AGREED** - Add `Math.max(1, ...)` clamp | CTO | P1 |
| JSON Parse Exception | **AGREED** - Add try/catch wrapper | CTO | P1 |
| Route Shadowing | **AGREED** - Merge routers + deprecation headers | CEO | P1 |
| Equipment Validation | **AGREED** - Use `.every()` with unit test | CTO | P0 |

---

## 🎯 Implementation Plan

**Immediate (P0) - Deploy in hotfix branch:**
1. Fix workout builder category/movement filter logic
2. Fix equipment validation with `.every()` 
3. Remove `num` from News/YouTube cache keys
4. Run Redis `SCAN` migration script before deployment
5. Fix 1RM falsy zero bug with `??`

**Next Sprint (P1):**
6. Add negative number clamping to oracle routes
7. Add JSON parse error handling
8. Merge auth routers with deprecation headers
9. Add equipment validation unit tests

**CTO, do you concur with this implementation plan?** If so, we have **CONSENSUS** and can proceed to implementation.

**Rounds remaining: 2**

---

## CTO (Chief Technology Officer) — Round 5

CONSENSUS REACHED

To the CEO: Excellent collaboration. Your additions of the `totalDeleted` counter for the Redis script, the unit test for the equipment validation, and the standard HTTP `Deprecation` and `Sunset` headers for the route migration are textbook examples of mature engineering leadership. 

I agree with all of your technical refinements and the overall implementation plan. My only executive override as CTO is that since we are already modifying `backend/services/serpApiService.mjs` in the P0 hotfix, we will include the 3-line JSON parse `try/catch` and the negative number clamp in the P0 release as well. Leaving an event-loop-crashing bug in production until the next sprint is an unnecessary risk when the file is already checked out for the hotfix.

Here are the final merged findings and the exact code specifications for the engineering team to execute.

---

### 1. Workout Builder Logic & Equipment Validation (P0)
**File:** `backend/services/workoutBuilderService.mjs` (Lines ~266-276)
**Resolution:** We will implement the combined category/movement/secondary filter and the strict `.every()` equipment validation to prevent zero-exercise bugs and dangerous equipment assumptions.

```javascript
const categoryExercises = registry
  .filter(ex => 
    ex.category === categoryOrPattern || 
    ex.movementPattern === categoryOrPattern || 
    ex.secondaryCategories?.includes(categoryOrPattern)
  )
  .filter(ex => {
    // Empty array means bodyweight only
    if (!equipmentItems || !equipmentItems.length) {
      return !ex.equipment?.length || 
        ex.equipment.every(e => e === 'bodyweight' || e === 'none');
    }
    // User has equipment: ensure they have ALL required items
    return !ex.equipment?.length || 
      ex.equipment.every(e => 
        e === 'bodyweight' || e === 'none' || equipmentItems.includes(e)
      );
  });
```

**File:** `backend/tests/workoutBuilderService.test.mjs`
**Resolution:** Add the CEO's regression test for the `.every()` logic.
```javascript
describe('Equipment Validation', () => {
  it('should exclude exercises requiring equipment user does not have', () => {
    const registry = [
      { id: 1, category: 'chest', equipment: ['dumbbell', 'bench'] },
      { id: 2, category: 'chest', equipment: ['dumbbell'] },
      { id: 3, category: 'chest', equipment: ['bodyweight'] }
    ];
    const result = selectExercises(registry, 'chest', 10, {}, ['dumbbell'], 'phase1');
    expect(result.map(e => e.id)).toEqual([2, 3]); 
  });
});
```

### 2. Cache Fragmentation & Safe Redis Migration (P0)
**File:** `backend/services/serpApiService.mjs` (Lines 127-130, 152-155)
**Resolution:** Remove the unused `num` parameter from the cache keys to prevent quota drain.
```javascript
const cacheKey = `oracle:news:${fitnessQuery}`; // :${num} removed
```

**File:** `backend/scripts/clearFragmentedCache.mjs` (New File)
**Resolution:** Implement the non-blocking `SCAN` script. DevOps will add this to `DEPLOYMENT.md` to run pre-restart.
```javascript
import redisClient from '../core/redis.mjs';

async function clearOldCache(pattern) {
  let cursor = '0';
  let totalDeleted = 0;
  do {
    const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = reply[0];
    const keys = reply[1];
    if (keys.length > 0) {
      await redisClient.del(keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== '0');
  console.log(`Cleared ${totalDeleted} keys matching ${pattern}`);
}

await clearOldCache('oracle:news:*');
await clearOldCache('oracle:youtube:*');
```

### 3. Falsy Zero Bug in 1RM (P0)
**File:** `backend/services/oneRepMaxService.mjs` (Lines 94-95)
**Resolution:** Replace `||` with `??` to allow 0% intensity for corrective/bodyweight phases.
```javascript
const safeMin = Math.min(intensityMin ?? 0.5, 1.0);
const safeMax = Math.min(intensityMax ?? 0.7, 1.0);
```

### 4. JSON Parse Exception & Negative Number Injection (P0)
**File:** `backend/services/serpApiService.mjs` (Lines 57-59)
**Resolution:** Wrap cache parsing in a `try/catch` to prevent event loop crashes from corrupted Redis data.
```javascript
  if (cached) {
    try {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return { ok: true, data, fromCache: true };
    } catch (e) {
      logger.warn(`[SwanOracle] Cache parse failed for ${cacheKey}, fetching fresh.`);
    }
  }
```

**File:** `backend/routes/oracleRoutes.mjs` (Lines 46, 62, 78)
**Resolution:** Clamp pagination to prevent negative slice injections.
```javascript
const parsedNum = Math.max(1, Math.min(parseInt(num) || 5, 10));
```

### 5. Route Shadowing & Deprecation Headers (P1)
**File:** `backend/routes/authRoutes.mjs` & `backend/core/routes.mjs`
**Resolution:** Merge the routers to eliminate Express fall-through ambiguity.
```javascript
// In authRoutes.mjs
import userManagementRoutes from './userManagementRoutes.mjs';
router.use('/', userManagementRoutes); 
export default router;
```

**File:** `backend/routes/userManagementRoutes.mjs`
**Resolution:** Apply the CEO's sunset headers to enforce a clean migration path for frontend teams.
```javascript
router.get('/profile', (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT');
  res.set('Link', '</api/users/profile>; rel="alternate"');
  next();
}, getProfile);
```

---
**Final Status:** All architectural, logical, and performance disputes have been resolved. The engineering team is cleared to execute this merged plan immediately.

---

