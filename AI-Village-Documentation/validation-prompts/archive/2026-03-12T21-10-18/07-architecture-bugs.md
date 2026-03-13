# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 82.4s
> **Files:** frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx
> **Generated:** 3/12/2026, 2:10:18 PM

---

# DEEP CODE REVIEW: UniversalMasterSchedule.tsx

## Executive Summary

This component is a **1,100+ line god component** with significant architectural and bug issues. It violates multiple production-readiness standards and contains race conditions, state management bugs, and missing error handling. The component needs immediate refactoring before production deployment.

---

## 1. BUG DETECTION

### Bug 1: Race Condition in Admin Scope State Initialization
**Severity:** HIGH  
**File & Line:** Lines 82-90

```tsx
const [adminViewScope, setAdminViewScope] = useState<'my' | 'global'>(() => {
  if (typeof window !== 'undefined' && mode === 'admin') {
    return (localStorage.getItem('adminScheduleViewScope') as 'my' | 'global') || 'my';
  }
  return 'my';
});
```

**What's Wrong:** The `mode` variable is derived from props and auth context, but the useState initializer runs only once on mount. If the user role loads asynchronously (common with auth context), `mode` may be `'client'` on first render, then switch to `'admin'` after auth resolves—but `adminViewScope` will remain stuck at `'my'` without reading localStorage.

**Fix:**
```tsx
const [adminViewScope, setAdminViewScope] = useState<'my' | 'global'>('my');

// Separate effect to sync with localStorage after mode is determined
useEffect(() => {
  if (mode === 'admin' && typeof window !== 'undefined') {
    const saved = localStorage.getItem('adminScheduleViewScope') as 'my' | 'global';
    if (saved) setAdminViewScope(saved);
  }
}, [mode]);
```

---

### Bug 2: Stale Closure in handleAdminScopeChange
**Severity:** CRITICAL  
**File & Line:** Lines 280-295

```tsx
const handleAdminScopeChange = useCallback((scope: 'my' | 'global') => {
  setAdminViewScope(scope);
  if (typeof window !== 'undefined') {
    localStorage.setItem('adminScheduleViewScope', scope);
  }
  // Reset trainer filter when switching to 'my' mode
  const newTrainerId = scope === 'my' ? null : selectedTrainerId;  // STALE VALUE
  if (scope === 'my') {
    setSelectedTrainerId(null);
  }
  // Trigger data refresh with new scope - pass filter options directly
  refreshData(false, {
    adminScope: scope,
    trainerId: newTrainerId?.toString() || '',  // Uses stale selectedTrainerId
    clientId: '',
    status: 'all',
    dateRange: 'all',
    location: '',
    searchTerm: ''
  });
}, [refreshData, selectedTrainerId]);  // selectedTrainerId in deps causes recreation
```

**What's Wrong:** When `scope === 'my'`, the code reads `selectedTrainerId` (the OLD value) to compute `newTrainerId`, then immediately sets `selectedTrainerId` to null. The refresh call uses the wrong trainerId. Additionally, the dependency on `selectedTrainerId` causes the callback to recreate on every trainer selection change, defeating the purpose of useCallback.

**Fix:**
```tsx
const handleAdminScopeChange = useCallback((scope: 'my' | 'global') => {
  setAdminViewScope(scope);
  if (typeof window !== 'undefined') {
    localStorage.setItem('adminScheduleViewScope', scope);
  }
  
  // Reset trainer filter when switching to 'my' mode
  if (scope === 'my') {
    setSelectedTrainerId(null);
    refreshData(false, {
      adminScope: scope,
      trainerId: '',
      clientId: '',
      status: 'all',
      dateRange: 'all',
      location: '',
      searchTerm: ''
    });
  } else {
    // For global view, keep current trainer filter
    refreshData(false, {
      adminScope: scope,
      trainerId: '', // Or keep existing: use a ref if needed
      clientId: '',
      status: 'all',
      dateRange: 'all',
      location: '',
      searchTerm: ''
    });
  }
}, [refreshData]); // Remove selectedTrainerId dependency
```

