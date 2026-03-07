# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 62.2s
> **Files:** backend/models/EquipmentProfile.mjs, backend/models/EquipmentItem.mjs, backend/models/EquipmentExerciseMap.mjs, backend/routes/equipmentRoutes.mjs, backend/services/equipmentScanService.mjs, frontend/src/hooks/useEquipmentAPI.ts, frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx
> **Generated:** 3/6/2026, 3:55:31 PM

---

# Code Review: SwanStudios Equipment Profile Manager

## CRITICAL Issues

### 1. **SQL Injection via String Interpolation in Routes**
**Location:** `backend/routes/equipmentRoutes.mjs` (multiple locations)  
**Severity:** CRITICAL

```javascript
// Line ~200+: Direct string interpolation in queries
const existing = await EquipmentProfile.findOne({
  where: { trainerId: req.user.id, name: name.trim() },
});
```

**Issue:** While Sequelize parameterizes these queries, the pattern is risky. More critically, the `getOwnedProfile` helper doesn't validate `req.params.id` is numeric before using it.

**Fix:**
```javascript
async function getOwnedProfile(req, res) {
  const profileId = parseInt(req.params.id, 10);
  if (isNaN(profileId)) {
    res.status(400).json({ success: false, error: 'Invalid profile ID' });
    return null;
  }
  // ... rest of function
}
```

---

### 2. **Race Condition in Equipment Count Cache**
**Location:** `backend/routes/equipmentRoutes.mjs` (lines ~280, ~350, ~430)  
**Severity:** CRITICAL

```javascript
// Multiple routes update equipmentCount without transaction
const count = await EquipmentItem.count({ where: { profileId: profile.id, isActive: true } });
await profile.update({ equipmentCount: count });
```

**Issue:** Concurrent requests can cause stale counts. If two items are added simultaneously, one count update may be lost.

