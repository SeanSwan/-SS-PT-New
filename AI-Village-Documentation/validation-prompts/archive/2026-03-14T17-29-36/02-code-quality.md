# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.2s
> **Files:** backend/middleware/aiRateLimiter.mjs, backend/routes/aiChatRoutes.mjs, backend/routes/foodScannerRoutes.mjs, frontend/src/components/BodyMap/BodyMapSVG.tsx, frontend/src/components/BodyMap/bodyRegions.ts, frontend/src/components/BodyMap/index.tsx
> **Generated:** 3/14/2026, 10:29:36 AM

---

# SwanStudios Code Quality Review

## Summary
Overall code quality is **GOOD** with some critical issues around error handling, type safety, and performance patterns. The backend routes show mature patterns (rate limiting, auth), but the frontend has several React anti-patterns and accessibility gaps.

---

## 🔴 CRITICAL Issues

### 1. **Stale Closure Bug in BodyMapSVG Zoom Handlers**
**File:** `frontend/src/components/BodyMap/BodyMapSVG.tsx`  
**Lines:** 166-195

```tsx
const handleTouchMove = useCallback((e: React.TouchEvent) => {
  // ... uses `scale` and `translate` from closure
}, [scale]); // ❌ Missing `translate` in deps
```

**Problem:** `handleTouchMove` reads `translate` but doesn't include it in dependencies. This will cause stale values during pan gestures.

**Fix:**
```tsx
const handleTouchMove = useCallback((e: React.TouchEvent) => {
  // ... existing logic
}, [scale, translate]); // ✅ Include all closure dependencies
```

**Impact:** Pan gestures will use outdated translation values, causing jumpy/broken panning.

---

### 2. **Missing Error Boundaries Around AI Chat**
**File:** `backend/routes/aiChatRoutes.mjs`  
**Lines:** 180-250

**Problem:** AI chat route has complex async logic (DB queries, AI provider calls, data writes) but no error recovery. If `sendChatMessage` throws, the user gets a generic 500 with no context.

**Fix:**
```javascript
try {
  const aiResult = await sendChatMessage(promptMessages);
} catch (aiError) {
  logger.error('[AIChatRoutes] AI provider error:', aiError);
  return res.status(503).json({
    success: false,
    error: 'AI service temporarily unavailable',
    code: 'AI_PROVIDER_ERROR',
    retryAfter: 60, // seconds
  });
}
```

**Impact:** Poor UX during AI outages; users see cryptic errors instead of actionable messages.

---

### 3. **Unvalidated User Input in AI Data Updates**
**File:** `backend/routes/aiChatRoutes.mjs`  
**Lines:** 256-275

```javascript
const actionMatch = aiResult.content.match(/```json\s*(\{[\s\S]*?"action"\s*:\s*"update_client_data"[\s\S]*?\})\s*```/);
if (actionMatch) {
  const actionPayload = JSON.parse(actionMatch[1]); // ❌ No validation
  dataUpdateResult = await processAIDataUpdates(targetId, actionPayload.updates, ...);
}
```

**Problem:** AI response is parsed without schema validation. A malicious/buggy AI response could inject arbitrary data structures.

**Fix:**
```javascript
import Joi from 'joi';

const dataUpdateSchema = Joi.object({
  action: Joi.string().valid('update_client_data').required(),
  updates: Joi.array().items(Joi.object({
    type: Joi.string().valid('macro_log', 'weight', 'workout').required(),
    data: Joi.object().required(),
  })).required(),
});

const { error, value } = dataUpdateSchema.validate(actionPayload);
if (error) {
  logger.warn('[AIChatRoutes] Invalid AI action payload:', error.message);
  continue; // Skip malformed updates
}
```

**Impact:** Potential data corruption or injection attacks via prompt engineering.

---

## 🟠 HIGH Priority Issues

### 4. **Inline Function Creation in Render Loop**
**File:** `frontend/src/components/BodyMap/BodyMapSVG.tsx`  
**Lines:** 215-240

```tsx
const renderRegions = (regions: BodyRegion[]) =>
  regions.map((region) => {
    // ... creates new onClick handler on every render
    return (
      <g key={region.id} onClick={() => onRegionClick(region.id)}>
```

**Problem:** `onClick` creates a new function instance for every region on every render (60+ regions × render frequency).

**Fix:**
```tsx
const handleRegionClick = useCallback((regionId: string) => {
  onRegionClick(regionId);
}, [onRegionClick]);

// In render:
<g key={region.id} onClick={() => handleRegionClick(region.id)}>
```

Or better, use a data attribute:
```tsx
<g key={region.id} data-region-id={region.id} onClick={handleRegionClickEvent}>

const handleRegionClickEvent = useCallback((e: React.MouseEvent<SVGGElement>) => {
  const regionId = e.currentTarget.dataset.regionId;
  if (regionId) onRegionClick(regionId);
}, [onRegionClick]);
```