---

### Bug 3: Type Coercion Bug in trainerId Comparison
**Severity:** MEDIUM  
**File & Line:** Lines 95-103

```tsx
const scopedSessions = useMemo(() => {
  if (mode === 'admin' && adminViewScope === 'my' && userId) {
    return sessions.filter((s: any) =>
      s.trainerId === userId ||
      s.trainerId?.toString() === userId?.toString()
    );
  }
  return sessions;
}, [sessions, mode, adminViewScope, userId]);
```

**What's Wrong:** The comparison `s.trainerId === userId` uses loose equality which can match incorrectly (e.g., `"123" == 123` is true in JavaScript but `"123" === 123` is false). The fallback `.toString()` helps but the logic is inconsistent—first checks strict equality, then falls back to string comparison only if that fails. This creates unpredictable filtering.

**Fix:**
```tsx
const scopedSessions = useMemo(() => {
  if (mode === 'admin' && adminViewScope === 'my' && userId) {
    const userIdStr = String(userId);
    return sessions.filter((s: any) => 
      String(s.trainerId) === userIdStr
    );
  }
  return sessions;
}, [sessions, mode, adminViewScope, userId]);
```

---

### Bug 4: Missing Dependency in Auto-Layout Effect
**Severity:** HIGH  
**File & Line:** Lines 185-195

```tsx
useEffect(() => {
  // Only auto-switch if no saved preference in localStorage
  const savedLayout = localStorage.getItem('scheduleLayoutMode');
  if (!savedLayout && isMobile) {
    dispatch(setLayoutMode(suggestedLayout));
    dispatch(setDensity(suggestedDensity));
  }
}, [isMobile, suggestedLayout, suggestedDensity, dispatch]);
```

**What's Wrong:** The effect reads `localStorage` on every render but only acts when `savedLayout` is falsy. If localStorage changes during runtime (e.g., user clears it), the effect won't re-run. More critically: this effect runs on mount and whenever dependencies change, but it doesn't account for the case where user manually sets a layout then switches to mobile—the auto-switch will override their preference.

**Fix:**
```tsx
useEffect(() => {
  if (!isMobile) return;
  
  const savedLayout = localStorage.getItem('scheduleLayoutMode');
  if (savedLayout) return; // Respect user preference
  
  dispatch(setLayoutMode(suggestedLayout));
  dispatch(setDensity(suggestedDensity));
}, [isMobile, suggestedLayout, suggestedDensity, dispatch]);
```

---

### Bug 5: Unreachable Code in displaySessions
**Severity:** MEDIUM  
**File & Line:** Lines 120-127

```tsx
if (statusFilter === 'other') {
  const KNOWN_STATUSES = ['available', 'scheduled', 'confirmed', 'completed'];
  return scopedSessions.filter((s: any) =>
    !s.status || !KNOWN_STATUSES.includes(s.status)
  );
}
return scopedSessions.filter((s: any) => s.status === statusFilter); // UNREACHABLE if statusFilter is 'other'
```

**What's Wrong:** The `statusFilter` can be any string, but the function returns early for `'other'`. The final `return` statement is only reached if `statusFilter` is something other than `null`, `'total'`, `'scheduled'`, `'available'`, or `'other'`. Since `statusFilter` is set via `handleStatusFilterChange` which only toggles between `null` and the passed status, this is mostly safe—but the logic is fragile and confusing.

**Fix:** Add explicit handling or remove the fallback:
```tsx
// Remove the final return and add default case
return scopedSessions;
```

---

### Bug 6: Console.error in Production Code
**Severity:** MEDIUM  
**File & Line:** Lines 410, 550, 640

```tsx
console.error('Error creating session:', error);
console.error('Reschedule request failed:', error);
console.error('Error booking session:', error);
```

**What's Wrong:** Console

---

*Part of SwanStudios 7-Brain Validation System*