**Fix:**
```javascript
// Use database transaction
const t = await sequelize.transaction();
try {
  await item.update({ isActive: false }, { transaction: t });
  const count = await EquipmentItem.count({ 
    where: { profileId: profile.id, isActive: true },
    transaction: t 
  });
  await profile.update({ equipmentCount: count }, { transaction: t });
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

---

### 3. **Memory Leak in Rate Limiter**
**Location:** `backend/routes/equipmentRoutes.mjs` (lines 44-58)  
**Severity:** CRITICAL

```javascript
const scanRateMap = new Map();
// Never cleaned up - grows indefinitely
```

**Issue:** The in-memory rate limiter never expires old entries. Over time, this will consume unbounded memory.

**Fix:**
```javascript
function checkScanRate(trainerId) {
  const now = Date.now();
  const entry = scanRateMap.get(trainerId);
  
  // Clean up old entries (older than 2 hours)
  if (scanRateMap.size > 1000) {
    for (const [id, data] of scanRateMap.entries()) {
      if (now - data.windowStart > SCAN_WINDOW_MS * 2) {
        scanRateMap.delete(id);
      }
    }
  }
  
  if (!entry || now - entry.windowStart > SCAN_WINDOW_MS) {
    scanRateMap.set(trainerId, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= SCAN_LIMIT) return false;
  entry.count++;
  return true;
}
```

---

## HIGH Issues

### 4. **Missing TypeScript Discriminated Union for Approval Status**
**Location:** `frontend/src/hooks/useEquipmentAPI.ts` (line 56)  
**Severity:** HIGH

```typescript
approvalStatus: 'pending' | 'approved' | 'rejected' | 'manual';
```

**Issue:** No type narrowing for status-dependent fields. `approvedAt` should only exist when `approvalStatus === 'approved'`.

**Fix:**
```typescript
type BaseEquipmentItem = {
  id: number;
  profileId: number;
  name: string;
  // ... common fields
};

type PendingItem = BaseEquipmentItem & {
  approvalStatus: 'pending';
  approvedAt: null;
  aiScanData: AiScanData;
};

type ApprovedItem = BaseEquipmentItem & {
  approvalStatus: 'approved';
  approvedAt: string;
  aiScanData: AiScanData | null;
};

type ManualItem = BaseEquipmentItem & {
  approvalStatus: 'manual';
  approvedAt: null;
  aiScanData: null;
};

type RejectedItem = BaseEquipmentItem & {
  approvalStatus: 'rejected';
  approvedAt: null;
  aiScanData: AiScanData | null;
};

export type EquipmentItem = PendingItem | ApprovedItem | ManualItem | RejectedItem;
```

---

### 5. **Stale Closure in useCallback Dependencies**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`  
**Severity:** HIGH

```tsx
const handleApprove = useCallback(async (itemId: number) => {
  // Uses `selectedProfile` but doesn't list it in deps
  await approveItem(selectedProfile.id, itemId);
}, [approveItem]); // Missing selectedProfile
```

**Issue:** If `selectedProfile` changes, the callback still references the old value.

**Fix:**
```tsx
const handleApprove = useCallback(async (itemId: number) => {
  if (!selectedProfile) return;
  await approveItem(selectedProfile.id, itemId);
}, [approveItem, selectedProfile]);
```

---

### 6. **Inline Object Creation in Render**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx` (multiple locations)  
**Severity:** HIGH

```tsx
// Creates new object on every render, breaking memoization
<Card
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
```

**Issue:** Framer Motion props are recreated on every render, causing unnecessary re-animations.

**Fix:**
```tsx
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// In render:
<Card variants={cardVariants} initial="initial" animate="animate" exit="exit">
```

---

### 7. **Missing Error Boundary**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`  
**Severity:** HIGH

**Issue:** No error boundary wraps the component. If AI scan fails catastrophically, the entire page crashes.

**Fix:**
```tsx
// Create ErrorBoundary.tsx
class EquipmentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error} 
          reset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

// Wrap in parent component
<EquipmentErrorBoundary>
  <EquipmentManagerPage />
</EquipmentErrorBoundary>
```

---

## MEDIUM Issues

### 8. **Hardcoded Color Values in Styled Components**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx` (lines 50-300)  
**Severity:** MEDIUM

```tsx
const PageWrapper = styled.div`
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #e0ecf4;
`;
```

**Issue:** Colors are hardcoded instead of using theme tokens. Violates Galaxy-Swan theme system.

**Fix:**
```tsx
const PageWrapper = styled.div`
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.midnightSapphire} 0%, ${({ theme }) => theme.colors.deepSpace} 100%);
  color: ${({ theme }) => theme.colors.textPrimary};
`;

// In theme.ts:
export const theme = {
  colors: {
    midnightSapphire: '#002060',
    deepSpace: '#001040',
    swanCyan: '#60C0F0',
    textPrimary: '#e0ecf4',
    // ...
  },
};
```

---

### 9. **DRY Violation: Validation Arrays Duplicated**
**Location:** `backend/routes/equipmentRoutes.mjs` (lines ~270, ~340, ~450)  
**Severity:** MEDIUM

```javascript
// Duplicated 3 times
const validCategories = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx', 'other'
];
```

**Fix:**
```javascript
// Create constants file
// backend/constants/equipment.mjs
export const EQUIPMENT_CATEGORIES = [
  'barbell', 'dumbbell', 'kettlebell', 'cable_machine', 'resistance_band',
  'bodyweight', 'machine', 'bench', 'rack', 'cardio', 'foam_roller',
  'stability_ball', 'medicine_ball', 'pull_up_bar', 'trx', 'other'
];

export const RESISTANCE_TYPES = [
  'bodyweight', 'dumbbell', 'barbell', 'cable', 'band', 'machine', 'kettlebell', 'other'
];

// Import in routes
import { EQUIPMENT_CATEGORIES, RESISTANCE_TYPES } from '../constants/equipment.mjs';
```

---

### 10. **Missing Loading States in UI**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`  
**Severity:** MEDIUM

```tsx
const handleScan = async (file: File) => {
  setIsScanning(true);
  const result = await scanEquipment(selectedProfile.id, file);
  setIsScanning(false);
  // No error handling if scanEquipment throws
};
```

**Issue:** If the API call fails, `isScanning` stays `true` forever, locking the UI.