**Impact:** Unnecessary re-renders and memory churn, especially on low-end devices.

---

### 5. **Missing TypeScript Types in Backend Routes**
**File:** `backend/routes/aiChatRoutes.mjs`  
**Lines:** Throughout

**Problem:** Backend uses `.mjs` with no TypeScript. Request/response shapes are undocumented, making frontend integration error-prone.

**Fix:** Migrate to `.ts` or add JSDoc types:
```javascript
/**
 * @typedef {Object} CreateConversationRequest
 * @property {string} [context='general']
 * @property {string} [title]
 * @property {number} [targetUserId]
 * @property {'phd_only'|'simple_only'|'both'} [responseStyle='both']
 */

/**
 * @param {import('express').Request<{}, {}, CreateConversationRequest>} req
 * @param {import('express').Response} res
 */
router.post('/conversations', async (req, res) => {
```

**Impact:** Runtime type errors, harder to maintain, no IDE autocomplete for API contracts.

---

### 6. **Race Condition in Rate Limiter Release**
**File:** `backend/middleware/aiRateLimiter.mjs`  
**Lines:** 37-45

```javascript
const releaseOnce = () => {
  releaseConcurrent(userId);
  res.removeListener('finish', releaseOnce);
  res.removeListener('close', releaseOnce);
};
res.on('finish', releaseOnce);
res.on('close', releaseOnce);
```

**Problem:** If `finish` and `close` fire simultaneously (rare but possible), `releaseConcurrent` could be called twice before listeners are removed.

**Fix:**
```javascript
let released = false;
const releaseOnce = () => {
  if (released) return;
  released = true;
  releaseConcurrent(userId);
  res.removeListener('finish', releaseOnce);
  res.removeListener('close', releaseOnce);
};
```

**Impact:** Could decrement concurrent counter below zero, breaking rate limiting.

---

### 7. **Hardcoded Colors in BodyMapSVG**
**File:** `frontend/src/components/BodyMap/BodyMapSVG.tsx`  
**Lines:** 84, 96, 113, 127

```tsx
const ViewLabel = styled.h4`
  color: #8B5CF6; // ❌ Hardcoded Wing Purple
`;

const PainDot = styled.circle<{ $color: string }>`
  stroke: #E0ECF4; // ❌ Hardcoded Frost White
`;
```

**Problem:** Violates theme token usage requirement. Colors won't adapt to theme changes.

**Fix:**
```tsx
const ViewLabel = styled.h4`
  color: ${({ theme }) => theme.colors.glowAccent || '#8B5CF6'};
`;

const PainDot = styled.circle<{ $color: string }>`
  stroke: ${({ theme }) => theme.colors.background || '#E0ECF4'};
`;
```

---

## 🟡 MEDIUM Priority Issues

### 8. **DRY Violation: Admin Role Check Repeated**
**File:** `backend/routes/foodScannerRoutes.mjs`  
**Lines:** 197, 227, 256

```javascript
if (req.user.role !== 'admin') {
  return res.status(403).json({ success: false, message: 'Unauthorized: Admin access required' });
}
```

**Fix:** Extract to middleware:
```javascript
// middleware/adminOnly.mjs
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// In routes:
router.post('/admin/ingredient', protect, adminOnly, async (req, res) => {
```

---

### 9. **Missing Memoization in BodyMap**
**File:** `frontend/src/components/BodyMap/index.tsx` (truncated)

**Problem:** If `BodyMap` re-renders frequently (e.g., parent state changes), `regionPainMap` is rebuilt every time.

**Fix:**
```tsx
const regionPainMap = useMemo(() => {
  const map = new Map<string, PainEntry>();
  for (const entry of painEntries) {
    if (!entry.isActive) continue;
    const existing = map.get(entry.bodyRegion);
    if (!existing || entry.painLevel > existing.painLevel) {
      map.set(entry.bodyRegion, entry);
    }
  }
  return map;
}, [painEntries]);
```

---

### 10. **Inconsistent Error Response Shapes**
**Files:** `backend/routes/aiChatRoutes.mjs`, `foodScannerRoutes.mjs`

**Problem:**
- AI routes: `{ success: false, error: '...' }`
- Food scanner: `{ success: false, message: '...' }`

**Fix:** Standardize on one shape:
```javascript
// utils/apiResponse.mjs
export const errorResponse = (message, code = null, statusCode = 500) => ({
  success: false,
  error: { message, code },
});

// Usage:
return res.status(404).json(errorResponse('Conversation not found', 'NOT_FOUND', 404));
```

---

### 11. **Accessibility: Missing ARIA Labels on Body Regions**
**File:** `frontend/src/components/BodyMap/BodyMapSVG.tsx`  
**Lines:** 215-240

```tsx
<g key={region.id} onClick={() => onRegionClick(region.id)}>
  {/* No aria-label or role */}
```

