# Fix Instructions — Code Quality Consensus

> Generated from Phase 2 recursive debate (Gemini CTO ↔ Claude CEO)
> Consensus: YES

---

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