**Fix:**
```tsx
const handleScan = async (file: File) => {
  setIsScanning(true);
  setError(null);
  try {
    const result = await scanEquipment(selectedProfile.id, file);
    setScanResult(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Scan failed');
  } finally {
    setIsScanning(false);
  }
};
```

---

### 11. **Missing Keys in List Rendering**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`  
**Severity:** MEDIUM

```tsx
{profiles.map(profile => (
  <Card onClick={() => handleSelectProfile(profile)}>
    {/* Missing key prop */}
  </Card>
))}
```

**Fix:**
```tsx
{profiles.map(profile => (
  <Card key={profile.id} onClick={() => handleSelectProfile(profile)}>
    {/* ... */}
  </Card>
))}
```

---

### 12. **Inefficient Re-renders from Inline Functions**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`  
**Severity:** MEDIUM

```tsx
<Card onClick={() => handleSelectProfile(profile)}>
```

**Issue:** Creates new function on every render. If `profiles` has 50 items, that's 50 new functions per render.

**Fix:**
```tsx
const handleProfileClick = useCallback((profileId: number) => {
  const profile = profiles.find(p => p.id === profileId);
  if (profile) setSelectedProfile(profile);
}, [profiles]);

// In render:
<Card onClick={() => handleProfileClick(profile.id)}>
```

---

## LOW Issues

### 13. **Console Logs in Production Code**
**Location:** `backend/services/equipmentScanService.mjs` (line 120)  
**Severity:** LOW

```javascript
logger.info('[EquipmentScan] Scan complete', { ... });
```

**Issue:** While using a logger is good, there's no log level filtering. Production logs may be too verbose.

**Fix:** Ensure logger has environment-based levels:
```javascript
// In logger.mjs
const level = process.env.NODE_ENV === 'production' ? 'warn' : 'info';
```

---

### 14. **Magic Numbers in Pagination**
**Location:** `backend/routes/equipmentRoutes.mjs` (line 310)  
**Severity:** LOW

```javascript
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
```

**Fix:**
```javascript
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;
const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
```

---

### 15. **Unused Import in Frontend Hook**
**Location:** `frontend/src/hooks/useEquipmentAPI.ts` (line 1)  
**Severity:** LOW

```typescript
import { useCallback } from 'react';
```

**Issue:** `useCallback` is imported but all functions are already wrapped in `useCallback`. This is correct, but the import statement could include `useMemo` for future use.

**No action needed** (this is actually correct usage).

---

### 16. **Missing Alt Text on Images**
**Location:** `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx`  
**Severity:** LOW

```tsx
<PreviewImage src={previewUrl} />
```

**Fix:**
```tsx
<PreviewImage src={previewUrl} alt={`Preview of ${scanResult?.suggestedName || 'equipment'}`} />
```

---

### 17. **Inconsistent Error Messages**
**Location:** `backend/routes/equipmentRoutes.mjs` (multiple)  
**Severity:** LOW

```javascript
// Some errors are generic:
res.status(500).json({ success: false, error: 'Failed to list profiles' });

// Others are specific:
res.status(409).json({ success: false, error: 'A profile with this name already exists' });
```

**Fix:** Create error message constants:
```javascript
const ERRORS = {
  PROFILE_NOT_FOUND: 'Equipment profile not found',
  PROFILE_EXISTS: 'A profile with this name already exists',
  // ...
};
```

---

## Summary Table

| Severity | Count | Top Issues |
|----------|-------|------------|
| CRITICAL | 3 | SQL injection risk, race conditions, memory leak |
| HIGH | 4 | Missing discriminated unions, stale closures, missing error boundary |
| MEDIUM | 5 | Hardcoded colors, DRY violations, missing loading states |
| LOW | 4 | Magic numbers, missing alt text, inconsistent errors |

---

## Recommended Priority Fixes

1. **Immediate (CRITICAL):**
   - Add input validation to `getOwnedProfile` (#1)
   - Wrap count updates in transactions (#2)
   - Fix rate limiter memory leak (#3)

2. **This Sprint (HIGH):**
   - Add discriminated unions for `EquipmentItem` (#

---

*Part of SwanStudios 7-Brain Validation System*