**Fix:**
```tsx
<g
  key={region.id}
  role="button"
  aria-label={`${region.label}${isActive ? ` - Pain level ${painEntry.painLevel}` : ''}`}
  tabIndex={0}
  onClick={() => onRegionClick(region.id)}
  onKeyPress={(e) => e.key === 'Enter' && onRegionClick(region.id)}
>
```

---

### 12. **Potential Memory Leak in Zoom Handlers**
**File:** `frontend/src/components/BodyMap/BodyMapSVG.tsx`  
**Lines:** 166-195

**Problem:** `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` are recreated on every `scale`/`translate` change, but event listeners aren't cleaned up if component unmounts mid-gesture.

**Fix:**
```tsx
useEffect(() => {
  return () => {
    // Cleanup refs on unmount
    pinchRef.current = null;
    panRef.current = null;
  };
}, []);
```

---

## 🟢 LOW Priority Issues

### 13. **Magic Numbers in Barcode Validation**
**File:** `backend/routes/foodScannerRoutes.mjs`  
**Line:** 13

```javascript
const isValidBarcode = (barcode) => /^\d{8,14}$/.test(barcode);
```

**Fix:**
```javascript
const BARCODE_MIN_LENGTH = 8;  // UPC-A, EAN-8
const BARCODE_MAX_LENGTH = 14; // ITF-14
const isValidBarcode = (barcode) => 
  new RegExp(`^\\d{${BARCODE_MIN_LENGTH},${BARCODE_MAX_LENGTH}}$`).test(barcode);
```

---

### 14. **Unused Import in aiRateLimiter**
**File:** `backend/middleware/aiRateLimiter.mjs`  
**Line:** 11

```javascript
import { checkRateLimit, releaseConcurrent } from '../services/ai/rateLimiter.mjs';
```

**Problem:** `releaseConcurrent` is imported but only used in routes, not in the middleware itself (it's called in routes' `finally` blocks).

**Fix:** Remove from middleware imports; keep only in routes.

---

### 15. **Inconsistent Naming: `resolvedStyle` vs `responseStyle`**
**File:** `backend/routes/aiChatRoutes.mjs`  
**Lines:** 61-62, 73

```javascript
const resolvedStyle = validStyles.includes(responseStyle) ? responseStyle : 'both';
// Later stored as:
metadata: { responseStyle: resolvedStyle },
```

**Fix:** Use consistent naming:
```javascript
const validatedResponseStyle = validStyles.includes(responseStyle) ? responseStyle : 'both';
metadata: { responseStyle: validatedResponseStyle },
```

---

### 16. **Missing `key` Prop Warning Potential**
**File:** `frontend/src/components/BodyMap/BodyMapSVG.tsx`  
**Lines:** 215-240

**Problem:** While `key={region.id}` is present, if `ALL_BODY_REGIONS` has duplicate IDs (data bug), React will warn.

**Fix:** Add runtime validation in dev:
```tsx
if (process.env.NODE_ENV === 'development') {
  const ids = new Set();
  for (const region of regions) {
    if (ids.has(region.id)) {
      console.error(`Duplicate body region ID: ${region.id}`);
    }
    ids.add(region.id);
  }
}
```

---

### 17. **Overly Broad Try-Catch in Food Scanner Routes**
**File:** `backend/routes/foodScannerRoutes.mjs`  
**Lines:** 25-40 (and others)

```javascript
try {
  // ... entire route logic
} catch (error) {
  logger.error(`Error in scan route: ${error.message}`, error);
  return res.status(500).json({ success: false, message: 'Server error while scanning product' });
}
```

**Problem:** Catches all errors (including programming errors like typos), masking bugs.

**Fix:** Only catch expected errors:
```javascript
try {
  const product = await foodScannerService.getProductByBarcode(barcode, userId);
} catch (error) {
  if (error.name === 'DatabaseError') {
    logger.error('[FoodScanner] DB error:', error);
    return res.status(503).json({ success: false, message: 'Database temporarily unavailable' });
  }
  throw error; // Re-throw unexpected errors to be caught by global error handler
}
```

---

## Performance Recommendations

1. **Virtualize Body Region List** (if >100 regions): Use `react-window` for large region arrays.
2. **Debounce Zoom Gestures**: Add 16ms debounce to `handleTouchMove` to reduce render thrashing.
3. **Lazy Load PainEntryPanel**: Code-split the panel component since it's only shown after region selection.

---

## Security Notes

✅ **Good:**
- Rate limiting on AI endpoints
- Auth middleware on all protected routes
- Barcode input validation

⚠️ **Needs Attention:**
- AI data update payload validation (CRITICAL #3)
- SQL injection risk if `foodScannerService` uses raw queries (audit service layer)
- No CSRF protection mentioned (ensure cookies use `SameSite=Strict`)

---

## Testing Gaps

1. **No tests for rate limiter edge cases** (concurrent requests,

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
