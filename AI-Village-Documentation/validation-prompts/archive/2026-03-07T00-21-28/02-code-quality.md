# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 62.4s
> **Files:** backend/models/VariationLog.mjs, backend/migrations/20260306000003-create-variation-logs.cjs, backend/services/variationEngine.mjs, backend/routes/variationRoutes.mjs, frontend/src/hooks/useVariationAPI.ts, frontend/src/components/VariationEngine/VariationEnginePage.tsx
> **Generated:** 3/6/2026, 4:21:28 PM

---

# Code Review: SwanStudios Variation Engine

## CRITICAL Issues

### 1. **Missing Error Boundary Render**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx` (line ~580+)  
**Issue:** Error boundary render method is truncated/incomplete
```tsx
// Current (incomplete):
<p style={{ color: '
// ... truncated ...

// Should be:
<p style={{ color: 'rgba(224, 236, 244, 0.5)' }}>
  Please refresh the page or contact support.
</p>
<button onClick={() => window.location.reload()}>Reload Page</button>
```
**Impact:** Runtime errors will show broken UI  
**Rating:** **CRITICAL**

---

### 2. **Missing Try/Catch in useEffect**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx` (line ~445)  
**Issue:** Exercise loading has no error handling
```tsx
// Current:
useEffect(() => {
  api.getExercises({ category: category === 'full_body' ? undefined : category })
    .then(res => setExercises(res.exercises))
    .catch(() => {}); // Silent failure
}, [api, category]);

// Should:
useEffect(() => {
  api.getExercises({ category: category === 'full_body' ? undefined : category })
    .then(res => setExercises(res.exercises))
    .catch(err => {
      console.error('[VariationEngine] Failed to load exercises:', err);
      setError('Failed to load exercise library');
    });
}, [api, category]);
```
**Rating:** **CRITICAL**

---

### 3. **Unsafe parseInt Without Validation**
**File:** `backend/routes/variationRoutes.mjs` (multiple locations)  
**Issue:** Direct parseInt usage can cause NaN injection
```mjs
// Lines 68, 128, 152, 178 — Pattern repeated:
const parsedClientId = parseInt(clientId, 10);
if (isNaN(parsedClientId)) {
  return res.status(400).json({ success: false, error: 'Valid clientId is required' });
}

// Better: Extract to validation middleware
function validateIntParam(value, fieldName) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}
```
**Rating:** **CRITICAL** (DRY violation + security)

---

## HIGH Issues

### 4. **Stale Closure in loadTimeline**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx` (line ~455)  
**Issue:** `loadTimeline` recreates on every `clientId`/`category`/`rotationPattern` change, causing unnecessary effect triggers
```tsx
// Current:
const loadTimeline = useCallback(async () => {
  const cid = parseInt(clientId, 10);
  if (isNaN(cid)) return;
  try {
    const res = await api.getTimeline(cid, category, rotationPattern);
    setTimeline(res.timeline);
    setNextType(res.nextSessionType);
  } catch {
    // silent
  }
}, [api, clientId, category, rotationPattern]); // ❌ Too many deps

useEffect(() => {
  if (clientId) loadTimeline();
}, [clientId, category, rotationPattern, loadTimeline]); // ❌ Runs on every change

// Should:
useEffect(() => {
  const cid = parseInt(clientId, 10);
  if (isNaN(cid)) return;
  
  let cancelled = false;
  api.getTimeline(cid, category, rotationPattern)
    .then(res => {
      if (!cancelled) {
        setTimeline(res.timeline);
        setNextType(res.nextSessionType);
      }
    })
    .catch(err => {
      if (!cancelled) {
        console.error('[VariationEngine] Timeline load failed:', err);
      }
    });
  
  return () => { cancelled = true; };
}, [api, clientId, category, rotationPattern]);
```
**Rating:** **HIGH**

---

### 5. **Missing Keys in Timeline Map**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx` (line ~520)  
**Issue:** Using `entry.id` as key, but next session node has no unique key
```tsx
// Current:
{timeline.map((entry, i) => (
  <TimelineNode key={entry.id} $type={entry.sessionType}>
    {/* ... */}
  </TimelineNode>
))}
{/* Next session indicator */}
<TimelineNode $type={nextType} $current> {/* ❌ No key */}

// Should:
<TimelineNode key="next-session" $type={nextType} $current>
```
**Rating:** **HIGH**

---

### 6. **Hardcoded Color Values**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx` (throughout)  
**Issue:** Colors hardcoded instead of using theme tokens
```tsx
// Current (50+ instances):
color: #e0ecf4;
background: linear-gradient(180deg, #002060 0%, #001040 100%);
border: 1px solid rgba(96, 192, 240, 0.2);

// Should create theme tokens:
const theme = {
  colors: {
    text: {
      primary: '#e0ecf4',
      secondary: 'rgba(224, 236, 244, 0.7)',
      muted: 'rgba(224, 236, 244, 0.5)',
    },
    background: {
      primary: '#002060',
      secondary: '#001040',
      glass: 'rgba(0, 32, 96, 0.5)',
    },
    accent: {
      cyan: '#60c0f0',
      purple: '#7851a9',
    },
    border: {
      default: 'rgba(96, 192, 240, 0.2)',
      active: '#60c0f0',
    },
  },
};

// Then use:
color: ${({ theme }) => theme.colors.text.primary};
```
**Rating:** **HIGH** (maintainability + theme consistency)

---

### 7. **Inline Function Creation in Render**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx` (line ~535)  
**Issue:** Creates new function on every render
```tsx
// Current:
<Pill
  key={c}
  $active={category === c}
  onClick={() => { setCategory(c); setSelectedExercises([]); }} // ❌ New function every render
>

// Should:
const handleCategoryChange = useCallback((newCategory: string) => {
  setCategory(newCategory);
  setSelectedExercises([]);
}, []);

<Pill onClick={() => handleCategoryChange(c)}>
```
**Rating:** **HIGH** (performance)

---

## MEDIUM Issues

### 8. **DRY Violation: Repeated Validation Logic**
**File:** `backend/routes/variationRoutes.mjs`  
**Issue:** Same validation pattern repeated 4 times
```mjs
// Lines 68-76, 128-132, 152-156, 178-182
const parsedClientId = parseInt(req.query.clientId, 10);
if (isNaN(parsedClientId)) {
  return res.status(400).json({ success: false, error: 'Valid clientId is required' });
}

// Extract to middleware:
function validateClientId(req, res, next) {
  const clientId = parseInt(req.query.clientId || req.body.clientId, 10);
  if (isNaN(clientId) || clientId < 1) {
    return res.status(400).json({ success: false, error: 'Valid clientId is required' });
  }
  req.validatedClientId = clientId;
  next();
}

router.get('/history', validateClientId, async (req, res) => {
  const { validatedClientId } = req;
  // ...
});
```
**Rating:** **MEDIUM**

---

### 9. **Missing TypeScript Discriminated Union**
**File:** `frontend/src/hooks/useVariationAPI.ts`  
**Issue:** `SwapSuggestion` should use discriminated union for `replacement`
```ts
// Current:
export interface SwapSuggestion {
  original: string;
  replacement: string | null; // ❌ Unclear when null vs string
  muscleMatch: number;
  nasmConfidence: string;
  replacementName?: string;
  originalName?: string;
  muscles?: string[];
}

// Should:
type SwapSuggestion = 
  | {
      type: 'swap';
      original: string;
      replacement: string;
      muscleMatch: number;
      nasmConfidence: 'High' | 'Medium';
      replacementName: string;
      originalName: string;
      muscles: string[];
    }
  | {
      type: 'keep';
      original: string;
      replacement: string; // Same as original
      muscleMatch: 100;
      nasmConfidence: 'Keep';
      replacementName: string;
      originalName: string;
      muscles: string[];
    };
```
**Rating:** **MEDIUM**

---

### 10. **Untyped Error Handling**
**File:** `frontend/src/hooks/useVariationAPI.ts` (line ~22)  
**Issue:** Error handling assumes `Error` instance
```ts
// Current:
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getHeaders(), ...options?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Should:
interface APIError {
  error: string;
  details?: unknown;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, { ...options, headers: { ...getHeaders(), ...options?.headers } });
    const data: T | APIError = await res.json();
    
    if (!res.ok) {
      const errorMsg = (data as APIError).error || `Request failed (${res.status})`;
      throw new Error(errorMsg);
    }
    
    return data as T;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Network request failed');
  }
}
```
**Rating:** **MEDIUM**

---

### 11. **Magic Numbers in Variation Logic**
**File:** `backend/services/variationEngine.mjs` (line ~140)  
**Issue:** Hardcoded thresholds without constants
```mjs
// Current:
if (matchScore < 0.3) continue; // ❌ Magic number
if (Math.abs(exercise.nasmLevel - nasmLevel) > 1) continue; // ❌ Magic number

// Should:
const MUSCLE_MATCH_THRESHOLD = 0.3; // Minimum 30% muscle overlap
const NASM_LEVEL_TOLERANCE = 1; // Allow ±1 level difference

if (matchScore < MUSCLE_MATCH_THRESHOLD) continue;
if (Math.abs(exercise.nasmLevel - nasmLevel) > NASM_LEVEL_TOLERANCE) continue;
```
**Rating:** **MEDIUM**

---

### 12. **Missing Pagination State Management**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx`  
**Issue:** History endpoint supports pagination but UI doesn't implement it
```tsx
// Add pagination state:
const [historyPage, setHistoryPage] = useState(1);
const [historyTotal, setHistoryTotal] = useState(0);

const loadHistory = useCallback(async () => {
  const cid = parseInt(clientId, 10);
  if (isNaN(cid)) return;
  
  try {
    const res = await api.getHistory(cid, { category, page: historyPage, limit: 20 });
    setHistoryLogs(res.logs);
    setHistoryTotal(res.pagination.total);
  } catch (err) {
    setError('Failed to load history');
  }
}, [api, clientId, category, historyPage]);
```
**Rating:** **MEDIUM**

---

## LOW Issues

### 13. **Inconsistent Table Name Casing**
**File:** `backend/models/VariationLog.mjs` vs `backend/migrations/20260306000003-create-variation-logs.cjs`  
**Issue:** Model references `'Users'` but migration uses `'users'`
```mjs
// Model (line 25):
references: { model: 'Users', key: 'id' },

// Migration (line 13):
references: { model: 'users', key: 'id' },

// PostgreSQL is case-sensitive in quotes — ensure consistency
```
**Rating:** **LOW** (may work but risky)

---

### 14. **Missing Index on Composite Query**
**File:** `backend/models/VariationLog.mjs`  
**Issue:** `getVariationTimeline` queries `clientId + templateCategory + sessionDate` but only has partial index
```mjs
// Current indexes:
{ fields: ['clientId', 'templateCategory'], name: 'idx_variation_log_client_category' },
{ fields: ['sessionDate'], name: 'idx_variation_log_date' },

// Add composite index for timeline query:
{ 
  fields: ['clientId', 'templateCategory', 'sessionDate'], 
  name: 'idx_variation_log_timeline' 
},
```
**Rating:** **LOW** (performance optimization)

---

### 15. **Unused Import**
**File:** `backend/routes/variationRoutes.mjs` (line ~13)  
**Issue:** `getVariationLog` imported but only used once
```mjs
import { getVariationLog } from '../models/index.mjs';

// Only used on line 152 — could inline:
const VariationLog = (await import('../models/index.mjs')).getVariationLog();
```
**Rating:** **LOW**

---

### 16. **Missing ARIA Labels**
**File:** `frontend/src/components/VariationEngine/VariationEnginePage.tsx`  
**Issue:** Interactive elements lack accessibility attributes
```tsx
// Current:
<Pill $active={category === c} onClick={() => { ... }}>

// Should:
<Pill 
  $active={category === c} 
  onClick={() => { ... }}
  role="button"
  aria-pressed={category === c}
  aria-label={`Select ${CATEGORY_LABELS[c]} category`}
>
```
**Rating:** **LOW**

---

## Summary

| Severity | Count | Must Fix Before Production |
|----------|-------|----------------------------|
| CRITICAL | 3 | ✅ Yes |
| HIGH | 4 | ✅ Yes |
| MEDIUM | 6 | ⚠️ Recommended |
| LOW | 4 | ℹ️ Nice to have |

### Top 3 Priorities:
1. **Fix error boundary** (CRITICAL #1) — Prevents white screen of death
2. **Add error handling to useEffect** (CRITICAL #2) — User-facing errors
3. **Extract validation middleware** (CRITICAL #3 + MEDIUM #8) — Security + DRY

### Performance Wins:
- Fix stale closure (HIGH #4)
- Memoize category change handler (HIGH #7)
- Add composite DB index (LOW #14)

### Code Quality:
- Create theme tokens (HIGH #6) — 50+ hardcoded colors
- Use discriminated unions (MEDIUM #9) — Type safety
- Extract magic numbers (MEDIUM #11) — Maintainability

---

*Part of SwanStudios 7-Brain Validation System*
